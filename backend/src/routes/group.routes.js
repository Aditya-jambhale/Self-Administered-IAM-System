import express from "express";
import iampermissioncheck from "../middleware/iampermissioncheck.js";
import {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  addUserToGroup,
  removeUserFromGroup,
  attachGroupPolicy,
  detachGroupPolicy,
} from "../controllers/group.controllers.js";

const router = express.Router();

router.get("/", iampermissioncheck("iam:ListGroups"), listGroups);
router.get("/:id", iampermissioncheck("iam:GetGroup"), getGroup);
router.post("/", iampermissioncheck("iam:CreateGroup"), createGroup);
router.put("/:id", iampermissioncheck("iam:UpdateGroup"), updateGroup);
router.delete("/:id", iampermissioncheck("iam:DeleteGroup"), deleteGroup);

router.post("/:id/members", iampermissioncheck("iam:AddUserToGroup"), addUserToGroup);
router.delete("/:id/members/:userId", iampermissioncheck("iam:RemoveUserFromGroup"), removeUserFromGroup);

router.post("/:id/policies", iampermissioncheck("iam:AttachGroupPolicy"), attachGroupPolicy);
router.delete("/:id/policies/:policyId", iampermissioncheck("iam:DetachGroupPolicy"), detachGroupPolicy);

export default router;
