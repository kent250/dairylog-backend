import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

import { AppError } from "../utils/error-utils/AppError.js";
import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";

// 1. Define the environment schema
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    SERVER_PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
    API_BASE_URL: z.url(),
    CORS_ORIGINS_PRODUCTION: z.string().transform(val => val.split(',')),
    CORS_ORIGINS_STAGING: z.string().transform(val => val.split(',')),
    CORS_ORIGINS_DEVELOPMENT: z.string().transform(val => val.split(',')),
    CORS_ORIGINS_LOCAL: z.string().transform(val => val.split(',')),

    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),


    // Added: For password and token hashing
    BCRYPT_SALT_ROUNDS: z.coerce.number().min(1).max(15).default(10),
});

// 2. Load the correct .env file (simplified)
const envPath = path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`);
dotenv.config({ path: envPath });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    throw new AppError(ERROR_CODES.INVALID_ENV_VARIABLE);
}

// Export the validated and typed environment variables
export const env = parsedEnv.data;

// 4. Create the final config object using the validated env
export const config = {
    port: env.SERVER_PORT,
    environment: env.NODE_ENV,
    JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,

    BCRYPT_SALT_ROUNDS: env.BCRYPT_SALT_ROUNDS,

    database: {
        url: env.DATABASE_URL,
    },
    api: {
        baseUrl: env.API_BASE_URL,
    },
    corsOrigins: ((): string[] => {
        switch (env.NODE_ENV) {
            case 'production': return env.CORS_ORIGINS_PRODUCTION;
            case 'staging': return env.CORS_ORIGINS_STAGING;
            case 'development': return env.CORS_ORIGINS_DEVELOPMENT;
            default: return env.CORS_ORIGINS_LOCAL;
        }
    })()
};