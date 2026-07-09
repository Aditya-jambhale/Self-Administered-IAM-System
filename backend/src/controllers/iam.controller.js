import { ACTIONS, VALID_ACTIONS } from "../constants/actions.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { getUserWithIam, simulatePermissionForUser } from "../services/iamService.js";

// Retrieve list of grouped and individual IAM actions
export const getActions = (req, res) => {
  sendSuccess(res, {
    grouped: ACTIONS,
    all: VALID_ACTIONS
  });
};

// Simulate permission evaluation for a user performing a specific action
export const simulatePermission = asyncHandler(async (req, res) => {
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
});
