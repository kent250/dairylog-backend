import type { Response } from "express";
import { z } from "zod";
import { eq, or, like, ilike, asc, desc, count, and } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  type NewFarmer,
  insertFarmerSchema,
  farmersTable,
} from "../db/schemas/farmer.schema.js";

import { AppError } from "../utils/error-utils/AppError.js";
import { getFirstZodErrorMessage } from "../utils/error-utils/error-helpers.js";
import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/syncHandler.js";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { sendScheduledSms } from "../services/sms.service.js";

/**
 * Zod schema for validating query parameters when listing farmers.
 *
 * @property {string} [search] - Optional search term to filter farmers by name or phone number.
 * @property {number} [page=1] - Page number (must be a positive integer).
 * @property {number} [limit=10] - Number of farmers per page (maximum 100).
 * @property {'name'|'createdAt'|'phoneNumber'} [sortBy='createdAt'] - Field to sort results by.
 * @property {'asc'|'desc'} [sortOrder='desc'] - Sort order direction.
 */
const listFarmersQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z
    .enum(["name", "createdAt", "phoneNumber"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Zod schema for validating query parameters when looking up a farmer by phone number.
 *
 * @property {string} phone - Required phone number of the farmer to search for. Must be at least 1 character long.
 *
 */
const lookupQuerySchema = z.object({
  phone: z
    .string()
    .min(1, { message: "Phone number query parameter is required." }),
});

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
export const createFarmer = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // 1. Get logged-in user ID from middleware
    const loggedInUserId = req.user?.userId;
    if (!loggedInUserId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token payload."
      );
    }

    // 2. Validate request body against Zod schema
    const validationResult = insertFarmerSchema.safeParse(req.body);
    if (!validationResult.success) {
      const formattedFirstZodError = getFirstZodErrorMessage(
        validationResult.error
      );

      throw new AppError(ERROR_CODES.VALIDATION_ERROR, formattedFirstZodError);
    }
    const validatedData: NewFarmer = validationResult.data;

    // 3. Check if phone number already exists
    const existingFarmer = await db
      .select({ id: farmersTable.id })
      .from(farmersTable)
      .where(eq(farmersTable.phone_number, validatedData.phone_number))
      .limit(1);

    if (existingFarmer.length > 0) {
      throw new AppError(
        ERROR_CODES.RESOURCE_CONFLICT,
        "Phone number is already registered."
      );
    }

    // 4. Insert the new farmer
    const newFarmers = await db
      .insert(farmersTable)
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
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create farmer record."
      );
    }

    //send SMS
    sendScheduledSms({
      content: `Hello, ${validatedData.farmer_name}, You have been registered into ${req.user?.collection_name} as Milk Supprier`,
      to: validatedData.phone_number,
    });

    return ApiResponse.created(
      res,
      newFarmers[0],
      "Farmer created successfully."
    );
  }
);

/**
 * Retrieves a paginated list of farmers belonging to the authenticated collection center.
 *
 * The authenticated user's ID is extracted from the JWT token payload. The function supports:
 * - Searching farmers by name or phone number (case-insensitive)
 * - Pagination using `page` and `limit`
 * - Sorting by name, creation date, or phone number
 *
 * Query parameters are validated using `listFarmersQuerySchema` (Zod).
 *
 * @param {AuthenticatedRequest} req - Express request with authenticated user info and optional query parameters.
 * @param {Response} res - Express response object used to return the paginated list of farmers.
 * @throws {AppError} Throws `UNAUTHORIZED` if `userId` is missing in the token.
 * @throws {AppError} Throws `VALIDATION_ERROR` if query parameters fail validation.
 * @returns {Promise<void>} Sends a paginated JSON response with farmers data and metadata.
 */
