import type { Response } from "express";
import { eq, and, gte, lte, sum, desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { farmersTable } from "../db/schemas/farmer.schema.js";
import { milkRecordsTable } from "../db/schemas/milk-record.schema.js";
import { farmerPurchasesTable } from "../db/schemas/farmer-purchase.schema.js";

import { AppError } from "../utils/error-utils/AppError.js";
import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/syncHandler.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns UTC start/end of a calendar month (1-indexed month). */
function getMonthBounds(year: number, month: number) {
    return {
        start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
        end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
    };
}

/** Returns UTC start/end of the month preceding the given year/month. */
function getPreviousMonthBounds(year: number, month: number) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return getMonthBounds(prevYear, prevMonth);
}

/**
 * Compute milk earnings for a farmer within a date range.
 * Earnings = SUM(liters × price_per_liter) per delivery record.
 */
async function calcMilkEarnings(
    farmerId: number,
    collectionId: number,
    start: Date,
    end: Date
): Promise<number> {
    const rows = await db
        .select({
            liters: milkRecordsTable.liters,
            price_per_liter: milkRecordsTable.price_per_liter,
        })
        .from(milkRecordsTable)
        .where(
            and(
                eq(milkRecordsTable.farmer_id, farmerId),
                eq(milkRecordsTable.recorded_by_collection_id, collectionId),
                gte(milkRecordsTable.recordedAt, start),
                lte(milkRecordsTable.recordedAt, end)
            )
        );

    return parseFloat(
        rows
            .reduce(
                (acc, r) => acc + parseFloat(r.liters) * parseFloat(r.price_per_liter),
                0
            )
            .toFixed(2)
    );
}

/**
 * Compute total product purchases (deductions) for a farmer within a date range.
 */
async function calcPurchasesTotal(
    farmerId: number,
    collectionId: number,
    start: Date,
    end: Date
): Promise<number> {
    const rows = await db
        .select({ total_amount: farmerPurchasesTable.total_amount })
        .from(farmerPurchasesTable)
        .where(
            and(
                eq(farmerPurchasesTable.farmer_id, farmerId),
                eq(farmerPurchasesTable.recorded_by_collection_id, collectionId),
                gte(farmerPurchasesTable.createdAt, start),
                lte(farmerPurchasesTable.createdAt, end)
            )
        );

    return parseFloat(
        rows.reduce((acc, r) => acc + parseFloat(r.total_amount), 0).toFixed(2)
    );
}

/**
 * Core financial calculation for one farmer in one month.
 *
 * ```
 * milk_earnings      = SUM(liters × price_per_liter)   this month
 * products_taken     = SUM(total_amount of purchases)   this month
 * previous_debt      = MAX(0, prev month deficit)
 * final_payment      = milk_earnings - products_taken - previous_debt
 * carried_debt       = MAX(0, -final_payment)           (if still in deficit)
 * ```
 */
