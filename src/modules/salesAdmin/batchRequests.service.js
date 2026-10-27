import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import { createNotification } from "../notifications/notifications.service.js";

const clean = (value) => String(value ?? "").trim();
const normalized = (value) => clean(value).toUpperCase();
const ACTIVE_REQUEST_STATUSES = ["PENDING", "IN_PROGRESS"];
const REQUEST_DESCRIPTION_PREFIX = "SALES_CRM_BATCH_REQUEST:";

function requestKey(branchId, leadId, courseId) {
  return `${branchId}:${leadId}:${courseId}`;
}

function displayDate(value) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(value || new Date());
}

async function suitableBatches({ branchId, courseId, mode, schedule }) {
  const rows = await prisma.branchBatch.findMany({
    where: { branchId, courseId, status: "ACTIVE" },
    include: {
      cycles: {
        orderBy: { cycleNumber: "desc" },
        take: 1,
        include: {
          enrollments: {
            where: { status: "ACTIVE", branchStudent: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } } } },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const now = Date.now();
  return rows.flatMap((batch) => {
    const cycle = batch.cycles?.[0];
    if (!cycle || cycle.status !== "ACTIVE" || (cycle.freezeUntil && new Date(cycle.freezeUntil).getTime() > now)) return [];
    if (normalized(mode) && normalized(batch.mode) && normalized(mode) !== normalized(batch.mode)) return [];
    if (normalized(schedule) && normalized(batch.weekType) && normalized(schedule) !== normalized(batch.weekType)) return [];
    const availableSeats = Math.max(0, Number(batch.totalSeats || 0) - (cycle.enrollments || []).length);
    if (!availableSeats) return [];
    return [{ id: batch.id, batchId: batch.batchId, batchName: batch.batchName, batchTiming: batch.batchTiming, mode: batch.mode, weekType: batch.weekType, totalSeats: batch.totalSeats, availableSeats }];
  });
}

function requestRow(row, matchingBatches = []) {
  return {
    id: row.id,
    leadId: row.lead?.leadId || "",
    leadRecordId: row.leadId,
    studentId: row.lead?.convertedStudent?.studentId || "",
    studentName: row.lead?.studentName || "",
    phoneNumber: row.lead?.phoneNumber || "",
    branchId: row.branchId,
    branchName: row.branch?.branchName || "",
    courseId: row.courseId,
    courseName: row.course?.name || "",
    requestedById: row.requestedById,
    requestedByName: row.requestedBy?.fullName || "",
    assignedToId: row.assignedToId || "",
    assignedToName: row.assignedTo?.fullName || row.branch?.branchAdminName || "",
    requestedMode: row.requestedMode || "",
    requestedSchedule: row.requestedSchedule || "",
    requestDetails: row.requestDetails,
    status: row.status,
    resolvedBatchId: row.resolvedBatchId || "",
    resolvedBatch: row.resolvedBatch ? { id: row.resolvedBatch.id, batchId: row.resolvedBatch.batchId, batchName: row.resolvedBatch.batchName, batchTiming: row.resolvedBatch.batchTiming } : null,
    matchingBatches,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const requestInclude = {
  lead: { select: { leadId: true, studentName: true, phoneNumber: true, convertedStudent: { select: { studentId: true } } } },
  branch: { select: { id: true, branchName: true, branchAdminName: true, adminUserId: true } },
  course: { select: { id: true, name: true } },
  requestedBy: { select: { id: true, fullName: true } },
  assignedTo: { select: { id: true, fullName: true } },
  resolvedBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true } },
};

function notificationForStatus(row, status, batch = null) {
  const resolved = status === "RESOLVED";
  const statusLabel = resolved ? "Resolved" : "In Progress";
  const batchLabel = batch ? ` Suitable batch: ${batch.batchName || batch.batchId}${batch.batchTiming ? ` (${batch.batchTiming})` : ""}.` : "";
  return {
    kind: "SALES_CRM_BATCH_REQUEST_UPDATE",
    tone: resolved ? "green" : "blue",
    title: resolved ? `Batch Request Resolved - ${row.lead?.studentName || "Student"}` : `Batch Request In Progress - ${row.lead?.studentName || "Student"}`,
    message: `${row.branch?.branchName || "Branch"} updated the batch request for ${row.lead?.studentName || "student"} (${row.lead?.leadId || ""}), ${row.course?.name || "course"}: ${statusLabel}.${batchLabel}`,
    actionLabel: resolved ? "View Admission" : "View Request",
    targetUserId: row.requestedById,
    targetBranchId: row.branchId,
    targetBranchName: row.branch?.branchName || null,
    createdBy: row.assignedToId || null,
    requestDescription: `${REQUEST_DESCRIPTION_PREFIX}${row.id}:${status}`,
  };
}

async function getSalesScope(actorOrUserId) {
  const actor = typeof actorOrUserId === "string" ? { userId: actorOrUserId, role: "SALES_ADMIN" } : (actorOrUserId || {});
  const branchIds = String(actor.role || "").toUpperCase() === "BRANCH_ADMIN"
    ? [actor.branchId]
    : (await prisma.salesAdminBranch.findMany({ where: { salesAdminId: actor.userId, branch: { status: "ACTIVE" } }, select: { branchId: true } })).map((link) => link.branchId);
  return { actor, userId: actor.userId, branchIds };
}

async function loadSalesAdminLead(actorOrUserId, leadKey) {
  const { actor, userId, branchIds } = await getSalesScope(actorOrUserId);
  const lead = await prisma.lead.findFirst({
    where: { OR: [{ id: clean(leadKey) }, { leadId: clean(leadKey) }], branchId: { in: branchIds }, deletedAt: null },
    include: {
      branch: { select: { id: true, branchName: true, status: true, adminUserId: true, branchAdminName: true } },
      course: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, fullName: true } },
      convertedStudent: { select: { studentId: true } },
    },
  });
  if (!lead) throw new AppError("Lead not found in your authorized branches", 404);
  if (lead.stage !== "HOT" || lead.status === "CONVERTED" || lead.branch?.status !== "ACTIVE") throw new AppError("Only incomplete HOT admissions can request a batch", 400);
  if (lead.assignedToId !== userId) throw new AppError("You can only request a batch for a lead assigned to you", 403);
  return lead;
}

export async function createSalesAdminBatchRequest(actorOrUserId, leadKey) {
  const { userId } = await getSalesScope(actorOrUserId);
  const lead = await loadSalesAdminLead(actorOrUserId, leadKey);
  if (!lead.courseId || !lead.course) throw new AppError("A branch course must be selected before requesting a batch", 400);
  const existingBatch = await suitableBatches({ branchId: lead.branchId, courseId: lead.courseId, mode: lead.courseMode || lead.trainingMode, schedule: lead.classSchedule });
  if (existingBatch.length) throw new AppError("A suitable batch is available now. Refresh the admissions list and continue admission.", 409);
  const activeKey = requestKey(lead.branchId, lead.id, lead.courseId);
  const requestDetails = `No suitable active batch is available for ${lead.course.name}; requested mode: ${lead.courseMode || lead.trainingMode || "not specified"}; schedule: ${lead.classSchedule || "not specified"}.`;
  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.salesCrmBatchRequest.create({
        data: {
          leadId: lead.id,
          branchId: lead.branchId,
          courseId: lead.courseId,
          requestedById: userId,
          assignedToId: lead.branch.adminUserId || null,
          requestedMode: lead.courseMode || lead.trainingMode || null,
          requestedSchedule: lead.classSchedule || null,
          requestDetails,
          status: "PENDING",
          activeKey,
        },
        include: requestInclude,
      });
      const studentLabel = lead.convertedStudent?.studentId ? `Student ID: ${lead.convertedStudent.studentId}.` : `Lead ID: ${lead.leadId}.`;
      await createNotification({
        kind: "SALES_CRM_BATCH_REQUEST",
        tone: "amber",
        title: "Student Admission - Batch Required",
        message: `A student is waiting for admission, but no suitable batch is currently available. Please create or assign a suitable batch.\nStudent: ${lead.studentName}. ${studentLabel}\nCourse: ${lead.course.name}.\nBranch: ${lead.branch.branchName}.\nRequested by: ${lead.assignedTo?.fullName || "Sales Admin"}.\nRequest date: ${displayDate(created.createdAt)}.\nRequirements: ${requestDetails}`,
        actionLabel: "View Request",
        targetBranchId: lead.branchId,
        targetBranchName: lead.branch.branchName,
        targetUserId: lead.branch.adminUserId || null,
        createdBy: userId,
        requestDescription: `${REQUEST_DESCRIPTION_PREFIX}${created.id}`,
      }, tx);
      return requestRow(created);
    });
  } catch (error) {
    if (error?.code === "P2002") throw new AppError("A pending batch request already exists for this student and course", 409);
    throw error;
  }
}

