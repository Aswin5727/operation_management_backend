import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { createNotification } from "../notifications/notifications.service.js";

const recordingRoot = path.resolve(process.cwd(), "uploads", "lead-recordings");
const normalizeRole = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const clean = (value) => String(value ?? "").trim();

async function getLeadScope(leadId, actor) {
  const lead = await prisma.lead.findFirst({ where: { id: clean(leadId), deletedAt: null }, select: {
    id: true, leadId: true, studentName: true, branchId: true, assignedToId: true,
    branch: { select: { id: true, branchName: true } }, course: { select: { id: true, name: true } },
    convertedStudent: { select: { studentId: true } }, assignedTo: { select: { id: true, fullName: true, role: true } },
  } });
  if (!lead) throw new AppError("Lead not found", 404);
  const actorRole = normalizeRole(actor.role);
  if (actorRole === "SUPERADMIN") return lead;
  if (actorRole === "BRANCHADMIN" && (!actor.branchId || actor.branchId !== lead.branchId)) throw new AppError("You are not authorized for this lead", 403);
  if (!["SUPERADMIN", "BRANCHADMIN", "SALESADMIN"].includes(actorRole)) throw new AppError("You are not authorized for this lead", 403);
  if (actorRole === "SALESADMIN" && lead.assignedToId !== actor.userId) throw new AppError("You are not authorized for this lead", 403);
  return lead;
}

async function getSuperAdmins() {
  const admins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN", active: true }, select: { id: true, fullName: true, role: true } });
  if (!admins.length) throw new AppError("No active Super Admin is available", 503);
  return admins;
}

function defaultIdempotencyKey(_actor, _leadId, _recordingIds, supplied) {
  return supplied ? clean(supplied).slice(0, 160) : crypto.randomUUID();
}

export async function createLeadRecordingShare({ leadId, recordingIds, message, idempotencyKey }, actor) {
  const lead = await getLeadScope(leadId, actor);
  const ids = [...new Set((Array.isArray(recordingIds) ? recordingIds : []).map(clean).filter(Boolean))];
  if (!ids.length) throw new AppError("Select at least one call recording", 400);
  const recordings = await prisma.leadRecording.findMany({ where: { id: { in: ids }, leadId: lead.id }, select: { id: true, originalName: true, createdAt: true } });
  if (recordings.length !== ids.length) throw new AppError("One or more recordings are not available for this lead", 400);
  const sender = await prisma.user.findUnique({ where: { id: actor.userId }, select: { id: true, fullName: true, role: true } });
  if (!sender || !["SALESADMIN", "BRANCHADMIN"].includes(normalizeRole(sender.role))) throw new AppError("Only Sales Admin or Branch Admin can share recordings", 403);
  const superAdmins = await getSuperAdmins();
  const branchSalesAdmins = await prisma.salesAdminBranch.findMany({ where: { branchId: lead.branchId }, orderBy: { createdAt: "asc" }, select: { salesAdminId: true } });
  const reportSalesAdminId = lead.assignedToId || branchSalesAdmins[0]?.salesAdminId || sender.id;
  const key = defaultIdempotencyKey(actor, lead.id, ids, idempotencyKey);
  const existing = await prisma.leadRecordingShare.findUnique({ where: { idempotencyKey: key }, select: { id: true, sharedAt: true } });
  if (existing) return { id: existing.id, leadId: lead.leadId, studentName: lead.studentName, recordingCount: recordings.length, sharedAt: existing.sharedAt, duplicate: true };
  const result = await prisma.$transaction(async (tx) => {
    const share = await tx.leadRecordingShare.create({ data: {
      leadId: lead.id, branchId: lead.branchId, senderUserId: sender.id, senderRole: sender.role,
      recipientUserId: superAdmins[0].id, recipientRole: "SUPER_ADMIN", message: clean(message) || null, idempotencyKey: key,
      items: { create: recordings.map((recording) => ({ recordingId: recording.id, originalName: recording.originalName, uploadedAt: recording.createdAt })) },
    }, include: { items: true } });
    const messageText = `${sender.fullName} (${sender.role === "BRANCH_ADMIN" ? "Branch Admin" : "Sales Admin"}) submitted ${recordings.length} call recording${recordings.length === 1 ? "" : "s"} for Lead ${lead.leadId}, Student ${lead.studentName}, Course ${lead.course?.name || "-"} on ${new Date().toISOString()}.`;
    for (const admin of superAdmins) await createNotification({ kind: "CALL_RECORDING_SHARED", tone: "blue", title: "New Call Recordings Received", message: messageText, actionLabel: "View call recordings", targetUserId: admin.id, targetBranchId: lead.branchId, requestDescription: `CALL_RECORDING_SHARE:${share.id}:${lead.id}:${reportSalesAdminId}`, createdBy: sender.id }, tx);
    return share;
  });
  return { id: result.id, leadId: lead.leadId, studentName: lead.studentName, courseName: lead.course?.name || null, recordingCount: recordings.length, sharedAt: result.sharedAt };
}

