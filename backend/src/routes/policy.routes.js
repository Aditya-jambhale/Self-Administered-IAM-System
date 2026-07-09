import express from "express";
import iampermissioncheck from "../middleware/iampermissioncheck.js";
import {
  listPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
} from "../controllers/policy.controller.js";

const router = express.Router();

router.get("/", iampermissioncheck("iam:ListPolicies"), listPolicies);
router.get("/:id", iampermissioncheck("iam:GetPolicy"), getPolicy);
router.post("/", iampermissioncheck("iam:CreatePolicy"), createPolicy);
router.put("/:id", iampermissioncheck("iam:UpdatePolicy"), updatePolicy);
router.delete("/:id", iampermissioncheck("iam:DeletePolicy"), deletePolicy);

export default router;
