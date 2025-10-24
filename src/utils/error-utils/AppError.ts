import { type ErrorDefinitionType } from "./errorCodes.js";

/**
 * Custom error class for application-specific errors with HTTP status codes
 *
 * @extends Error
 *
 * @example
 * // Using error definition (recommended)
 * throw new AppError(ERROR_CODES.NOT_FOUND);
 *
 * @example
 * // With additional context
 * throw new AppError(ERROR_CODES.VALUE_TOO_LONG, 'Email cannot exceed 255 characters');
 *
 * @example
 * // With additional details object
 * throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'Invalid input', {
 *   field: 'email',
 *   reason: 'invalid_format'
 * });
 */
export class AppError extends Error {
  /**
   * HTTP status code for the error response
   */
  public statusCode: number;

  /**
   * Machine-readable error code for client handling
   */
  public code: string;

  /**
   * Additional error details or context (optional)
   */
  public details?: unknown;

  /**
   * ISO timestamp when error occurred
   */
  public timestamp: string;

  /**
   * Creates a new AppError instance
   *
   * @param errorDefinition - Error definition object from ERROR_CODES
   * @param additionalContext - Additional human-readable context (optional)
   * @param details - Additional structured error details (optional)
   *
   * @remarks
   * - Automatically captures stack trace for better debugging
   * - Extends native Error class for compatibility
   * - Provides structured error information for consistent API responses
   */
  constructor(
    errorDefinition: ErrorDefinitionType,
    additionalContext?: string,
    details?: unknown
  ) {
    // Combine base message with optional context
    const fullMessage = additionalContext
      ? `${errorDefinition.message} ${additionalContext}`
      : errorDefinition.message;

    super(fullMessage);

    this.statusCode = errorDefinition.httpStatus;
    this.code = errorDefinition.code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}
