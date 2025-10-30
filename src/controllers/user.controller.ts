import type { Response } from "express";

import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { users } from "../db/schemas/user.schema.js";

import { AppError } from "../utils/error-utils/AppError.js";
import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/syncHandler.js";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware";

/**
 * Retrieves the profile of the authenticated user.
 *
 * This function expects that the request has already been authenticated
 * and contains the user's ID in `req.user.userId`. It fetches the user's
 * data from the database including `id`, `username`, `email`,
 * `collection_name`, and `createdAt`. If the user is not found or
 * authentication information is missing, an error is thrown.
 *
 * @param {AuthenticatedRequest} req - The authenticated request object containing `user.userId`.
 * @param {Response} res - The Express response object used to send back the user profile.
 * @throws {AppError} Throws `UNAUTHORIZED` if `userId` is missing in the token.
 * @throws {AppError} Throws `NOT_FOUND` if no user profile is found for the given `userId`.
 * @returns {Promise<void>} Sends a JSON response with the user's profile data.
 */
export const getProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token payload."
      );
    }

    const userProfile = await db
      .select({
        id: users.id,
        username: users.username,
        location: users.location,
        phone_number: users.phone_number,
        email: users.email,
        collection_name: users.collection_name,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userProfile.length === 0) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "User profile not found.");
    }

    return ApiResponse.ok(res, userProfile[0]);
  }
);
