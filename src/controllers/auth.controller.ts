import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, or, and, gt } from 'drizzle-orm';
import crypto from 'crypto';

import { db } from '../db/index.js';
import { users } from '../db/schemas/user.schema.js';
import { refreshTokensTable } from '../db/schemas/refresh-token.schema.js';

import { AppError } from '../utils/error-utils/AppError.js';
import { ERROR_CODES } from '../utils/error-utils/errorCodes.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/syncHandler.js';
import { hashData } from '../utils/auth-utils.js';

import { config } from '../config/env.js';


/**
 * Registers a new collection user.
 *
 * Validates required fields (username, email, password, and collection name),
 * ensures uniqueness across existing users, hashes the password, and saves
 * the new user record to the database. Returns the created user data on success.
 *
 * @param {Request} req - Express request object containing user registration data.
 * @param {Response} res - Express response object used to send back the result.
 * @returns {Promise<Response>} JSON response with the newly created user or an error.
 */
export const registerNewCollectionUser = asyncHandler(async (req: Request, res: Response) => {

    const {
        collection_name,
        username,
        email,
        password
    } = req.body;

    // Basic validation
    if (!username || !password || !email || !collection_name) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Username, password, email, and collection name are required')
    }

    const existingUsers = await db.select()
        .from(users)
        .where(
            or(
                eq(users.username, username),
                eq(users.email, email),
                eq(users.collection_name, collection_name)
            )
        )
        .limit(1);

    if (existingUsers.length > 0) {
        const existingUser = existingUsers[0];

        if (existingUser.username === username) {
            throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Username not availalble');
        }

        if (existingUser.email === email) {
            throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'E-mail already used');
        }

        if (existingUser.collection_name === collection_name) {
            throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Collection Name already exists');
        }
    }

    // Hash the password
    const hashedPassword = await hashData(password);

    const insertedUsers = await db.insert(users)
        .values({
            collection_name: collection_name,
            email: email,
            username: username,
            password: hashedPassword,
        })
        .returning({
            id: users.id,
            collection_name: users.collection_name,
            email: users.email,
            username: users.username,
            createdAt: users.createdAt,
        });

    if (insertedUsers.length === 0) {
        throw new AppError(ERROR_CODES.DATABASE_ERROR, 'Failed to save new user record to the database.');
    }

    const newUser = insertedUsers[0];

    return ApiResponse.ok(res, newUser, "Collection User registered successfully");

});


