import prisma from "../../config/prisma.js";

async function findBranchForAdmin(user) {
  if (String(user?.role || "").toUpperCase() !== "BRANCH_ADMIN") {
    return null;
  }

  return prisma.branch.findFirst({
    where: {
      OR: [
        { adminUserId: user.id },
        { branchEmail: { equals: user.email, mode: "insensitive" } },
      ],
    },
    select: { id: true, status: true, roleAccess: true },
  });
}

function isInactiveBranch(branch) {
  return String(branch?.status || "ACTIVE").toUpperCase() === "INACTIVE";
}

function isInactiveSalesAdmin(user) {
  return String(user?.role || "").toUpperCase() === "SALES_ADMIN"
    && String(user?.status || (user?.active === false ? "INACTIVE" : "ACTIVE")).toUpperCase() === "INACTIVE";
}

export { findBranchForAdmin, isInactiveBranch, isInactiveSalesAdmin };
