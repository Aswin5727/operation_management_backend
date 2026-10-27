import fs from "node:fs/promises";
import path from "node:path";
import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { syncLeadFollowUpReminder } from "./followUpReminder.service.js";
import { createNotification } from "../notifications/notifications.service.js";

const CALL_TYPES = new Set(["NEW_LEAD", "REGULAR_CALL", "EXISTING_LEAD_FOLLOW_UP", "STUDENT_JOB_OPENING", "BUSINESS_OPPORTUNITY", "PROMOTIONAL_LEAD", "STUDENT_JOB_OPPORTUNITY", "JOB_OPPORTUNITY", "JOB_OPENING", "EXISTING_LEAD_STUDENT_JOB_OPPORTUNITY", "OTHER"]);
const STATUSES = new Set(["DRAFT", "ACTIVE", "FOLLOW_UP", "NOT_ANSWERING", "CONTACTED", "INTERESTED", "DEMO_SCHEDULED", "DEMO_ATTENDED", "ADMISSION_CONFIRMED", "ENROLLED", "LOST_LEAD", "SWITCHED_OFF", "OUT_OF_SERVICE", "INCOMING_CALL_BLOCK", "DND", "NOT_REACHABLE", "CALL_WAITING", "CALL_LATER", "UNAVAILABLE_COURSE", "NOT_INTERESTED", "WRONG_NO", "CURRENTLY_NO_IDEA", "FORWARD_TO_HR_TEAM", "MAY_BE_IN_FUTURE", "JOINED_IN_ANOTHER_INSTITUTION", "CONVERTED", "CLOSED", "OTHER"]);
const STAGES = new Set(["COLD", "WARM", "HOT", "CLOSED", "OTHER"]);
const SOURCES = new Set(["OUTBOUND_DB", "JUSTDIAL", "GOOGLE", "WEBSITE", "TALLY_WEBSITE", "DIRECT_WALK_IN", "REFERENCE", "SOCIAL_MEDIA", "HR_DB", "OTHER"]);
const PAYMENT_STATUSES = new Set(["NOT_PAID", "INITIAL_PAYMENT", "PARTIALLY_PAID", "PAID"]);
const TRAINING_MODES = new Set(["ONLINE", "OFFLINE", "WEEKDAY", "WEEKEND"]);
const CLASS_SCHEDULES = new Set(["WEEKDAY", "WEEKEND"]);
const COURSE_MODES = new Set(["ONLINE", "OFFLINE"]);
const DISTANCES = new Set(["NEARBY", "WITHIN_CITY_MEDIUM", "WITHIN_CITY_LONG", "OUTSTATION", "OTHER"]);
const CALL_STATUSES = new Set(["CONNECTED", "INTERESTED", "NOT_INTERESTED", "NO_ANSWER", "BUSY", "SWITCHED_OFF", "NOT_REACHABLE", "CALL_BACK_REQUESTED", "WRONG_NUMBER"]);
const text = (v) => String(v ?? "").trim();
const upper = (v) => text(v).toUpperCase().replace(/[\s-]+/g, "_");
const required = (v, label, max = 255) => { const value = text(v); if (!value) throw new AppError(`${label} is required`, 400); if (value.length > max) throw new AppError(`${label} must not exceed ${max} characters`, 400); return value; };
const optional = (v, max = 255) => { const value = text(v); if (value.length > max) throw new AppError(`Value must not exceed ${max} characters`, 400); return value || null; };
const enumValue = (v, set, label, fallback) => { const value = upper(v || fallback); if (!set.has(value)) throw new AppError(`${label} is invalid`, 400); return value; };
const callStatusValue = (value) => { const normalized = upper(value); const aliases = { NOT_ANSWERED: "NO_ANSWER", DISCONNECTED: "NOT_REACHABLE", DC: "NOT_REACHABLE", CALLBACK_REQUESTED: "CALL_BACK_REQUESTED" }; return enumValue(aliases[normalized] || normalized, CALL_STATUSES, "Call status"); };
const dateValue = (v, label, isRequired = true) => { if (!v && !isRequired) return null; const value = new Date(v); if (Number.isNaN(value.getTime())) throw new AppError(`${label} must be a valid date`, 400); return value; };
function branchDateTimeParts(timeZone) { return Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])); }
async function validateFollowUpSchedule(data, branchId) {
  const stage = String(data.stage || '').toUpperCase();
  const status = String(data.status || '').toUpperCase();
  if (['HOT', 'CLOSED'].includes(stage) || status === 'CONVERTED') return;
  const timezone = (await prisma.branch.findUnique({ where: { id: branchId }, select: { timezone: true } }))?.timezone || 'Asia/Kolkata';
  const dateKey = data.nextFollowUpDate?.toISOString().slice(0, 10) || '';
  const time = data.nextFollowUpTime || '';
  if (!dateKey && time) throw new AppError('Follow-up time cannot be saved without a date', 400);
  if (!dateKey) return;
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new AppError('Next follow-up time must be valid', 400);
  const now = branchDateTimeParts(timezone);
  const today = `${now.year}-${now.month}-${now.day}`;
  if (dateKey < today) throw new AppError('Next follow-up date cannot be in the past', 400);
  if (dateKey === today) {
    if (!time) throw new AppError('Next follow-up time is required for today', 400);
    const [hour, minute] = time.split(':').map(Number);
    if (hour * 60 + minute <= Number(now.hour) * 60 + Number(now.minute)) throw new AppError("Please select a future time for today's follow-up.", 400);
  } else if (time) data.nextFollowUpTime = null;
}
const phone = (v, label = "Phone number", isRequired = true) => { const value = text(v); if (!value && !isRequired) return null; if (!/^\d{10}$/.test(value)) throw new AppError(`${label} must contain exactly 10 digits`, 400); return value; };
const paymentAmountValue = (value, status, existing) => { if (status === "NOT_PAID") return null; const raw = value ?? existing; if (raw === null || raw === undefined || text(raw) === "") throw new AppError("Payment amount is required when payment status is not Not Paid", 400); const amount = Number(raw); if (!Number.isFinite(amount) || amount < 0) throw new AppError("Payment amount must be a valid non-negative number", 400); return amount; };
async function generatedLeadId(client = prisma) {
  const rows = await client.lead.findMany({ where: { leadId: { startsWith: "CISLEA" } }, select: { leadId: true } });
  const highest = rows.reduce((max, row) => { const match = /^CISLEA(\d+)$/.exec(row.leadId || ""); return Math.max(max, match ? Number(match[1]) : 0); }, 0);
  return `CISLEA${String(highest + 1).padStart(3, "0")}`;
}

