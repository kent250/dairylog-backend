// ─────────────────────────────────────────────────────────────────────────────
// farmer-sub.routes.ts
// Routes mounted under /farmers — financial summary, purchase history, debts
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import {
    getFarmerFinancialSummary,
    getFarmersWithDebt,
} from "../controllers/financials.controller.js";
import { getFarmerPurchaseHistory } from "../controllers/farmer-purchases.controller.js";

const router = Router();

/**
 * @swagger
 * /farmers/debts:
 *   get:
 *     summary: Get all farmers with outstanding debt
 *     description: >
 *       Returns every farmer in this collection center whose loan obligations
 *       exceeded their milk earnings for the specified month. The result is
 *       sorted by largest debt first. The `carried_debt` field is the amount
 *       that will be automatically deducted next month.
 *     tags:
 *       - Farmers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           example: "2026-06"
 *         description: Target month in YYYY-MM format. Defaults to the current month.
 *     responses:
 *       200:
 *         description: Farmers with debt retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 month: "2026-06"
 *                 farmers_with_debt: 1
 *                 farmers:
 *                   - farmer_id: 4
 *                     farmer_name: "Alice Uwera"
 *                     phone_number: "0788001122"
 *                     milk_earnings: 10000
 *                     products_taken: 15000
 *                     previous_debt: 0
 *                     carried_debt: 5000
 *               message: "Farmers with debt retrieved successfully."
 *       400:
 *         description: Invalid month format.
 *       401:
 *         description: Unauthorized.
 */
// NOTE: /debts must be registered BEFORE /:id to avoid Express matching "debts" as an ID
router.get("/debts", getFarmersWithDebt);

/**
 * @swagger
 * /farmers/{id}/financial-summary:
 *   get:
 *     summary: Get monthly financial summary for a farmer
 *     description: |
 *       Calculates the complete monthly payment breakdown for a single farmer.
 *
 *       ### Formula
 *       ```
 *       milk_earnings   = SUM(liters × price_per_liter)      [this month]
 *       products_taken  = SUM(total_amount of purchases)     [this month]
 *       previous_debt   = deficit carried from previous month (if any)
 *       final_payment   = milk_earnings - products_taken - previous_debt
 *       carried_debt    = MAX(0, deficit)  → rolls into next month
 *       ```
 *     tags:
 *       - Farmers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The farmer's ID.
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           example: "2026-06"
 *         description: Target month in YYYY-MM format. Defaults to the current month.
 *     responses:
 *       200:
 *         description: Financial summary retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 farmer_id: 1
 *                 farmer_name: "John Doe"
 *                 month: "2026-06"
 *                 milk_earnings: 120000
 *                 products_taken: 40000
 *                 previous_debt: 0
 *                 final_payment: 80000
 *                 carried_debt: 0
 *               message: "Financial summary retrieved successfully."
 *       400:
 *         description: Invalid month format or farmer ID.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Farmer not found.
 */
router.get("/:id/financial-summary", getFarmerFinancialSummary);

/**
 * @swagger
 * /farmers/{id}/purchases:
 *   get:
 *     summary: Get purchase history for a farmer
 *     description: >
 *       Returns all product purchases for the specified farmer, scoped to
 *       the authenticated collection center. Optionally filter by month.
 *     tags:
 *       - Farmers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The farmer's ID.
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           example: "2026-06"
 *         description: Optional. Filter by month in YYYY-MM format.
 *     responses:
 *       200:
 *         description: Farmer purchase history retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 purchases:
 *                   - id: 1
 *                     farmer_id: 1
 *                     product_name: "Animal Feed"
 *                     quantity: 2
 *                     unit: "Bags"
 *                     unit_price: 15000
 *                     total_amount: 30000
 *                     purchase_date: "2026-06-01"
 *                     notes: "Monthly feed"
 *                 totalPurchasesAmount: 30000
 *               message: "Farmer purchase history retrieved successfully."
 *       400:
 *         description: Invalid ID or month format.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Farmer not found.
 */
router.get("/:id/purchases", getFarmerPurchaseHistory);

export default router;