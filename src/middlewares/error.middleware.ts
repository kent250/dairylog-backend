import { type Request, type Response, type NextFunction } from "express";
import { AppError } from "../utils/error-utils/AppError.js";

interface ErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
    timestamp: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
    stack?: string;
    statusCode?: number;
    name?: string;
  };
}

/**
 * Determines if detailed error info should be shown
 * Shows in development OR when DEBUG_MODE is explicitly enabled
 */
const shouldShowDetailedErrors = (): boolean => {
  return (
    process.env.NODE_ENV === "development" || process.env.DEBUG_MODE === "true"
  );
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _next = next; // Retain a reference to `next` to satisfy the linter/type requirement

  const showDetails = shouldShowDetailedErrors();

  // Log in development/debug mode
  if (showDetails) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("🔴 Error occurred:");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(`Path: ${req.method} ${req.path}`);
    console.error(`Time: ${new Date().toISOString()}`);
    console.error("Error:", err);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  // If it's our custom AppError
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        timestamp: err.timestamp,
      },
    };

    // Include details if they exist
    if (err.details) {
      response.error.details = err.details;
    }

    // Include stack trace when showing details
    if (showDetails && err.stack) {
      response.error.stack = err.stack;
      response.error.statusCode = err.statusCode;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle unexpected errors
  console.error("Unexpected error:", err);

  const response: ErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: showDetails
        ? err.message || "An unexpected error occurred."
        : "An unexpected error occurred.",
      timestamp: new Date().toISOString(),
    },
  };

  // Include stack trace for unexpected errors when showing details
  if (showDetails && err.stack) {
    response.error.stack = err.stack;
    response.error.name = err.name;
  }

  return res.status(500).json(response);
};