function normalizePayload(payload = {}, existing = null, fallbackLeadId = null) {
  const studentName = required(payload.studentName ?? existing?.studentName, "Student name", 120);
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(studentName)) throw new AppError("Enter a valid student name", 400);
  const leadId = required(payload.leadId ?? existing?.leadId ?? fallbackLeadId, "Lead ID", 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(leadId)) throw new AppError("Enter a valid Lead ID", 400);
  const phoneNumber = phone(payload.phoneNumber ?? existing?.phoneNumber);
  const alternativeNumber = phone(payload.alternativeNumber ?? existing?.alternativeNumber, "Alternative number", false);
  if (alternativeNumber && alternativeNumber === phoneNumber) throw new AppError("Alternative number must differ from phone number", 400);
  const email = required(payload.email ?? existing?.email, "Email address", 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError("Enter a valid email address", 400);
  required(payload.qualification ?? existing?.qualification, "Qualification", 120);
  required(payload.location ?? existing?.location, "Location", 160);
  const classSchedule = payload.classSchedule ?? existing?.classSchedule;
  const courseMode = payload.courseMode ?? existing?.courseMode;
  const locationDistance = payload.locationDistance ?? existing?.locationDistance;
  if (upper(locationDistance) === "OTHER" && !text(payload.otherLocationDistance ?? existing?.otherLocationDistance)) throw new AppError("Other location distance is required", 400);
  const callType = enumValue(payload.callType ?? existing?.callType, CALL_TYPES, "Call type");
  const status = enumValue(payload.status ?? existing?.status, STATUSES, "Lead status", "DRAFT");
  const stage = enumValue(payload.stage ?? existing?.stage, STAGES, "Lead stage", "COLD");
  const leadSource = enumValue(payload.leadSource ?? existing?.leadSource, SOURCES, "Lead source");
  if (callType === "OTHER" && !text(payload.otherCallType ?? existing?.otherCallType)) throw new AppError("Other call type is required", 400);
  if (status === "OTHER" && !text(payload.otherStatus ?? existing?.otherStatus)) throw new AppError("Other lead status is required", 400);
  if (stage === "OTHER" && !text(payload.otherStage ?? existing?.otherStage)) throw new AppError("Other lead stage is required", 400);
  if (leadSource === "OTHER" && !text(payload.otherLeadSource ?? existing?.otherLeadSource)) throw new AppError("Other lead source is required", 400);
  if (text(payload.referredBy ?? existing?.referredBy) && !text(payload.referredName ?? existing?.referredName)) throw new AppError("Referred name is required when Referred By is selected", 400);
  const paymentStatus = enumValue(payload.paymentStatus ?? existing?.paymentStatus, PAYMENT_STATUSES, "Payment status", "NOT_PAID");
  const paymentAmount = paymentAmountValue(payload.paymentAmount, paymentStatus, existing?.paymentAmount);
  return { leadId, studentName, phoneNumber, alternativeNumber, email, qualification: optional(payload.qualification ?? existing?.qualification, 120), location: optional(payload.location ?? existing?.location, 160), callType, otherCallType: callType === "OTHER" ? optional(payload.otherCallType ?? existing?.otherCallType, 160) : null, status, otherStatus: status === "OTHER" ? optional(payload.otherStatus ?? existing?.otherStatus, 160) : null, stage, otherStage: stage === "OTHER" ? optional(payload.otherStage ?? existing?.otherStage, 160) : null, courseId: required(payload.courseId ?? existing?.courseId, "Course ID"), otherCourse: optional(payload.otherCourse ?? existing?.otherCourse, 160), nextFollowUpDate: dateValue(payload.nextFollowUpDate ?? existing?.nextFollowUpDate, "Next follow-up date", false), nextFollowUpTime: optional(payload.nextFollowUpTime ?? existing?.nextFollowUpTime, 5), branchId: required(payload.branchId ?? existing?.branchId, "Branch ID"), leadSource, otherLeadSource: leadSource === "OTHER" ? optional(payload.otherLeadSource ?? existing?.otherLeadSource, 160) : null, referredBy: optional(payload.referredBy ?? existing?.referredBy, 120), referredName: text(payload.referredBy ?? existing?.referredBy) ? optional(payload.referredName ?? existing?.referredName, 160) : null, paymentStatus, paymentAmount, classSchedule: enumValue(classSchedule, CLASS_SCHEDULES, "Class schedule"), courseMode: enumValue(courseMode, COURSE_MODES, "Course mode"), locationDistance: locationDistance ? enumValue(locationDistance, DISTANCES, "Location distance") : null, otherLocationDistance: upper(locationDistance) === "OTHER" ? optional(payload.otherLocationDistance ?? existing?.otherLocationDistance, 160) : null, leadDate: dateValue(payload.leadDate ?? existing?.leadDate, "Lead date"), assignedToId: optional(payload.assignedToId ?? existing?.assignedToId) };
}

