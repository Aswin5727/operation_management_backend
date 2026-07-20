import { fileURLToPath } from "node:url";

import app from "./app.js";
import config from "./src/config/env.js";
import prisma from "./src/config/prisma.js";

async function ensureCourseInstallmentView() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE VIEW "CourseInstallmentRows" AS
      SELECT
        c.id AS "courseId",
        c.name AS "courseName",
        c."installmentCount" AS "installmentCount",
        item.ordinality AS "installmentNo",
        item.value::int AS "amount"
      FROM "Course" c
      LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(c.installments::jsonb, '[]'::jsonb))
        WITH ORDINALITY AS item(value, ordinality)
        ON TRUE;
    `);
  } catch (error) {
    console.warn("CourseInstallmentRows view could not be prepared:", error?.message || error);
  }
}

async function startServer() {
  await ensureCourseInstallmentView();
  return app.listen(config.port, "0.0.0.0", () => {
    console.log(`Backend server running on port ${config.port}`);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void startServer();
}

export { app, startServer };
