import crypto from "node:crypto";
import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { resolveBranchId } from "./branchAttendanceReports.repository.js";
import {
  MAX_ROWS,
  apply,
  assertNoActiveCompletedStudentImport,
  buildImportLookup,
  completedStudentFailedRowsReport,
  validate,
} from "./completedStudentImport.service.js";

// A completed-student row can touch the student, enrollment, academic result,
// installment and payment tables. Keep transactions small enough that a slow
// live database cannot hold one transaction open for the entire upload.
const DEFAULT_BATCH_SIZE = 10;
const IMPORT_TRANSACTION_OPTIONS = { maxWait: 30000, timeout: 120000 };
const WORKER_INTERVAL_MS = 5000;
const WORKER_LEASE_MS = 10 * 60 * 1000;
const activeJobs = new Set();
let workerTimer = null;

function cleanJobRow(row, index) {
  const rawData = row?.data && typeof row.data === "object" ? row.data : row || {};
  const data = { ...rawData };
  delete data.__rowNumber;
  const rowNumber = Number(row?.rowNumber || rawData.__rowNumber || index + 1);
  return { rowNumber: Number.isFinite(rowNumber) ? rowNumber : index + 1, data };
}

function canonicalImportValue(value) {
  if (Array.isArray(value)) return value.map(canonicalImportValue);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalImportValue(value[key]);
      return result;
    }, {});
  }
  return value;
}

function importRowsHash(rows) {
  const canonicalRows = rows
    .map((row) => canonicalImportValue(cleanJobRow(row, 0).data))
    .map((row) => JSON.stringify(row))
    .sort();
  return crypto.createHash("sha256").update(canonicalRows.join("\n")).digest("hex");
}

function duplicateImportMessage(job) {
  return ["PENDING", "RUNNING"].includes(String(job?.status || "").toUpperCase())
    ? "This workbook is already being imported for this branch. Open the active import status and wait for it to finish."
    : "This workbook was already imported for this branch. Upload a new workbook or retry its failed rows.";
}

function isDuplicateImportConstraint(error) {
  const target = String(error?.meta?.target || "");
  return error?.code === "P2002" && (target.includes("fileHash") || target.includes("branchId_fileHash"));
}
const ACTIVE_DUPLICATE_JOB_STATUSES = ["PENDING", "RUNNING"];
const TERMINAL_DUPLICATE_JOB_STATUSES = ["COMPLETED", "COMPLETED_WITH_ERRORS"];

async function importJobStillHasPersistedStudents(job) {
  const rows = await prisma.completedStudentImportRow.findMany({
    where: { jobId: job.id, status: "IMPORTED" },
    select: { importedId: true, data: true },
    take: MAX_ROWS,
  });
  const studentIds = [...new Set(rows.map((row) => String(row.importedId || row.data?.studentId || "").trim()).filter(Boolean))];
  if (!studentIds.length) return false;
  return prisma.branchStudent.count({
    where: { branchId: job.branchId, studentId: { in: studentIds } },
  }).then((count) => count > 0);
}

async function shouldBlockDuplicateJob(job) {
  if (!job) return false;
  if (ACTIVE_DUPLICATE_JOB_STATUSES.includes(String(job.status || "").toUpperCase())) return true;
  if (!TERMINAL_DUPLICATE_JOB_STATUSES.includes(String(job.status || "").toUpperCase())) return false;
  // A terminal import record is only a duplicate while at least one of its
  // imported students still exists in this branch. Import history can remain
  // after an admin deletes the students, so history alone must not block a
  // clean re-upload.
  return importJobStillHasPersistedStudents(job);
}