function decorateShare(share) {
  return { id: share.id, leadId: share.lead.leadId, studentName: share.lead.studentName, studentId: share.lead.convertedStudent?.studentId || null, courseName: share.lead.course?.name || null, branch: share.branch.branchName, submitterName: share.sender.fullName, submittedBy: share.sender.fullName, submitterRole: share.senderRole, submissionStatus: "SUBMITTED", submissionDate: share.sharedAt, message: share.message, recordings: share.items.map((item) => ({ recordingId: item.recordingId, originalName: item.originalName, recordingDate: item.recording.createdAt, recordingType: item.recording.followUp?.followUpType || null, mimeType: item.recording.mimeType, sizeBytes: item.recording.sizeBytes, playbackUrl: `/lead-recording-shares/${share.id}/recordings/${item.recordingId}` })) };
}

export async function listLeadRecordingShares({ actor, salesAdminId, leadId, branchId } = {}) {
  const actorRole = normalizeRole(actor?.role);
  let senderScope = actorRole === "SUPERADMIN" ? {} : { senderUserId: actor?.userId };
  if (salesAdminId) {
    if (actorRole !== "SUPERADMIN") throw new AppError("Only Super Admin can view Sales Admin recording submissions", 403);
    const assignedBranches = await prisma.salesAdminBranch.findMany({ where: { salesAdminId: clean(salesAdminId) }, select: { branchId: true } });
    senderScope = { OR: [{ senderUserId: clean(salesAdminId) }, ...(assignedBranches.length ? [{ senderRole: "BRANCH_ADMIN", branchId: { in: assignedBranches.map((item) => item.branchId) } }] : [])] };
  }
  const where = { ...senderScope, ...(leadId ? { leadId: clean(leadId) } : {}), ...(branchId ? { branchId: clean(branchId) } : {}) };
  const rows = await prisma.leadRecordingShare.findMany({ where, orderBy: { sharedAt: "desc" }, include: { branch: { select: { branchName: true } }, sender: { select: { fullName: true } }, lead: { select: { leadId: true, studentName: true, course: { select: { name: true } }, convertedStudent: { select: { studentId: true } } } }, items: { include: { recording: { select: { createdAt: true, mimeType: true, sizeBytes: true, followUp: { select: { followUpType: true } } } } } } } });
  return { data: rows.map(decorateShare), meta: { totalShares: rows.length, totalRecordings: rows.reduce((count, row) => count + row.items.length, 0) } };
}

export async function getSharedRecordingFile(shareId, recordingId, actor) {
  const share = await prisma.leadRecordingShare.findUnique({ where: { id: shareId }, select: { senderUserId: true, items: { where: { recordingId }, select: { recordingId: true } } } });
  if (!share?.items.length) throw new AppError("Shared recording not found", 404);
  if (normalizeRole(actor.role) !== "SUPERADMIN" && actor.userId !== share.senderUserId) throw new AppError("You are not authorized to access this recording", 403);
  const recording = await prisma.leadRecording.findUnique({ where: { id: recordingId }, select: { storageKey: true, originalName: true, mimeType: true } });
  if (!recording) throw new AppError("Recording is no longer available", 404);
  try { return { buffer: await fs.readFile(path.join(recordingRoot, recording.storageKey)), fileName: recording.originalName, mimeType: recording.mimeType }; } catch { throw new AppError("Recording file is missing", 404); }
}
