import type { Response } from "express";
import { eq, and, gte, lte, desc, asc, count, sum } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { farmersTable } from "../db/schemas/farmer.schema.js";
import {
  insertMilkRecordSchema,
  milkRecordsTable,
} from "../db/schemas/milk-record.schema.js";

import { AppError } from "../utils/error-utils/AppError.js";
import { getFirstZodErrorMessage } from "../utils/error-utils/error-helpers.js";
import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/syncHandler.js";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { sendScheduledSms } from "../services/sms.service.js";

/**
 * Record a milk delivery for a farmer.
 *
 * @param {AuthenticatedRequest} req - Express request object containing `user` populated by auth middleware.
 * @param {Response} res - Express response object.
 *
 * @throws {AppError} UNAUTHORIZED - If the logged-in user ID is missing from token.
 * @throws {AppError} VALIDATION_ERROR - If request body fails validation.
 * @throws {AppError} RESOURCE_CONFLICT - If farmer has already delivered milk today.
 * @throws {AppError} NOT_FOUND - If the farmer does not exist or does not belong to the collection center.
 * @throws {AppError} INTERNAL_ERROR - If the milk record fails to be inserted.
 *
 * @returns {object} The newly created milk record including farmer info.
 *
 * This function runs inside a transaction to ensure atomicity of insertion and retrieval.
 */
export const recordMilkDelivery = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // 1. Get logged-in user ID from middleware
    const loggedInUserId = req.user?.userId;
    if (!loggedInUserId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token payload."
      );
    }

    // 2. Validate request body
    const validationResult = insertMilkRecordSchema.safeParse(req.body);
    if (!validationResult.success) {
      const formattedFirstZodError = getFirstZodErrorMessage(
        validationResult.error
      );

      throw new AppError(ERROR_CODES.VALIDATION_ERROR, formattedFirstZodError);
    }

    const { farmer_id, liters, price_per_liter } = validationResult.data;
    const responseObject = await db.transaction(async (trx) => {
      // Verify farmer exists and belongs to this collection center
      const farmerCheck = await trx
        .select({ id: farmersTable.id })
        .from(farmersTable)
        .where(
          and(
            eq(farmersTable.id, farmer_id),
            eq(farmersTable.collection_center_id, loggedInUserId)
          )
        )
        .limit(1);

      if (farmerCheck.length === 0) {
        throw new AppError(
          ERROR_CODES.NOT_FOUND,
          `Farmer with ID ${farmer_id} not found or does not belong to this collection center.`
        );
      }

      // Check if farmer has already delivered today
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const todayDeliveryCheck = await trx
        .select({ id: milkRecordsTable.id })
        .from(milkRecordsTable)
        .where(
          and(
            eq(milkRecordsTable.farmer_id, farmer_id),
            gte(milkRecordsTable.recordedAt, todayStart),
            lte(milkRecordsTable.recordedAt, todayEnd)
          )
        )
        .limit(1);

      if (todayDeliveryCheck.length > 0) {
        throw new AppError(
          ERROR_CODES.RESOURCE_CONFLICT,
          `Farmer with ID ${farmer_id} has already delivered milk today.`
        );
      }

      // Insert milk record
      const newRecords = await trx
        .insert(milkRecordsTable)
        .values({
          farmer_id,
          price_per_liter: price_per_liter.toString(),
          liters: liters.toString(),
          recorded_by_collection_id: loggedInUserId,
        })
        .returning({ id: milkRecordsTable.id });

      if (newRecords.length === 0) {
        throw new AppError(
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to record milk delivery."
        );
      }

      // Fetch inserted record with farmer info
      const record = await trx.query.milkRecordsTable.findFirst({
        where: eq(milkRecordsTable.id, newRecords[0].id),
        columns: {
          id: true,
          farmer_id: true,
          price_per_liter: true,
          liters: true,
          recordedAt: true,
        },
        with: {
          farmer: {
            columns: {
              farmer_name: true,
              phone_number: true,
            },
          },
        },
      });

      if (!record) {
        throw new AppError(
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to retrieve milk record after insertion."
        );
      }

      return {
        ...record,
        price_per_liter: parseFloat(record.price_per_liter),
        liters: parseFloat(record.liters),
      };
    });

    if (!responseObject) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to send notification of  the recorded milk delivery."
      );
    }

    const farmerPhoneNumber = responseObject.farmer.phone_number;
    const litersRecord = responseObject.liters;
    const recordedAt = responseObject.recordedAt.toDateString();

    //send SMS
    sendScheduledSms({
      content: `${litersRecord} has been recorded, Today ${recordedAt}`,
      to: farmerPhoneNumber,
    });

    return ApiResponse.created(
      res,
      responseObject,
      "Milk recorded successfully."
    );
  }
);

