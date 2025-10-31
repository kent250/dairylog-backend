import { Router } from "express";
import {
  recordMilkDelivery,
  getMilkRecordsForUser,
  getFarmerMilkRecordHistory
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
 *                 example: "25"
 *               price_per_liter:
 *                 type: string
 *                 example: "250"
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
 *                       type: number
 *                       example: 25
 *                     price_per_liter:
 *                       type: number
 *                       example: 250
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
 *       409:
 *         description: Conflict - Farmer has already delivered milk today.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: "RESOURCE_CONFLICT"
 *                 message: "Farmer with ID 8 has already delivered milk today."
 *                 timestamp: "2025-10-31T15:10:48.017Z"
 *                 statusCode: 409
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
 *     description: |
 *       Retrieves milk delivery records filtered by optional parameters such as farmer, date range, and sorting. 
 *       Supports pagination. 
 *       
 *       **Date Filter Behavior:**
 *       - If no date filters provided, defaults to today's records (00:00:00 to 23:59:59)
 *       - If only startDate provided, endDate is set to end of that day (23:59:59)
 *       - If only endDate provided, startDate is set to beginning of that day (00:00:00)
 *       - If both provided, endDate is adjusted to end of day (23:59:59)
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
 *         description: Filter records from this date (inclusive, defaults to 00:00:00 if time not specified).
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-10-01"
 *       - name: endDate
 *         in: query
 *         description: Filter records up to this date (inclusive, adjusted to 23:59:59).
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-10-26"
 *       - name: page
 *         in: query
 *         description: Page number for pagination (default is 1).
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           example: 1
 *       - name: limit
 *         in: query
 *         description: Number of results per page (max 100, default is 15).
 *         required: false
 *         schema:
 *           type: integer
 *           default: 15
 *           maximum: 100
 *           example: 10
 *       - name: sortBy
 *         in: query
 *         description: Field to sort by (default is recordedAt).
 *         required: false
 *         schema:
 *           type: string
 *           enum: [recordedAt, liters, farmerName]
 *           default: recordedAt
 *           example: recordedAt
 *       - name: sortOrder
 *         in: query
 *         description: Sort direction (default is desc).
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
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
 *                         type: number
 *                         format: float
 *                         example: 25
 *                       price_per_liter:
 *                         type: number
 *                         format: float
 *                         example: 250
 *                       recordedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-10-26T21:19:17.771Z"
 *                       farmer:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Jean Bosco Nkurunziza"
 *                           phoneNumber:
 *                             type: string
 *                             example: "0788123456"
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
 *                       description: Total number of records matching the filter criteria
 *                       example: 25
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-10-26T21:19:17.813Z"
 *                 message:
 *                   type: string
 *                   example: "Milk records retrieved successfully."
 *                 summary:
 *                   type: object
 *                   description: Summary statistics for the current page of records
 *                   properties:
 *                     returnedRecordTotalLiters:
 *                       type: number
 *                       format: float
 *                       description: Sum of liters for records returned on the current page
 *                       example: 250
 *
 *       400:
 *         description: Invalid query parameter.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: "VALIDATION_ERROR"
 *                 message: "End date cannot be before start date."
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
 *                 message: "User ID not found in token payload."
 *                 timestamp: "2025-10-26T18:26:19.337Z"
 *                 statusCode: 401
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
router.get("/", getMilkRecordsForUser);



/**
 * @swagger
 * /milk-record/farmer-history:
 *   get:
 *     summary: Get milk record history for a farmer
 *     description: >
 *       Retrieves all milk delivery records for a farmer identified by phone number,
 *       scoped to the authenticated collection center.  
 *       Requires a valid JWT access token.
 *     tags:
 *       - Milk Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *           example: "0788123456"
 *         description: The farmer's phone number to look up milk records for.
 *     responses:
 *       200:
 *         description: Milk records retrieved successfully.
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
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       liters:
 *                         type: number
 *                         example: 12.5
 *                       price_per_liter:
 *                         type: number
 *                         example: 450
 *                       recordedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-10-26T15:51:40.422Z"
 *                 message:
 *                   type: string
 *                   example: Milk records retrieved successfully.
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-10-26T18:17:54.713Z"
 *
 *       400:
 *         description: Invalid or missing query parameter.
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
 *         description: Farmer not found for provided phone number.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: "NOT_FOUND"
 *                 message: "Farmer with phone number 0783741533 not found."
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
router.get('/farmer-history', getFarmerMilkRecordHistory);

export default router;