export const getAllFarmersForUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // 1. Get logged-in user ID from middleware
    const loggedInUserId = req.user?.userId;
    if (!loggedInUserId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token payload."
      );
    }

    // 2. Validate query parameters
    const queryValidation = listFarmersQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid query parameters."
      );
    }

    const { search, page, limit, sortBy, sortOrder } = queryValidation.data;

    const offset = (page - 1) * limit;

    // 3. Map sortBy to actual table columns safely
    const sortColumn = {
      name: farmersTable.farmer_name,
      createdAt: farmersTable.createdAt,
      phoneNumber: farmersTable.phone_number,
    }[sortBy];

    const sortDirection = sortOrder === "asc" ? asc : desc;

    // 3. Build the base query conditions
    const conditions = [eq(farmersTable.collection_center_id, loggedInUserId)];
    if (search) {
      // Add search condition (case-insensitive)
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(farmersTable.farmer_name, searchTerm),
          like(farmersTable.phone_number, searchTerm) // we used 'like' because phone format is strict (rw)
        )! // Non-null assertion as 'or' can return undefined if array is empty, which isn't the case here that is why we added !
      );
    }

    // 5. Fetch paginated farmers
    const farmers = await db
      .select({
        id: farmersTable.id,
        farmer_name: farmersTable.farmer_name,
        phone_number: farmersTable.phone_number,
        sector: farmersTable.sector,
        cell: farmersTable.cell,
        village: farmersTable.village,
        createdAt: farmersTable.createdAt,
      })
      .from(farmersTable)
      .where(conditions.length > 1 ? or(...conditions.slice(1)) : conditions[0])
      .orderBy(sortDirection(sortColumn))
      .limit(limit)
      .offset(offset);

    // 6. Fetch total count for pagination metadata
    const totalResult = await db
      .select({ value: count() })
      .from(farmersTable)
      .where(
        conditions.length > 1 ? or(...conditions.slice(1)) : conditions[0]
      );

    const totalFarmers = totalResult[0]?.value ?? 0;
    const totalPages = Math.ceil(totalFarmers / limit);

    return ApiResponse.paginated(
      res,
      farmers,
      {
        currentPage: page,
        totalPages: totalPages,
        limit: limit,
        total: totalFarmers,
      },
      "Farmers retrieved successfully."
    );
  }
);

/**
 * Retrieves a farmer record by phone number for the authenticated collection center.
 *
 * This function verifies the logged-in user's ID, validates the phone number provided
 * as a query parameter, and searches the database for a matching farmer associated
 * with that collection center.
 *
 * @async
 * @function findFarmerByPhoneForUser
 * @param {AuthenticatedRequest} req - Express request object with authenticated user data.
 * @param {Response} res - Express response object.
 * @throws {AppError} 401 - If no user ID is found in the JWT payload.
 * @throws {AppError} 400 - If query parameters are invalid.
 * @throws {AppError} 404 - If no farmer is found with the provided phone number.
 * @returns {Promise<void>} Sends a JSON response with farmer details on success.
 *
 * @example
 * GET /api/farmer/lookup?phone=0788123456
 *
 */
export const findFarmerByPhoneForUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // 1. Get logged-in user ID from middleware
    const loggedInUserId = req.user?.userId;
    if (!loggedInUserId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token payload."
      );
    }

    // Validate query parameters
    const queryValidation = lookupQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid query parameters."
      );
    }

    const { phone } = queryValidation.data;

    // Query for the farmer matching the phone number AND the logged-in user's ID
    const foundFarmers = await db
      .select({
        id: farmersTable.id,
        farmer_name: farmersTable.farmer_name,
        phone_number: farmersTable.phone_number,
        sector: farmersTable.sector,
        cell: farmersTable.cell,
        village: farmersTable.village,
        createdAt: farmersTable.createdAt,
      })
      .from(farmersTable)
      .where(
        and(
          eq(farmersTable.collection_center_id, loggedInUserId),
          eq(farmersTable.phone_number, phone)
        )
      )
      .limit(1);

    if (foundFarmers.length === 0) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `Farmer with phone number ${phone} not found.`
      );
    }

    return ApiResponse.ok(res, foundFarmers[0], "Farmer found.");
  }
);
