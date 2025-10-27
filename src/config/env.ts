import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

import { AppError } from "../utils/error-utils/AppError.js";
import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";
import { getFirstZodErrorMessage } from "../utils/error-utils/error-helpers.js";

/**
 * Loads environment variables from a .env file based on NODE_ENV.
 * Skips loading in 'production' as variables are expected from the platform.
 */
function loadEnvFile() {
  const nodeEnv = process.env.NODE_ENV || "development";

  if (nodeEnv === "production") {
    console.log(
      "✓ Running in production - using platform environment variables."
    );
    return;
  }

  // Construct the path: .env.development, .env.staging, etc.
  const envFileName = `.env.${nodeEnv}`;
  const envPath = path.resolve(process.cwd(), envFileName);
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.warn(
      `⚠️ Warning: Could not load environment file from ${envPath}. Falling back to platform variables or defaults.`
    );
  } else {
    console.log(`✓ Loaded environment variables from ${envPath}`);
  }
}

loadEnvFile();

/**
 * Defines the expected shape and types of environment variables using Zod.
 * Provides default values for non-critical variables.
 */
const envSchema = z.object({
  // --- Application Environment ---
  NODE_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  SERVER_PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_URL: z.string().url().default("http://localhost:3000"),

  // --- Database ---
  DATABASE_URL: z.string().url("Invalid DATABASE_URL format"),


  // --- EasySendSMS ---
  EASY_SEND_SMS_API_URL: z
    .string()
    .min(10, "EASY_SEND_SMS_API_URL must be at least 10 characters long"),
  EASY_SEND_SMS_SENDER_ID: z
    .string()
    .min(3, "EASY_SEND_SMS_SENDER_ID must be at least 3 characters long"),
  EASY_SEND_SMS_API_KEY: z
    .string()
    .min(3, "EASY_SEND_SMS_API_KEY must be at least 3 characters long"),

  // --- Security ---
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters long"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters long"),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(10), // Min 10 rounds recommended

  // --- CORS ---
  // Transforms comma-separated strings into arrays, handles undefined/empty strings
  CORS_ORIGINS_PRODUCTION: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        : []
    ),
  CORS_ORIGINS_STAGING: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        : []
    ),
  CORS_ORIGINS_DEVELOPMENT: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        : []
    ),
  CORS_ORIGINS_LOCAL: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        : ["http://localhost:3000", "http://127.0.0.1:3000"]
    ),
});

// Validate process.env against the schema
const parsedEnvResult = envSchema.safeParse(process.env);

if (!parsedEnvResult.success) {
  const formattedFirstZodError = getFirstZodErrorMessage(parsedEnvResult.error);
  throw new AppError(ERROR_CODES.INVALID_ENV_VARIABLE, formattedFirstZodError);
}

// Export the validated and typed environment variables
export const env = parsedEnvResult.data;

/**
 * Determines the appropriate CORS origins based on the current NODE_ENV.
 * Implements fallback logic (e.g., Staging uses Production if Staging-specific origins aren't set).
 */
function determineCorsOrigins(): string[] {
  const {
    NODE_ENV,
    CORS_ORIGINS_PRODUCTION,
    CORS_ORIGINS_STAGING,
    CORS_ORIGINS_DEVELOPMENT,
    CORS_ORIGINS_LOCAL,
  } = env;

  // Define origins map for clarity
  const originsMap: Record<typeof NODE_ENV, string[]> = {
    production: CORS_ORIGINS_PRODUCTION,
    staging:
      CORS_ORIGINS_STAGING.length > 0
        ? CORS_ORIGINS_STAGING
        : CORS_ORIGINS_PRODUCTION,
    development:
      CORS_ORIGINS_DEVELOPMENT.length > 0
        ? CORS_ORIGINS_DEVELOPMENT
        : CORS_ORIGINS_LOCAL,
  };

  const selectedOrigins = originsMap[NODE_ENV];

  if (NODE_ENV === "production" && selectedOrigins.length === 0) {
    console.warn(
      "⚠️ CORS_ORIGINS_PRODUCTION is empty or not set. This may block all cross-origin requests in production!"
    );
  }

  return selectedOrigins;
}

/**
 * Consolidated configuration object derived from validated environment variables.
 * Provides a structured way to access configuration throughout the application.
 */
export const config = {
  // --- Server ---
  port: env.SERVER_PORT,
  environment: env.NODE_ENV,
  apiBaseUrl: env.API_BASE_URL,

  // --- EasySendSMS ---
  easy_send_sms: {
    EASY_SEND_SMS_API_URL: env.EASY_SEND_SMS_API_URL,
    EASY_SEND_SMS_SENDER_ID: env.EASY_SEND_SMS_SENDER_ID,
    EASY_SEND_SMS_API_KEY: env.EASY_SEND_SMS_API_KEY,
  },

  // --- Security ---
  jwt: {
    JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
  },
  bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,

  // --- Database ---
  database: {
    url: env.DATABASE_URL,
  },

  corsOrigins: determineCorsOrigins(),
} as const;

console.log(
  `✓ CORS Origins for ${config.environment}: ${config.corsOrigins.join(", ") || "[]"
  }`
);
