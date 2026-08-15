import prisma from "../config/prisma.js";
import config from "../config/env.js";
import { USER_ROLES } from "../common/constants/roles.js";
import { hashPassword } from "../common/utils/password.js";

const SYSTEM_USERS = [
  {
    userCode: "SA-001",
    fullName: "Super Admin",
    email: "superadmin.manager@cispro.com",
    role: USER_ROLES.SUPER_ADMIN,
    password: "superAdmin@cispro123",
  },
  {
    userCode: "BO-001",
    fullName: "Business Owner",
    email: "business.owner@cispro.com",
    role: USER_ROLES.BUSINESS_OWNER,
    password: config.seedDefaultPassword,
  },
  {
    userCode: "OM-001",
    fullName: "Operation Manager",
    email: "operation.manager@cispro.com",
    role: USER_ROLES.OPERATION_MANAGER,
    password: config.seedDefaultPassword,
  },
  {
    userCode: "HR-001",
    fullName: "HR Manager",
    email: "hr@cispro.local",
    role: USER_ROLES.HR,
    password: config.seedDefaultPassword,
  },
  {
    userCode: "FAC-001",
    fullName: "Faculty User",
    email: "faculty@cispro.local",
    role: USER_ROLES.FACULTY,
    password: config.seedDefaultPassword,
  },
  {
    userCode: "STU-001",
    fullName: "Student User",
    email: "student@cispro.local",
    role: USER_ROLES.STUDENT,
    password: config.seedDefaultPassword,
  },
];

export async function ensureSystemUsers() {
  for (const user of SYSTEM_USERS) {
    const passwordHash = await hashPassword(user.password);
    const existingUser = await prisma.user.findFirst({
      where: { email: user.email },
    });

    const data = {
      userCode: user.userCode,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      active: true,
      passwordHash,
      updatedBy: "system-bootstrap",
    };

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data,
      });
      continue;
    }

    await prisma.user.create({
      data: {
        ...data,
        createdBy: "system-bootstrap",
      },
    });
  }
}

export default ensureSystemUsers;