async function computeFinancials(
    farmerId: number,
    collectionId: number,
    year: number,
    month: number
) {
    const { start, end } = getMonthBounds(year, month);
    const { start: prevStart, end: prevEnd } = getPreviousMonthBounds(year, month);

    const [milkEarnings, productsTaken, prevMilkEarnings, prevProductsTaken] =
        await Promise.all([
            calcMilkEarnings(farmerId, collectionId, start, end),
            calcPurchasesTotal(farmerId, collectionId, start, end),
            calcMilkEarnings(farmerId, collectionId, prevStart, prevEnd),
            calcPurchasesTotal(farmerId, collectionId, prevStart, prevEnd),
        ]);

    const prevNet = prevMilkEarnings - prevProductsTaken;
    const previousDebt = parseFloat(Math.max(0, -prevNet).toFixed(2));

    const net = parseFloat(
        (milkEarnings - productsTaken - previousDebt).toFixed(2)
    );

    return {
        milk_earnings: milkEarnings,
        products_taken: productsTaken,
        previous_debt: previousDebt,
        final_payment: net >= 0 ? net : 0,
        carried_debt: net < 0 ? parseFloat(Math.abs(net).toFixed(2)) : 0,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

const monthQuerySchema = z.object({
    month: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
            message: 'month must be in YYYY-MM format (e.g. "2025-10").',
        })
        .default(
            // default to current month if not provided
            () => {
                const now = new Date();
                return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
            }
        ),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /farmers/:id/financial-summary?month=YYYY-MM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the monthly financial summary for a single farmer.
 *
 * @example
 * GET /farmers/3/financial-summary?month=2026-06
 * {
 *   "milk_earnings": 120000,
 *   "products_taken": 40000,
 *   "previous_debt": 0,
 *   "final_payment": 80000,
 *   "carried_debt": 0
 * }
 */
export const getFarmerFinancialSummary = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User ID not found in token payload.");
        }

        const farmerId = parseInt(req.params.id, 10);
        if (isNaN(farmerId)) {
            throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid farmer ID.");
        }

        const queryValidation = monthQuerySchema.safeParse(req.query);
        if (!queryValidation.success) {
            throw new AppError(
                ERROR_CODES.VALIDATION_ERROR,
                queryValidation.error.issues[0]?.message ?? "Invalid query parameters."
            );
        }

        const { month } = queryValidation.data;
        const [year, monthNum] = month.split("-").map(Number);

        // Verify farmer belongs to this center
        const farmerRows = await db
            .select({ id: farmersTable.id, farmer_name: farmersTable.farmer_name })
            .from(farmersTable)
            .where(
                and(
                    eq(farmersTable.id, farmerId),
                    eq(farmersTable.collection_center_id, loggedInUserId)
                )
            )
            .limit(1);

        if (farmerRows.length === 0) {
            throw new AppError(
                ERROR_CODES.NOT_FOUND,
                `Farmer with ID ${farmerId} not found.`
            );
        }

        const summary = await computeFinancials(
            farmerId,
            loggedInUserId,
            year,
            monthNum
        );

        return ApiResponse.ok(
            res,
            { farmer_id: farmerId, farmer_name: farmerRows[0].farmer_name, month, ...summary },
            "Financial summary retrieved successfully."
        );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/settlements?month=YYYY-MM
// Aggregate settlement report across ALL farmers for the center
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a center-wide settlement report for the given month.
 *
 * Iterates over every farmer in this collection center and sums:
 * - `milk_revenue`        — total milk money owed to all farmers
 * - `product_deductions`  — total product purchases across all farmers
 * - `previous_debt`       — total carried debt from last month
 * - `final_payments`      — total cash to actually pay out
 * - `carried_debts`       — total new debt rolling into next month
 *
 * @example
 * GET /reports/settlements?month=2026-06
 * {
 *   "month": "2026-06",
 *   "milk_revenue": 500000,
 *   "product_deductions": 84400,
 *   "previous_debt": 25000,
 *   "final_payments": 390600,
 *   "carried_debts": 18800,
 *   "total_farmers": 12,
 *   "farmers_in_debt": 3
 * }
 */
export const getSettlementReport = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User ID not found in token payload.");
        }

        const queryValidation = monthQuerySchema.safeParse(req.query);
        if (!queryValidation.success) {
            throw new AppError(
                ERROR_CODES.VALIDATION_ERROR,
                queryValidation.error.issues[0]?.message ?? "Invalid query parameters."
            );
        }

        const { month } = queryValidation.data;
        const [year, monthNum] = month.split("-").map(Number);

        // Get all farmers for this collection center
        const farmers = await db
            .select({ id: farmersTable.id, farmer_name: farmersTable.farmer_name })
            .from(farmersTable)
            .where(eq(farmersTable.collection_center_id, loggedInUserId));

        // Compute financials for every farmer in parallel
        const results = await Promise.all(
            farmers.map(async (farmer) => ({
                farmer_id: farmer.id,
                farmer_name: farmer.farmer_name,
                ...(await computeFinancials(farmer.id, loggedInUserId, year, monthNum)),
            }))
        );

        // Aggregate
        const totals = results.reduce(
            (acc, r) => {
                acc.milk_revenue += r.milk_earnings;
                acc.product_deductions += r.products_taken;
                acc.previous_debt += r.previous_debt;
                acc.final_payments += r.final_payment;
                acc.carried_debts += r.carried_debt;
                if (r.carried_debt > 0) acc.farmers_in_debt += 1;
                return acc;
            },
            {
                milk_revenue: 0,
                product_deductions: 0,
                previous_debt: 0,
                final_payments: 0,
                carried_debts: 0,
                farmers_in_debt: 0,
            }
        );

        return ApiResponse.ok(
            res,
            {
                month,
                milk_revenue: parseFloat(totals.milk_revenue.toFixed(2)),
                product_deductions: parseFloat(totals.product_deductions.toFixed(2)),
                previous_debt: parseFloat(totals.previous_debt.toFixed(2)),
                final_payments: parseFloat(totals.final_payments.toFixed(2)),
                carried_debts: parseFloat(totals.carried_debts.toFixed(2)),
                total_farmers: farmers.length,
                farmers_in_debt: totals.farmers_in_debt,
            },
            "Settlement report generated successfully."
        );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/product-deductions?month=YYYY-MM
