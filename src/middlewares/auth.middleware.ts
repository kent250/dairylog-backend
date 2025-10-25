import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { AppError } from '../utils/error-utils/AppError.js';
import { ERROR_CODES } from '../utils/error-utils/errorCodes.js';
import { config } from '../config/env';

interface AuthenticatedRequest extends Request {
    user?: {
        userId: number;
        username: string;
        collection_name: string,
        email: string
    };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // 1. Get the token from the Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // 2. Check if token exists
    if (!token) {
        throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized: Access token is missing');
    }

    // 3. Verify the token
    const secret = config.JWT_SECRET;
    if (!secret) {
        throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Internal server error - configuration missing');
    }

    jwt.verify(token, secret, (err, decodedPayload) => {
        if (err) {
            throw new AppError(ERROR_CODES.FORBIDDEN, 'Forbidden: Invalid token');
        }

        // 4. Token is valid, attach payload to request object
        // We assert the type here because verify returns object | string
        req.user = decodedPayload as AuthenticatedRequest['user'];

        next();
    });
};