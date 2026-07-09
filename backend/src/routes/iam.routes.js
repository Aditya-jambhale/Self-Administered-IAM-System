import express from "express";
import { getActions, simulatePermission } from "../controllers/iam.controller.js";
import policyRoutes from "./policy.routes.js";
import groupRoutes from "./group.routes.js";
import userRoutes from "./user.routes.js";
import authenticate from "../middleware/auth.middleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.get("/actions", authenticate, getActions);
router.post("/simulate", asyncHandler(simulatePermission));

router.use("/policies", policyRoutes);
router.use("/groups", groupRoutes);
router.use("/users", userRoutes);

export default router;
