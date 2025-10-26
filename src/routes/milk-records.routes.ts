import { Router } from "express";
import { recordMilkDelivery } from "../controllers/milk-record.controller.js";
const router = Router();

/**
 * @swagger
 * /milk-records:
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
 *         description: Farmer not found
 *       500:
 *         description: Internal server error
 */
router.post('/', recordMilkDelivery);



export default router;








