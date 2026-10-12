import prisma from "../../config/prisma.js";
import AppError from "../errors/AppError.js";

export const APPROVED_DISCONTINUATION_STATUS = "APPROVED";

export async function getApprovedDiscontinuationMap(studentIds = [], client = prisma) {
  const ids = [...new Set((Array.isArray(studentIds) ? studentIds : []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (!ids.length) return new Map();

  const rows = await client.studentDiscontinuationRequest.findMany({
    where: { branchStudentId: { in: ids }, status: APPROVED_DISCONTINUATION_STATUS },
    select: { branchStudentId: true, accessDeactivationAt: true, superAdminReviewedAt: true },
  });
  return new Map(rows.map((row) => [row.branchStudentId, row]));
}

export async function assertStudentsNotDiscontinued(studentIds = [], client = prisma) {
  const approved = await getApprovedDiscontinuationMap(studentIds, client);
  if (approved.size) {
    throw new AppError("This student is discontinued. Attendance and academic updates are not allowed.", 409);
  }
}