export async function listSalesAdminBatchRequests(actorOrUserId) {
  const { userId, branchIds } = await getSalesScope(actorOrUserId);
  const rows = await prisma.salesCrmBatchRequest.findMany({ where: { requestedById: userId, branchId: { in: branchIds } }, include: requestInclude, orderBy: { createdAt: "desc" } });
  return { data: rows.map((row) => requestRow(row)), meta: { total: rows.length } };
}

export async function listBranchBatchRequests(actor, query = {}) {
  const branch = await getCurrentBranchProfile(actor);
  const status = normalized(query.status);
  const rows = await prisma.salesCrmBatchRequest.findMany({
    where: { branchId: branch.id, ...(ACTIVE_REQUEST_STATUSES.includes(status) || status === "RESOLVED" ? { status } : {}) },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });
  const data = await Promise.all(rows.map(async (row) => requestRow(row, ACTIVE_REQUEST_STATUSES.includes(row.status)
    ? await suitableBatches({ branchId: row.branchId, courseId: row.courseId, mode: row.requestedMode, schedule: row.requestedSchedule })
    : [])));
  return { data, meta: { total: data.length }, branch: { id: branch.id, branchName: branch.branchName } };
}

export async function updateBranchBatchRequest(actor, requestId, payload = {}) {
  const branch = await getCurrentBranchProfile(actor);
  const row = await prisma.salesCrmBatchRequest.findFirst({ where: { id: clean(requestId), branchId: branch.id }, include: requestInclude });
  if (!row) throw new AppError("Batch request not found in your branch", 404);
  if (!ACTIVE_REQUEST_STATUSES.includes(row.status)) throw new AppError("This batch request is already resolved", 409);
  const nextStatus = normalized(payload.status);
  if (nextStatus === "IN_PROGRESS") {
    if (row.status === "IN_PROGRESS") return requestRow(row);
    const updated = await prisma.$transaction(async (tx) => {
      const change = await tx.salesCrmBatchRequest.updateMany({ where: { id: row.id, branchId: branch.id, status: "PENDING" }, data: { status: "IN_PROGRESS", statusUpdatedById: actor.id } });
      if (!change.count) throw new AppError("The batch request was already updated", 409);
      const refreshed = await tx.salesCrmBatchRequest.findUnique({ where: { id: row.id }, include: requestInclude });
      await createNotification(notificationForStatus(refreshed, "IN_PROGRESS"), tx);
      return refreshed;
    });
    return requestRow(updated);
  }
  if (nextStatus !== "RESOLVED") throw new AppError("Status must be In Progress or Resolved", 400);
  const requestedBatchId = clean(payload.batchId);
  if (!requestedBatchId) throw new AppError("Select a suitable batch before resolving the request", 400);
  const candidates = await suitableBatches({ branchId: branch.id, courseId: row.courseId, mode: row.requestedMode, schedule: row.requestedSchedule });
  const batch = candidates.find((candidate) => candidate.id === requestedBatchId || candidate.batchId === requestedBatchId);
  if (!batch) throw new AppError("That batch is not available or does not match this request", 409);
  const updated = await prisma.$transaction(async (tx) => {
    const change = await tx.salesCrmBatchRequest.updateMany({ where: { id: row.id, branchId: branch.id, status: { in: ACTIVE_REQUEST_STATUSES } }, data: { status: "RESOLVED", resolvedBatchId: batch.id, activeKey: null, statusUpdatedById: actor.id } });
    if (!change.count) throw new AppError("The batch request was already updated", 409);
    const refreshed = await tx.salesCrmBatchRequest.findUnique({ where: { id: row.id }, include: requestInclude });
    await createNotification(notificationForStatus(refreshed, "RESOLVED", batch), tx);
    return refreshed;
  });
  return requestRow(updated);
}

