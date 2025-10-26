import type { Response } from 'express';
import { eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { type NewFarmer, insertFarmerSchema, farmersTable } from '../db/schemas/farmer.schema.js';

import { AppError } from '../utils/error-utils/AppError.js';
import { ERROR_CODES } from '../utils/error-utils/errorCodes.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/syncHandler.js';

import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';



/**
 * Creates a new farmer record for the authenticated collection center user.
 *
 * This function performs several steps:
 * 1. Extracts and validates the authenticated user's ID from the request.
 * 2. Validates the incoming request body against the `insertFarmerSchema` (Zod schema).
 * 3. Checks whether the provided phone number already exists in the database.
 * 4. Inserts the validated farmer record into the `farmersTable` and returns the created record.
 *
 * @async
 * @function createFarmer
 * @param {AuthenticatedRequest} req - The authenticated request object containing user info and farmer data.
 * @param {Response} res - The Express response object used to send back the created farmer data.
 *
 * @throws {AppError} Throws `UNAUTHORIZED` if user ID is missing in the token payload.
 * @throws {AppError} Throws `VALIDATION_ERROR` if the request body fails schema validation.
 * @throws {AppError} Throws `RESOURCE_CONFLICT` if the phone number is already registered.
 * @throws {AppError} Throws `INTERNAL_ERROR` if the insert operation fails unexpectedly.
 *
 * @returns {Promise<void>} Sends a JSON response with the created farmer record on success.
 *
 * @example
 * // Request body example
 * {
 *   "farmer_name": "John Doe",
 *   "phone_number": "0789001122",
 *   "sector": "Gitega",
 *   "cell": "Nyamirambo",
 *   "village": "Kigali"
 * }
 *
 * // Success response
 * {
 *   "success": true,
 *   "data": {
 *     "id": 4,
 *     "farmer_name": "John Doe",
 *     "phone_number": "0789001122"
 *   },
 *   "message": "Farmer created successfully.",
 *   "meta": { "timestamp": "2025-10-26T16:13:42.968Z" }
 * }
 */
export const createFarmer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {

    // 1. Get logged-in user ID from middleware
    const loggedInUserId = req.user?.userId;
    if (!loggedInUserId) {
        throw new AppError(ERROR_CODES.UNAUTHORIZED, 'User ID not found in token payload.');
    }

    // 2. Validate request body against Zod schema
    const validationResult = insertFarmerSchema.safeParse(req.body);
    if (!validationResult.success) {

        // 1. Get the first error issue from Zod's error array
        const firstError = validationResult.error.issues[0];
        const fieldName = firstError.path.join('.');
        const errorMessage = firstError.message;

        // 4. Create a clean, combined message
        const fullErrorMessage = `${fieldName}: ${errorMessage}`;

        throw new AppError(
            ERROR_CODES.VALIDATION_ERROR,
            fullErrorMessage
        );
    }
    const validatedData: NewFarmer = validationResult.data;

    // 3. Check if phone number already exists 
    const existingFarmer = await db.select({ id: farmersTable.id })
        .from(farmersTable)
        .where(eq(farmersTable.phone_number, validatedData.phone_number))
        .limit(1);

    if (existingFarmer.length > 0) {
        throw new AppError(ERROR_CODES.RESOURCE_CONFLICT, 'Phone number is already registered.');
    }

    // 4. Insert the new farmer
    const newFarmers = await db.insert(farmersTable)
        .values({

            farmer_name: validatedData.farmer_name,
            phone_number: validatedData.phone_number,

            sector: validatedData.sector,
            cell: validatedData.cell,
            village: validatedData.village,

            collection_center_id: loggedInUserId,
        })
        .returning({
            id: farmersTable.id,
            farmer_name: farmersTable.farmer_name,
            phone_number: farmersTable.phone_number,
        });

    if (newFarmers.length === 0) {
        throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Failed to create farmer record.');
    }

    return ApiResponse.created(res, newFarmers[0], 'Farmer created successfully.');
});