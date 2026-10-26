import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import { getBranchStudentAcademicReports } from "../academicTests/academicTests.service.js";
import { getBranchStudentReports } from "../exams/reportSharing.service.js";
import { collectBranchStudentReportSummaries } from "./reportSummaryBatch.js";

const MAX_STUDENTS_PER_REQUEST = 100;

function normalizeIds(input) {
  const values = Array.isArray(input) ? input : String(input || "").split(",");
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

export async function listBranchStudentReportCompletionSummaries(input, user = {}) {
  const studentIds = normalizeIds(input);
  if (studentIds.length > MAX_STUDENTS_PER_REQUEST) {
    throw new AppError(
      "A maximum of " + MAX_STUDENTS_PER_REQUEST + " students can be requested at once.",
      422,
    );
  }
  if (!studentIds.length) return [];

  const branch = await getCurrentBranchProfile(user);
  if (!branch?.id) throw new AppError("Branch scope not found.", 403);

  // Resolve requested identifiers inside the authenticated branch first.
  // Unknown and cross-branch identifiers simply do not appear in the response.
  const students = await prisma.branchStudent.findMany({
    where: {
      branchId: branch.id,
      recordStatus: "ACTIVE",
      OR: [
        { studentId: { in: studentIds } },
        { id: { in: studentIds } },
      ],
    },
    select: {
      id: true,
      studentId: true,
      studentName: true,
      emailAddress: true,
      courseName: true,
      batchName: true,
      batchId: true,
      courseEnrollments: { select: { courseId: true, batchId: true, batchCycleId: true } },
    },
  });
  const uniqueStudents = [...new Map(
    students
      .filter((student) => String(student.studentId || "").trim())
      .map((student) => [String(student.studentId).trim().toLowerCase(), student]),
  ).values()];

  return collectBranchStudentReportSummaries(uniqueStudents, {
    // Preserve existing report/history rules while bounding DB work.
    concurrency: 4,
    getAcademicReport: (studentId, student) => getBranchStudentAcademicReports(user, studentId, { branchId: branch.id, student }),
    getSyllabusReport: (studentId, student) => getBranchStudentReports(user, studentId, { branch, student }),
  });
}
