import prisma from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { assertCanDelegateStatements } from "../services/iamService.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { sendSuccess } from "../utils/response.js";

const groupDetailInclude = {
  members: {
    include: {
      user: {
        select: { id: true, name: true, email: true, isRoot: true }
      }
    }
  },
  policyAttachments: { include: { policy: true } },
};

const findGroup = async (id) => prisma.group.findUnique({ where: { id }, include: groupDetailInclude });

const ensureGroupNameAvailable = async (name, exceptId = undefined) => {
  if (!name) {
    return;
  }

  const existing = await prisma.group.findUnique({ where: { name } });
  if (existing && existing.id !== exceptId) {
    throw conflict("A group with this name already exists");
  }
};

const ensureNotRootGroupChange = (req, group) => {
  if (req.user.isRoot) {
    return;
  }

  if (group.members.some((membership) => membership.user.isRoot)) {
    throw forbidden("Only root can modify a group that contains the root user");
  }
};

// Retrieve all groups with member and policy counts
export const listGroups = asyncHandler(async (req, res) => {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { members: true, policyAttachments: true } } },
  });

  sendSuccess(
    res,
    groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      memberCount: group._count.members,
      policyCount: group._count.policyAttachments,
    })),
  );
});

// Retrieve details of a specific group by its ID
export const getGroup = asyncHandler(async (req, res) => {
  const group = await findGroup(req.params.id);
  if (!group) {
    throw notFound("Group not found");
  }

  sendSuccess(res, group);
});

// Create a new group with a unique name
export const createGroup = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    throw badRequest("name is required");
  }

  await ensureGroupNameAvailable(name);
  const group = await prisma.group.create({ data: { name, description } });
  sendSuccess(res, group, 201);
});

// Update an existing group's name or description
export const updateGroup = asyncHandler(async (req, res) => {
  const group = await findGroup(req.params.id);
  if (!group) {
    throw notFound("Group not found");
  }

  ensureNotRootGroupChange(req, group);

  const data = {};
  if (req.body.name !== undefined) {
    if (!req.body.name) {
      throw badRequest("name cannot be empty");
    }
    await ensureGroupNameAvailable(req.body.name, group.id);
    data.name = req.body.name;
  }
  if (req.body.description !== undefined) {
    data.description = req.body.description;
  }
  if (Object.keys(data).length === 0) {
    throw badRequest("No valid fields supplied for update");
  }

  const updated = await prisma.group.update({ where: { id: group.id }, data });
  sendSuccess(res, updated);
});

// Delete a group and its associated inline policies
export const deleteGroup = asyncHandler(async (req, res) => {
  const group = await findGroup(req.params.id);
  if (!group) {
    throw notFound("Group not found");
  }

  ensureNotRootGroupChange(req, group);

  const inlinePolicyIds = group.policyAttachments
    .filter((attachment) => attachment.policy.type === "INLINE")
    .map((attachment) => attachment.policyId);

  await prisma.$transaction([
    prisma.group.delete({ where: { id: group.id } }),
    prisma.policy.deleteMany({ where: { id: { in: inlinePolicyIds } } }),
  ]);

  sendSuccess(res, { id: group.id });
});

// Add a user to a group's membership
export const addUserToGroup = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    throw badRequest("userId is required");
  }

  const [group, user] = await Promise.all([
    findGroup(req.params.id),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!group) {
    throw notFound("Group not found");
  }
  if (!user) {
    throw notFound("User not found");
  }
  if (user.isRoot && !req.user.isRoot) {
    throw forbidden("Only root can modify the root user's access");
  }
  ensureNotRootGroupChange(req, group);

  const existing = await prisma.userGroupMembership.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  });
  if (existing) {
    throw conflict("User is already a member of this group");
  }

  const membership = await prisma.userGroupMembership.create({ data: { userId, groupId: group.id } });
  sendSuccess(res, membership, 201);
});

// Remove a user from a group's membership
export const removeUserFromGroup = asyncHandler(async (req, res) => {
  const group = await findGroup(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!group) {
    throw notFound("Group not found");
  }
  if (!user) {
    throw notFound("User not found");
  }
  if (user.isRoot && !req.user.isRoot) {
    throw forbidden("Only root can modify the root user's access");
  }
  ensureNotRootGroupChange(req, group);

  await prisma.userGroupMembership.delete({
    where: { userId_groupId: { userId: req.params.userId, groupId: group.id } },
  });

  sendSuccess(res, { userId: req.params.userId, groupId: group.id });
});

// Attach a managed policy to a group
export const attachGroupPolicy = asyncHandler(async (req, res) => {
  const { policyId } = req.body;
  if (!policyId) {
    throw badRequest("policyId is required");
  }

  const [group, policy] = await Promise.all([
    findGroup(req.params.id),
    prisma.policy.findUnique({ where: { id: policyId } }),
  ]);

  if (!group) {
    throw notFound("Group not found");
  }
  if (!policy) {
    throw notFound("Policy not found");
  }
  if (policy.type !== "MANAGED") {
    throw badRequest("Only MANAGED policies can be attached to groups");
  }

  ensureNotRootGroupChange(req, group);
  await assertCanDelegateStatements(req.user, policy.statements);

  const existing = await prisma.groupPolicyAttachment.findUnique({
    where: { groupId_policyId: { groupId: group.id, policyId } },
  });
  if (existing) {
    throw conflict("Policy is already attached to this group");
  }

  const attachment = await prisma.groupPolicyAttachment.create({ data: { groupId: group.id, policyId } });
  sendSuccess(res, attachment, 201);
});

// Detach a policy from a group, deleting it if it is an inline policy
export const detachGroupPolicy = asyncHandler(async (req, res) => {
  const group = await findGroup(req.params.id);
  if (!group) {
    throw notFound("Group not found");
  }
  const policy = await prisma.policy.findUnique({ where: { id: req.params.policyId } });
  if (!policy) {
    throw notFound("Policy not found");
  }
  ensureNotRootGroupChange(req, group);

  if (policy.type === "INLINE") {
    await prisma.policy.delete({ where: { id: policy.id } });
  } else {
    await prisma.groupPolicyAttachment.delete({
      where: { groupId_policyId: { groupId: group.id, policyId: policy.id } },
    });
  }

  sendSuccess(res, { groupId: group.id, policyId: req.params.policyId });
});
