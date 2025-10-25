import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { schema } from "./schemas/index.js";
import { AppError } from "../utils/error-utils/AppError.js";
import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";
import { config } from "../config/env.js";

if (!config.database.url) {
  throw new AppError(ERROR_CODES.DATABASE_URL_MISSING);
}

const isSeeding = process.env.DB_SEEDING === "true";
const isMigrating = process.env.DB_MIGRATING === "true";

const pool = new Pool({
  connectionString: config.database.url,
  ssl:
    config.environment === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: isSeeding || isMigrating ? 1 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

export { pool };

process.on("SIGINT", async () => {
  console.log("SIGINT received. Closing Postgres pool...");
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Closing Postgres pool...");
  await pool.end();
  process.exit(0);
});
