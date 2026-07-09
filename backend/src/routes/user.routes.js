import express from "express";
import iampermissioncheck from "../middleware/iampermissioncheck.js";
import {
  listUsers,
  getUser,
  attachUserPolicy,
  detachUserPolicy,
  putUserBoundary,
  deleteUserBoundary,
} from "../controllers/users.controllers.js";

const router = express.Router();

router.get("/", iampermissioncheck("iam:ListUsers"), listUsers);
router.get("/:id", iampermissioncheck("iam:GetUser"), getUser);
router.post("/:id/policies", iampermissioncheck("iam:AttachUserPolicy"), attachUserPolicy);
router.delete("/:id/policies/:policyId", iampermissioncheck("iam:DetachUserPolicy"), detachUserPolicy);
router.put("/:id/boundary", iampermissioncheck("iam:PutUserBoundary"), putUserBoundary);
router.delete("/:id/boundary", iampermissioncheck("iam:DeleteUserBoundary"), deleteUserBoundary);

export default router;
