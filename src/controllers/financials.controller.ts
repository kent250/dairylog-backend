import type { Response } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
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
import { deadMilkRecordsTable } from "../db/schemas/dead-milk-record.schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

/** UTC start/end of a full calendar month. */
function getMonthBounds(year: number, month: number) {
    return {
        start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
        end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
    };
}

/** UTC start/end of the month before a given year/month. */
function getPreviousMonthBounds(year: number, month: number) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return getMonthBounds(prevYear, prevMonth);
}

/** Format a Date to YYYY-MM-DD string. */
function toDateStr(d: Date): string {
    return d.toISOString().split("T")[0];
}


/** SUM(liters) of dead milk for a farmer within a date range. */
async function calcDeadMilkLiters(
    farmerId: number,
    collectionId: number,
    start: Date,
    end: Date
): Promise<number> {
    const rows = await db
        .select({ liters: deadMilkRecordsTable.liters })
        .from(deadMilkRecordsTable)
        .where(
            and(
                eq(deadMilkRecordsTable.farmer_id, farmerId),
                eq(deadMilkRecordsTable.recorded_by_collection_id, collectionId),
                gte(deadMilkRecordsTable.recordedAt, toDateStr(start)),
                lte(deadMilkRecordsTable.recordedAt, toDateStr(end))
            )
        );

    return parseFloat(
        rows.reduce((acc, r) => acc + parseFloat(r.liters), 0).toFixed(2)
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accepts EITHER:
 *   ?month=YYYY-MM                          (resolves to full calendar month)
 *   ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD (explicit range)
 *
 * Rules:
 * - `month` and `startDate/endDate` are mutually exclusive.
 * - If neither is provided, defaults to the current calendar month.
 * - `endDate` must not be before `startDate`.
 *
 * Resolves to a normalised `{ start: Date, end: Date, label: string }` used
 * consistently everywhere downstream.
 */
const dateRangeQuerySchema = z
    .object({
        month: z
            .string()
            .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
                message: 'month must be in YYYY-MM format (e.g. "2026-06").',
            })
            .optional(),

        startDate: z.coerce.date({ error: "startDate must be a valid date (YYYY-MM-DD)." }).optional(),
        endDate: z.coerce.date({ error: "endDate must be a valid date (YYYY-MM-DD)." }).optional(),
    })
    .refine(
        (d) => !(d.month && (d.startDate || d.endDate)),
        { message: "Provide either month or startDate/endDate — not both.", path: ["month"] }
    )
    .refine(
        (d) => {
            if (d.startDate && d.endDate) return d.endDate >= d.startDate;
            return true;
        },
        { message: "endDate cannot be before startDate.", path: ["endDate"] }
    );

/** Parse and validate date range query params, returning normalised bounds + label. */
function resolveDateRange(query: unknown): {
    start: Date;
    end: Date;
    label: string;
} {
    const result = dateRangeQuerySchema.safeParse(query);
    if (!result.success) {
        throw new AppError(
            ERROR_CODES.VALIDATION_ERROR,
            result.error.issues[0]?.message ?? "Invalid date range parameters."
        );
    }

    const { month, startDate, endDate } = result.data;

    if (month) {
        const [year, monthNum] = month.split("-").map(Number);
        const { start, end } = getMonthBounds(year, monthNum);
        return { start, end, label: month };
    }

    if (startDate || endDate) {
        // If only one side is provided, default the missing side to the same day
        const s = startDate ?? endDate!;
        const e = endDate ?? startDate!;
        const start = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0));
        const end = new Date(Date.UTC(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999));
        return { start, end, label: `${toDateStr(start)} to ${toDateStr(end)}` };
    }

    // Default: current calendar month
    const now = new Date();
    const year = now.getUTCFullYear();
    const monthNum = now.getUTCMonth() + 1;
    const { start, end } = getMonthBounds(year, monthNum);
    const label = `${year}-${String(monthNum).padStart(2, "0")}`;
    return { start, end, label };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared DB helpers
// ─────────────────────────────────────────────────────────────────────────────

/** SUM(liters × price_per_liter) for a farmer within a date range. */
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
            .reduce((acc, r) => acc + parseFloat(r.liters) * parseFloat(r.price_per_liter), 0)
            .toFixed(2)
    );
}

