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
    select: { id: true, status: true },
  });
}

function isInactiveBranch(branch) {
  return String(branch?.status || "ACTIVE").toUpperCase() === "INACTIVE";
}

export { findBranchForAdmin, isInactiveBranch };