/**
 * Logs in an existing collection user.
 *
 * Validates the provided username and password, verifies credentials against
 * the database, and returns a signed JWT token on successful authentication.
 *
 * @param {Request} req - Express request object containing username and password.
 * @param {Response} res - Express response object used to send the authentication result.
 * @returns {Promise<Response>} JSON response with JWT token on success or an error on failure.
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Username and password are required');
    }

    const foundUsers = await db.select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

    if (foundUsers.length === 0) {
        throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid credentials');
    }

    const user = foundUsers[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid credentials');
    }

    const accessSecret = config.jwt.JWT_ACCESS_SECRET;
    const refreshSecret = config.jwt.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
        throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'JWT configuration missing');
    }

    // Access Token (short-lived)
    const accessTokenPayload = { userId: user.id, username: user.username, collection_name: user.collection_name, email: user.email };
    const accessToken = jwt.sign(accessTokenPayload, accessSecret, { expiresIn: '1m' });

    // Refresh Token (long-lived, random string, store hashed version)
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);


    // Hash the refresh token before storing
    const hashedRefreshToken = await hashData(refreshToken);

    // Store the hashed refresh token in the database
    await db.insert(refreshTokensTable).values({
        token: hashedRefreshToken,
        user_id: user.id,
        expiresAt: refreshTokenExpiry,
    });

    const token = {
        accessToken,
        refreshToken
    };

    return ApiResponse.ok(res, { token }, "Login successful");
});


/**
 * Refresh user access and refresh tokens.
 *
 * This function handles secure token rotation. It:
 *  - Validates the provided refresh token and user ID.
 *  - Confirms the refresh token exists and hasn’t expired.
 *  - Revokes (deletes) the old refresh token from the database.
 *  - Issues a new refresh token and access token.
 *  - Returns both tokens in the response.
 *
 * Errors:
 *  - Throws `REFRESH_TOKEN_REQUIRED` if no refresh token is provided.
 *  - Throws `BAD_REQUEST` if `userId` is missing.
 *  - Throws `FORBIDDEN` if the provided refresh token is invalid or expired.
 *  - Throws `INTERNAL_ERROR` if JWT secrets or DB issues occur.
 *
 * @async
 * @function refreshToken
 * @param {Request} req - Express request object. Expects `{ refreshToken, userId }` in the body.
 * @param {Response} res - Express response object used to return the new tokens.
 * @returns {Promise<Response>} A JSON response containing the new access and refresh tokens.
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {

    const { refreshToken: providedRefreshToken, userId } = req.body;

    if (!providedRefreshToken) {
        throw new AppError(ERROR_CODES.REFRESH_TOKEN_REQUIRED);
    }
    if (!userId) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, 'User ID is required for token refresh.');
    }

    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
        throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'JWT configuration missing');
    }


    const potentialTokens = await db.select().from(refreshTokensTable)
        .where(
            and(
                eq(refreshTokensTable.user_id, userId),
                gt(refreshTokensTable.expiresAt, new Date())
            )
        );

    let foundTokenRecord = null;
    let user = null;

    const tokensToCheck = potentialTokens.length > 0
        ? potentialTokens
        : [{ token: await hashData('dummy-token-for-timing'), id: 0, user_id: userId, expiresAt: new Date(0) }];

    for (const record of tokensToCheck) {
        const isMatch = await bcrypt.compare(providedRefreshToken, record.token);
        if (isMatch && potentialTokens.length > 0) {
            foundTokenRecord = record;
            const usersFound = await db.select().from(users)
                .where(eq(users.id, record.user_id))
                .limit(1);
            if (usersFound.length > 0) {
                user = usersFound[0];
            }
            break;
        }
    }

    if (!foundTokenRecord || !user) {
        throw new AppError(ERROR_CODES.FORBIDDEN, 'Invalid refresh token');
    }


    await db.delete(refreshTokensTable).where(eq(refreshTokensTable.id, foundTokenRecord.id));

    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const newRefreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newHashedRefreshToken = await hashData(newRefreshToken);

    await db.insert(refreshTokensTable).values({
        token: newHashedRefreshToken,
        user_id: user.id,
        expiresAt: newRefreshTokenExpiry,
    });

    // Generate a new access token
    const newAccessTokenPayload = { userId: user.id, username: user.username };
    const newAccessToken = jwt.sign(newAccessTokenPayload, accessSecret, { expiresIn: '15m' });


    const token = {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    };

    return ApiResponse.ok(res, { token }, "Token Refresh successful");
});



/**
 * Logs out a user by invalidating their refresh token.
 *
 * This endpoint expects a `refreshToken` in the request body.
 * It searches for a matching hashed token in the database,
 * deletes it if found, and returns a success response.
 * If no token is provided or no match is found, it still returns
 * a generic success message to prevent token enumeration.
 *
 * @route POST /logout
 * @param {Request} req - Express request object containing the refresh token in the body.
 * @param {Response} res - Express response object used to return the logout result.
 * @returns {Promise<Response>} JSON response indicating logout success.
 * @throws {AppError} If the refresh token is missing or a database error occurs.
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {

    const { refreshToken: providedRefreshToken } = req.body;

    if (!providedRefreshToken) {
        throw new AppError(ERROR_CODES.REFRESH_TOKEN_REQUIRED);
    }


    const potentialTokens = await db.select().from(refreshTokensTable);

    let foundTokenId = null;
    for (const record of potentialTokens) {
        const isMatch = await bcrypt.compare(providedRefreshToken, record.token);
        if (isMatch) {
            foundTokenId = record.id;
            break;
        }
    }

    if (foundTokenId) {
        await db.delete(refreshTokensTable).where(eq(refreshTokensTable.id, foundTokenId));
        return ApiResponse.ok(res, {}, "Logout successful");
    }
    return ApiResponse.ok(res, {}, "Logout successful");
});