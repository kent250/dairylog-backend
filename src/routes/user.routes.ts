import { Router } from "express";
import { getProfile } from "../controllers/user.controller.js";
const router = Router();


/**
 * @openapi
 * /user/profile:
 *   get:
 *     summary: Get authenticated user's profile
 *     description: Returns the profile information of the currently authenticated user. Requires a valid JWT access token.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                       example: 10
 *                     username:
 *                       type: string
 *                       example: kicukiro
 *                     email:
 *                       type: string
 *                       example: kicukiro@inyange.cfodm
 *                     collection_name:
 *                       type: string
 *                       example: KicukiroCollection
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-25T09:09:34.150Z
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-25T10:36:29.496Z
 *       401:
 *         description: Unauthorized — missing or invalid authentication token
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
 *                       example: User ID not found in token payload.
 *                     statusCode:
 *                       type: integer
 *                       example: 401
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-25T10:33:30.574Z
 *       403:
 *         description: Forbidden — invalid or expired token
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
 *                       example: "Insufficient permissions. Forbidden: Invalid token"
 *                     statusCode:
 *                       type: integer
 *                       example: 403
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-25T10:33:30.574Z
 *       404:
 *         description: User profile not found
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
 *                       example: NOT_FOUND
 *                     message:
 *                       type: string
 *                       example: User profile not found.
 *                     statusCode:
 *                       type: integer
 *                       example: 404
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-25T10:33:30.574Z
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
 *                     statusCode:
 *                       type: integer
 *                       example: 500
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-25T10:33:30.574Z
 */
router.get("/profile", getProfile);


export default router;



