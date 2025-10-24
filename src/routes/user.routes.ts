import { Router } from "express";
import { getUsers } from "../controllers/user.controller.js";
import { ApiResponse } from "../utils/api-response.js";
import { AppError } from "../utils/error-utils/AppError.js";
import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const fetchedUsers = await getUsers();

    // With custom message
    return ApiResponse.ok(res, fetchedUsers, "Profile retrieved successfully");
  } catch (error) {
    next(error);
  }
});

router.get("/test-errors/basic", () => {
  throw new AppError(ERROR_CODES.DATABASE_ERROR);
});

export default router;
