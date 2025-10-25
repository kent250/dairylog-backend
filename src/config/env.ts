import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

import { AppError } from "../utils/error-utils/AppError.js";
import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";


// 1. Load .env file ONLY in non-production environments
if (process.env.NODE_ENV !== 'production') {
    const envPath = path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`);
    const result = dotenv.config({ path: envPath });

    if (result.error) {
        console.warn(`Warning: Could not load ${envPath}`, result.error.message);
    } else {
        console.log(`✓ Loaded environment from ${envPath}`);
    }
} else {
    console.log('✓ Running in production - using platform environment variables');
}


// 1. Define the environment schema
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    // SERVER_PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
    API_BASE_URL: z.url(),
    CORS_ORIGINS_PRODUCTION: z.string().optional().transform(val => val?.split(',') || []),
    CORS_ORIGINS_STAGING: z.string().optional().transform(val => val?.split(',') || []),
    CORS_ORIGINS_DEVELOPMENT: z.string().optional().transform(val => val?.split(',') || []),
    CORS_ORIGINS_LOCAL: z.string().optional().transform(val => val?.split(',') || []),
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),


    // Added: For password and token hashing
    BCRYPT_SALT_ROUNDS: z.coerce.number().min(1).max(15).default(10),
});



const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    throw new AppError(ERROR_CODES.INVALID_ENV_VARIABLE);
}

// Export the validated and typed environment variables
export const env = parsedEnv.data;


const getCorsOrigins = (): string[] => {
    const { NODE_ENV, CORS_ORIGINS_PRODUCTION, CORS_ORIGINS_STAGING, CORS_ORIGINS_DEVELOPMENT, CORS_ORIGINS_LOCAL } = env;

    switch (NODE_ENV) {
        case 'production':
            if (CORS_ORIGINS_PRODUCTION.length === 0) {
                console.warn('⚠️  CORS_ORIGINS_PRODUCTION is empty - this may block requests');
            }
            return CORS_ORIGINS_PRODUCTION;

        case 'staging':
            return CORS_ORIGINS_STAGING.length > 0 ? CORS_ORIGINS_STAGING : CORS_ORIGINS_PRODUCTION;

        case 'development':
            return CORS_ORIGINS_DEVELOPMENT.length > 0 ? CORS_ORIGINS_DEVELOPMENT : CORS_ORIGINS_LOCAL;

        default:
            return CORS_ORIGINS_LOCAL;
    }
};

// 4. Create the final config object using the validated env
export const config = {
    // port: env.SERVER_PORT,
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
    corsOrigins: getCorsOrigins()
};