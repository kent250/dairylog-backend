import type { Response } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { farmersTable } from "../db/schemas/farmer.schema.js";
import {
    farmerPurchasesTable,
    insertFarmerPurchaseSchema,
    updateFarmerPurchaseSchema,
} from "../db/schemas/farmer-purchase.schema.js";

import { AppError } from "../utils/error-utils/AppError.js";
import { getFirstZodErrorMessage } from "../utils/error-utils/error-helpers.js";
import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/syncHandler.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { sendScheduledSms } from "../services/sms.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Parse and format a raw DB purchase row into clean numbers. */
function formatPurchase(p: {
    id: number;
    farmer_id: number;
    product_name: string;
    quantity: string;
    unit: string;
    unit_price: string;
    total_amount: string;
    purchase_date: string;
    notes: string | null;
    createdAt: Date;
}) {
    return {
        id: p.id,
        farmer_id: p.farmer_id,
        product_name: p.product_name,
        quantity: parseFloat(p.quantity),
        unit: p.unit,
        unit_price: parseFloat(p.unit_price),
        total_amount: parseFloat(p.total_amount),
        purchase_date: p.purchase_date,
        notes: p.notes ?? null,
        createdAt: p.createdAt,
    };
}

/** Verify a farmer exists and belongs to this collection center. */
async function resolveFarmer(
    farmerId: number,
    collectionCenterId: number
): Promise<{ id: number; farmer_name: string; phone_number: string }> {
    const rows = await db
        .select({
            id: farmersTable.id,
            farmer_name: farmersTable.farmer_name,
            phone_number: farmersTable.phone_number,
        })
        .from(farmersTable)
        .where(
            and(
                eq(farmersTable.id, farmerId),
                eq(farmersTable.collection_center_id, collectionCenterId)
            )
        )
        .limit(1);

    if (rows.length === 0) {
        throw new AppError(
            ERROR_CODES.NOT_FOUND,
            `Farmer with ID ${farmerId} not found or does not belong to this collection center.`
        );
    }
    return rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /farmer-purchases
// Create a new purchase record
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new farmer purchase record (product taken on credit).
 *
 * `total_amount` is computed automatically as `quantity × unit_price`.
 *
 * @throws {AppError} UNAUTHORIZED    - Missing user ID in token.
 * @throws {AppError} VALIDATION_ERROR - Invalid request body.
 * @throws {AppError} NOT_FOUND       - Farmer not found / not in this center.
 * @throws {AppError} INTERNAL_ERROR  - DB insert failed.
 */
export const createPurchase = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User ID not found in token payload.");
        }

        const validation = insertFarmerPurchaseSchema.safeParse(req.body);
        if (!validation.success) {
            throw new AppError(
                ERROR_CODES.VALIDATION_ERROR,
                getFirstZodErrorMessage(validation.error)
            );
        }

        const { farmer_id, product_name, quantity, unit, unit_price, purchase_date, notes } =
            validation.data;

        const farmer = await resolveFarmer(farmer_id, loggedInUserId);

        const total_amount = parseFloat((quantity * unit_price).toFixed(2));

        const inserted = await db
            .insert(farmerPurchasesTable)
            .values({
                farmer_id,
                recorded_by_collection_id: loggedInUserId,
                product_name,
                quantity: quantity.toString(),
                unit,
                unit_price: unit_price.toString(),
                total_amount: total_amount.toString(),
                purchase_date,
                notes: notes ?? null,
            })
            .returning({
                id: farmerPurchasesTable.id,
                farmer_id: farmerPurchasesTable.farmer_id,
                product_name: farmerPurchasesTable.product_name,
                quantity: farmerPurchasesTable.quantity,
                unit: farmerPurchasesTable.unit,
                unit_price: farmerPurchasesTable.unit_price,
                total_amount: farmerPurchasesTable.total_amount,
                purchase_date: farmerPurchasesTable.purchase_date,
                notes: farmerPurchasesTable.notes,
                createdAt: farmerPurchasesTable.createdAt,
            });

        if (inserted.length === 0) {
            throw new AppError(ERROR_CODES.INTERNAL_ERROR, "Failed to create purchase record.");
        }

        const firstName = farmer.farmer_name.split(" ")[0];
        sendScheduledSms({
            content: `Hello ${firstName}, ${quantity} ${unit} of ${product_name} worth ${total_amount} RWF has been purchased today on ${inserted[0].purchase_date}.`,
            to: farmer.phone_number,
        });

        return ApiResponse.created(
            res,
            {
                ...formatPurchase(inserted[0]),
                farmer_name: farmer.farmer_name,
            },
            "Purchase recorded successfully."
        );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /farmer-purchases
