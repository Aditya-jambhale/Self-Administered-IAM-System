import express from "express";
import prisma from "../config/prisma.js";
import iampermissioncheck from "../middleware/iampermissioncheck.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  assertCanDelegateStatements,
  buildEffectivePermissionsSummary,
  getUserWithIam,
} from "../services/iamService.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { sendSuccess } from "../utils/response.js";

const router = express.Router();

const ensureCanModifyTargetUserAccess = (req, targetUser) => {
  if (targetUser.isRoot && !req.user.isRoot) {
    throw forbidden("Only root can modify the root user's access");
  }
};

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  isRoot: true,
  createdAt: true,
  updatedAt: true,
};

router.get(
  "/",
  iampermissioncheck("iam:ListUsers"),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        ...publicUserSelect,
        _count: { select: { groupMemberships: true, policyAttachments: true } },
        boundary: { select: { policyId: true } },
      },
    });

    sendSuccess(
      res,
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isRoot: user.isRoot,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        groupCount: user._count.groupMemberships,
        directPolicyCount: user._count.policyAttachments,
        hasBoundary: Boolean(user.boundary),
      })),
    );
  }),
);

router.get(
  "/:id",
  iampermissioncheck("iam:GetUser"),
  asyncHandler(async (req, res) => {
    const user = await getUserWithIam(req.params.id);
    if (!user) {
      throw notFound("User not found");
    }

    sendSuccess(res, {
      id: user.id,
      name: user.name,
      email: user.email,
      isRoot: user.isRoot,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      directPolicies: user.policyAttachments.map((attachment) => attachment.policy),
      groups: user.groupMemberships.map((membership) => ({
        id: membership.group.id,
        name: membership.group.name,
        description: membership.group.description,
        policies: membership.group.policyAttachments.map((attachment) => attachment.policy),
      })),
      boundary: user.boundary?.policy || null,
      effectivePermissions: buildEffectivePermissionsSummary(user),
    });
  }),
);

router.post(
  "/:id/policies",
  iampermissioncheck("iam:AttachUserPolicy"),
  asyncHandler(async (req, res) => {
    const { policyId } = req.body;
    if (!policyId) {
      throw badRequest("policyId is required");
    }

    const [targetUser, policy] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.params.id } }),
      prisma.policy.findUnique({ where: { id: policyId } }),
    ]);

    if (!targetUser) {
      throw notFound("User not found");
    }
    if (!policy) {
      throw notFound("Policy not found");
    }
    if (policy.type !== "MANAGED") {
      throw badRequest("Only MANAGED policies can be attached directly to users");
    }

    ensureCanModifyTargetUserAccess(req, targetUser);
    await assertCanDelegateStatements(req.user, policy.statements);

    const existing = await prisma.userPolicyAttachment.findUnique({
      where: { userId_policyId: { userId: targetUser.id, policyId } },
    });
    if (existing) {
      throw conflict("Policy is already attached to this user");
    }

    const attachment = await prisma.userPolicyAttachment.create({ data: { userId: targetUser.id, policyId } });
    sendSuccess(res, attachment, 201);
  }),
);

router.delete(
  "/:id/policies/:policyId",
  iampermissioncheck("iam:DetachUserPolicy"),
  asyncHandler(async (req, res) => {
    const [targetUser, policy] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.params.id } }),
      prisma.policy.findUnique({ where: { id: req.params.policyId } }),
    ]);

    if (!targetUser) {
      throw notFound("User not found");
    }
    if (!policy) {
      throw notFound("Policy not found");
    }

    ensureCanModifyTargetUserAccess(req, targetUser);

    if (policy.type === "INLINE") {
      await prisma.policy.delete({ where: { id: policy.id } });
    } else {
      await prisma.userPolicyAttachment.delete({
        where: { userId_policyId: { userId: targetUser.id, policyId: policy.id } },
      });
    }

    sendSuccess(res, { userId: targetUser.id, policyId: req.params.policyId });
  }),
);

router.put(
  "/:id/boundary",
  iampermissioncheck("iam:PutUserBoundary"),
  asyncHandler(async (req, res) => {
    if (!req.user.isRoot) {
      throw forbidden("Only root can set user boundaries");
    }

    const { policyId } = req.body;
    if (!policyId) {
      throw badRequest("policyId is required");
    }

    const [targetUser, policy] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.params.id } }),
      prisma.policy.findUnique({ where: { id: policyId } }),
    ]);

    if (!targetUser) {
      throw notFound("User not found");
    }
    if (!policy) {
      throw notFound("Policy not found");
    }
    if (policy.type !== "MANAGED") {
      throw badRequest("Boundary must be a MANAGED policy");
    }
    if (targetUser.isRoot) {
      throw badRequest("The root user cannot have a boundary");
    }

    const boundary = await prisma.userBoundary.upsert({
      where: { userId: targetUser.id },
      update: { policyId },
      create: { userId: targetUser.id, policyId },
    });

    sendSuccess(res, boundary);
  }),
);

router.delete(
  "/:id/boundary",
  iampermissioncheck("iam:DeleteUserBoundary"),
  asyncHandler(async (req, res) => {
    if (!req.user.isRoot) {
      throw forbidden("Only root can remove user boundaries");
    }

    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!targetUser) {
      throw notFound("User not found");
    }
    if (targetUser.isRoot) {
      throw badRequest("The root user cannot have a boundary");
    }

    await prisma.userBoundary.delete({ where: { userId: targetUser.id } });
    sendSuccess(res, { userId: targetUser.id });
  }),
);

export default router;
