import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { users } from '../db/schemas/user.schema.js';
import { eq, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { AppError } from '../utils/error-utils/AppError.js';
import { ERROR_CODES } from '../utils/error-utils/errorCodes.js';
import { ApiResponse } from '../utils/api-response.js';


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
export const registerNewCollectionUser = async (req: Request, res: Response) => {

    const {
        collection_name,
        username,
        email,
        password
    } = req.body;

    // Basic validation
    if (!username || !password || !email || !collection_name) {
        throw new AppError(ERROR_CODES.DATABASE_ERROR, 'Username, password, email, and collection name are required')
    }

    try {
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
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

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

    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError(ERROR_CODES.DATABASE_ERROR, 'Failed to create collection user');
    }
};