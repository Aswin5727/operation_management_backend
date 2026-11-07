import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { resolveBranchId } from "./branchAttendanceReports.repository.js";

function view(job) {
  return {
    id: job.id,
    uploadId: job.uploadId,
    status: job.status,
    fileName: job.fileName || null,
    totalRows: Number(job.totalRows || 0),
    readyRows: Number(job.readyRows || 0),
    processedRows: Number(job.processedRows || 0),
    importedRows: Number(job.importedRows || 0),
    failedRows: Number(job.failedRows || 0),
    skippedRows: Number(job.skippedRows || 0),
    progress: Number(job.totalRows || 0) ? Math.min(100, Math.round((Number(job.processedRows || 0) / Number(job.totalRows || 0)) * 100)) : 0,
    errorMessage: job.errorMessage || null,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
  };
}

export async function cancelCompletedStudentImportJob({ jobId, user }) {
  const branchId = await resolveBranchId(user);
  const job = await prisma.completedStudentImportJob.findFirst({ where: { id: jobId, branchId } });
  if (!job) throw new AppError("Import job was not found.", 404);
  if (!["PENDING", "RUNNING"].includes(String(job.status || "").toUpperCase())) return view(job);

  const cancelled = await prisma.completedStudentImportJob.updateMany({
    where: { id: job.id, branchId, status: { in: ["PENDING", "RUNNING"] } },
    data: {
      status: "CANCELLED",
      startedAt: null,
      completedAt: new Date(),
      errorMessage: "Import cancelled by the branch admin.",
    },
  });
  if (!cancelled.count) {
    const current = await prisma.completedStudentImportJob.findFirst({ where: { id: job.id, branchId } });
    if (!current) throw new AppError("Import job was not found.", 404);
    return view(current);
  }
  const current = await prisma.completedStudentImportJob.findFirst({ where: { id: job.id, branchId } });
  return view(current || job);
}