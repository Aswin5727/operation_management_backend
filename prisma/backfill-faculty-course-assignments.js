import prisma from "../src/config/prisma.js";

function normalizeString(value) {
  return String(value ?? "").trim();
}

function uniqueCourseIds(record = {}) {
  const ids = [
    record.courseId || "",
    ...(Array.isArray(record.batchEntries) ? record.batchEntries.map((entry) => entry?.courseId || "") : []),
    ...(Array.isArray(record.courseAssignments) ? record.courseAssignments.map((entry) => entry?.courseId || "") : []),
  ]
    .map((courseId) => normalizeString(courseId))
    .filter(Boolean);

  return Array.from(new Set(ids));
}

async function main() {
  const faculties = await prisma.facultyProfile.findMany({
    include: {
      batchEntries: {
        select: {
          courseId: true,
        },
      },
      courseAssignments: {
        select: {
          courseId: true,
        },
      },
    },
  });

  let createdCount = 0;

  for (const faculty of faculties) {
    const courseIds = uniqueCourseIds(faculty);
    if (!courseIds.length) continue;

    const existingCourseIds = new Set(
      (Array.isArray(faculty.courseAssignments) ? faculty.courseAssignments : [])
        .map((entry) => normalizeString(entry.courseId))
        .filter(Boolean),
    );

    const missingCourseIds = courseIds.filter((courseId) => !existingCourseIds.has(courseId));
    if (!missingCourseIds.length) continue;

    const rows = missingCourseIds.map((courseId) => ({
      facultyId: faculty.id,
      courseId,
      createdBy: "backfill",
      updatedBy: "backfill",
    }));

    const result = await prisma.facultyCourseAssignment.createMany({
      data: rows,
      skipDuplicates: true,
    });

    createdCount += result.count || 0;
  }

  console.log(`Backfill complete. Created ${createdCount} missing faculty-course assignment rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
