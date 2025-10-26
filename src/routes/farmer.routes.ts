import { Router } from "express";

import { createFarmer } from '../controllers/farmer.controller.js';

const router = Router();



/**
 * @swagger
 * /farmer:
 *   post:
 *     summary: Create a new farmer
 *     description: Creates a farmer record linked to the authenticated collection center user.
 *     tags:
 *       - Farmers
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - farmer_name
 *               - phone_number
 *               - sector
 *               - cell
 *               - village
 *             properties:
 *               farmer_name:
 *                 type: string
 *                 example: John Doe
 *                 description: Full name of the farmer.
 *               phone_number:
 *                 type: string
 *                 example: "0789001122"
 *                 description: Unique phone number for the farmer.
 *               sector:
 *                 type: string
 *                 example: Gitega
 *               cell:
 *                 type: string
 *                 example: Nyamirambo
 *               village:
 *                 type: string
 *                 example: Kigali
 *
 *     responses:
 *       201:
 *         description: Farmer created successfully.
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
 *                       example: 4
 *                     farmer_name:
 *                       type: string
 *                       example: John Doe
 *                     phone_number:
 *                       type: string
 *                       example: "0789001122"
 *                 message:
 *                   type: string
 *                   example: Farmer created successfully.
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       example: "2025-10-26T16:13:42.968Z"
 *
 *       400:
 *         description: Validation error — invalid or missing fields.
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
 *                       example: "farmer_name: Farmer name must be at least 2 characters long"
 *                     statusCode:
 *                       type: integer
 *                       example: 400
 *
 *       409:
 *         description: Conflict — phone number already registered.
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
 *                       example: RESOURCE_CONFLICT
 *                     message:
 *                       type: string
 *                       example: Phone number is already registered.
 *                     statusCode:
 *                       type: integer
 *                       example: 409
 *
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
router.post('/', createFarmer);


export default router;