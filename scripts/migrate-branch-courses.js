import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, "../.env") });

const { default: prisma } = await import("../src/config/prisma.js");

function normalizeString(value) {
  return String(value ?? "").trim();
}

async function main() {
  const branchCourses = await prisma.course.findMany({
    where: {
      branchId: {
        not: null,
      },
    },
  });

  if (!branchCourses.length) {
    console.log("No legacy branch courses found in Course table.");
    return;
  }

  const rows = branchCourses.map((course, index) => ({
    branchId: course.branchId,
    courseCode: normalizeString(course.courseCode) || `BR-COURSE-${index + 1}`,
    name: course.name,
    nameKey: course.nameKey,
    description: course.description,
    mode: course.mode,
    duration: course.duration,
    hours: course.hours,
    actualFees: course.actualFees,
    registrationFees: course.registrationFees,
    discount: course.discount,
    afterDiscount: course.afterDiscount,
    status: course.status,
    createdBy: course.createdBy,
    updatedBy: course.updatedBy,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  }));

  await prisma.branchCourse.createMany({
    data: rows,
    skipDuplicates: true,
  });

  await prisma.course.deleteMany({
    where: {
      branchId: {
        not: null,
      },
    },
  });

  console.log(`Migrated ${rows.length} branch course rows into BranchCourse.`);
}

main()
  .catch((error) => {
    console.error("Branch course migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
