import * as userSchema from "./user.schema";
import * as farmerSchema from "./farmer.schema";
import * as refreshTokenSchema from "./refresh-token.schema";
import * as milkRecordsSchema from "./milk-record.schema";

/**
 * This object is for your RUNTIME.
 * It combines all tables, relations, and zod schemas into one
 * object for the Drizzle client to use.
 */
export const schema = {
  ...userSchema,
  ...farmerSchema,
  ...refreshTokenSchema,
  ...milkRecordsSchema,
};

// We also re-export the types for convenience
export * from "./user.schema";
export * from "./farmer.schema";
export * from "./refresh-token.schema";
export * from "./milk-record.schema";
