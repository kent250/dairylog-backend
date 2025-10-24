import { Router } from "express";
import { specs, swaggerUi } from '../config/swagger-doc.js';
import userRoutes from "./user.routes.js";

const router = Router();

router.use("/users", userRoutes);

router.use('/doc', swaggerUi.serve, swaggerUi.setup(specs));

export default router;