async function permittedBranches(actor) {
  const role = String(actor?.role || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (role === "SUPERADMIN") return null;
  if (role === "SALESADMIN") return (await prisma.salesAdminBranch.findMany({ where: { salesAdminId: actor.userId, branch: { status: "ACTIVE" } }, select: { branchId: true } })).map((row) => row.branchId);
  if (role === "BRANCHADMIN" && actor.branchId) return [actor.branchId];
  throw new AppError("You do not have permission to manage leads", 403);
}

function assertLeadAssignment(lead, actor) {
  const role = String(actor?.role || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (role === "SALESADMIN" && lead.assignedToId !== actor.userId) throw new AppError("You do not have access to this lead", 403);
  if (role === "BRANCHADMIN" && lead.assignedToId && lead.assignedToId !== actor.userId) throw new AppError("This lead is assigned to another Sales Admin", 403);
}

async function assertBranchAccess(branchId, actor, allowed = undefined) {
  const permitted = allowed === undefined ? await permittedBranches(actor) : allowed;
  if (permitted && !permitted.includes(branchId)) throw new AppError("You do not have access to this branch", 403);
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, branchName: true, status: true } });
  if (!branch) throw new AppError("Branch not found", 404);
  if (branch.status !== "ACTIVE") throw new AppError("Lead operations are unavailable for an inactive branch", 403);
  return branch;
}