async function findDuplicateImportJob({ branchId, fileHash, fileName }) {
  const byHash = await prisma.completedStudentImportJob.findFirst({
    where: { branchId, fileHash, status: { in: [...ACTIVE_DUPLICATE_JOB_STATUSES, ...TERMINAL_DUPLICATE_JOB_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });
  if (await shouldBlockDuplicateJob(byHash)) return byHash;
  if (!fileName) return null;

  // Jobs created before content hashing was introduced have a null hash. Only
  // compare legacy rows when the workbook name matches, avoiding a full-table
  // scan while still blocking an exact re-upload of an older workbook.
  const legacyJobs = await prisma.completedStudentImportJob.findMany({
    where: { branchId, fileHash: null, fileName, status: { in: [...ACTIVE_DUPLICATE_JOB_STATUSES, ...TERMINAL_DUPLICATE_JOB_STATUSES] } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      branchId: true,
      status: true,
      fileName: true,
      totalRows: true,
      rows: { select: { rowNumber: true, data: true }, orderBy: { rowNumber: "asc" } },
    },
  });
  for (const job of legacyJobs) {
    if (importRowsHash(job.rows) === fileHash && await shouldBlockDuplicateJob(job)) return job;
  }
  return null;
}
function errorText(error) {
  const message = String(error?.message || "Unable to save this row.");
  if (/Unique constraint|duplicate key|P2002/i.test(message)) return "Duplicate database record or unique value.";
  if (/timeout|expired transaction|connection/i.test(message)) return "Database timeout while saving this row. Retry this row.";
  return message.slice(0, 500);
}

function jobView(job) {
  const total = Number(job?.totalRows || 0);
  const processed = Number(job?.processedRows || 0);
  return {
    id: job.id,
    uploadId: job.uploadId,
    status: job.status,
    fileName: job.fileName || null,
    totalRows: total,
    readyRows: Number(job.readyRows || 0),
    processedRows: processed,
    importedRows: Number(job.importedRows || 0),
    failedRows: Number(job.failedRows || 0),
    skippedRows: Number(job.skippedRows || 0),
    progress: total ? Math.min(100, Math.round((processed / total) * 100)) : 0,
    errorMessage: job.errorMessage || null,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
  };
}

async function validateRows(rows, branchId, allowMissingContact) {
  const normalized = rows.map(cleanJobRow);
  const lookup = await buildImportLookup(normalized, branchId);
  const seen = new Map();
  const checked = [];
  for (const row of normalized) {
    checked.push(await validate({ ...row.data, __rowNumber: row.rowNumber }, branchId, seen, { allowMissingContact, lookup }));
  }
  return { normalized, checked, lookup };
}

async function refreshJobCountersForWorker(jobId, workerStartedAt = null) {
  const [job, imported, failed, pending] = await Promise.all([
    prisma.completedStudentImportJob.findFirst({
      where: {
        id: jobId,
        status: "RUNNING",
        ...(workerStartedAt ? { startedAt: workerStartedAt } : {}),
      },
    }),
    prisma.completedStudentImportRow.count({ where: { jobId, status: "IMPORTED" } }),
    prisma.completedStudentImportRow.count({ where: { jobId, status: "FAILED" } }),
    prisma.completedStudentImportRow.count({ where: { jobId, status: "PENDING" } }),
  ]);
  if (!job) return null;
  const processed = imported + failed;
  const nextStatus = pending === 0 ? (failed > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED") : "RUNNING";
  const result = await prisma.completedStudentImportJob.updateMany({
    where: {
      id: jobId,
      status: "RUNNING",
      ...(workerStartedAt ? { startedAt: workerStartedAt } : {}),
    },
    data: {
      processedRows: processed,
      importedRows: imported,
      failedRows: failed,
      status: nextStatus,
      completedAt: pending === 0 ? (job.completedAt || new Date()) : null,
    },
  });
  return result.count
    ? { ...job, processedRows: processed, importedRows: imported, failedRows: failed, status: nextStatus }
    : null;
}


function wasPersistedByThisJob(job, checkedRow, lookup) {
  const studentId = String(checkedRow?.studentId || "").trim();
  if (!studentId) return false;
  const student = lookup?.studentsByStudentId?.get(studentId);
  if (!student || new Date(student.createdAt) < new Date(job.createdAt)) return false;
  if (!checkedRow.courseName) return true;
  const courseName = String(checkedRow.courseName).trim().toLowerCase();
  const persistedCourseName = String(student.courseName || student.course || "").trim().toLowerCase();
  if (persistedCourseName && persistedCourseName === courseName) return true;
  return (student.courseEnrollments || []).some((enrollment) =>
    String(enrollment.course?.name || enrollment.courseName || "").trim().toLowerCase() === courseName &&
    new Date(enrollment.createdAt || student.createdAt) >= new Date(job.createdAt)
  );
}
async function saveRowResult(row, data) {
  return prisma.completedStudentImportRow.update({ where: { id: row.id }, data });
}

async function processBatch(job, dbRows) {
  const branchId = job.branchId;
  const { checked, lookup } = await validateRows(dbRows.map((row) => ({ rowNumber: row.rowNumber, data: row.data })), branchId, job.allowMissingContact);
  const checkedByNumber = new Map(checked.map((row) => [Number(row.rowNumber), row]));
  const validRows = [];

  for (const dbRow of dbRows) {
    const checkedRow = checkedByNumber.get(Number(dbRow.rowNumber));
    if (!checkedRow?.valid) {
      // A previous worker may have committed the student before losing the
      // row-status update. Reconcile that durable write as imported instead
      // of reporting a false validation failure.
      if (wasPersistedByThisJob(job, checkedRow, lookup)) {
        await saveRowResult(dbRow, {
          status: "IMPORTED",
          errors: [],
          warnings: checkedRow?.warnings || [],
          importedId: String(checkedRow.studentId || "").trim() || null,
          attempts: { increment: 1 },
          processedAt: new Date(),
        });
      } else {
        await saveRowResult(dbRow, {
          status: "FAILED",
          errors: checkedRow?.errors || ["Validation failed."],
          warnings: checkedRow?.warnings || [],
          attempts: { increment: 1 },
          processedAt: new Date(),
        });
      }
    } else {
      validRows.push({ dbRow, checkedRow });
    }
  }

  if (!validRows.length) return;

  try {
    await prisma.$transaction(async (tx) => {
      const result = [];
      for (const item of validRows) {
        // Keep the row status update in the same transaction as the domain
        // write. A worker crash can therefore never leave a saved student
        // with a pending import row that another worker reprocesses.
        const saved = await apply(tx, item.checkedRow, branchId, { id: job.createdBy }, lookup);
        await tx.completedStudentImportRow.update({
          where: { id: item.dbRow.id },
          data: {
            status: "IMPORTED",
            errors: [],
            warnings: item.checkedRow.warnings || [],
            importedId: saved?.studentId || null,
            attempts: { increment: 1 },
            processedAt: new Date(),
          },
        });
        result.push(saved);
      }
      return result;
    }, IMPORT_TRANSACTION_OPTIONS);

  } catch (batchError) {
    // If a single row breaks the batch transaction, isolate each row so valid
    // records still import and the failed row receives an actionable reason.
    for (const item of validRows) {
      try {
        await prisma.$transaction(async (tx) => {
          const saved = await apply(tx, item.checkedRow, branchId, { id: job.createdBy }, null);
          await tx.completedStudentImportRow.update({
            where: { id: item.dbRow.id },
            data: {
              status: "IMPORTED",
              errors: [],
              warnings: item.checkedRow.warnings || [],
              importedId: saved?.studentId || null,
              attempts: { increment: 1 },
              processedAt: new Date(),
            },
          });
          return saved;
        }, IMPORT_TRANSACTION_OPTIONS);
      } catch (rowError) {
        await saveRowResult(item.dbRow, {
          status: "FAILED",
          errors: [errorText(rowError || batchError)],
          warnings: item.checkedRow.warnings || [],
          attempts: { increment: 1 },
          processedAt: new Date(),
        });
      }
    }
  }
}

export async function processCompletedStudentImportJob(jobId) {
  if (activeJobs.has(jobId)) return;
  activeJobs.add(jobId);
  let workerStartedAt = null;
  try {
    const claimStartedAt = new Date();
    const staleBefore = new Date(Date.now() - WORKER_LEASE_MS);
    const claimed = await prisma.completedStudentImportJob.updateMany({
      where: {
        id: jobId,
        OR: [
          { status: "PENDING" },
          { status: "RUNNING", updatedAt: { lt: staleBefore } },
        ],
      },
      data: { status: "RUNNING", startedAt: claimStartedAt, errorMessage: null },
    });
    if (!claimed.count) return;
    workerStartedAt = claimStartedAt;

    while (true) {
      const job = await prisma.completedStudentImportJob.findFirst({
        where: { id: jobId, status: "RUNNING", startedAt: workerStartedAt },
      });
      if (!job) break;
      // Jobs created by an older server may still carry the old 50-row batch
      // size. Clamp persisted values so retries also use the timeout-safe size.
      const persistedBatchSize = Number(job.batchSize);
      const batchSize = persistedBatchSize > 0 ? Math.min(persistedBatchSize, DEFAULT_BATCH_SIZE) : DEFAULT_BATCH_SIZE;
      if (persistedBatchSize !== batchSize) {
        await prisma.completedStudentImportJob.updateMany({
          where: { id: jobId, status: "RUNNING", startedAt: workerStartedAt },
          data: { batchSize },
        });
      }
      const rows = await prisma.completedStudentImportRow.findMany({
        where: { jobId, status: "PENDING" },
        orderBy: { rowNumber: "asc" },
        take: batchSize,
      });
      if (!rows.length) {
        await refreshJobCountersForWorker(jobId, workerStartedAt);
        break;
      }
      await processBatch(job, rows);
      if (!await refreshJobCountersForWorker(jobId, workerStartedAt)) break;
    }
  } catch (error) {
    // A cancellation or a newer worker lease is authoritative. A late worker
    // error must not overwrite the owner that currently holds the import.
    if (workerStartedAt) {
      await prisma.completedStudentImportJob.updateMany({
        where: { id: jobId, status: "RUNNING", startedAt: workerStartedAt },
        data: { status: "FAILED", errorMessage: errorText(error), completedAt: new Date() },
      }).catch(() => {});
    }
  } finally {
    activeJobs.delete(jobId);
  }
}
async function workerTick() {
  const staleBefore = new Date(Date.now() - WORKER_LEASE_MS);
  const jobs = await prisma.completedStudentImportJob.findMany({
    where: {
      OR: [
        { status: "PENDING" },
        { status: "RUNNING", updatedAt: { lt: staleBefore } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true },
  });
  await Promise.all(jobs.map((job) => processCompletedStudentImportJob(job.id)));
}
export function startCompletedStudentImportWorker() {
  if (workerTimer) return workerTimer;
  void workerTick().catch((error) => console.warn(`Completed import worker tick failed: ${error?.message || error}`));
  workerTimer = setInterval(() => {
    void workerTick().catch((error) => console.warn(`Completed import worker tick failed: ${error?.message || error}`));
  }, WORKER_INTERVAL_MS);
  workerTimer.unref?.();
  return workerTimer;
}

export async function createCompletedStudentImportJob({ rows, user, allowMissingContact = false, fileName = null, skippedRows = 0 }) {
  if (!Array.isArray(rows) || !rows.length) throw new AppError("No rows were selected for import.", 400);
  if (rows.length > MAX_ROWS) throw new AppError(`Only ${MAX_ROWS} records can be imported at a time.`, 400);
  const branchId = await resolveBranchId(user);
  await assertNoActiveCompletedStudentImport(branchId);
  const { normalized, checked } = await validateRows(rows, branchId, allowMissingContact);
  const invalid = checked.filter((row) => !row.valid);
  if (invalid.length) {
    return {
      validationRequired: true,
      totalRows: checked.length,
      validRows: checked.length - invalid.length,
      invalidRows: invalid.length,
      rows: checked,
      message: "Fix all validation errors and revalidate before importing.",
    };
  }
  const fileHash = importRowsHash(normalized);
  const duplicateJob = await findDuplicateImportJob({ branchId, fileHash, fileName });

  if (duplicateJob) throw new AppError(duplicateImportMessage(duplicateJob), 409);

  const uploadId = `UP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  let job;
  try {
    job = await prisma.$transaction(async (tx) => {
      const created = await tx.completedStudentImportJob.create({ data: {
        uploadId,
        branchId,
        createdBy: user?.id || null,
        fileName,
        fileHash,
        status: "PENDING",
        totalRows: normalized.length,
        readyRows: normalized.length,
        batchSize: DEFAULT_BATCH_SIZE,
        skippedRows: Math.max(0, Number(skippedRows) || 0),
        allowMissingContact,
      } });
      await tx.completedStudentImportRow.createMany({ data: checked.map((row) => ({ jobId: created.id, rowNumber: row.rowNumber, data: row.data, status: "PENDING", errors: [], warnings: row.warnings || [] })) });
      return created;
    });
  } catch (error) {
    if (isDuplicateImportConstraint(error)) {
      const current = await prisma.completedStudentImportJob.findFirst({ where: { branchId, fileHash }, orderBy: { createdAt: "desc" } });
      throw new AppError(duplicateImportMessage(current), 409);
    }
    if (error?.code === "P2002") {
      // The partial branch-level index closes the race between two concurrent
      // uploads. Re-read the active job so the client receives the same
      // actionable message as the normal preflight guard.
      try {
        await assertNoActiveCompletedStudentImport(branchId);
      } catch (activeError) {
        throw activeError;
      }
    }
    throw error;
  }
  void processCompletedStudentImportJob(job.id);
  return { validationRequired: false, job: jobView(job) };
}

const RECENT_IMPORT_STATUS_WINDOW_MS = 30 * 60 * 1000;

export async function listCompletedStudentImportJobs({ user }) {
  const branchId = await resolveBranchId(user);
  const recentCutoff = new Date(Date.now() - RECENT_IMPORT_STATUS_WINDOW_MS);
  const jobs = await prisma.completedStudentImportJob.findMany({
    where: {
      branchId,
      OR: [
        { status: { in: ["PENDING", "RUNNING"] } },
        { status: { in: ["COMPLETED", "COMPLETED_WITH_ERRORS", "FAILED"] }, completedAt: { gte: recentCutoff } },
      ],
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 5,
  });
  return { jobs: jobs.map(jobView) };
}

export async function getCompletedStudentImportJob({ jobId, user }) {
  const branchId = await resolveBranchId(user);
  const job = await prisma.completedStudentImportJob.findFirst({ where: { id: jobId, branchId } });
  if (!job) throw new AppError("Import job was not found.", 404);
  return jobView(job);
}

export async function retryCompletedStudentImportJob({ jobId, user }) {
  const branchId = await resolveBranchId(user);
  const job = await prisma.completedStudentImportJob.findFirst({ where: { id: jobId, branchId } });
  if (!job) throw new AppError("Import job was not found.", 404);
  if (!["COMPLETED_WITH_ERRORS", "FAILED"].includes(job.status)) throw new AppError("Only a completed import with failed rows can be retried.", 409);
  await assertNoActiveCompletedStudentImport(branchId);
  try {
    await prisma.$transaction([
      prisma.completedStudentImportRow.updateMany({ where: { jobId, status: "FAILED" }, data: { status: "PENDING", errors: [], processedAt: null } }),
      prisma.completedStudentImportJob.update({ where: { id: jobId }, data: { status: "PENDING", errorMessage: null, completedAt: null, processedRows: job.importedRows, failedRows: 0 } }),
    ]);
  } catch (error) {
    if (error?.code === 'P2002') await assertNoActiveCompletedStudentImport(branchId);
    throw error;
  }
  void processCompletedStudentImportJob(jobId);
  return getCompletedStudentImportJob({ jobId, user });
}

export async function downloadCompletedStudentImportFailedRows({ jobId, user }) {
  const branchId = await resolveBranchId(user);
  const job = await prisma.completedStudentImportJob.findFirst({ where: { id: jobId, branchId } });
  if (!job) throw new AppError("Import job was not found.", 404);
  const rows = await prisma.completedStudentImportRow.findMany({ where: { jobId, status: "FAILED" }, orderBy: { rowNumber: "asc" } });
  return completedStudentFailedRowsReport({ rows: rows.map((row) => ({ rowNumber: row.rowNumber, data: row.data, errors: Array.isArray(row.errors) ? row.errors : ["Import failed."], valid: false })) });
}

export async function stopCompletedStudentImportWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
}
