import { Router } from "express";
import {
    getSettlementReport,
    getProductDeductionsReport,
} from "../controllers/financials.controller.js";

const router = Router();

/**
 * @swagger
 * /reports/settlements:
 *   get:
 *     summary: Center-wide monthly settlement report
 *     description: >
 *       Aggregates the financial position of every farmer in the collection center
 *       for the given month. Shows total milk revenue, total product deductions,
 *       previous debts carried in, total cash to pay out, and total new debts
 *       rolling into next month.
 *     tags:
 *       - Reports
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
 *         description: Settlement report generated successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 month: "2026-06"
 *                 milk_revenue: 500000
 *                 product_deductions: 84400
 *                 previous_debt: 25000
 *                 final_payments: 390600
 *                 carried_debts: 18800
 *                 total_farmers: 12
 *                 farmers_in_debt: 3
 *               message: "Settlement report generated successfully."
 *       400:
 *         description: Invalid month format.
 *       401:
 *         description: Unauthorized.
 */
router.get("/settlements", getSettlementReport);

/**
 * @swagger
 * /reports/product-deductions:
 *   get:
 *     summary: Itemised product deductions report
 *     description: >
 *       Returns a line-by-line list of every product purchase made across all
 *       farmers in this collection center for the given month, joined with
 *       farmer name. Useful for auditing what products were given on credit.
 *     tags:
 *       - Reports
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
 *         description: Product deductions report retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - farmer_name: "John Doe"
 *                   product_name: "Animal Feed"
 *                   quantity: 2
 *                   unit: "Bags"
 *                   unit_price: 15000
 *                   total_amount: 30000
 *                   purchase_date: "2026-06-01"
 *               message: "Product deductions report retrieved successfully."
 *       400:
 *         description: Invalid month format.
 *       401:
 *         description: Unauthorized.
 */
router.get("/product-deductions", getProductDeductionsReport);

export default router;