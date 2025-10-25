import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, or } from 'drizzle-orm';
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

    const accessSecret = config.JWT_ACCESS_SECRET;
    const refreshSecret = config.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
        throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'JWT configuration missing');
    }

    // Access Token (short-lived)
    const accessTokenPayload = { userId: user.id, username: user.username, collection_name: user.collection_name, email: user.email };
    const accessToken = jwt.sign(accessTokenPayload, accessSecret, { expiresIn: '15m' });

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