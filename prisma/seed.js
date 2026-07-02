const prisma = require("../src/config/prisma");
const { hashPassword } = require("../src/common/utils/password");
const { USER_ROLES } = require("../src/common/constants/roles");
const config = require("../src/config/env");

const seedUsers = [
  {
    userCode: "BO-001",
    fullName: "Business Owner",
    email: "business.owner@cispro.local",
    role: USER_ROLES.BUSINESS_OWNER,
  },
  {
    userCode: "OM-001",
    fullName: "Operation Manager",
    email: "operation.manager@cispro.local",
    role: USER_ROLES.OPERATION_MANAGER,
  },
  {
    userCode: "HR-001",
    fullName: "HR Manager",
    email: "hr@cispro.local",
    role: USER_ROLES.HR,
  },
  {
    userCode: "FAC-001",
    fullName: "Faculty User",
    email: "faculty@cispro.local",
    role: USER_ROLES.FACULTY,
  },
  {
    userCode: "STU-001",
    fullName: "Student User",
    email: "student@cispro.local",
    role: USER_ROLES.STUDENT,
  },
];

async function main() {
  const passwordHash = await hashPassword(config.seedDefaultPassword);

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        userCode: user.userCode,
        role: user.role,
        active: true,
        passwordHash,
        updatedBy: "seed",
      },
      create: {
        ...user,
        passwordHash,
        createdBy: "seed",
        updatedBy: "seed",
      },
    });
  }

  console.log("Phase 0 seed users created or updated.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
