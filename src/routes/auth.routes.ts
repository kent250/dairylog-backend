import { Router } from "express";
import { registerNewCollectionUser, login } from "../controllers/auth.controller.js";
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
 *     description: Authenticates dairy user with username and password and returns a JWT token if valid.
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
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-24T23:59:54.073Z
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

export default router;