/**
 * Zod schema for validating query parameters when retrieving milk records.
 *
 * @property {number} [farmerId] - Optional ID of a farmer to filter records.
 * @property {string} [startDate] - Optional start date (ISO 8601 format) to filter records from.
 * @property {string} [endDate] - Optional end date (ISO 8601 format) to filter records until.
 * @property {number} [page=1] - Page number for pagination (must be a positive integer).
 * @property {number} [limit=10] - Number of records per page (maximum 100).
 * @property {'recordedAt'|'liters'|'farmerName'} [sortBy='recordedAt'] - Field to sort results by.
 * @property {'asc'|'desc'} [sortOrder='desc'] - Sort direction (ascending or descending).
 *
 * @description
 * Ensures query parameters for listing milk records are valid.
 * It also validates that the `endDate` is not earlier than the `startDate`.
 *
 * @example
 * // Valid query:
 * {
 *   farmerId: 12,
 *   startDate: "2025-10-01",
 *   endDate: "2025-10-26",
 *   page: 1,
 *   limit: 15,
 *   sortBy: "liters",
 *   sortOrder: "asc"
 * }
 */
const listMilkRecordsQuerySchema = z
  .object({
    farmerId: z.coerce.number().int().positive().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(15),
    sortBy: z
      .enum(["recordedAt", "liters", "farmerName"])
      .optional()
      .default("recordedAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date cannot be before start date.",
      path: ["endDate"],
    }
  );


/**
* Retrieves all milk records associated with the authenticated collection center user.
*
* Supports optional filtering by farmer, date range, pagination, and sorting.
* If no date filters are provided, defaults to today's records.
* If only startDate is provided, endDate is set to end of that day.
* If only endDate is provided, startDate is set to beginning of that day.
*
* @async
* @function getMilkRecordsForUser
* @param {AuthenticatedRequest} req - Express request object, containing the authenticated user's ID and query parameters.
* @param {Response} res - Express response object used to send the paginated list of milk records.
* @throws {AppError} Throws an UNAUTHORIZED error if the user is not authenticated.
* @throws {AppError} Throws a VALIDATION_ERROR if query parameters fail validation.
* @returns {Promise<void>} Sends a paginated list of milk records with metadata and summary statistics.
*
* @example
* // Example request with all parameters:
* GET /api/milk-record?farmerId=5&startDate=2025-10-01&endDate=2025-10-26&page=1&limit=10&sortBy=liters&sortOrder=asc
*
* // Example request with no date filters (defaults to today):
* GET /api/milk-record?page=1&limit=10
*
* // Example response:
* {
*   "success": true,
*   "data": [
*     {
*       "recordId": 14,
*       "liters": 25,
*       "price_per_liter": 25,
*       "recordedAt": "2025-10-26T21:19:17.771Z",
*       "farmer": {
*         "id": 1,
*         "name": "Jean Bosco Nkurunziza",
*         "phoneNumber": "0788123456"
*       }
*     }
*   ],
*   "meta": {
*     "currentPage": 1,
*     "totalPages": 3,
*     "limit": 10,
*     "total": 25,
*     "timestamp": "2025-10-26T21:19:17.813Z"
*   },
*   "message": "Milk records retrieved successfully.",
*   "summary": {
*     "returnedRecordTotalLiters": 250
*   }
* }
*/
export const getMilkRecordsForUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const loggedInUserId = req.user?.userId;
    if (!loggedInUserId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token payload."
      );
    }

    const queryValidation = listMilkRecordsQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      const formattedFirstZodError = getFirstZodErrorMessage(
        queryValidation.error
      );
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, formattedFirstZodError);
    }

    const { farmerId, startDate, endDate, page, limit, sortBy, sortOrder } =
      queryValidation.data;

    // Default to today if no date filters provided
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Ensure dates are always defined
    let finalStartDate: Date;
    let finalEndDate: Date;

    if (!startDate && !endDate) {
      finalStartDate = todayStart;
      finalEndDate = todayEnd;
    } else if (startDate && !endDate) {
      finalStartDate = startDate;
      finalEndDate = new Date(startDate);
      finalEndDate.setHours(23, 59, 59, 999);
    } else if (!startDate && endDate) {
      finalStartDate = new Date(endDate);
      finalStartDate.setHours(0, 0, 0, 0);
      finalEndDate = endDate;
    } else {
      finalStartDate = startDate!;
      finalEndDate = new Date(endDate!);
      finalEndDate.setHours(23, 59, 59, 999);
    }

    const offset = (page - 1) * limit;

    const sortColumn = {
      recordedAt: milkRecordsTable.recordedAt,
      liters: milkRecordsTable.liters,
      farmerName: farmersTable.farmer_name,
    }[sortBy];

    const sortDirection = sortOrder === "asc" ? asc : desc;

    const conditions = [
      eq(milkRecordsTable.recorded_by_collection_id, loggedInUserId),
      gte(milkRecordsTable.recordedAt, finalStartDate),
      lte(milkRecordsTable.recordedAt, finalEndDate),
    ];

    if (farmerId) {
      conditions.push(eq(milkRecordsTable.farmer_id, farmerId));
    }

    const [records, statsResult] = await Promise.all([
      db
        .select({
          recordId: milkRecordsTable.id,
          liters: milkRecordsTable.liters,
          price_per_liter: milkRecordsTable.price_per_liter,
          recordedAt: milkRecordsTable.recordedAt,
          farmer: {
            id: farmersTable.id,
            name: farmersTable.farmer_name,
            phoneNumber: farmersTable.phone_number,
          },
        })
        .from(milkRecordsTable)
        .innerJoin(farmersTable, eq(milkRecordsTable.farmer_id, farmersTable.id))
        .where(and(...conditions))
        .orderBy(sortDirection(sortColumn))
        .limit(limit)
        .offset(offset),

      db
        .select({
          totalCount: count(),
          totalLiters: sum(milkRecordsTable.liters),
        })
        .from(milkRecordsTable)
        .where(and(...conditions)),
    ]);

    const formattedRecords = records.map((record) => ({
      ...record,
      liters: parseFloat(record.liters),
      price_per_liter: parseFloat(record.price_per_liter),
    }));

    const currentPageTotalLiters = formattedRecords.reduce(
      (sum, record) => sum + record.liters,
      0
    );

    const totalRecords = statsResult[0]?.totalCount ?? 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return ApiResponse.paginated(
      res,
      formattedRecords,
      {
        currentPage: page,
        totalPages: totalPages,
        limit: limit,
        total: totalRecords,
      },
      "Milk records retrieved successfully.",
      {
        summary: {
          returnedRecordTotalLiters: currentPageTotalLiters,
        },
      }
    );
  }
);







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


export const getFarmerMilkRecordHistory = asyncHandler(
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


    const records = await db.query.milkRecordsTable.findMany({
      columns: {
        id: true,
        liters: true,
        price_per_liter: true,
        recordedAt: true,
      },
      where: eq(milkRecordsTable.farmer_id, foundFarmers[0].id),
      orderBy: [desc(milkRecordsTable.recordedAt)],
    });


    const formattedRecords = records.map((record) => ({
      ...record,
      liters: parseFloat(record.liters),
      price_per_liter: parseFloat(record.price_per_liter),
    }));

    const totalLiters = formattedRecords.reduce((acc, r) => acc + r.liters, 0);

    const responseData = {
      records: formattedRecords,
      totalLitersDeliveredByFarmer: totalLiters,
    };

    return ApiResponse.ok(
      res,
      responseData,
      "Milk records retrieved successfully.",
    );

  }
);    
