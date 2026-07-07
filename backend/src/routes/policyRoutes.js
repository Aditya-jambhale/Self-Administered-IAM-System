import express from "express";
import prisma from "../config/prisma.js";
import requireIam from "../middleware/requireIam.js";
import asyncHandler from "../utils/asyncHandler.js";
import { assertCanDelegateStatements, getPolicyStatementCount } from "../services/iamService.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { validatePolicyStatements } from "../utils/policyValidation.js";
import { sendSuccess } from "../utils/response.js";

const router = express.Router();

const policyInclude = {
  userAttachments: { include: { user: { select: { id: true, name: true, email: true, isRoot: true } } } },
  groupAttachments: {
    include: {
      group: {
        include: {
          members: { include: { user: { select: { id: true, isRoot: true } } } },
        },
      },
    },
  },
  boundaries: { include: { user: { select: { id: true, name: true, email: true, isRoot: true } } } },
};

const ensurePolicyNameAvailable = async (name, exceptId = undefined) => {
  if (!name) {
    return;
  }

  const existing = await prisma.policy.findUnique({ where: { name } });
  if (existing && existing.id !== exceptId) {
    throw conflict("A policy with this name already exists");
  }
};

const ensureNotModifyingRootPolicy = (req, policy) => {
  if (req.user.isRoot) {
    return;
  }

  const attachedToRoot =
    policy.userAttachments?.some((attachment) => attachment.user.isRoot) ||
    policy.boundaries?.some((boundary) => boundary.user.isRoot) ||
    policy.groupAttachments?.some((attachment) =>
      attachment.group.members.some((membership) => membership.user.isRoot),
    );

  if (attachedToRoot) {
    throw forbidden("Only root can modify policies attached to the root user");
  }
};

router.get(
  "/",
  requireIam("iam:ListPolicies"),
  asyncHandler(async (req, res) => {
    const policies = await prisma.policy.findMany({ orderBy: { createdAt: "asc" } });
    sendSuccess(
      res,
      policies.map((policy) => ({ ...policy, statementCount: getPolicyStatementCount(policy) })),
    );
  }),
);

router.get(
  "/:id",
  requireIam("iam:GetPolicy"),
  asyncHandler(async (req, res) => {
    const policy = await prisma.policy.findUnique({ where: { id: req.params.id }, include: policyInclude });
    if (!policy) {
      throw notFound("Policy not found");
    }

    sendSuccess(res, policy);
  }),
);

router.post(
  "/",
  requireIam("iam:CreatePolicy"),
  asyncHandler(async (req, res) => {
    const { name, description, type } = req.body;

    if (!name || !type || !req.body.statements) {
      throw badRequest("name, type, and statements are required");
    }

    if (!["MANAGED", "INLINE"].includes(type)) {
      throw badRequest('type must be "MANAGED" or "INLINE"');
    }

    await ensurePolicyNameAvailable(name);
    const statements = validatePolicyStatements(req.body.statements);
    await assertCanDelegateStatements(req.user, statements);

    const policy = await prisma.policy.create({
      data: { name, description, type, statements },
    });

    sendSuccess(res, policy, 201);
  }),
);

router.put(
  "/:id",
  requireIam("iam:UpdatePolicy"),
  asyncHandler(async (req, res) => {
    const policy = await prisma.policy.findUnique({ where: { id: req.params.id }, include: policyInclude });
    if (!policy) {
      throw notFound("Policy not found");
    }

    ensureNotModifyingRootPolicy(req, policy);

    const data = {};

    if (req.body.name !== undefined) {
      if (!req.body.name) {
        throw badRequest("name cannot be empty");
      }
      await ensurePolicyNameAvailable(req.body.name, policy.id);
      data.name = req.body.name;
    }

    if (req.body.description !== undefined) {
      data.description = req.body.description;
    }

    if (req.body.statements !== undefined) {
      const statements = validatePolicyStatements(req.body.statements);
      await assertCanDelegateStatements(req.user, statements);
      data.statements = statements;
    }

    if (Object.keys(data).length === 0) {
      throw badRequest("No valid fields supplied for update");
    }

    const updated = await prisma.policy.update({ where: { id: policy.id }, data });
    sendSuccess(res, updated);
  }),
);

router.delete(
  "/:id",
  requireIam("iam:DeletePolicy"),
  asyncHandler(async (req, res) => {
    const policy = await prisma.policy.findUnique({ where: { id: req.params.id }, include: policyInclude });
    if (!policy) {
      throw notFound("Policy not found");
    }

    ensureNotModifyingRootPolicy(req, policy);

    const userNames = policy.userAttachments.map((attachment) => attachment.user.email);
    const groupNames = policy.groupAttachments.map((attachment) => attachment.group.name);
    const boundaryUsers = policy.boundaries.map((boundary) => boundary.user.email);
    const isAttached = userNames.length > 0 || groupNames.length > 0 || boundaryUsers.length > 0;

    if (policy.type === "MANAGED" && isAttached && !req.user.isRoot) {
      throw badRequest("Managed policy is still attached", {
        users: userNames,
        groups: groupNames,
        boundaries: boundaryUsers,
      });
    }

    await prisma.$transaction([
      prisma.userBoundary.deleteMany({ where: { policyId: policy.id } }),
      prisma.policy.delete({ where: { id: policy.id } }),
    ]);
    sendSuccess(res, { id: policy.id });
  }),
);

export default router;




