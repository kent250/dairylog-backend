import { Router } from "express";
import {
  recordMilkDelivery,
  getMilkRecordsForUser,
} from "../controllers/milk-record.controller.js";
const router = Router();

/**
 * @swagger
 * /milk-record:
 *   post:
 *     summary: Record milk delivery
 *     description: Records a milk delivery for a farmer in the authenticated collection center.
 *     tags:
 *       - Milk Records
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - farmer_id
 *               - liters
 *             properties:
 *               farmer_id:
 *                 type: integer
 *                 example: 12
 *               liters:
 *                 type: string
 *                 example: "25.00"
 *     responses:
 *       201:
 *         description: Milk recorded successfully.
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
 *                       example: 14
 *                     farmer_id:
 *                       type: integer
 *                       example: 1
 *                     liters:
 *                       type: string
 *                       example: "25.00"
 *                     recordedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-26T21:19:17.771Z
 *                     farmer:
 *                       type: object
 *                       properties:
 *                         farmer_name:
 *                           type: string
 *                           example: Jean Bosco Nkurunziza
 *                         phone_number:
 *                           type: string
 *                           example: 0788123456
 *                 message:
 *                   type: string
 *                   example: Milk recorded successfully.
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       example: 2025-10-26T21:19:17.813Z
 *       404:
 *         description: Farmer not found for provided phone number.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: "NOT_FOUND"
 *                 message: "Farmer with ID 1245 not found or does not belong to this collection center."
 *                 timestamp: "2025-10-26T18:27:40.445Z"
 *                 statusCode: 404
 *
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: "INTERNAL_SERVER_ERROR"
 *                 message: "Something went wrong."
 *                 timestamp: "2025-10-26T18:30:00.000Z"
 *                 statusCode: 500
 */
router.post("/", recordMilkDelivery);

/**
 * @swagger
 * /milk-record:
 *   get:
 *     summary: Get all milk records for the authenticated collection center
 *     description: Retrieves milk delivery records filtered by optional parameters such as farmer, date range, and sorting. Supports pagination.
 *     tags:
 *       - Milk Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: farmerId
 *         in: query
 *         description: Filter by specific farmer ID.
 *         required: false
 *         schema:
 *           type: integer
 *           example: 5
 *       - name: startDate
 *         in: query
 *         description: Filter records from this date (inclusive).
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-10-01"
 *       - name: endDate
 *         in: query
 *         description: Filter records up to this date (inclusive).
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-10-26"
 *       - name: page
 *         in: query
 *         description: Page number for pagination.
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: limit
 *         in: query
 *         description: Number of results per page (max 100).
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *       - name: sortBy
 *         in: query
 *         description: Field to sort by.
 *         required: false
 *         schema:
 *           type: string
 *           enum: [recordedAt, liters, farmerName]
 *           example: recordedAt
 *       - name: sortOrder
 *         in: query
 *         description: Sort direction.
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: desc
 *
 *     responses:
 *       200:
 *         description: Successfully retrieved milk records.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       recordId:
 *                         type: integer
 *                         example: 14
 *                       liters:
 *                         type: string
 *                         example: "25.00"
 *                       recordedAt:
 *                         type: string
 *                         example: "2025-10-26T21:19:17.771Z"
 *                       farmer:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: Jean Bosco Nkurunziza
 *                           phoneNumber:
 *                             type: string
 *                             example: 0788123456
 *                 meta:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     timestamp:
 *                       type: string
 *                       example: "2025-10-26T21:19:17.813Z"
 *                 message:
 *                   type: string
 *                   example: Milk records retrieved successfully.
 *
 *       400:
 *         description: Invalid query parameter.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: "VALIDATION_ERROR"
 *                 message: "Invalid query parameters."
 *                 timestamp: "2025-10-26T18:25:58.607Z"
 *                 statusCode: 400
 *
 *       401:
 *         description: Unauthorized — missing or invalid authentication token.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: "UNAUTHORIZED"
 *                 message: "Unauthorized: Access token is missing"
 *                 timestamp: "2025-10-26T18:26:19.337Z"
 *                 statusCode: 401
 *
 *       404:
 *         description: No records found for the given filters.
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: "INTERNAL_SERVER_ERROR"
 *                 message: "Something went wrong."
 *                 timestamp: "2025-10-26T18:30:00.000Z"
 *                 statusCode: 500
 */
router.get("/", getMilkRecordsForUser);

export default router;