/** SUM(total_amount) of purchases for a farmer within a date range. */
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
 * Core financial calculation for one farmer.
 *
 * When called with a `month`-based range, the previous-month debt is
 * automatically looked up. When called with a custom date range, the
 * "previous period" is the same span length ending just before `start`.
 *
 * ```
 * milk_earnings   = SUM(liters × price_per_liter)   [start → end]
 * products_taken  = SUM(total_amount of purchases)   [start → end]
 * previous_debt   = MAX(0, deficit of previous period)
 * final_payment   = milk_earnings - products_taken - previous_debt  (if ≥ 0)
 * carried_debt    = MAX(0, deficit)  → rolls into next period
 * ```
 */
async function computeFinancials(
    farmerId: number,
    collectionId: number,
    start: Date,
    end: Date
) {
    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    const [milkEarnings, productsTaken, prevMilkEarnings, prevProductsTaken, deadMilkLiters] =
        await Promise.all([
            calcMilkEarnings(farmerId, collectionId, start, end),
            calcPurchasesTotal(farmerId, collectionId, start, end),
            calcMilkEarnings(farmerId, collectionId, prevStart, prevEnd),
            calcPurchasesTotal(farmerId, collectionId, prevStart, prevEnd),
            calcDeadMilkLiters(farmerId, collectionId, start, end),  // 👈 new
        ]);

    const prevNet = prevMilkEarnings - prevProductsTaken;
    const previousDebt = parseFloat(Math.max(0, -prevNet).toFixed(2));
    const net = parseFloat((milkEarnings - productsTaken - previousDebt).toFixed(2));

    return {
        milk_earnings: milkEarnings,
        products_taken: productsTaken,
        previous_debt: previousDebt,
        final_payment: net >= 0 ? net : 0,
        carried_debt: net < 0 ? parseFloat(Math.abs(net).toFixed(2)) : 0,
        dead_milk_liters: deadMilkLiters,  // 👈 new
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /farmers/:id/financial-summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Monthly (or custom range) financial summary for a single farmer.
 *
 * @example
 * GET /farmers/3/financial-summary?month=2026-06
 * GET /farmers/3/financial-summary?startDate=2026-06-01&endDate=2026-06-30
 * GET /farmers/3/financial-summary?startDate=2026-06-01&endDate=2026-06-15
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

        const { start, end, label } = resolveDateRange(req.query);

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
            throw new AppError(ERROR_CODES.NOT_FOUND, `Farmer with ID ${farmerId} not found.`);
        }

        const summary = await computeFinancials(farmerId, loggedInUserId, start, end);

        return ApiResponse.ok(
            res,
            {
                farmer_id: farmerId,
                farmer_name: farmerRows[0].farmer_name,
                period: label,
                start_date: toDateStr(start),
                end_date: toDateStr(end),
                ...summary,
            },
            "Financial summary retrieved successfully."
        );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/settlements
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Center-wide settlement report.
 * Supports ?month=YYYY-MM or ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD.
 *
 * @example
 * GET /reports/settlements?month=2026-06
 * GET /reports/settlements?startDate=2026-06-01&endDate=2026-06-30
 * GET /reports/settlements?startDate=2026-06-01&endDate=2026-06-15
 */
export const getSettlementReport = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User ID not found in token payload.");
        }

        const { start, end, label } = resolveDateRange(req.query);

        const farmers = await db
            .select({ id: farmersTable.id, farmer_name: farmersTable.farmer_name })
            .from(farmersTable)
            .where(eq(farmersTable.collection_center_id, loggedInUserId));

        const results = await Promise.all(
            farmers.map(async (farmer) => ({
                farmer_id: farmer.id,
                farmer_name: farmer.farmer_name,
                ...(await computeFinancials(farmer.id, loggedInUserId, start, end)),
            }))
        );

        const totals = results.reduce(
            (acc, r) => {
                acc.milk_revenue += r.milk_earnings;
                acc.product_deductions += r.products_taken;
                acc.previous_debt += r.previous_debt;
                acc.final_payments += r.final_payment;
                acc.carried_debts += r.carried_debt;
                acc.dead_milk_liters += r.dead_milk_liters;  // 👈 new
                if (r.carried_debt > 0) acc.farmers_in_debt += 1;
                return acc;
            },
            {
                milk_revenue: 0, product_deductions: 0, previous_debt: 0,
                final_payments: 0, carried_debts: 0, farmers_in_debt: 0,
                dead_milk_liters: 0,  // 👈 new
            }
        );

        return ApiResponse.ok(
            res,
            {
                period: label,
                start_date: toDateStr(start),
                end_date: toDateStr(end),
                milk_revenue: parseFloat(totals.milk_revenue.toFixed(2)),
                product_deductions: parseFloat(totals.product_deductions.toFixed(2)),
                previous_debt: parseFloat(totals.previous_debt.toFixed(2)),
                final_payments: parseFloat(totals.final_payments.toFixed(2)),
                carried_debts: parseFloat(totals.carried_debts.toFixed(2)),
                dead_milk_liters: parseFloat(totals.dead_milk_liters.toFixed(2)),  // 👈 new
                total_farmers: farmers.length,
                farmers_in_debt: totals.farmers_in_debt,
                per_farmer_report: results.map(r => ({           // 👈 per-farmer breakdown
                    farmer_id: r.farmer_id,
                    farmer_name: r.farmer_name,
                    milk_earnings: r.milk_earnings,
                    products_taken: r.products_taken,
                    previous_debt: r.previous_debt,
                    final_payment: r.final_payment,
                    carried_debt: r.carried_debt,
                    dead_milk_liters: r.dead_milk_liters,
                })),
            },
            "Settlement report generated successfully."
        );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/product-deductions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Itemised product deductions report.
 * Supports ?month=YYYY-MM or ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD.
 *
 * @example
 * GET /reports/product-deductions?month=2026-06
 * GET /reports/product-deductions?startDate=2026-06-01&endDate=2026-06-30
 * GET /reports/product-deductions?startDate=2026-06-01&endDate=2026-06-15
 */
