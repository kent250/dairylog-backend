import { Router } from "express";
import { specs, swaggerUi } from "../config/swagger-doc.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import farmerRoutes from "./farmer.routes.js";
import milkRecordsRoutes from "./milk-records.routes.js";
import deadMilkRecordRoutes from "./dead-milk-record.routes.js";
import farmerPurchasesRoutes from "./farmer-purchases.routes.js";  // NEW
import farmerSubRoutes from "./farmer-sub.routes.js";
import reportsRoutes from "./reports.routes.js";

const router = Router();

router.use("/auth", authRoutes);

router.use("/doc", swaggerUi.serve, swaggerUi.setup(specs));

router.use("/user", authenticateToken, userRoutes);
router.use("/farmer", authenticateToken, farmerRoutes);
router.use("/milk-record", authenticateToken, milkRecordsRoutes);
router.use("/dead-milk-record", authenticateToken, deadMilkRecordRoutes);
router.use("/farmer-purchases", authenticateToken, farmerPurchasesRoutes);
router.use("/farmers", authenticateToken, farmerSubRoutes);
router.use("/reports", authenticateToken, reportsRoutes);
export default router;
