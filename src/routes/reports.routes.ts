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
 *     summary: Center-wide settlement report
 *     description: |
 *       Aggregates the financial position of every farmer in the collection center
 *       for the specified period. Supports two ways to define the period:
 *
 *       **Option A — Calendar month:**
 *       `?month=2026-06`
 *
 *       **Option B — Custom date range:**
 *       `?startDate=2026-06-01&endDate=2026-06-30`
 *
 *       Rules:
 *       - `month` and `startDate/endDate` are mutually exclusive.
 *       - If only `startDate` is given, `endDate` defaults to end of that same day.
 *       - If only `endDate` is given, `startDate` defaults to start of that same day.
 *       - If neither is given, defaults to the current calendar month.
 *       - `endDate` cannot be before `startDate`.
 *
 *       The response always includes `period`, `start_date`, and `end_date` so
 *       the frontend knows exactly what window was used.
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
 *         description: Calendar month in YYYY-MM format. Mutually exclusive with startDate/endDate.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-06-01"
 *         description: Start of custom date range (inclusive). Mutually exclusive with month.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-06-30"
 *         description: End of custom date range (inclusive). Mutually exclusive with month.
 *     responses:
 *       200:
 *         description: Settlement report generated successfully.
 *         content:
 *           application/json:
 *             examples:
 *               month_filter:
 *                 summary: Using month filter
 *                 value:
 *                   success: true
 *                   data:
 *                     period: "2026-06"
 *                     start_date: "2026-06-01"
 *                     end_date: "2026-06-30"
 *                     milk_revenue: 500000
 *                     product_deductions: 84400
 *                     previous_debt: 25000
 *                     final_payments: 390600
 *                     carried_debts: 18800
 *                     dead_milk_liters: 12.50
 *                     total_farmers: 12
 *                     farmers_in_debt: 3
 *                     per_farmer_report:
 *                       - farmer_id: 1
 *                         farmer_name: "John Doe"
 *                         milk_earnings: 45000
 *                         products_taken: 8000
 *                         previous_debt: 2000
 *                         final_payment: 35000
 *                         carried_debt: 0
 *                         dead_milk_liters: 3.00
 *                       - farmer_id: 2
 *                         farmer_name: "Alice Uwera"
 *                         milk_earnings: 38000
 *                         products_taken: 12000
 *                         previous_debt: 5000
 *                         final_payment: 21000
 *                         carried_debt: 0
 *                         dead_milk_liters: 2.50
 *                   message: "Settlement report generated successfully."
 *               range_filter:
 *                 summary: Using custom date range
 *                 value:
 *                   success: true
 *                   data:
 *                     period: "2026-06-01 to 2026-06-15"
 *                     start_date: "2026-06-01"
 *                     end_date: "2026-06-15"
 *                     milk_revenue: 250000
 *                     product_deductions: 42000
 *                     previous_debt: 10000
 *                     final_payments: 198000
 *                     carried_debts: 5000
 *                     dead_milk_liters: 6.00
 *                     total_farmers: 12
 *                     farmers_in_debt: 1
 *                     per_farmer_report:
 *                       - farmer_id: 1
 *                         farmer_name: "John Doe"
 *                         milk_earnings: 22000
 *                         products_taken: 4000
 *                         previous_debt: 1000
 *                         final_payment: 17000
 *                         carried_debt: 0
 *                         dead_milk_liters: 1.50
 *                       - farmer_id: 2
 *                         farmer_name: "Alice Uwera"
 *                         milk_earnings: 18000
 *                         products_taken: 6000
 *                         previous_debt: 4000
 *                         final_payment: 0
 *                         carried_debt: 8000
 *                         dead_milk_liters: 2.00
 *                   message: "Settlement report generated successfully."
 *       400:
 *         description: Invalid date parameters.
 *         content:
 *           application/json:
 *             examples:
 *               both_provided:
 *                 summary: month and startDate both provided
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "VALIDATION_ERROR"
 *                     message: "Provide either month or startDate/endDate — not both."
 *                     statusCode: 400
 *               end_before_start:
 *                 summary: endDate before startDate
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "VALIDATION_ERROR"
 *                     message: "endDate cannot be before startDate."
 *                     statusCode: 400
 *               bad_month:
 *                 summary: Invalid month format
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "VALIDATION_ERROR"
 *                     message: "month must be in YYYY-MM format (e.g. \"2026-06\")."
 *                     statusCode: 400
 *       401:
 *         description: Unauthorized.
 */
router.get("/settlements", getSettlementReport);

/**
 * @swagger
 * /reports/product-deductions:
 *   get:
 *     summary: Itemised product deductions report
 *     description: |
 *       Returns a line-by-line list of every product purchase made across all
 *       farmers in this collection center for the given period, joined with
 *       farmer name. Also returns a `totalDeductions` summary field.
 *
 *       **Option A — Calendar month:**
 *       `?month=2026-06`
 *
 *       **Option B — Custom date range:**
 *       `?startDate=2026-06-01&endDate=2026-06-30`
 *
 *       Same mutual-exclusion rules as `/reports/settlements`.
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
 *         description: Calendar month in YYYY-MM format. Mutually exclusive with startDate/endDate.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-06-01"
 *         description: Start of custom date range (inclusive). Mutually exclusive with month.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-06-30"
 *         description: End of custom date range (inclusive). Mutually exclusive with month.
 *     responses:
 *       200:
 *         description: Product deductions report retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 period: "2026-06"
 *                 start_date: "2026-06-01"
 *                 end_date: "2026-06-30"
 *                 records:
 *                   - farmer_name: "John Doe"
 *                     product_name: "Animal Feed"
 *                     quantity: 2
 *                     unit: "Bags"
 *                     unit_price: 15000
 *                     total_amount: 30000
 *                     purchase_date: "2026-06-01"
 *                   - farmer_name: "Alice Uwera"
 *                     product_name: "Mineral Salt"
 *                     quantity: 5
 *                     unit: "Kg"
 *                     unit_price: 3000
 *                     total_amount: 15000
 *                     purchase_date: "2026-06-05"
 *                 totalDeductions: 45000
 *               message: "Product deductions report retrieved successfully."
 *       400:
 *         description: Invalid date parameters.
 *       401:
 *         description: Unauthorized.
 */
router.get("/product-deductions", getProductDeductionsReport);

export default router;