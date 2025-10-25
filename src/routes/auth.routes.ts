import { Router } from "express";
import { registerNewCollectionUser, login, refreshToken, logout } from "../controllers/auth.controller.js";
const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new dairy collection user
 *     description: Creates a new Dairy collection user with unique username, email, and collection name. The password is securely hashed before saving.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - collection_name
 *               - username
 *               - email
 *               - password
 *             properties:
 *               collection_name:
 *                 type: string
 *                 example: MyAwesomeCollection
 *               username:
 *                 type: string
 *                 example: john_doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: secret123
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 3
 *                     collection_name:
 *                       type: string
 *                       example: MyAwesomeCollection
 *                     email:
 *                       type: string
 *                       example: john@example.com
 *                     username:
 *                       type: string
 *                       example: john_doe
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-24T23:09:54.646Z
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-24T23:09:54.648Z
 *       400:
 *         description: Validation error — missing or duplicate fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: VALIDATION_ERROR
 *                     message:
 *                       type: string
 *                       example: Request validation failed. Username not available
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-24T23:13:10.423Z
 *                     statusCode:
 *                       type: integer
 *                       example: 400
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: INTERNAL_ERROR
 *                     message:
 *                       type: string
 *                       example: Internal server error.
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-24T23:10:47.708Z
 *                     statusCode:
 *                       type: integer
 *                       example: 500
 */
router.post("/register", registerNewCollectionUser);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in a dairy collection user
 *     description: Authenticates a dairy collection user with username and password, and returns access and refresh tokens if valid.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                         refreshToken:
 *                           type: string
 *                           example: 6538478c765993d9a22R5cCI6IkpXVCJ9...
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-25T08:12:29.073Z
 *       400:
 *         description: Missing username or password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: VALIDATION_ERROR
 *                     message:
 *                       type: string
 *                       example: Username and password are required
 *                     statusCode:
 *                       type: integer
 *                       example: 400
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: UNAUTHORIZED
 *                     message:
 *                       type: string
 *                       example: Invalid credentials
 *                     statusCode:
 *                       type: integer
 *                       example: 401
 */
router.post("/login", login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access and refresh tokens
 *     description: >
 *       Generates a new access token and refresh token pair using a valid existing refresh token.  
 *       The old refresh token is invalidated (token rotation).  
 *       Requires both `refreshToken` and `userId` in the request body.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *               - userId
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The user's current refresh token.
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               userId:
 *                 type: integer
 *                 description: The user's unique ID.
 *                 example: 10
 *     responses:
 *       200:
 *         description: Token refresh successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                         refreshToken:
 *                           type: string
 *                           example: 0d3fa4d8bda9a5f4b2e6b53c59f2e0c9a0b5...
 *                 message:
 *                   type: string
 *                   example: Token Refresh successful
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       example: 2025-10-25T09:38:52.521Z
 *       400:
 *         description: Missing or invalid user ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: BAD_REQUEST
 *                     message:
 *                       type: string
 *                       example: User ID is required for token refresh.
 *       401:
 *         description: Missing or invalid refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: REFRESH_TOKEN_REQUIRED
 *                     message:
 *                       type: string
 *                       example: Refresh token required.
 *       403:
 *         description: Invalid or expired refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: FORBIDDEN
 *                     message:
 *                       type: string
 *                       example: Invalid refresh token.
 */
router.post("/refresh-token", refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logs out the user
 *     description: Invalidates the provided refresh token, effectively logging the user out. 
 *                  Even if the token is invalid or missing, a generic success message is returned 
 *                  to prevent token enumeration.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The user's refresh token to be invalidated.
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Logout successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   example: {}
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       example: 2025-10-25T09:50:29.783Z
 *       401:
 *         description: Refresh token required or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: REFRESH_TOKEN_REQUIRED
 *                     message:
 *                       type: string
 *                       example: Refresh token required.
 */
router.post('/logout', logout);

export default router;



