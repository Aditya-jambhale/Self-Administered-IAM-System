import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const readOnlyStatements = [
  {
    Effect: "Allow",
    Action: [
      "reports:List",
      "reports:Read",
      "alerts:List",
      "alerts:Read",
      "audit:List",
      "audit:Read",
    ],
    Resource: ["*"],
  },
];

const reportsFullStatements = [
  {
    Effect: "Allow",
    Action: [
      "reports:List",
      "reports:Read",
      "reports:Create",
      "reports:Update",
      "reports:Delete",
    ],
    Resource: ["*"],
  },
];

const users = [
  { name: "Root", email: "root@org.local", password: "root1234", isRoot: true },
  { name: "Alice", email: "alice@org.local", password: "alice1234", isRoot: false },
  { name: "Bob", email: "bob@org.local", password: "bob1234", isRoot: false },
  { name: "Charlie", email: "charlie@org.local", password: "charlie1234", isRoot: false },
];

async function main() {
  await prisma.userBoundary.deleteMany();
  await prisma.userPolicyAttachment.deleteMany();
  await prisma.groupPolicyAttachment.deleteMany();
  await prisma.userGroupMembership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.user.deleteMany();

  const createdUsers = {};
  for (const user of users) {
    createdUsers[user.email] = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        passwordHash: await bcrypt.hash(user.password, 12),
        isRoot: user.isRoot,
      },
    });
  }

  const readOnlyPolicy = await prisma.policy.create({
    data: {
      name: "ReadOnlyAccess",
      description: "Allows read-only access to reports, alerts, and audit logs.",
      type: "MANAGED",
      statements: readOnlyStatements,
    },
  });

  await prisma.policy.create({
    data: {
      name: "ReportsFullAccess",
      description: "Allows all report actions.",
      type: "MANAGED",
      statements: reportsFullStatements,
    },
  });

  const viewersGroup = await prisma.group.create({
    data: {
      name: "Viewers",
      description: "Read-only users for reports, alerts, and audit logs.",
    },
  });

  await prisma.groupPolicyAttachment.create({
    data: { groupId: viewersGroup.id, policyId: readOnlyPolicy.id },
  });

  await prisma.userGroupMembership.create({
    data: { userId: createdUsers["alice@org.local"].id, groupId: viewersGroup.id },
  });

  console.log("Seed complete");
  console.table(users.map(({ name, email, password }) => ({ name, email, password })));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