// Itemised list of all product purchases across all farmers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns an itemised list of every product purchase (deduction) made by any
 * farmer in this collection center for the given month, joined with farmer name.
 *
 * @example
 * GET /reports/product-deductions?month=2026-06
 * [
 *   {
 *     "farmer_name": "John Doe",
 *     "product_name": "Animal Feed",
 *     "quantity": 2,
 *     "unit": "Bags",
 *     "unit_price": 15000,
 *     "total_amount": 30000,
 *     "purchase_date": "2026-06-01"
 *   }
 * ]
 */
export const getProductDeductionsReport = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User ID not found in token payload.");
        }

        const queryValidation = monthQuerySchema.safeParse(req.query);
        if (!queryValidation.success) {
            throw new AppError(
                ERROR_CODES.VALIDATION_ERROR,
                queryValidation.error.issues[0]?.message ?? "Invalid query parameters."
            );
        }

        const { month } = queryValidation.data;
        const [year, monthNum] = month.split("-").map(Number);
        const { start, end } = getMonthBounds(year, monthNum);

        const rows = await db
            .select({
                farmer_name: farmersTable.farmer_name,
                product_name: farmerPurchasesTable.product_name,
                quantity: farmerPurchasesTable.quantity,
                unit: farmerPurchasesTable.unit,
                unit_price: farmerPurchasesTable.unit_price,
                total_amount: farmerPurchasesTable.total_amount,
                purchase_date: farmerPurchasesTable.purchase_date,
            })
            .from(farmerPurchasesTable)
            .innerJoin(
                farmersTable,
                eq(farmerPurchasesTable.farmer_id, farmersTable.id)
            )
            .where(
                and(
                    eq(farmerPurchasesTable.recorded_by_collection_id, loggedInUserId),
                    gte(farmerPurchasesTable.createdAt, start),
                    lte(farmerPurchasesTable.createdAt, end)
                )
            )
            .orderBy(desc(farmerPurchasesTable.purchase_date));

        const data = rows.map((r) => ({
            farmer_name: r.farmer_name,
            product_name: r.product_name,
            quantity: parseFloat(r.quantity),
            unit: r.unit,
            unit_price: parseFloat(r.unit_price),
            total_amount: parseFloat(r.total_amount),
            purchase_date: r.purchase_date,
        }));

        return ApiResponse.ok(
            res,
            data,
            "Product deductions report retrieved successfully."
        );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /farmers/debts?month=YYYY-MM
// List all farmers currently carrying debt into next month
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns every farmer in this collection center whose net payout for the
 * given month is negative (i.e. their loan obligations exceeded milk earnings).
 *
 * @example
 * GET /farmers/debts?month=2026-06
 * [
 *   {
 *     "farmer_id": 4,
 *     "farmer_name": "Alice Uwera",
 *     "phone_number": "0788001122",
 *     "milk_earnings": 10000,
 *     "products_taken": 15000,
 *     "previous_debt": 0,
 *     "carried_debt": 5000
 *   }
 * ]
 */
export const getFarmersWithDebt = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User ID not found in token payload.");
        }

        const queryValidation = monthQuerySchema.safeParse(req.query);
        if (!queryValidation.success) {
            throw new AppError(
                ERROR_CODES.VALIDATION_ERROR,
                queryValidation.error.issues[0]?.message ?? "Invalid query parameters."
            );
        }

        const { month } = queryValidation.data;
        const [year, monthNum] = month.split("-").map(Number);

        const farmers = await db
            .select({
                id: farmersTable.id,
                farmer_name: farmersTable.farmer_name,
                phone_number: farmersTable.phone_number,
            })
            .from(farmersTable)
            .where(eq(farmersTable.collection_center_id, loggedInUserId));

        const results = await Promise.all(
            farmers.map(async (farmer) => {
                const financials = await computeFinancials(
                    farmer.id,
                    loggedInUserId,
                    year,
                    monthNum
                );
                return { farmer_id: farmer.id, farmer_name: farmer.farmer_name, phone_number: farmer.phone_number, ...financials };
            })
        );

        const inDebt = results
            .filter((r) => r.carried_debt > 0)
            .map(({ milk_earnings, products_taken, previous_debt, carried_debt, farmer_id, farmer_name, phone_number }) => ({
                farmer_id,
                farmer_name,
                phone_number,
                milk_earnings,
                products_taken,
                previous_debt,
                carried_debt,
            }))
            .sort((a, b) => b.carried_debt - a.carried_debt); // worst debt first

        return ApiResponse.ok(
            res,
            { month, farmers_with_debt: inDebt.length, farmers: inDebt },
            "Farmers with debt retrieved successfully."
        );
    }
);