export const getProductDeductionsReport = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User ID not found in token payload.");
        }

        const { start, end, label } = resolveDateRange(req.query);

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
            .innerJoin(farmersTable, eq(farmerPurchasesTable.farmer_id, farmersTable.id))
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

        const totalDeductions = parseFloat(
            data.reduce((acc, r) => acc + r.total_amount, 0).toFixed(2)
        );

        return ApiResponse.ok(
            res,
            {
                period: label,
                start_date: toDateStr(start),
                end_date: toDateStr(end),
                records: data,
                totalDeductions,
            },
            "Product deductions report retrieved successfully."
        );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /farmers/debts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All farmers with outstanding debt for the given period.
 * Supports ?month=YYYY-MM or ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD.
 *
 * @example
 * GET /farmers/debts?month=2026-06
 * GET /farmers/debts?startDate=2026-06-01&endDate=2026-06-30
 */
export const getFarmersWithDebt = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User ID not found in token payload.");
        }

        const { start, end, label } = resolveDateRange(req.query);

        const farmers = await db
            .select({
                id: farmersTable.id,
                farmer_name: farmersTable.farmer_name,
                phone_number: farmersTable.phone_number,
            })
            .from(farmersTable)
            .where(eq(farmersTable.collection_center_id, loggedInUserId));

        const results = await Promise.all(
            farmers.map(async (farmer) => ({
                farmer_id: farmer.id,
                farmer_name: farmer.farmer_name,
                phone_number: farmer.phone_number,
                ...(await computeFinancials(farmer.id, loggedInUserId, start, end)),
            }))
        );

        const inDebt = results
            .filter((r) => r.carried_debt > 0)
            .map(({ farmer_id, farmer_name, phone_number, milk_earnings, products_taken, previous_debt, carried_debt }) => ({
                farmer_id, farmer_name, phone_number,
                milk_earnings, products_taken, previous_debt, carried_debt,
            }))
            .sort((a, b) => b.carried_debt - a.carried_debt);

        return ApiResponse.ok(
            res,
            {
                period: label,
                start_date: toDateStr(start),
                end_date: toDateStr(end),
                farmers_with_debt: inDebt.length,
                farmers: inDebt,
            },
            "Farmers with debt retrieved successfully."
        );
    }
);