async function validateRelations(data, actor, existingId = null) {
  const allowed = await permittedBranches(actor);
  await assertBranchAccess(data.branchId, actor, allowed);
  const actorRole = String(actor?.role || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if ((actorRole === "SALESADMIN" || actorRole === "BRANCHADMIN") && data.assignedToId !== actor.userId) throw new AppError("You can only assign leads to your own account", 403);
  const course = await prisma.branchCourse.findFirst({ where: { id: data.courseId, branchId: data.branchId, status: "ACTIVE" }, select: { id: true, name: true } });
  if (!course) throw new AppError("Course does not belong to the selected branch", 400);
  if (data.assignedToId) {
    const assigned = actorRole === "BRANCHADMIN" && data.assignedToId === actor.userId
      ? await prisma.user.findFirst({ where: { id: actor.userId, role: "BRANCH_ADMIN", active: true }, select: { id: true } })
      : await prisma.user.findFirst({ where: { id: data.assignedToId, role: "SALES_ADMIN", active: true, salesAdminBranches: { some: { branchId: data.branchId } } }, select: { id: true } });
    if (!assigned) throw new AppError("Assigned user is not authorized for this branch", 400);
  }
  const duplicate = await prisma.lead.findFirst({
    where: {
      deletedAt: null,
      ...(existingId ? { id: { not: existingId } } : {}),
      OR: [
        { leadId: { equals: data.leadId, mode: "insensitive" } },
        { email: { equals: data.email, mode: "insensitive" } },
        { phoneNumber: data.phoneNumber },
      ],
    },
    select: { leadId: true, email: true, phoneNumber: true },
  });
  if (duplicate) {
    if (String(duplicate.leadId || "").toLowerCase() === data.leadId.toLowerCase()) throw new AppError("Lead ID already exists", 409);
    if (String(duplicate.email || "").toLowerCase() === data.email.toLowerCase()) throw new AppError("Email address already exists", 409);
    throw new AppError("Phone number already exists", 409);
  }
}

const includeLead = { branch: { select: { id: true, branchId: true, branchName: true, timezone: true } }, course: { select: { id: true, courseCode: true, name: true, branchId: true } }, assignedTo: { select: { id: true, userCode: true, fullName: true, email: true } } };
const output = (lead) => lead;

async function findLead(id, actor, history = false) {
  const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null }, include: { ...includeLead, ...(history ? { followUps: { orderBy: { followUpDate: "desc" }, include: { createdBy: { select: { id: true, fullName: true, email: true } }, recordings: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true } } } }, stageHistory: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { id: true, fullName: true } } } }, activities: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { id: true, fullName: true } } } }, recordings: { orderBy: { createdAt: "desc" }, select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true, followUpId: true } } } : {}) } });
  if (!lead) throw new AppError("Lead not found", 404);
  await assertBranchAccess(lead.branchId, actor);
  assertLeadAssignment(lead, actor);
  const actorRole = String(actor?.role || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (actorRole === "BRANCHADMIN" && !lead.assignedTo) {
    const branchAdmin = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { id: true, userCode: true, fullName: true, email: true },
    });
    if (branchAdmin) lead.assignedTo = branchAdmin;
  }
  return lead;
}

export async function listLeads(query = {}, actor) {
  const allowed = await permittedBranches(actor); const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1); const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit || "10", 10) || 10)); const search = text(query.search);
  const where = { deletedAt: null, ...(allowed ? { branchId: { in: allowed } } : {}), ...(query.branchId ? { branchId: text(query.branchId) } : {}), ...(query.courseId ? { courseId: text(query.courseId) } : {}), ...(query.assignedToId ? { assignedToId: text(query.assignedToId) } : {}), ...(query.stage ? { stage: enumValue(query.stage, STAGES, "Lead stage") } : {}), ...(query.status ? { status: enumValue(query.status, STATUSES, "Lead status") } : {}), ...(query.leadSource ? { leadSource: enumValue(query.leadSource, SOURCES, "Lead source") } : {}) };
  const actorRole = String(actor?.role || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (actorRole === "SALESADMIN") where.assignedToId = actor.userId;
  if (actorRole === "BRANCHADMIN") where.OR = [{ assignedToId: null }, { assignedToId: actor.userId }];
  if (query.branchId && allowed && !allowed.includes(text(query.branchId))) throw new AppError("You do not have access to this branch", 403);
  if (search) where.AND = [{ OR: [{ leadId: { contains: search, mode: "insensitive" } }, { studentName: { contains: search, mode: "insensitive" } }, { phoneNumber: { contains: search } }, { email: { contains: search, mode: "insensitive" } }] }];
  if (query.from || query.to) where.leadDate = { ...(query.from ? { gte: dateValue(query.from, "From date") } : {}), ...(query.to ? { lte: dateValue(query.to, "To date") } : {}) };
  const sortBy = ["createdAt", "leadDate", "studentName", "stage", "status"].includes(text(query.sortBy)) ? text(query.sortBy) : "createdAt"; const sortOrder = text(query.sortOrder).toLowerCase() === "asc" ? "asc" : "desc";
  const [total, rows, branchAdmin] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({ where, include: includeLead, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
    actorRole === "BRANCHADMIN" ? prisma.user.findUnique({ where: { id: actor.userId }, select: { id: true, userCode: true, fullName: true, email: true } }) : Promise.resolve(null),
  ]);
  return {
    data: rows.map((lead) => {
      const item = output(lead);
      if (branchAdmin && !item.assignedTo) item.assignedTo = branchAdmin;
      return item;
    }),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function checkLeadDuplicates(query = {}, actor) {
  const leadId = text(query.leadId);
  const email = text(query.email).toLowerCase();
  const phoneNumber = text(query.phoneNumber);
  const excludeId = text(query.excludeId);
  const checks = [
    leadId ? { leadId: { equals: leadId, mode: 'insensitive' } } : null,
    email ? { email: { equals: email, mode: 'insensitive' } } : null,
    phoneNumber ? { phoneNumber } : null,
  ].filter(Boolean);
  if (!checks.length) return { duplicate: false };
  const duplicate = await prisma.lead.findFirst({
    where: { deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}), OR: checks },
    select: { leadId: true, email: true, phoneNumber: true },
  });
  if (!duplicate) return { duplicate: false };
  if (leadId && String(duplicate.leadId || "").toLowerCase() === leadId.toLowerCase()) return { duplicate: true, field: "leadId", message: "Lead ID already exists" };
  if (email && String(duplicate.email || "").toLowerCase() === email) return { duplicate: true, field: "email", message: "Email address already exists" };
  return { duplicate: true, field: "phoneNumber", message: "Phone number already exists" };
}