// List all purchases for this collection center (with farmer name)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all purchase records belonging to the authenticated collection center,
 * joined with farmer name.
 */
export const getAllPurchases = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User ID not found in token payload.");
        }

        const rows = await db
            .select({
                id: farmerPurchasesTable.id,
                farmer_id: farmerPurchasesTable.farmer_id,
                farmer_name: farmersTable.farmer_name,
                product_name: farmerPurchasesTable.product_name,
                quantity: farmerPurchasesTable.quantity,
                unit: farmerPurchasesTable.unit,
                unit_price: farmerPurchasesTable.unit_price,
                total_amount: farmerPurchasesTable.total_amount,
                purchase_date: farmerPurchasesTable.purchase_date,
                notes: farmerPurchasesTable.notes,
                createdAt: farmerPurchasesTable.createdAt,
            })
            .from(farmerPurchasesTable)
            .innerJoin(farmersTable, eq(farmerPurchasesTable.farmer_id, farmersTable.id))
            .where(eq(farmerPurchasesTable.recorded_by_collection_id, loggedInUserId))
            .orderBy(desc(farmerPurchasesTable.purchase_date));

        const data = rows.map((r) => ({
            ...formatPurchase(r),
            farmer_name: r.farmer_name,
        }));

        return ApiResponse.ok(res, data, "Purchases retrieved successfully.");
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /farmer-purchases/:id
// Get a single purchase by ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves a single purchase record by ID, scoped to the authenticated center.
 *
 * @throws {AppError} NOT_FOUND - If no purchase matches the ID for this center.
 */
export const getPurchaseById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User ID not found in token payload.");
        }

        const purchaseId = parseInt(req.params.id, 10);
        if (isNaN(purchaseId)) {
            throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid purchase ID.");
        }

        const rows = await db
            .select({
                id: farmerPurchasesTable.id,
                farmer_id: farmerPurchasesTable.farmer_id,
                farmer_name: farmersTable.farmer_name,
                product_name: farmerPurchasesTable.product_name,
                quantity: farmerPurchasesTable.quantity,
                unit: farmerPurchasesTable.unit,
                unit_price: farmerPurchasesTable.unit_price,
                total_amount: farmerPurchasesTable.total_amount,
                purchase_date: farmerPurchasesTable.purchase_date,
                notes: farmerPurchasesTable.notes,
                createdAt: farmerPurchasesTable.createdAt,
            })
            .from(farmerPurchasesTable)
            .innerJoin(farmersTable, eq(farmerPurchasesTable.farmer_id, farmersTable.id))
            .where(
                and(
                    eq(farmerPurchasesTable.id, purchaseId),
                    eq(farmerPurchasesTable.recorded_by_collection_id, loggedInUserId)
                )
            )
            .limit(1);

        if (rows.length === 0) {
            throw new AppError(ERROR_CODES.NOT_FOUND, `Purchase with ID ${purchaseId} not found.`);
        }

        return ApiResponse.ok(
            res,
            { ...formatPurchase(rows[0]), farmer_name: rows[0].farmer_name },
            "Purchase retrieved successfully."
        );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /farmer-purchases/:id
// Update a purchase record
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates an existing purchase record. `farmer_id` cannot be changed.
 * If `quantity` or `unit_price` changes, `total_amount` is recomputed automatically.
 *
 * @throws {AppError} VALIDATION_ERROR - Invalid body or ID.
 * @throws {AppError} NOT_FOUND        - Purchase not found for this center.
 */
