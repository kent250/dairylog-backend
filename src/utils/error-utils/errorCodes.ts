/**
 * Application Error Codes
 * 
 * @module ErrorCodes
 * @description Central repository for all application error codes with documentation
 */

/**
 * Error definition structure
 */
interface ErrorDefinition {
    code: string;
    message: string;
    httpStatus: number;
}

/**
 * Authentication & Authorization Errors (401, 403)
 */
export const AUTH_ERRORS = {
    INVALID_CREDENTIALS: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials provided.',
        httpStatus: 401,
    },
    UNAUTHORIZED: {
        code: 'UNAUTHORIZED',
        message: 'Access denied. Unauthorized.',
        httpStatus: 401,
    },
} as const satisfies Record<string, ErrorDefinition>;

/**
 * Validation Errors (400, 404, 409, 422)
 */
export const VALIDATION_ERRORS = {
    // Client errors (4xx)
    VALIDATION_ERROR: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        httpStatus: 400,
    },
    RESOURCE_CONFLICT: {
        code: 'RESOURCE_CONFLICT',
        message: 'Resource already exists.',
        httpStatus: 409,
    },
    NOT_FOUND: {
        code: 'NOT_FOUND',
        message: 'Requested resource not found.',
        httpStatus: 404,
    },
    UNAUTHORIZED: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
        httpStatus: 401,
    },
    FORBIDDEN: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions.',
        httpStatus: 403,
    },
    REFRESH_TOKEN_REQUIRED: {
        code: 'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token required.',
        httpStatus: 401,
    },
    BAD_REQUEST: {
        code: 'BAD_REQUEST',
        message: 'The request was malformed or invalid.',
        httpStatus: 400,
    },


} as const satisfies Record<string, ErrorDefinition>;

/**
 * Server Errors (500, 503)
 */
export const SERVER_ERRORS = {
    INTERNAL_ERROR: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error.',
        httpStatus: 500,
    },
    DATABASE_ERROR: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed.',
        httpStatus: 500,
    },
    DATABASE_URL_MISSING: {
        code: 'DATABASE_URL_MISSING',
        message: 'The DATABASE_URL environment variable is not defined.',
        httpStatus: 500,
    },
    SERVER_PORT_MISSING: {
        code: 'SERVER_PORT_MISSING',
        message: 'Server port is not configured.',
        httpStatus: 500,
    },
    ENV_MISSING: {
        code: 'ENV_MISSING',
        message: 'Missing required environment variable.',
        httpStatus: 500,
    },
    INVALID_ENV_VARIABLE: {
        code: 'INVALID_ENV_VARIABLE',
        message: 'An environment variable has an invalid format or value.',
        httpStatus: 500,
    },
} as const satisfies Record<string, ErrorDefinition>;

/**
 * Combined error codes object
 */
export const ERROR_CODES = {
    ...AUTH_ERRORS,
    ...VALIDATION_ERRORS,
    ...SERVER_ERRORS,
} as const;

/**
 * Type for error code keys
 */
export type ErrorCodeKey = keyof typeof ERROR_CODES;

/**
 * Type for error definitions
 */
export type ErrorDefinitionType = typeof ERROR_CODES[ErrorCodeKey];