import type { Response } from "express";
import { eq, and, gte, lte, desc, or, ilike } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { farmersTable } from "../db/schemas/farmer.schema.js";
import {
    deadMilkRecordsTable,
    insertDeadMilkRecordSchema,
} from "../db/schemas/dead-milk-record.schema.js";

import { AppError } from "../utils/error-utils/AppError.js";
import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/syncHandler.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a raw dead milk record row into clean types.
 */
function formatRecord(r: {
    id: number;
    farmer_id: number;
    liters: string;
    reason: string;
    notes: string | null;
    recordedAt: string;
    createdAt: Date;
}) {
    return {
        id: r.id,
        farmer_id: r.farmer_id,
        liters: parseFloat(r.liters),
        reason: r.reason,
        notes: r.notes ?? null,
        recordedAt: r.recordedAt,
        createdAt: r.createdAt,
    };
}

/**
 * Resolve a farmer from the DB using ONE of: farmerId, farmerPhone, farmerName.
 * Priority: farmerId > farmerPhone > farmerName
 * Scoped to the authenticated collection center.
 */
async function resolveFarmer(
    collectionCenterId: number,
    farmerId?: number,
    farmerPhone?: string,
    farmerName?: string
): Promise<{ id: number; farmer_name: string; phone_number: string }> {
    let whereClause;

    if (farmerId !== undefined) {
        // Lookup by ID — most precise
        whereClause = and(
            eq(farmersTable.collection_center_id, collectionCenterId),
            eq(farmersTable.id, farmerId)
        );
    } else if (farmerPhone !== undefined) {
        // Lookup by exact phone
        whereClause = and(
            eq(farmersTable.collection_center_id, collectionCenterId),
            eq(farmersTable.phone_number, farmerPhone)
        );
    } else if (farmerName !== undefined) {
        // Lookup by name (case-insensitive)
        whereClause = and(
            eq(farmersTable.collection_center_id, collectionCenterId),
            ilike(farmersTable.farmer_name, farmerName)
        );
    } else {
        // Should never reach here — schema refine already catches this
        throw new AppError(
            ERROR_CODES.VALIDATION_ERROR,
            "At least one of farmerId, farmerPhone, or farmerName is required."
        );
    }

    const rows = await db
        .select({
            id: farmersTable.id,
            farmer_name: farmersTable.farmer_name,
            phone_number: farmersTable.phone_number,
        })
        .from(farmersTable)
        .where(whereClause)
        .limit(1);

    if (rows.length === 0) {
        const identifier = farmerId
            ? `ID ${farmerId}`
            : farmerPhone
                ? `phone ${farmerPhone}`
                : `name "${farmerName}"`;

        throw new AppError(
            ERROR_CODES.NOT_FOUND,
            `Farmer with ${identifier} not found or does not belong to this collection center.`
        );
    }

    return rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for phone query param (GET farmer-history)
// ─────────────────────────────────────────────────────────────────────────────

const phoneQuerySchema = z.object({
    phone: z.string().min(1, { message: "phone query parameter is required." }),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /dead-milk-record
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records a dead (rejected) milk delivery for a farmer.
 *
 * The farmer can be identified by any one of: `farmerId`, `farmerPhone`,
 * or `farmerName`. If multiple are sent, priority is farmerId > farmerPhone > farmerName.
 *
 * @async
 * @function createDeadMilkRecord
 *
 * @param {AuthenticatedRequest} req - Body fields:
 *   - `farmerId`    {number}  [optional] — identify farmer by ID
 *   - `farmerPhone` {string}  [optional] — identify farmer by phone
 *   - `farmerName`  {string}  [optional] — identify farmer by name
 *   - `liters`      {number}  [required] — litres of rejected milk
 *   - `reason`      {string}  [required] — reason for rejection
 *   - `recordedAt`  {string}  [required] — date the milk was rejected (YYYY-MM-DD)
 *   - `notes`       {string}  [optional] — extra details
 * @param {Response} res
 *
 * @throws {AppError} UNAUTHORIZED    - Missing token.
 * @throws {AppError} VALIDATION_ERROR - Invalid body / missing farmer identifier.
 * @throws {AppError} NOT_FOUND       - Farmer not found in this center.
 * @throws {AppError} INTERNAL_ERROR  - DB insert failed.
 *
 * @example
 * POST /dead-milk-record
 * {
 *   "farmerPhone": "0788123456",
 *   "liters": 5,
 *   "reason": "Bad smell",
 *   "notes": "Milk was sour",
 *   "recordedAt": "2026-06-08"
 * }
 */
export const createDeadMilkRecord = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(
                ERROR_CODES.UNAUTHORIZED,
                "User ID not found in token payload."
            );
        }

        // Validate body
        const validation = insertDeadMilkRecordSchema.safeParse(req.body);
        if (!validation.success) {
            const firstIssue = validation.error.issues[0];
            throw new AppError(
                ERROR_CODES.VALIDATION_ERROR,
                firstIssue?.message ?? "Invalid request body."
            );
        }

        const {
            farmerId,
            farmerPhone,
            farmerName,
            liters,
            reason,
            notes,
            recordedAt,
        } = validation.data;

        // Resolve farmer using whichever identifier was provided
        const farmer = await resolveFarmer(
            loggedInUserId,
            farmerId,
            farmerPhone,
            farmerName
        );

        // Insert the dead milk record
        const inserted = await db
            .insert(deadMilkRecordsTable)
            .values({
                farmer_id: farmer.id,
                recorded_by_collection_id: loggedInUserId,
                liters: liters.toString(),
                reason,
                notes: notes ?? null,
                recordedAt,
            })
            .returning({
                id: deadMilkRecordsTable.id,
                farmer_id: deadMilkRecordsTable.farmer_id,
                liters: deadMilkRecordsTable.liters,
                reason: deadMilkRecordsTable.reason,
                notes: deadMilkRecordsTable.notes,
                recordedAt: deadMilkRecordsTable.recordedAt,
                createdAt: deadMilkRecordsTable.createdAt,
            });

        if (inserted.length === 0) {
            throw new AppError(
                ERROR_CODES.INTERNAL_ERROR,
                "Failed to record dead milk."
            );
        }

        return ApiResponse.created(
            res,
            {
                ...formatRecord(inserted[0]),
                farmerId: farmer.id,
                farmerName: farmer.farmer_name,
                farmerPhone: farmer.phone_number,
            },
            "Dead milk record created successfully."
        );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /dead-milk-record
// All dead milk records for this collection center
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all dead milk records for the authenticated collection center,
 * joined with farmer info. Supports optional `?month=YYYY-MM` filter.
 *
 * @example
 * GET /dead-milk-record
 * GET /dead-milk-record?month=2026-06
 *
 * Response:
 * {
 *   "data": {
 *     "records": [
 *       {
 *         "id": 1,
 *         "farmerId": 1,
 *         "farmerName": "Jean Bosco Nkurunziza",
 *         "farmerPhone": "0788123456",
 *         "liters": 5,
 *         "reason": "Bad smell",
 *         "notes": "Milk was sour",
 *         "recordedAt": "2026-06-08",
 *         "createdAt": "2026-06-08T09:00:00.000Z"
 *       }
 *     ],
 *     "totalDeadLiters": 5
 *   }
 * }
 */
export const getAllDeadMilkRecords = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(
                ERROR_CODES.UNAUTHORIZED,
                "User ID not found in token payload."
            );
        }

        // Optional month filter
        const monthParam = req.query.month as string | undefined;
        let dateStart: string | undefined;
        let dateEnd: string | undefined;

        if (monthParam) {
            const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
            if (!monthRegex.test(monthParam)) {
                throw new AppError(
                    ERROR_CODES.VALIDATION_ERROR,
                    'month must be in YYYY-MM format (e.g. "2026-06").'
                );
            }
            const [y, m] = monthParam.split("-").map(Number);
            // For date column (string comparison works with ISO format)
            dateStart = `${y}-${String(m).padStart(2, "0")}-01`;
            // Last day of month
            const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
            dateEnd = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        }

        const conditions: ReturnType<typeof and>[] = [
            eq(deadMilkRecordsTable.recorded_by_collection_id, loggedInUserId) as any,
        ];

        if (dateStart && dateEnd) {
            conditions.push(gte(deadMilkRecordsTable.recordedAt, dateStart) as any);
            conditions.push(lte(deadMilkRecordsTable.recordedAt, dateEnd) as any);
        }

        const rows = await db
            .select({
                id: deadMilkRecordsTable.id,
                farmer_id: deadMilkRecordsTable.farmer_id,
                farmer_name: farmersTable.farmer_name,
                phone_number: farmersTable.phone_number,
                liters: deadMilkRecordsTable.liters,
                reason: deadMilkRecordsTable.reason,
                notes: deadMilkRecordsTable.notes,
                recordedAt: deadMilkRecordsTable.recordedAt,
                createdAt: deadMilkRecordsTable.createdAt,
            })
            .from(deadMilkRecordsTable)
            .innerJoin(
                farmersTable,
                eq(deadMilkRecordsTable.farmer_id, farmersTable.id)
            )
            .where(and(...conditions))
            .orderBy(desc(deadMilkRecordsTable.recordedAt));

        const records = rows.map((r) => ({
            id: r.id,
            farmerId: r.farmer_id,
            farmerName: r.farmer_name,
            farmerPhone: r.phone_number,
            liters: parseFloat(r.liters),
            reason: r.reason,
            notes: r.notes ?? null,
            recordedAt: r.recordedAt,
            createdAt: r.createdAt,
        }));

        const totalDeadLiters = parseFloat(
            records.reduce((acc, r) => acc + r.liters, 0).toFixed(2)
        );

        return ApiResponse.ok(
            res,
            { records, totalDeadLiters },
            "Dead milk records retrieved successfully."
        );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /dead-milk-record/farmer-history?phone=...
// All dead milk records for one specific farmer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all dead milk records for a specific farmer (looked up by phone number),
 * scoped to the authenticated collection center.
 *
 * @example
 * GET /dead-milk-record/farmer-history?phone=0788123456
 *
 * Response:
 * {
 *   "data": {
 *     "farmer": {
 *       "id": 1,
 *       "farmerName": "Jean Bosco Nkurunziza",
 *       "farmerPhone": "0788123456"
 *     },
 *     "records": [
 *       {
 *         "id": 1,
 *         "liters": 5,
 *         "reason": "Bad smell",
 *         "notes": "Milk was sour",
 *         "recordedAt": "2026-06-08",
 *         "createdAt": "2026-06-08T09:00:00.000Z"
 *       }
 *     ],
 *     "totalDeadLiters": 5
 *   }
 * }
 */
export const getFarmerDeadMilkHistory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const loggedInUserId = req.user?.userId;
        if (!loggedInUserId) {
            throw new AppError(
                ERROR_CODES.UNAUTHORIZED,
                "User ID not found in token payload."
            );
        }

        // Validate query params
        const queryValidation = phoneQuerySchema.safeParse(req.query);
        if (!queryValidation.success) {
            throw new AppError(
                ERROR_CODES.VALIDATION_ERROR,
                queryValidation.error.issues[0]?.message ?? "Invalid query parameters."
            );
        }

        const { phone } = queryValidation.data;

        // Find farmer by phone scoped to this center
        const farmerRows = await db
            .select({
                id: farmersTable.id,
                farmer_name: farmersTable.farmer_name,
                phone_number: farmersTable.phone_number,
            })
            .from(farmersTable)
            .where(
                and(
                    eq(farmersTable.collection_center_id, loggedInUserId),
                    eq(farmersTable.phone_number, phone)
                )
            )
            .limit(1);

        if (farmerRows.length === 0) {
            throw new AppError(
                ERROR_CODES.NOT_FOUND,
                `Farmer with phone number ${phone} not found.`
            );
        }

        const farmer = farmerRows[0];

        // Get all dead milk records for this farmer
        const rows = await db
            .select({
                id: deadMilkRecordsTable.id,
                farmer_id: deadMilkRecordsTable.farmer_id,
                liters: deadMilkRecordsTable.liters,
                reason: deadMilkRecordsTable.reason,
                notes: deadMilkRecordsTable.notes,
                recordedAt: deadMilkRecordsTable.recordedAt,
                createdAt: deadMilkRecordsTable.createdAt,
            })
            .from(deadMilkRecordsTable)
            .where(
                and(
                    eq(deadMilkRecordsTable.farmer_id, farmer.id),
                    eq(deadMilkRecordsTable.recorded_by_collection_id, loggedInUserId)
                )
            )
            .orderBy(desc(deadMilkRecordsTable.recordedAt));

        const records = rows.map((r) => ({
            id: r.id,
            liters: parseFloat(r.liters),
            reason: r.reason,
            notes: r.notes ?? null,
            recordedAt: r.recordedAt,
            createdAt: r.createdAt,
        }));

        const totalDeadLiters = parseFloat(
            records.reduce((acc, r) => acc + r.liters, 0).toFixed(2)
        );

        return ApiResponse.ok(
            res,
            {
                farmer: {
                    id: farmer.id,
                    farmerName: farmer.farmer_name,
                    farmerPhone: farmer.phone_number,
                },
                records,
                totalDeadLiters,
            },
            "Farmer dead milk history retrieved successfully."
        );
    }
);