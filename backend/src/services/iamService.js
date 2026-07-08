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


//simulate the permission (new feature)
export const simulatePermissionForUser = (user, action) => {
  const steps = [];
  steps.push(`Evaluating action "${action}" for user "${user.email}"`);

  if (user.isRoot) {
    steps.push("User is Root: bypassing all permission checks.");
    return {
      allowed: true,
      reason: "Root user bypass",
      steps,
      evaluation: {
        isRoot: true,
        directPolicies: [],
        groupPolicies: [],
        boundary: null,
        matchedAllow: true,
        matchedDeny: false
      }
    };
  }

  // Load policies
  const directPolicies = user.policyAttachments.map((a) => a.policy.name);
  const groupPolicies = user.groupMemberships.flatMap((m) =>
    m.group.policyAttachments.map((a) => `${m.group.name}: ${a.policy.name}`)
  );
  const boundary = user.boundary?.policy?.name || null;

  steps.push(`Loaded direct policies: ${directPolicies.length > 0 ? directPolicies.join(", ") : "none"}`);
  steps.push(`Loaded group policies: ${groupPolicies.length > 0 ? groupPolicies.join(", ") : "none"}`);

  const effectiveStatements = collectEffectiveStatements(user);
  
  // Check Deny
  const hasDeny = effectiveStatements.some(
    (statement) => statement.Effect === "Deny" && statement.Action.includes(action),
  );
  if (hasDeny) {
    steps.push(`Explicit Deny matched for action "${action}"`);
    steps.push("Decision: DENY (Explicit Deny wins over Allow)");
    return {
      allowed: false,
      reason: "Explicit Deny",
      steps,
      evaluation: {
        directPolicies,
        groupPolicies,
        boundary,
        matchedAllow: effectiveStatements.some(s => s.Effect === "Allow" && s.Action.includes(action)),
        matchedDeny: true
      }
    };
  }
  steps.push("No matching Explicit Deny statement found");

  // Check Allow
  const hasAllow = effectiveStatements.some(
    (statement) => statement.Effect === "Allow" && statement.Action.includes(action),
  );
  if (!hasAllow) {
    steps.push(`No matching Explicit Allow statement found for action "${action}"`);
    steps.push("Decision: DENY (Implicit Deny due to no matching Allow)");
    return {
      allowed: false,
      reason: "Implicit Deny",
      steps,
      evaluation: {
        directPolicies,
        groupPolicies,
        boundary,
        matchedAllow: false,
        matchedDeny: false
      }
    };
  }
  steps.push(`Explicit Allow statement matched for action "${action}"`);

  // Check Boundary
  if (!user.boundary) {
    steps.push("No Permissions Boundary set on the user");
    steps.push("Decision: ALLOW (Explicit Allow matched and no boundary set)");
    return {
      allowed: true,
      reason: "Explicit Allow",
      steps,
      evaluation: {
        directPolicies,
        groupPolicies,
        boundary,
        matchedAllow: true,
        matchedDeny: false
      }
    };
  }
  steps.push(`Permissions Boundary is set: "${boundary}"`);

  const boundaryAllows = policyStatements(user.boundary.policy).some(
    (statement) => statement.Effect === "Allow" && statement.Action.includes(action),
  );
  if (!boundaryAllows) {
    steps.push(`Permissions Boundary does NOT allow action "${action}"`);
    steps.push("Decision: DENY (Permissions boundary caps permissions)");
    return {
      allowed: false,
      reason: "Permissions Boundary",
      steps,
      evaluation: {
        directPolicies,
        groupPolicies,
        boundary,
        matchedAllow: true,
        matchedDeny: false,
        boundaryAllows: false
      }
    };
  }
  steps.push(`Permissions Boundary allows action "${action}"`);
  steps.push("Decision: ALLOW (Explicit Allow within boundary)");
  return {
    allowed: true,
    reason: "Explicit Allow within boundary",
    steps,
    evaluation: {
      directPolicies,
      groupPolicies,
      boundary,
      matchedAllow: true,
      matchedDeny: false,
      boundaryAllows: true
    }
  };
};
