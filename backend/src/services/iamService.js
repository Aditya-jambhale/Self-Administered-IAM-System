import prisma from "../config/prisma.js";
import { ACTIONS } from "../constants/actions.js";
import { forbidden } from "../utils/httpError.js";
import { getAllowActions } from "../utils/policyValidation.js";

const policyStatements = (policy) => {
  if (!policy) {
    return [];
  }

  if (Array.isArray(policy.statements)) {
    return policy.statements;
  }

  if (policy.statements && Array.isArray(policy.statements.statements)) {
    return policy.statements.statements;
  }

  return [];
};

export const getUserWithIam = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      policyAttachments: { include: { policy: true } },
      groupMemberships: {
        include: {
          group: {
            include: {
              policyAttachments: { include: { policy: true } },
            },
          },
        },
      },
      boundary: { include: { policy: true } },
    },
  });
};

export const collectEffectiveStatements = (user) => {
  const directStatements = user.policyAttachments.flatMap((attachment) =>
    policyStatements(attachment.policy),
  );
  const groupStatements = user.groupMemberships.flatMap((membership) =>
    membership.group.policyAttachments.flatMap((attachment) => policyStatements(attachment.policy)),
  );

  return [...directStatements, ...groupStatements];
};

export const evaluatePermissionForUser = (user, action) => {
  if (user.isRoot) {
    return { allowed: true, reason: "Root user bypass" };
  }

  const effectiveStatements = collectEffectiveStatements(user);
  const hasDeny = effectiveStatements.some(
    (statement) => statement.Effect === "Deny" && statement.Action.includes(action),
  );

  if (hasDeny) {
    return { allowed: false, reason: "Explicit deny" };
  }

  const hasAllow = effectiveStatements.some(
    (statement) => statement.Effect === "Allow" && statement.Action.includes(action),
  );

  if (!hasAllow) {
    return { allowed: false, reason: "Implicit deny" };
  }

  if (!user.boundary) {
    return { allowed: true, reason: "Explicit allow" };
  }

  const boundaryAllows = policyStatements(user.boundary.policy).some(
    (statement) => statement.Effect === "Allow" && statement.Action.includes(action),
  );

  if (!boundaryAllows) {
    return { allowed: false, reason: "Permissions boundary does not allow this action" };
  }

  return { allowed: true, reason: "Explicit allow within boundary" };
};

export const userHasPermission = async (userId, action) => {
  const user = await getUserWithIam(userId);

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  return evaluatePermissionForUser(user, action);
};

export const assertCanDelegateStatements = async (requestingUser, statements) => {
  if (requestingUser.isRoot) {
    return;
  }

  const allowActions = getAllowActions(statements);

  for (const action of allowActions) {
    const result = await userHasPermission(requestingUser.id, action);
    if (!result.allowed) {
      throw forbidden(`Delegation denied: you do not currently have ${action}`);
    }
  }
};

export const buildEffectivePermissionsSummary = (user) => {
  return Object.fromEntries(
    Object.entries(ACTIONS).map(([namespace, actions]) => [
      namespace,
      actions.map((action) => {
        const result = evaluatePermissionForUser(user, action);
        return {
          action,
          allowed: result.allowed,
          reason: result.reason,
        };
      }),
    ]),
  );
};

export const getPolicyStatementCount = (policy) => policyStatements(policy).length;
export const getPolicyAllowActions = (policy) => getAllowActions(policyStatements(policy));