export async function resolveSalesCrmBatchRequestsForBatch(branchId, batchId, actorId = null) {
  const initialBatch = await prisma.branchBatch.findFirst({ where: { id: clean(batchId), branchId }, select: { id: true, courseId: true } });
  if (!initialBatch) return 0;
  const rows = await prisma.salesCrmBatchRequest.findMany({ where: { branchId, courseId: initialBatch.courseId, status: { in: ACTIVE_REQUEST_STATUSES } }, include: requestInclude, orderBy: { createdAt: "asc" } });
  let resolvedCount = 0;
  for (const row of rows) {
    const candidates = await suitableBatches({ branchId, courseId: row.courseId, mode: row.requestedMode, schedule: row.requestedSchedule });
    const batch = candidates.find((candidate) => candidate.id === initialBatch.id && candidate.availableSeats > resolvedCount);
    if (!batch) continue;
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.salesCrmBatchRequest.updateMany({ where: { id: row.id, status: { in: ACTIVE_REQUEST_STATUSES } }, data: { status: "RESOLVED", resolvedBatchId: batch.id, activeKey: null, statusUpdatedById: actorId } });
      if (!changed.count) return false;
      const refreshed = await tx.salesCrmBatchRequest.findUnique({ where: { id: row.id }, include: requestInclude });
      await createNotification(notificationForStatus(refreshed, "RESOLVED", batch), tx);
      return true;
    });
    if (updated) resolvedCount += 1;
  }
  return resolvedCount;
}

