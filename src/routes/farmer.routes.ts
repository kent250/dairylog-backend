import { Router } from "express";
import {
    createFarmer,
    getAllFarmersForUser,
    findFarmerByPhoneForUser
} from '../controllers/farmer.controller.js';


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

/**
 * @swagger
 * /farmer:
 *   get:
 *     summary: Returns a paginated list of farmers belonging to the authenticated collection center. You can filter results by name or phone number, and control sorting and pagination through query parameters.
 *     description: >
 *       Retrieves a paginated list of farmers that belong to the currently authenticated collection center user.  
 *       Supports searching, pagination, and sorting by name, phone number, or creation date.
 *     tags:
 *       - Farmers
 *     security:
 *       - bearerAuth: []   # Protected route
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Filter farmers by name or phone number (case-insensitive).
 *         example: John
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number to retrieve.
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Number of farmers to return per page.
 *         example: 2
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, phoneNumber]
 *           default: createdAt
 *         description: Sort results by a specific field.
 *         example: name
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order direction.
 *         example: asc
 *     responses:
 *       200:
 *         description: Farmers retrieved successfully.
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
 *                         example: 5
 *                       farmer_name:
 *                         type: string
 *                         example: John Doe
 *                       phone_number:
 *                         type: string
 *                         example: 0789001122
 *                       sector:
 *                         type: string
 *                         example: Gitega
 *                       cell:
 *                         type: string
 *                         example: Nyamirambo
 *                       village:
 *                         type: string
 *                         example: Kigali
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-10-26T16:23:59.823Z
 *                 message:
 *                   type: string
 *                   example: Farmers retrieved successfully.
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       example: 2025-10-26T17:21:10.288Z
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *                         limit:
 *                           type: integer
 *                           example: 2
 *                         total:
 *                           type: integer
 *                           example: 5
 *                         hasNext:
 *                           type: boolean
 *                           example: true
 *                         hasPrev:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Invalid query parameters.
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
 *                       example: Invalid query parameters.
 *       401:
 *         description: Unauthorized – missing or invalid token.
 */
router.get('/', getAllFarmersForUser);



/**
 * @swagger
 * /farmer/lookup:
 *   get:
 *     summary: Find a farmer by phone number
 *     description: >
 *       Retrieves a single farmer record that matches the provided phone number,
 *       scoped to the authenticated collection center.  
 *       Requires a valid JWT access token.
 *     tags:
 *       - Farmers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *           example: "0788123456"
 *         description: The farmer's phone number to look up.
 *     responses:
 *       200:
 *         description: Farmer found successfully.
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
 *                       example: 1
 *                     farmer_name:
 *                       type: string
 *                       example: Jean Bosco Nkurunziza
 *                     phone_number:
 *                       type: string
 *                       example: "0788123456"
 *                     sector:
 *                       type: string
 *                       example: Gisozi
 *                     cell:
 *                       type: string
 *                       example: Musezero
 *                     village:
 *                       type: string
 *                       example: Kamasagara
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-10-26T15:51:40.422Z"
 *                 message:
 *                   type: string
 *                   example: Farmer found.
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
router.get('/lookup', findFarmerByPhoneForUser);



export default router;