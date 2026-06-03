import { Router } from "express";
import {
    createPurchase,
    getAllPurchases,
    getPurchaseById,
    updatePurchase,
    getFarmerPurchaseHistory,
} from "../controllers/farmer-purchases.controller.js";

const router = Router();

/**
 * @swagger
 * /farmer-purchases:
 *   post:
 *     summary: Record a product purchase for a farmer
 *     description: >
 *       Records a product taken on credit by a farmer (e.g. Animal Feed, Cow Salt,
 *       medicine). The product name is entered freely — no fixed list.
 *       `total_amount` is computed automatically as `quantity × unit_price`.
 *       This will be deducted from the farmer's monthly milk payment.
 *     tags:
 *       - Farmer Purchases
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
 *               - product_name
 *               - quantity
 *               - unit
 *               - unit_price
 *               - purchase_date
 *             properties:
 *               farmer_id:
 *                 type: integer
 *                 example: 1
 *               product_name:
 *                 type: string
 *                 example: "Animal Feed"
 *               quantity:
 *                 type: number
 *                 example: 2
 *               unit:
 *                 type: string
 *                 example: "Bags"
 *               unit_price:
 *                 type: number
 *                 example: 15000
 *               purchase_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-01"
 *               notes:
 *                 type: string
 *                 example: "Monthly feed"
 *     responses:
 *       201:
 *         description: Purchase recorded successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: 1
 *                 farmer_id: 1
 *                 farmer_name: "John Doe"
 *                 product_name: "Animal Feed"
 *                 quantity: 2
 *                 unit: "Bags"
 *                 unit_price: 15000
 *                 total_amount: 30000
 *                 purchase_date: "2026-06-01"
 *                 notes: "Monthly feed"
 *                 createdAt: "2026-06-01T08:00:00.000Z"
 *               message: "Purchase recorded successfully."
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Farmer not found.
 *       500:
 *         description: Internal server error.
 */
router.post("/", createPurchase);

/**
 * @swagger
 * /farmer-purchases:
 *   get:
 *     summary: Get all purchases for this collection center
 *     description: Returns all product purchases recorded by the authenticated
 *       collection center, across all farmers, ordered by purchase date descending.
 *     tags:
 *       - Farmer Purchases
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Purchases retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: 1
 *                   farmer_id: 1
 *                   farmer_name: "John Doe"
 *                   product_name: "Animal Feed"
 *                   quantity: 2
 *                   unit: "Bags"
 *                   unit_price: 15000
 *                   total_amount: 30000
 *                   purchase_date: "2026-06-01"
 *                   notes: "Monthly feed"
 *               message: "Purchases retrieved successfully."
 *       401:
 *         description: Unauthorized.
 */
router.get("/", getAllPurchases);

/**
 * @swagger
 * /farmer-purchases/{id}:
 *   get:
 *     summary: Get a single purchase by ID
 *     tags:
 *       - Farmer Purchases
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The purchase record ID.
 *     responses:
 *       200:
 *         description: Purchase retrieved successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Purchase not found.
 */
router.get("/:id", getPurchaseById);

/**
 * @swagger
 * /farmer-purchases/{id}:
 *   put:
 *     summary: Update a purchase record
 *     description: >
 *       All fields except `farmer_id` can be updated. If `quantity` or
 *       `unit_price` is changed, `total_amount` is recomputed automatically.
 *       Only send the fields you want to change.
 *     tags:
 *       - Farmer Purchases
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_name:
 *                 type: string
 *                 example: "Cow Medicine"
 *               quantity:
 *                 type: number
 *                 example: 3
 *               unit:
 *                 type: string
 *                 example: "Bottles"
 *               unit_price:
 *                 type: number
 *                 example: 5000
 *               purchase_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-02"
 *               notes:
 *                 type: string
 *                 example: "Updated quantity"
 *     responses:
 *       200:
 *         description: Purchase updated successfully.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Purchase not found.
 */
router.put("/:id", updatePurchase);

export default router;