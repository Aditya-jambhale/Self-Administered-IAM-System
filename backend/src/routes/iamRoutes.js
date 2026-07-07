import express from "express";
import policyRoutes from "./policyRoutes.js";
import groupRoutes from "./groupRoutes.js";
import userRoutes from "./userRoutes.js";
import { ACTIONS, VALID_ACTIONS } from "../constants/actions.js";
import requireIam from "../middleware/requireIam.js";
import { sendSuccess } from "../utils/response.js";

const router = express.Router();

router.get("/actions", requireIam("iam:ListPolicies"), (req, res) => {
  sendSuccess(res, { grouped: ACTIONS, all: VALID_ACTIONS });
});

router.use("/policies", policyRoutes);
router.use("/groups", groupRoutes);
router.use("/users", userRoutes);

export default router;

