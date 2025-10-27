import type { Response } from "express";
import { eq, and } from "drizzle-orm";

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

/**
 * Record a milk delivery for a farmer.
 *
 * @param {AuthenticatedRequest} req - Express request object containing `user` populated by auth middleware.
 * @param {Response} res - Express response object.
 *
 * @throws {AppError} UNAUTHORIZED - If the logged-in user ID is missing from token.
 * @throws {AppError} VALIDATION_ERROR - If request body fails validation.
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

    const { farmer_id, liters } = validationResult.data;
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

      // Insert milk record
      const newRecords = await trx
        .insert(milkRecordsTable)
        .values({
          farmer_id,
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

      return record;
    });

    return ApiResponse.created(
      res,
      responseObject,
      "Milk recorded successfully."
    );
  }
);
