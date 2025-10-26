import * as userSchema from "./user.schema.js";
import * as farmerSchema from './farmer.schema.js';

/**
 * This object is for your RUNTIME.
 * It combines all tables, relations, and zod schemas into one
 * object for the Drizzle client to use.
 */
export const schema = {
  ...userSchema,
  ...farmerSchema,
};

// We also re-export the types for convenience
export * from "./user.schema.js";
export * from './farmer.schema.js';
