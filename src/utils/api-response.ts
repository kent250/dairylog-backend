import { type Response } from "express";

/**
 * Standard API success response structure
 */
interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    [key: string]: unknown;
  };
}

/**
 * Configuration options for success responses
 */
interface SuccessResponseOptions {
  message?: string;
  statusCode?: number;
  meta?: Record<string, unknown>;
}

/**
 * Sends a standardized success response
 *
 * @param res - Express response object
 * @param data - Response data payload
 * @param options - Optional configuration (message, status code, metadata)
 *
 * @example
 * // Simple success response
 * return sendSuccess(res, { id: 1, name: 'John' });
 *
 * @example
 * // With custom message and status code
 * return sendSuccess(res, user, {
 *   message: 'User created successfully',
 *   statusCode: 201
 * });
 *
 * @example
 * // With pagination metadata
 * return sendSuccess(res, users, {
 *   message: 'Users retrieved',
 *   meta: {
 *     page: 1,
 *     limit: 10,
 *     total: 100
 *   }
 * });
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  options: SuccessResponseOptions = {}
): Response => {
  const { message, statusCode = 200, meta = {} } = options;

  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return res.status(statusCode).json(response);
};

/**
 * Common success response helpers for typical use cases
 */
export const ApiResponse = {
  /**
   * 200 OK - Standard success response
   */
  ok: <T>(res: Response, data: T, message?: string) =>
    sendSuccess(res, data, { message, statusCode: 200 }),

  /**
   * 201 Created - Resource successfully created
   */
  created: <T>(
    res: Response,
    data: T,
    message: string = "Resource created successfully"
  ) => sendSuccess(res, data, { message, statusCode: 201 }),

  /**
   * 204 No Content - Success with no response body
   */
  noContent: (res: Response) => res.status(204).send(),

  /**
   * Paginated response helper
   */
  paginated: <T>(
    res: Response,
    data: T[],
    pagination: {
      currentPage: number;
      limit: number;
      total: number;
      totalPages?: number;
    },
    message?: string
  ) => {
    const totalPages =
      pagination.totalPages ?? Math.ceil(pagination.total / pagination.limit);

    return sendSuccess(res, data, {
      message,
      statusCode: 200,
      meta: {
        pagination: {
          ...pagination,
          totalPages,
          hasNext: pagination.currentPage < totalPages,
          hasPrev: pagination.currentPage > 1,
        },
      },
    });
  },
};
