import { Router } from "express";
import {
    createDeadMilkRecord,
    getAllDeadMilkRecords,
    getFarmerDeadMilkHistory,
} from "../controllers/dead-milk-record.controller.js";

const router = Router();

/**
 * @swagger
 * /dead-milk-record:
 *   post:
 *     summary: Record a dead (rejected) milk delivery
 *     description: |
 *       Records milk that was rejected at the collection center (e.g. sour, contaminated).
 *       The farmer can be identified by **any one** of: `farmerId`, `farmerPhone`, or `farmerName`.
 *       At least one of these three is required. If multiple are provided, priority is:
 *       `farmerId` → `farmerPhone` → `farmerName`.
 *
 *       This record is stored separately from normal milk deliveries and does **not**
 *       count toward milk earnings in the monthly payment summary.
 *     tags:
 *       - Dead Milk Records
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - liters
 *               - reason
 *               - recordedAt
 *             properties:
 *               farmerId:
 *                 type: integer
 *                 example: 1
 *                 description: Farmer's ID. One of farmerId, farmerPhone, or farmerName is required.
 *               farmerPhone:
 *                 type: string
 *                 example: "0788123456"
 *                 description: Farmer's phone number. Used if farmerId is not provided.
 *               farmerName:
 *                 type: string
 *                 example: "Jean Bosco Nkurunziza"
 *                 description: Farmer's full name. Used if neither farmerId nor farmerPhone is provided.
 *               liters:
 *                 type: number
 *                 example: 5
 *                 description: Litres of rejected milk (required).
 *               reason:
 *                 type: string
 *                 example: "Bad smell"
 *                 description: Reason the milk was rejected (required).
 *               notes:
 *                 type: string
 *                 example: "Milk was sour"
 *                 description: Optional extra details.
 *               recordedAt:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-08"
 *                 description: Date the milk was rejected (required).
 *     responses:
 *       201:
 *         description: Dead milk record created successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: 1
 *                 farmerId: 1
 *                 farmerName: "Jean Bosco Nkurunziza"
 *                 farmerPhone: "0788123456"
 *                 liters: 5
 *                 reason: "Bad smell"
 *                 notes: "Milk was sour"
 *                 recordedAt: "2026-06-08"
 *                 createdAt: "2026-06-08T09:00:00.000Z"
 *               message: "Dead milk record created successfully."
 *       400:
 *         description: Validation error — invalid body or missing farmer identifier.
 *         content:
 *           application/json:
 *             examples:
 *               missing_identifier:
 *                 summary: No farmer identifier provided
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "VALIDATION_ERROR"
 *                     message: "At least one of farmerId, farmerPhone, or farmerName is required to identify the farmer."
 *                     statusCode: 400
 *               invalid_liters:
 *                 summary: Invalid liters value
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "VALIDATION_ERROR"
 *                     message: "liters must be greater than 0."
 *                     statusCode: 400
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Farmer not found in this collection center.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: "NOT_FOUND"
 *                 message: "Farmer with phone 0788123456 not found or does not belong to this collection center."
 *                 statusCode: 404
 *       500:
 *         description: Internal server error.
 */
router.post("/", createDeadMilkRecord);

/**
 * @swagger
 * /dead-milk-record:
 *   get:
 *     summary: Get all dead milk records for this collection center
 *     description: |
 *       Returns all rejected milk records for the authenticated collection center,
 *       joined with farmer info. Ordered by `recordedAt` descending (most recent first).
 *
 *       Optionally filter by `?month=YYYY-MM` to see only a specific month's records.
 *     tags:
 *       - Dead Milk Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: string
 *           example: "2026-06"
 *         description: Filter by month in YYYY-MM format. Returns all months if omitted.
 *     responses:
 *       200:
 *         description: Dead milk records retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 records:
 *                   - id: 1
 *                     farmerId: 1
 *                     farmerName: "Jean Bosco Nkurunziza"
 *                     farmerPhone: "0788123456"
 *                     liters: 5
 *                     reason: "Bad smell"
 *                     notes: "Milk was sour"
 *                     recordedAt: "2026-06-08"
 *                     createdAt: "2026-06-08T09:00:00.000Z"
 *                   - id: 2
 *                     farmerId: 2
 *                     farmerName: "Alice Uwera"
 *                     farmerPhone: "0789001122"
 *                     liters: 3
 *                     reason: "Contaminated"
 *                     notes: null
 *                     recordedAt: "2026-06-10"
 *                     createdAt: "2026-06-10T11:00:00.000Z"
 *                 totalDeadLiters: 8
 *               message: "Dead milk records retrieved successfully."
 *       400:
 *         description: Invalid month format.
 *       401:
 *         description: Unauthorized.
 */
router.get("/", getAllDeadMilkRecords);

/**
 * @swagger
 * /dead-milk-record/farmer-history:
 *   get:
 *     summary: Get dead milk history for a specific farmer
 *     description: |
 *       Returns all rejected milk records for a farmer identified by phone number,
 *       scoped to the authenticated collection center.
 *     tags:
 *       - Dead Milk Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *           example: "0788123456"
 *         description: The farmer's phone number.
 *     responses:
 *       200:
 *         description: Farmer dead milk history retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 farmer:
 *                   id: 1
 *                   farmerName: "Jean Bosco Nkurunziza"
 *                   farmerPhone: "0788123456"
 *                 records:
 *                   - id: 1
 *                     liters: 5
 *                     reason: "Bad smell"
 *                     notes: "Milk was sour"
 *                     recordedAt: "2026-06-08"
 *                     createdAt: "2026-06-08T09:00:00.000Z"
 *                 totalDeadLiters: 5
 *               message: "Farmer dead milk history retrieved successfully."
 *       400:
 *         description: Missing or invalid phone query parameter.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Farmer not found.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: "NOT_FOUND"
 *                 message: "Farmer with phone number 0799999999 not found."
 *                 statusCode: 404
 */
router.get("/farmer-history", getFarmerDeadMilkHistory);

export default router;