import { Router } from "express";
import { specs, swaggerUi } from '../config/swagger-doc.js';
import authRoutes from "./auth.routes.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use("/auth", authRoutes);

router.use('/doc', swaggerUi.serve, swaggerUi.setup(specs));


export default router;
