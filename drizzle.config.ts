import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import path from "path";

const envFile = `.env.${process.env.NODE_ENV || "development"}`;
const envPath = path.resolve(process.cwd(), envFile);

config({ path: envPath });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables.");
}

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schemas/*.schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