export async function createLead(payload, actor) { const requestedLeadId = text(payload.leadId); const autoLeadId = requestedLeadId || await generatedLeadId(); const actorRole = String(actor?.role || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); const isSalesAdmin = actorRole === "SALESADMIN"; const isBranchAdmin = actorRole === "BRANCHADMIN"; const requestedAssignee = text(payload.assignedToId); if ((isSalesAdmin || isBranchAdmin) && requestedAssignee && requestedAssignee !== actor.userId) throw new AppError("You can only assign leads to your own account", 403); const data = normalizePayload({ ...payload, ...((isSalesAdmin || isBranchAdmin) ? { assignedToId: actor.userId } : {}), leadId: autoLeadId }); await validateRelations(data, actor); await validateFollowUpSchedule(data, data.branchId); const created = await prisma.$transaction(async (tx) => { const lead = await tx.lead.create({ data: { ...data, createdById: actor.userId }, include: includeLead }); await tx.leadActivity.create({ data: { leadId: lead.id, action: "LEAD_CREATED", newValue: { leadId: lead.leadId, stage: lead.stage, status: lead.status }, createdById: actor.userId } }); await tx.leadStageHistory.create({ data: { leadId: lead.id, toStage: lead.stage, createdById: actor.userId } }); if (data.nextFollowUpDate) await tx.leadActivity.create({ data: { leadId: lead.id, action: 'NEXT_FOLLOW_UP_CHANGED', newValue: { nextFollowUpDate: data.nextFollowUpDate.toISOString(), nextFollowUpTime: data.nextFollowUpTime }, createdById: actor.userId } }); return output(lead); }); await syncLeadFollowUpReminder(created.id); return created; }
export async function getLead(id, actor) { const lead = await findLead(id, actor, true); const followUpReminders = await prisma.followUpReminder.findMany({ where: { leadId: lead.id }, orderBy: { scheduledFor: "desc" }, take: 10, select: { id: true, dueDate: true, scheduledFor: true, timezone: true, status: true, notificationId: true, deliveredAt: true } }); return { ...lead, followUpReminders }; }
export async function updateLead(id, payload, actor) { const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null } }); if (!existing) throw new AppError("Lead not found", 404); await assertBranchAccess(existing.branchId, actor); assertLeadAssignment(existing, actor); const actorRole = String(actor?.role || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); const data = normalizePayload({ ...payload, ...(actorRole === "BRANCHADMIN" ? { assignedToId: actor.userId } : {}) }, existing); await validateRelations(data, actor, id); await validateFollowUpSchedule(data, data.branchId); const changedStage = existing.stage !== data.stage; const scheduleChanged = (existing.nextFollowUpDate?.getTime() || null) !== (data.nextFollowUpDate?.getTime() || null) || (existing.nextFollowUpTime || null) !== (data.nextFollowUpTime || null); const updated = await prisma.$transaction(async (tx) => { const lead = await tx.lead.update({ where: { id }, data: { ...data, updatedById: actor.userId }, include: includeLead }); await tx.leadActivity.create({ data: { leadId: id, action: changedStage ? "LEAD_UPDATED_STAGE_CHANGED" : "LEAD_UPDATED", previousValue: { stage: existing.stage, status: existing.status }, newValue: { stage: data.stage, status: data.status }, createdById: actor.userId } }); if (changedStage) await tx.leadStageHistory.create({ data: { leadId: id, fromStage: existing.stage, toStage: data.stage, createdById: actor.userId } }); if (scheduleChanged) await tx.leadActivity.create({ data: { leadId: id, action: 'NEXT_FOLLOW_UP_CHANGED', previousValue: { nextFollowUpDate: existing.nextFollowUpDate?.toISOString() || null, nextFollowUpTime: existing.nextFollowUpTime || null }, newValue: { nextFollowUpDate: data.nextFollowUpDate?.toISOString() || null, nextFollowUpTime: data.nextFollowUpTime || null }, createdById: actor.userId } }); return output(lead); }); await syncLeadFollowUpReminder(updated.id); return updated; }
export async function deleteLead(id, actor) { const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null }, select: { id: true, branchId: true, status: true, assignedToId: true } }); if (!lead) throw new AppError("Lead not found", 404); await assertBranchAccess(lead.branchId, actor); assertLeadAssignment(lead, actor); if (lead.status === "CONVERTED" && String(actor.role).toUpperCase().replace(/[^A-Z0-9]/g, "") !== "SUPERADMIN") throw new AppError("Converted leads require authorized archival workflow", 403); await prisma.lead.delete({ where: { id } }); return { deleted: true }; }
export async function addFollowUp(id, payload, actor) {
  const lead = await findLead(id, actor);
  const followUpDate = dateValue(payload.followUpDate || new Date(), "Follow-up date");
  const stage = enumValue(payload.stage ?? lead.stage, STAGES, "Lead stage");
  const status = enumValue(payload.status ?? lead.status, STATUSES, "Lead status");
  const callStatus = callStatusValue(payload.callStatus);
  const activeStage = ["COLD", "WARM"].includes(stage);
  let scheduleChoice = upper(payload.scheduleChoice);
  if (activeStage && scheduleChoice === "NO_FURTHER_FOLLOW_UP") throw new AppError("COLD and WARM leads must keep automatic follow-up reminders active. Move the lead to HOT or CLOSED to stop reminders.", 400);
  let nextFollowUpDate = dateValue(payload.nextFollowUpDate, "Next follow-up date", false);
  let nextFollowUpTime = optional(payload.nextFollowUpTime, 5);
  if (scheduleChoice === "KEEP_EXISTING_DATE") {
    const submittedDateChanged = Boolean(nextFollowUpDate) && nextFollowUpDate.getTime() !== (lead.nextFollowUpDate?.getTime() || null);
    const submittedTimeChanged = Boolean(nextFollowUpTime) && nextFollowUpTime !== (lead.nextFollowUpTime || null);
    if (submittedDateChanged || submittedTimeChanged) scheduleChoice = "SET_NEW_DATE";
  }
  if (scheduleChoice === "KEEP_EXISTING_DATE") {
    nextFollowUpDate = lead.nextFollowUpDate || null;
    nextFollowUpTime = lead.nextFollowUpTime || null;
    if (nextFollowUpDate) {
      const timezone = (await prisma.branch.findUnique({ where: { id: lead.branchId }, select: { timezone: true } }))?.timezone || "Asia/Kolkata";
      const now = branchDateTimeParts(timezone);
      const todayKey = `${now.year}-${now.month}-${now.day}`;
      const existingKey = nextFollowUpDate.toISOString().slice(0, 10);
      const existingTimePassed = existingKey === todayKey && nextFollowUpTime && Number(nextFollowUpTime.slice(0, 2)) * 60 + Number(nextFollowUpTime.slice(3, 5)) <= Number(now.hour) * 60 + Number(now.minute);
      if (existingKey < todayKey || existingTimePassed) { nextFollowUpDate = null; nextFollowUpTime = null; }
    }
  } else if (scheduleChoice === "NO_FURTHER_FOLLOW_UP") {
    nextFollowUpDate = null;
    nextFollowUpTime = null;
  }
  const schedule = { nextFollowUpDate, nextFollowUpTime };
  await validateFollowUpSchedule(schedule, lead.branchId);
  if (schedule.nextFollowUpDate && schedule.nextFollowUpDate.toISOString().slice(0, 10) < followUpDate.toISOString().slice(0, 10)) throw new AppError("Next follow-up must be after the follow-up date", 400);
  nextFollowUpDate = schedule.nextFollowUpDate;
  nextFollowUpTime = schedule.nextFollowUpTime;
  const notes = optional(payload.notes, 2000) || "";
  const followUpType = optional(payload.followUpType, 80) || "FOLLOW_UP";
  const followUp = await prisma.$transaction(async (tx) => {
    const saved = await tx.leadFollowUp.create({ data: { leadId: lead.id, followUpDate, nextFollowUpDate, nextFollowUpTime, followUpType, callStatus, notes, createdById: actor.userId }, include: { createdBy: { select: { id: true, fullName: true, email: true } } } });
    await tx.lead.update({ where: { id: lead.id }, data: { stage, status, lastCallStatus: callStatus, nextFollowUpDate, nextFollowUpTime, updatedById: actor.userId } });
    await tx.leadActivity.create({ data: { leadId: lead.id, action: "FOLLOW_UP_ADDED", previousValue: { stage: lead.stage, status: lead.status, callStatus: lead.lastCallStatus || null }, newValue: { followUpId: saved.id, stage, status, callStatus, nextFollowUpDate: nextFollowUpDate?.toISOString() || null, nextFollowUpTime }, createdById: actor.userId } });
    if ((lead.nextFollowUpDate?.getTime() || null) !== (nextFollowUpDate?.getTime() || null) || (lead.nextFollowUpTime || null) !== (schedule.nextFollowUpTime || null)) await tx.leadActivity.create({ data: { leadId: lead.id, action: 'NEXT_FOLLOW_UP_CHANGED', previousValue: { nextFollowUpDate: lead.nextFollowUpDate?.toISOString() || null, nextFollowUpTime: lead.nextFollowUpTime || null }, newValue: { nextFollowUpDate: nextFollowUpDate?.toISOString() || null, nextFollowUpTime: schedule.nextFollowUpTime, followUpId: saved.id }, createdById: actor.userId } });
    if (lead.stage !== stage) { await tx.leadStageHistory.create({ data: { leadId: lead.id, fromStage: lead.stage, toStage: stage, createdById: actor.userId } }); await tx.leadActivity.create({ data: { leadId: lead.id, action: "LEAD_STAGE_CHANGED", previousValue: { stage: lead.stage }, newValue: { stage }, createdById: actor.userId } }); }
    if (lead.status !== status) await tx.leadActivity.create({ data: { leadId: lead.id, action: "LEAD_STATUS_CHANGED", previousValue: { status: lead.status }, newValue: { status }, createdById: actor.userId } });
    return saved;
  });
  await syncLeadFollowUpReminder(lead.id);
  if (nextFollowUpDate) {
    const dateKey = nextFollowUpDate.toISOString().slice(0, 10);
    const timeKey = nextFollowUpTime || "";
    const requestDescription = `LEAD_FOLLOW_UP_SCHEDULED:${lead.id}:${dateKey}:${timeKey}`;
    const targetUserId = actor.userId;
    const existingNotification = await prisma.notification.findFirst({
      where: { kind: "LEAD_FOLLOW_UP_SCHEDULED", targetUserId, requestDescription },
      select: { id: true },
    });
    if (!existingNotification) {
      try {
        const dateLabel = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(nextFollowUpDate);
        const timeLabel = nextFollowUpTime ? ` at ${nextFollowUpTime}` : "";
        await createNotification({
          kind: "LEAD_FOLLOW_UP_SCHEDULED",
          tone: "blue",
          title: `Next Follow-up Scheduled - ${lead.studentName}`,
          message: `A follow-up for ${lead.studentName} (${lead.leadId}) is scheduled for ${dateLabel}${timeLabel}.`,
          actionLabel: "View Lead",
          targetUserId,
          targetBranchId: lead.branch?.id || lead.branchId || null,
          targetBranchName: lead.branch?.branchName || null,
          requestDescription,
          createdBy: actor.userId,
        });
      } catch (error) {
        console.warn(`Follow-up scheduled notification failed for ${lead.id}: ${error?.message || error}`);
      }
    }
  }
  return followUp;
}
export async function listLeadActivities(id, actor) { const lead = await findLead(id, actor); return prisma.leadActivity.findMany({ where: { leadId: lead.id }, orderBy: { createdAt: "desc" }, include: { createdBy: { select: { id: true, fullName: true, email: true } } } }); }

