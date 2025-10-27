import { z } from "zod";

/**
 * Extracts and formats the first error from a ZodError object.
 * @param zodError The error object from a failed Zod parse.
 * @returns A formatted string: "fieldName: errorMessage"
 */
export const getFirstZodErrorMessage = (zodError: z.ZodError): string => {
  // 1. Get the first error issue
  // A failed parse will always have at least one issue
  const firstError = zodError.issues[0];

  // 2. Get the field name and message
  const fieldName = firstError.path.join(".");
  const errorMessage = firstError.message;

  // 3. Create the clean, combined message
  // If fieldName is empty, just return the message itself
  return fieldName ? `${fieldName}: ${errorMessage}` : errorMessage;
};
