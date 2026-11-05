import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, "../.env") });

const { default: prisma } = await import("../src/config/prisma.js");

async function main() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename ASC
  `);

  const branchCourseCount = await prisma.branchCourse.count();
  const legacyBranchCourseCount = await prisma.course.count({
    where: {
      branchId: {
        not: null,
      },
    },
  });
  const globalCourseCount = await prisma.course.count({
    where: {
      branchId: null,
    },
  });

  console.log(
    JSON.stringify(
      {
        tables: tables.map((row) => row.tablename),
        branchCourseCount,
        legacyBranchCourseCount,
        globalCourseCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
