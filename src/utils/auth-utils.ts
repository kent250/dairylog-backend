import bcrypt from 'bcrypt';
import { config } from '../config/env.js';

/**
 * Hashes a given string (e.g., password or refresh token) using bcrypt.
 *
 * @param {string} data - The string to hash.
 * @returns {Promise<string>} The hashed string.
 */
export async function hashData(data: string): Promise<string> {

    const saltRounds = config.BCRYPT_SALT_ROUNDS;

    if (typeof saltRounds !== 'number' || saltRounds < 1) {
        return bcrypt.hash(data, 10);
    }

    return bcrypt.hash(data, saltRounds);
}