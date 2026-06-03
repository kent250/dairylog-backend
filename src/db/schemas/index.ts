import * as userSchema from "./user.schema.js";
import * as farmerSchema from "./farmer.schema.js";
import * as refreshTokenSchema from "./refresh-token.schema.js";
import * as milkRecordsSchema from "./milk-record.schema.js";
import * as farmerPurchaseSchema from "./farmer-purchase.schema.js";
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
  ...farmerPurchaseSchema,
};

// We also re-export the types for convenience
export * from "./user.schema.js";
export * from "./farmer.schema.js";
export * from "./refresh-token.schema.js";
export * from "./milk-record.schema.js";
export * from "./farmer-purchase.schema.js";