export const updatePurchase = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User ID not found in token payload.");
        }

        const purchaseId = parseInt(req.params.id, 10);
        if (isNaN(purchaseId)) {
            throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid purchase ID.");
        }

        const validation = updateFarmerPurchaseSchema.safeParse(req.body);
        if (!validation.success) {
            throw new AppError(
                ERROR_CODES.VALIDATION_ERROR,
                getFirstZodErrorMessage(validation.error)
            );
        }

        // Fetch existing record first to have current values for recomputing total
        const existing = await db
            .select({
                id: farmerPurchasesTable.id,
                quantity: farmerPurchasesTable.quantity,
                unit_price: farmerPurchasesTable.unit_price,
            })
            .from(farmerPurchasesTable)
            .where(
                and(
                    eq(farmerPurchasesTable.id, purchaseId),
                    eq(farmerPurchasesTable.recorded_by_collection_id, loggedInUserId)
                )
            )
            .limit(1);

        if (existing.length === 0) {
            throw new AppError(ERROR_CODES.NOT_FOUND, `Purchase with ID ${purchaseId} not found.`);
        }

        const { quantity, unit_price, product_name, unit, purchase_date, notes } =
            validation.data;

        // Use incoming values if provided, otherwise fall back to stored values
        const newQuantity = quantity ?? parseFloat(existing[0].quantity);
        const newUnitPrice = unit_price ?? parseFloat(existing[0].unit_price);
        const newTotalAmount = parseFloat((newQuantity * newUnitPrice).toFixed(2));

        const updatePayload: Partial<typeof farmerPurchasesTable.$inferInsert> = {
            total_amount: newTotalAmount.toString(),
            updatedAt: new Date(),
        };

        if (quantity !== undefined) updatePayload.quantity = quantity.toString();
        if (unit_price !== undefined) updatePayload.unit_price = unit_price.toString();
        if (product_name !== undefined) updatePayload.product_name = product_name;
        if (unit !== undefined) updatePayload.unit = unit;
        if (purchase_date !== undefined) updatePayload.purchase_date = purchase_date;
        if (notes !== undefined) updatePayload.notes = notes;

        const updated = await db
            .update(farmerPurchasesTable)
            .set(updatePayload)
            .where(
                and(
                    eq(farmerPurchasesTable.id, purchaseId),
                    eq(farmerPurchasesTable.recorded_by_collection_id, loggedInUserId)
                )
            )
            .returning({
                id: farmerPurchasesTable.id,
                farmer_id: farmerPurchasesTable.farmer_id,
                product_name: farmerPurchasesTable.product_name,
                quantity: farmerPurchasesTable.quantity,
                unit: farmerPurchasesTable.unit,
                unit_price: farmerPurchasesTable.unit_price,
                total_amount: farmerPurchasesTable.total_amount,
                purchase_date: farmerPurchasesTable.purchase_date,
                notes: farmerPurchasesTable.notes,
                createdAt: farmerPurchasesTable.createdAt,
            });

        return ApiResponse.ok(res, formatPurchase(updated[0]), "Purchase updated successfully.");
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /farmers/:id/purchases
// Purchase history for one farmer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all purchases for a specific farmer (by farmer ID in URL param),
 * scoped to the authenticated collection center.
 *
 * Optionally filter by `?month=YYYY-MM`.
 *
 * @throws {AppError} NOT_FOUND - Farmer not found.
 */
export const getFarmerPurchaseHistory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User ID not found in token payload.");
        }

        const farmerId = parseInt(req.params.id, 10);
        if (isNaN(farmerId)) {
            throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid farmer ID.");
        }

        // Optional month filter
        const monthParam = req.query.month as string | undefined;
        let dateFilter: { start: Date; end: Date } | null = null;
        if (monthParam) {
            const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
            if (!monthRegex.test(monthParam)) {
                throw new AppError(
                    ERROR_CODES.VALIDATION_ERROR,
                    'month must be in YYYY-MM format (e.g. "2025-10").'
                );
            }
            const [y, m] = monthParam.split("-").map(Number);
            dateFilter = {
                start: new Date(Date.UTC(y, m - 1, 1)),
                end: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
            };
        }

        await resolveFarmer(farmerId, loggedInUserId);

        const conditions = [
            eq(farmerPurchasesTable.farmer_id, farmerId),
            eq(farmerPurchasesTable.recorded_by_collection_id, loggedInUserId),
        ];

        if (dateFilter) {
            conditions.push(gte(farmerPurchasesTable.createdAt, dateFilter.start));
            conditions.push(lte(farmerPurchasesTable.createdAt, dateFilter.end));
        }

        const rows = await db
            .select({
                id: farmerPurchasesTable.id,
                farmer_id: farmerPurchasesTable.farmer_id,
                product_name: farmerPurchasesTable.product_name,
                quantity: farmerPurchasesTable.quantity,
                unit: farmerPurchasesTable.unit,
                unit_price: farmerPurchasesTable.unit_price,
                total_amount: farmerPurchasesTable.total_amount,
                purchase_date: farmerPurchasesTable.purchase_date,
                notes: farmerPurchasesTable.notes,
                createdAt: farmerPurchasesTable.createdAt,
            })
            .from(farmerPurchasesTable)
            .where(and(...conditions))
            .orderBy(desc(farmerPurchasesTable.purchase_date));

        const formattedRows = rows.map(formatPurchase);

        const totalPurchasesAmount = parseFloat(
            formattedRows.reduce((acc, r) => acc + r.total_amount, 0).toFixed(2)
        );

        return ApiResponse.ok(
            res,
            { purchases: formattedRows, totalPurchasesAmount },
            "Farmer purchase history retrieved successfully."
        );
    }
);