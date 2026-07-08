import express from "express";
import policyRoutes from "./policyRoutes.js";
import groupRoutes from "./groupRoutes.js";
import userRoutes from "./userRoutes.js";
import { ACTIONS, VALID_ACTIONS } from "../constants/actions.js";
import iampermissioncheck from "../middleware/iampermissioncheck.js";
import { sendSuccess } from "../utils/response.js";
import asyncHandler from "../utils/asyncHandler.js";
import { badRequest, notFound } from "../utils/httpError.js";
import authenticate from "../middleware/authenticate.js";
import { getUserWithIam, simulatePermissionForUser } from "../services/iamService.js";

const router = express.Router();

router.get("/actions", authenticate, (req, res) => {
    sendSuccess(res, {
        grouped: ACTIONS,
        all: VALID_ACTIONS
    });
});

router.post(
  "/simulate",
  asyncHandler(async (req, res) => {
    const { action } = req.body;
    if (!action) {
      throw badRequest("action is required");
    }

    let targetUserId;
    if (req.user.isRoot) {
      targetUserId = req.body.userId || req.user.id;
    } else {
      targetUserId = req.user.id;
    }

    const targetUser = await getUserWithIam(targetUserId);
    if (!targetUser) {
      throw notFound("Target user not found");
    }

    const result = simulatePermissionForUser(targetUser, action);

    sendSuccess(res, {
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
      action,
      allowed: result.allowed,
      reason: result.reason,
      steps: result.steps,
      evaluation: result.evaluation
    });
  }),
);

router.use("/policies", policyRoutes);
router.use("/groups", groupRoutes);
router.use("/users", userRoutes);

export default router;

