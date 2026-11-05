/**
 * cleanup-orphan-faculty-users.mjs
 *
 * One-time script: deletes User records (role=FACULTY) that have no
 * corresponding BranchFaculty row.  These were left behind because the old
 * deleteBranchFaculty() function failed to cascade-delete the User when
 * BatchFacultyAssignment rows existed (onDelete: Restrict FK constraint).
 *
 * Run:  node scripts/cleanup-orphan-faculty-users.mjs
 */

import { PrismaClient } from "../prisma-client-v2/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const dbUrl =
  process.env.PRISMA_DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ No DATABASE_URL / PRISMA_DATABASE_URL / DIRECT_URL found in environment.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Get all FACULTY users
  const facultyUsers = await prisma.user.findMany({
    where: { role: "FACULTY" },
    select: { id: true, email: true, fullName: true },
  });

  // 2. Get all emails currently in BranchFaculty table
  const branchFaculties = await prisma.branchFaculty.findMany({
    select: { email: true },
  });
  const activeEmails = new Set(branchFaculties.map((f) => f.email));

  // 3. Find orphans: FACULTY users with no matching BranchFaculty row
  const orphans = facultyUsers.filter((u) => !activeEmails.has(u.email));

  if (orphans.length === 0) {
    console.log("✅ No orphaned faculty users found. Database is clean.");
    return;
  }

  console.log(`Found ${orphans.length} orphaned faculty user(s):`);
  orphans.forEach((u) =>
    console.log(`  - ${u.fullName} <${u.email}> (id: ${u.id})`)
  );

  // 4. Clean up each orphan inside a transaction
  for (const orphan of orphans) {
    console.log(`\nCleaning up: ${orphan.email} ...`);
    await prisma.$transaction(async (tx) => {
      // Remove Restrict-constrained relations first
      await tx.batchFacultyAssignment.deleteMany({
        where: { facultyId: orphan.id },
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId: orphan.id },
      });
      // Cascade/SetNull relations handled automatically by schema
      await tx.user.delete({ where: { id: orphan.id } });
    });
    console.log(`  ✅ Deleted user ${orphan.email}`);
  }

  console.log(`\n✅ Cleanup complete. ${orphans.length} orphaned user(s) removed.`);
}

main()
  .catch((e) => {
    console.error("❌ Cleanup failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
