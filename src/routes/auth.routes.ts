import { Router } from "express";
import { registerNewCollectionUser } from "../controllers/auth.controller.js";
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

export default router;