export async function getLeadOptions(actor, query = {}) {
  const allowed = await permittedBranches(actor);
  const branchWhere = { status: "ACTIVE", ...(allowed ? { id: { in: allowed } } : {}) };
  const isMonthlyReport = String(query.view || '').trim().toLowerCase() === 'monthly';
  const role = String(actor?.role || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const [branches, courses, assignees] = await Promise.all([
    prisma.branch.findMany({ where: branchWhere, select: { id: true, branchId: true, branchName: true, timezone: true }, orderBy: { branchName: "asc" } }),
    prisma.branchCourse.findMany({ where: { status: "ACTIVE", branch: branchWhere }, select: { id: true, branchId: true, courseCode: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "SALES_ADMIN", active: true, ...(allowed ? { salesAdminBranches: { some: { branchId: { in: allowed } } } } : {}), ...(isMonthlyReport && role === "SALESADMIN" ? { id: actor.userId } : {}) }, select: { id: true, userCode: true, fullName: true, email: true, salesAdminBranches: { select: { branchId: true } } }, orderBy: { fullName: "asc" } }),
  ]);
  return { branches, courses, assignees: assignees.map(({ salesAdminBranches, ...user }) => ({ ...user, branchIds: salesAdminBranches.map((row) => row.branchId) })), nextLeadId: await generatedLeadId(), currentUserId: actor.userId };
}

const leadRecordingRoot = path.resolve(process.cwd(), "uploads", "lead-recordings");

export async function addLeadRecording(id, file, actor) {
  if (!file?.buffer) throw new AppError("Call recording file is required", 400);
  const lead = await findLead(id, actor);
  const extension = path.extname(file.originalname || "").toLowerCase();
  if (!/^\.(mp3|wav|m4a|aac|ogg)$/.test(extension)) throw new AppError("Unsupported call recording format", 400);
  const storageKey = `${lead.id}-${crypto.randomUUID()}${extension}`;
  await fs.mkdir(leadRecordingRoot, { recursive: true });
  await fs.writeFile(path.join(leadRecordingRoot, storageKey), file.buffer, { flag: "wx" });
  try {
    return await prisma.$transaction(async (tx) => {
      const recording = await tx.leadRecording.create({ data: { leadId: lead.id, originalName: file.originalname, storageKey, mimeType: file.mimetype, sizeBytes: file.size || file.buffer.length, createdById: actor.userId } });
      await tx.leadActivity.create({ data: { leadId: lead.id, action: "CALL_RECORDING_UPLOADED", newValue: { recordingId: recording.id, originalName: recording.originalName }, createdById: actor.userId } });
      return { id: recording.id, originalName: recording.originalName, mimeType: recording.mimeType, sizeBytes: recording.sizeBytes, createdAt: recording.createdAt };
    });
  } catch (error) {
    await fs.rm(path.join(leadRecordingRoot, storageKey), { force: true });
    throw error;
  }
}

export async function addLeadRecordings(id, files, actor, followUpId = null) {
  if (!Array.isArray(files) || !files.length) throw new AppError("At least one call recording is required", 400);
  const lead = await findLead(id, actor);
  if (followUpId) {
    const followUp = await prisma.leadFollowUp.findFirst({ where: { id: followUpId, leadId: lead.id }, select: { id: true } });
    if (!followUp) throw new AppError("Follow-up not found for this lead", 404);
  }
  const storageKeys = [];
  try {
    await fs.mkdir(leadRecordingRoot, { recursive: true });
    const prepared = [];
    for (const file of files) {
      const extension = path.extname(file.originalname || "").toLowerCase();
      if (!/^\.(mp3|wav|m4a|aac|ogg)$/.test(extension)) throw new AppError("Unsupported call recording format", 400);
      const storageKey = `${lead.id}-${crypto.randomUUID()}${extension}`;
      storageKeys.push(storageKey);
      await fs.writeFile(path.join(leadRecordingRoot, storageKey), file.buffer, { flag: "wx" });
      prepared.push({ file, storageKey });
    }
    return await prisma.$transaction(async (tx) => {
      const result = [];
      for (const { file, storageKey } of prepared) {
        const recording = await tx.leadRecording.create({ data: { leadId: lead.id, followUpId: followUpId || null, originalName: file.originalname, storageKey, mimeType: file.mimetype, sizeBytes: file.size || file.buffer.length, createdById: actor.userId } });
        await tx.leadActivity.create({ data: { leadId: lead.id, action: "CALL_RECORDING_UPLOADED", newValue: { recordingId: recording.id, originalName: recording.originalName }, createdById: actor.userId } });
        result.push({ id: recording.id, originalName: recording.originalName, mimeType: recording.mimeType, sizeBytes: recording.sizeBytes, createdAt: recording.createdAt });
      }
      return result;
    });
  } catch (error) {
    await Promise.all(storageKeys.map((storageKey) => fs.rm(path.join(leadRecordingRoot, storageKey), { force: true })));
    throw error;
  }
}

export async function getLeadRecording(id, recordingId, actor) {
  const lead = await findLead(id, actor);
  const recording = await prisma.leadRecording.findFirst({ where: { id: recordingId, leadId: lead.id }, select: { storageKey: true, originalName: true, mimeType: true } });
  if (!recording) throw new AppError("Recording not found", 404);
  try { return { buffer: await fs.readFile(path.join(leadRecordingRoot, recording.storageKey)), fileName: recording.originalName, mimeType: recording.mimeType }; } catch { throw new AppError("Recording file is missing", 404); }
}

export async function deleteLeadRecording(id, recordingId, actor) {
  const lead = await findLead(id, actor);
  const recording = await prisma.leadRecording.findFirst({ where: { id: recordingId, leadId: lead.id }, select: { id: true, storageKey: true, originalName: true } });
  if (!recording) throw new AppError("Recording not found", 404);
  await prisma.$transaction(async (tx) => {
    await tx.leadRecording.delete({ where: { id: recording.id } });
    await tx.leadActivity.create({ data: { leadId: lead.id, action: "CALL_RECORDING_DELETED", previousValue: { recordingId: recording.id, originalName: recording.originalName }, createdById: actor.userId } });
  });
  await fs.rm(path.join(leadRecordingRoot, recording.storageKey), { force: true });
  return { id: recording.id, originalName: recording.originalName };
}
