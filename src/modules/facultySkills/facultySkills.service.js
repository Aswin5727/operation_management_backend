import ExcelJS from "exceljs";
import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { createNotification } from "../notifications/notifications.service.js";

const STATUSES = new Set(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]);
const REFERENCE_TYPES = new Set(["Self Learning", "PDF / Document", "Video / Online Resource", "Other Faculty", "Training / Workshop", "Other"]);
const clean = (value) => String(value ?? "").trim();
const formatNotificationDate = (value) => { const text = clean(value); const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/); return match ? `${match[3]}/${match[2]}/${match[1]}` : text; };
const excelSafe = (value) => { const text = String(value ?? ""); return /^[=+\-@]/.test(text) ? `'${text}` : text; };
const excelStatusLabel = (value) => { const status = clean(value).toUpperCase(); if (status === "OVERDUE" || status === "BEHIND_SCHEDULE") return "Behind Schedule"; return status.replaceAll("_", " "); };
const dateOnly = (value) => { const text = clean(value); if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null; const date = new Date(`${text}T00:00:00Z`); return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? null : text; };
const today = () => new Date().toISOString().slice(0, 10);

function parseYmd(value) { const text = dateOnly(value); if (!text) return null; const [, year, month, day] = text.match(/^(\d{4})-(\d{2})-(\d{2})$/); return { year: Number(year), month: Number(month), day: Number(day) }; }
function formatYmd({ year, month, day }) { return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
function daysInMonth(year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
function addCalendarDays(date, days) { const serial = Date.UTC(date.year, date.month - 1, date.day) + days * 86400000; const result = new Date(serial); return { year: result.getUTCFullYear(), month: result.getUTCMonth() + 1, day: result.getUTCDate() }; }
export function calculateEndDate(startDate, months) {
  const start = parseYmd(startDate); const duration = Number(months);
  if (!start || !Number.isInteger(duration) || duration < 1 || duration > 60) throw new AppError("Duration must be a whole number of months between 1 and 60.", 400);
  const monthIndex = start.month - 1 + duration; const year = start.year + Math.floor(monthIndex / 12); const month = (monthIndex % 12) + 1;
  return formatYmd({ year, month, day: Math.min(start.day, daysInMonth(year, month)) });
}
export function parseDuration(value) {
  const text = clean(value).toLowerCase().replace(/\s+/g, " ");
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(month|months)$/);
  if (!match || Number(match[1]) <= 0) throw new AppError("Duration must be like 1 Month or 2 Months.", 400);
  const amount = Number(match[1]);
  const unit = match[2].startsWith("day") ? "DAY" : match[2].startsWith("year") ? "YEAR" : "MONTH";
  if (!Number.isInteger(amount)) throw new AppError("Duration must use a whole number of months.", 400);
  return { amount, unit, text };
}
export function calculateEndDateFromDuration(startDate, durationInput) {
  const parsed = parseDuration(durationInput);
  const start = parseYmd(startDate);
  if (!start) throw new AppError("Start date must be a valid date.", 400);
  if (parsed.unit === "DAY") return formatYmd(addCalendarDays(start, parsed.amount));
  if (parsed.unit === "YEAR") { const year = start.year + parsed.amount; return formatYmd({ year, month: start.month, day: Math.min(start.day, daysInMonth(year, start.month)) }); }
  return calculateEndDate(formatYmd(start), parsed.amount);
}
function normalizeTopics(topics) {
  if (!Array.isArray(topics) || topics.length === 0) throw new AppError("At least one topic is required.", 400); const seen = new Set();
  return topics.map((topic, index) => { const name = clean(typeof topic === "string" ? topic : topic?.topicName); const key = name.toLowerCase().replace(/\s+/g, " "); if (!name) throw new AppError(`Topic ${index + 1} is required.`, 400); if (seen.has(key)) throw new AppError(`Duplicate topic: ${name}.`, 400); seen.add(key); return name; });
}
async function getBranch(user, requestedBranchId) {
  const role = String(user.role).toUpperCase();
  const branchId = role === "BRANCH_ADMIN" ? user.branchId : clean(requestedBranchId);
  const branchLookup = branchId
    ? { OR: [{ id: branchId }, { branchId }] }
    : role === "BRANCH_ADMIN"
      ? {
          OR: [
            ...(user.id ? [{ adminUserId: user.id }] : []),
            ...(user.email ? [{ branchEmail: { equals: user.email, mode: "insensitive" } }] : []),
          ],
        }
      : null;
  if (!branchLookup) throw new AppError("Branch context is required.", 400);
  const branch = await prisma.branch.findFirst({ where: branchLookup, select: { id: true, branchId: true, branchName: true, branchEmail: true, adminUserId: true } });
  if (!branch) throw new AppError("Branch not found or not authorized.", 404); return branch;
}
const includeShape = () => ({ skill: { select: { id: true, name: true } }, faculty: { select: { id: true, facultyId: true, name: true, email: true } }, topics: { where: { active: true }, orderBy: { displayOrder: "asc" } } });
const skillLabel = (row) => row.skill?.name || row.skillName || "Skill";
const durationLabel = (row) => `${row.durationValue} ${String(row.durationUnit || "MONTH").toLowerCase()}${row.durationValue === 1 ? "" : "s"}`;
function summarize(row) { const topics = (row.topics || []).filter((x) => x.active !== false); const completed = topics.filter((x) => x.status === "COMPLETED").length; const started = topics.filter((x) => x.status === "IN_PROGRESS").length; const progress = topics.length ? Math.round((completed / topics.length) * 100) : 0; let status = row.status === "CANCELLED" ? "CANCELLED" : (topics.length > 0 && completed === topics.length ? "COMPLETED" : row.status); if (status !== "COMPLETED" && status !== "CANCELLED" && row.endDate < today()) status = "OVERDUE"; if (status !== "COMPLETED" && status !== "CANCELLED" && !status) status = completed || started ? "IN_PROGRESS" : "NOT_STARTED"; return { ...row, topics, skillName: skillLabel(row), durationLabel: durationLabel(row), status, completedTopics: completed, inProgressTopics: started, pendingTopics: topics.length - completed - started, progress }; }
async function notifyOnce(tx, data, marker) { const existing = await tx.notification.findFirst({ where: { kind: data.kind, requestDescription: marker }, select: { id: true } }); if (!existing) await createNotification({ ...data, requestDescription: marker }, tx); }

export async function listFacultyAndSkills(user, query = {}) { const branch = await getBranch(user, query.branchId); const search = clean(query.search); const [faculty, skills] = await Promise.all([prisma.branchFaculty.findMany({ where: { branchId: branch.id, status: "ACTIVE", ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { facultyId: { contains: search, mode: "insensitive" } }] } : {}) }, orderBy: { name: "asc" }, select: { id: true, facultyId: true, name: true, email: true } }), prisma.facultySkill.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })]); return { branch, faculty, skills }; }

export async function createAssignment(user, payload = {}) {
  const branch = await getBranch(user, payload.branchId); const faculty = await prisma.branchFaculty.findFirst({ where: { id: clean(payload.branchFacultyId), branchId: branch.id, status: "ACTIVE" } }); if (!faculty) throw new AppError("Selected faculty is not active in this branch.", 400);
  const facultyUser = await prisma.user.findFirst({ where: { email: { equals: faculty.email, mode: "insensitive" }, role: "FACULTY", active: true }, select: { id: true } }); if (!facultyUser) throw new AppError("Faculty login account was not found.", 400);
  const skillName = clean(payload.skillName); if (!skillName) throw new AppError("Technology / Skill is required.", 400);
  const durationInput = clean(payload.durationInput || payload.duration); const duration = parseDuration(durationInput); const startDate = dateOnly(payload.startDate); if (!startDate) throw new AppError("Start date must be a valid date.", 400); const endDate = calculateEndDateFromDuration(startDate, durationInput); const topics = normalizeTopics(payload.topics);
  const result = await prisma.$transaction(async (tx) => { const skill = await tx.facultySkill.upsert({ where: { name: skillName }, create: { name: skillName }, update: { active: true } }); const assignment = await tx.facultySkillAssignment.create({ data: { branchId: branch.id, branchFacultyId: faculty.id, facultyUserId: facultyUser.id, skillId: skill.id, skillName, durationValue: duration.amount, durationUnit: duration.unit, startDate, endDate, createdBy: user.id, topics: { create: topics.map((topicName, index) => ({ topicName, displayOrder: index + 1 })) } }, include: includeShape() }); await notifyOnce(tx, { kind: "FACULTY_SKILL_ASSIGNED", tone: "green", title: "New Skill Development Assigned", message: `${skillName} has been assigned to you.\nDuration: ${durationInput}.\nStart Date: ${formatNotificationDate(startDate)}.\nEnd Date: ${formatNotificationDate(endDate)}.\nTotal Topics: ${topics.length}.`, actionLabel: "View Skill Development", targetUserId: facultyUser.id, facultyId: faculty.facultyId, facultyName: faculty.name, facultySkillAssignmentId: assignment.id, createdBy: user.id }, `faculty-skill-assigned:${assignment.id}`); return assignment; }); return summarize(result);
}
function displayDate(value) { const text = clean(value); const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/); return match ? `${match[3]}/${match[2]}/${match[1]}` : text; }
function displayDuration(value, unit = "MONTH") { return `${value} ${String(unit).toLowerCase() === "month" ? "Month" : String(unit)}${Number(value) === 1 ? "" : "s"}`; }
function editNotificationMessage(skillName, changes) { const lines = changes.map((change) => { if (change.changeType === "TOPIC_ADDED") return `Topic Added: ${change.newValue}`; if (change.changeType === "TOPIC_REMOVED") return `Topic Removed: ${change.oldValue}`; if (change.changeType === "TOPIC_RENAMED") return `Topic Renamed: ${change.oldValue} → ${change.newValue}`; return `${change.fieldName}: ${change.oldValue} → ${change.newValue}`; }); return `Your ${skillName} skill development assignment has been updated by your Branch Admin\n\nChanges made:\n${lines.map((line) => `- ${line}`).join("\n")}\n\nPlease review your updated assignment in Faculty Dashboard → Skill Development`; }

export async function updateAssignment(user, id, payload = {}) {
  const branch = await getBranch(user, payload.branchId);
  const current = await prisma.facultySkillAssignment.findFirst({ where: { id: clean(id), branchId: branch.id }, include: { ...includeShape(), topics: { orderBy: { displayOrder: "asc" } } } });
  if (!current) throw new AppError("Skill assignment not found or not authorized.", 404);
  const facultyKey = clean(payload.branchFacultyId || current.branchFacultyId);
  const faculty = await prisma.branchFaculty.findFirst({ where: { OR: [{ id: facultyKey }, { facultyId: facultyKey }], branchId: branch.id, status: "ACTIVE" } });
  if (!faculty) throw new AppError("Selected faculty is not active in this branch.", 400);
  const facultyUser = await prisma.user.findFirst({ where: { email: { equals: faculty.email, mode: "insensitive" }, role: "FACULTY", active: true }, select: { id: true } });
  if (!facultyUser) throw new AppError("Faculty login account was not found.", 400);
  const skillName = clean(payload.skillName || current.skillName || current.skill?.name); if (!skillName) throw new AppError("Technology / Skill is required.", 400);
  const durationInput = clean(payload.durationInput || payload.duration); const duration = parseDuration(durationInput); const startDate = dateOnly(payload.startDate); if (!startDate) throw new AppError("Start date must be a valid date.", 400); const endDate = calculateEndDateFromDuration(startDate, durationInput); const topicNames = normalizeTopics(payload.topics); const topicIds = Array.isArray(payload.topicIds) ? payload.topicIds.map(clean) : [];
  const activeTopics = current.topics.filter((topic) => topic.active !== false); const matchedTopics = new Set(); const topicChanges = []; const topicMatches = topicNames.map((topicName, index) => { const requestedId = topicIds[index]; const byId = requestedId ? activeTopics.find((topic) => topic.id === requestedId && !matchedTopics.has(topic.id)) : null; const byName = activeTopics.find((topic) => topic.topicName.toLowerCase() === topicName.toLowerCase() && !matchedTopics.has(topic.id)); const existing = byId || byName || activeTopics.find((topic) => topic === activeTopics[index] && !matchedTopics.has(topic.id)) || null; if (existing) { matchedTopics.add(existing.id); if (existing.topicName !== topicName) topicChanges.push({ changeType: "TOPIC_RENAMED", fieldName: "Topic", oldValue: existing.topicName, newValue: topicName, topicId: existing.id }); } else topicChanges.push({ changeType: "TOPIC_ADDED", fieldName: "Topic Added", oldValue: null, newValue: topicName, topicId: null }); return existing; }); activeTopics.filter((topic) => !matchedTopics.has(topic.id)).forEach((topic) => topicChanges.push({ changeType: "TOPIC_REMOVED", fieldName: "Topic Removed", oldValue: topic.topicName, newValue: null, topicId: topic.id }));
  const changes = []; if (current.skillName !== skillName) changes.push({ changeType: "FIELD_UPDATED", fieldName: "Skill Name", oldValue: current.skillName, newValue: skillName, topicId: null }); if (current.durationValue !== duration.amount || current.durationUnit !== duration.unit) changes.push({ changeType: "FIELD_UPDATED", fieldName: "Duration", oldValue: displayDuration(current.durationValue, current.durationUnit), newValue: displayDuration(duration.amount, duration.unit), topicId: null }); if (current.startDate !== startDate) changes.push({ changeType: "FIELD_UPDATED", fieldName: "Start Date", oldValue: displayDate(current.startDate), newValue: displayDate(startDate), topicId: null }); if (current.endDate !== endDate) changes.push({ changeType: "FIELD_UPDATED", fieldName: "End Date", oldValue: displayDate(current.endDate), newValue: displayDate(endDate), topicId: null }); changes.push(...topicChanges); if (!changes.length) return summarize(current);
  const result = await prisma.$transaction(async (tx) => {
    const skill = await tx.facultySkill.upsert({ where: { name: skillName }, create: { name: skillName }, update: { active: true } });
    for (const topic of current.topics) await tx.facultySkillTopic.update({ where: { id: topic.id }, data: { topicName: `__editing__${topic.id}`, displayOrder: 10000 + topic.displayOrder } });
    const matched = new Set();
    for (let index = 0; index < topicNames.length; index += 1) {
      const requestedId = topicIds[index]; const byId = requestedId ? current.topics.find((topic) => topic.id === requestedId) : null; const byName = current.topics.find((topic) => topic.topicName.toLowerCase() === topicNames[index].toLowerCase() && !matched.has(topic.id)); const existing = byId || byName || current.topics[index];
      if (existing) { matched.add(existing.id); await tx.facultySkillTopic.update({ where: { id: existing.id }, data: { topicName: topicNames[index], displayOrder: index + 1, active: true } }); }
      else await tx.facultySkillTopic.create({ data: { assignmentId: current.id, topicName: topicNames[index], displayOrder: index + 1, active: true } });
    }
    for (const topic of current.topics) if (!matched.has(topic.id)) await tx.facultySkillTopic.update({ where: { id: topic.id }, data: { active: false, displayOrder: 10000 + topic.displayOrder } });
    const assignment = await tx.facultySkillAssignment.update({ where: { id: current.id }, data: { branchId: branch.id, branchFacultyId: faculty.id, facultyUserId: facultyUser.id, skillId: skill.id, skillName, durationValue: duration.amount, durationUnit: duration.unit, startDate, endDate, updatedBy: user.id }, include: includeShape() });
    await tx.facultySkillAssignmentAudit.createMany({ data: changes.map((change) => ({ assignmentId: current.id, branchId: branch.id, facultyId: faculty.facultyId, editedBy: user.id, changeType: change.changeType, fieldName: change.fieldName, oldValue: change.oldValue, newValue: change.newValue, topicId: change.topicId })) });
    await notifyOnce(tx, { kind: "FACULTY_SKILL_ASSIGNED", tone: "blue", title: "Skill Development Assignment Updated", message: editNotificationMessage(skillName, changes), actionLabel: "View Skill Development", targetUserId: facultyUser.id, facultyId: faculty.facultyId, facultyName: faculty.name, facultySkillAssignmentId: current.id, createdBy: user.id }, `faculty-skill-edited:${current.id}:${JSON.stringify(changes)}`);
    return assignment;
  });
  return summarize(result);
}
export async function cancelAssignment(user, id) {
  const branch = await getBranch(user);
  const current = await prisma.facultySkillAssignment.findFirst({ where: { id: clean(id), branchId: branch.id }, include: { ...includeShape(), topics: { orderBy: { displayOrder: "asc" } } } });
  if (!current) throw new AppError("Skill assignment not found or not authorized.", 404);
  if (current.status !== "NOT_STARTED") throw new AppError("Only NOT STARTED skill assignments can be cancelled.", 400);
  const result = await prisma.$transaction(async (tx) => {
    const assignment = await tx.facultySkillAssignment.update({ where: { id: current.id }, data: { status: "CANCELLED", updatedBy: user.id }, include: includeShape() });
    await tx.facultySkillTopic.updateMany({ where: { assignmentId: current.id, active: true }, data: { active: false } });
    await tx.facultySkillAssignmentAudit.create({ data: { assignmentId: current.id, branchId: branch.id, facultyId: current.faculty.facultyId, editedBy: user.id, changeType: "ASSIGNMENT_CANCELLED", fieldName: "Assignment Status", oldValue: "NOT_STARTED", newValue: "CANCELLED" } });
    await notifyOnce(tx, { kind: "FACULTY_SKILL_ASSIGNED", tone: "amber", title: "Skill Development Assignment Cancelled", message: `Your ${current.skillName} skill development assignment has been cancelled by your Branch Admin\nStart Date: ${formatNotificationDate(current.startDate)}\nEnd Date: ${formatNotificationDate(current.endDate)}`, actionLabel: "View Skill Development", targetUserId: current.facultyUserId, facultyId: current.faculty.facultyId, facultyName: current.faculty.name, facultySkillAssignmentId: current.id, createdBy: user.id }, `faculty-skill-cancelled:${current.id}`);
    return assignment;
  });
  return summarize(result);
}
function assignmentWhere(user, id, branchId) { return String(user.role).toUpperCase() === "FACULTY" ? { id, facultyUserId: user.id, status: { not: "CANCELLED" } } : { id, branchId, status: { not: "CANCELLED" } }; }
export async function listAssignments(user, query = {}) { const role = String(user.role).toUpperCase(); const branch = role === "FACULTY" ? null : await getBranch(user, query.branchId); const where = role === "FACULTY" ? { facultyUserId: user.id } : { branchId: branch.id }; const search = clean(query.search); if (search) where.OR = [{ faculty: { name: { contains: search, mode: "insensitive" } } }, { faculty: { facultyId: { contains: search, mode: "insensitive" } } }, { skill: { name: { contains: search, mode: "insensitive" } } }, { skillName: { contains: search, mode: "insensitive" } }]; if (query.status && query.status !== "OVERDUE") where.status = query.status; const rows = await prisma.facultySkillAssignment.findMany({ where, orderBy: { createdAt: "desc" }, include: includeShape() }); const data = rows.map(summarize).filter((row) => !query.status || row.status === query.status); return { data, summary: { total: data.length, inProgress: data.filter((x) => x.status === "IN_PROGRESS").length, completed: data.filter((x) => x.status === "COMPLETED").length, overdue: data.filter((x) => x.status === "OVERDUE").length } }; }
export async function getAssignment(user, id, branchId) { const role = String(user.role).toUpperCase(); const branch = role === "FACULTY" ? null : await getBranch(user, branchId); const row = await prisma.facultySkillAssignment.findFirst({ where: assignmentWhere(user, id, branch?.id), include: includeShape() }); if (!row) throw new AppError("Skill assignment not found or not authorized.", 404); return summarize(row); }

export async function saveTopic(user, assignmentId, topicId, payload = {}) {
  const current = await getAssignment(user, assignmentId, payload.branchId); const topic = current.topics.find((item) => item.id === topicId); if (!topic) throw new AppError("Topic not found or not authorized.", 404); const status = clean(payload.status).toUpperCase(); if (!STATUSES.has(status)) throw new AppError("Invalid topic status.", 400);
  const startDate = payload.startDate === undefined ? topic.startDate : dateOnly(payload.startDate); const expectedDate = payload.expectedDate === undefined ? topic.expectedDate : dateOnly(payload.expectedDate); const completedDate = payload.completedDate === undefined ? topic.completedDate : (payload.completedDate ? dateOnly(payload.completedDate) : null); if (status !== "NOT_STARTED" && (!startDate || !expectedDate)) throw new AppError("Start date and expected completion date are required.", 400); if (startDate && expectedDate && expectedDate < startDate) throw new AppError("Expected completion date must be on or after start date.", 400); if (status === "COMPLETED" && !completedDate) throw new AppError("Actual completed date is required.", 400); if (completedDate && startDate && completedDate < startDate) throw new AppError("Actual completed date cannot precede start date.", 400); if (payload.referenceType && !REFERENCE_TYPES.has(payload.referenceType)) throw new AppError("Invalid reference type.", 400); if (payload.referenceUrl && !/^https?:\/\/[^\s]+$/i.test(payload.referenceUrl)) throw new AppError("Reference link must be a valid URL.", 400); if (topic.status === "COMPLETED" && status !== "COMPLETED") throw new AppError("Completed topics cannot be reopened through a normal edit.", 400);
  const result = await prisma.$transaction(async (tx) => { await tx.facultySkillTopic.update({ where: { id: topicId }, data: { status, startDate: startDate || null, expectedDate: expectedDate || null, completedDate: completedDate || null, ...(payload.learningSummary !== undefined ? { learningSummary: clean(payload.learningSummary) || null } : {}), ...(payload.referenceType !== undefined ? { referenceType: clean(payload.referenceType) || null } : {}), ...(payload.referenceName !== undefined ? { referenceName: clean(payload.referenceName) || null } : {}), ...(payload.referenceUrl !== undefined ? { referenceUrl: clean(payload.referenceUrl) || null } : {}) } }); const allTopics = await tx.facultySkillTopic.findMany({ where: { assignmentId } }); const completed = allTopics.filter((item) => item.status === "COMPLETED").length; const nextStatus = completed === allTopics.length ? "COMPLETED" : completed || allTopics.some((item) => item.status === "IN_PROGRESS") ? "IN_PROGRESS" : "NOT_STARTED"; const assignment = await tx.facultySkillAssignment.update({ where: { id: assignmentId }, data: { status: nextStatus, completedAt: nextStatus === "COMPLETED" ? (current.completedAt || new Date()) : null, updatedBy: user.id }, include: includeShape() }); if (nextStatus === "COMPLETED" && current.status !== "COMPLETED") await notifyOnce(tx, { kind: "FACULTY_SKILL_COMPLETED", tone: "green", title: "Faculty Skill Development Completed", message: `${current.faculty.name} (${current.faculty.facultyId}) has completed the assigned ${current.skill.name} skill. All ${allTopics.length} topics are completed. Final progress: 100%.`, actionLabel: "View Assignment", targetBranchId: current.branchId, facultyId: current.faculty.facultyId, facultyName: current.faculty.name, createdBy: user.id }, `faculty-skill-completed:${assignmentId}`); return assignment; }); return summarize(result);
}
export async function reconcileOverdueAssignments() { const rows = await prisma.facultySkillAssignment.findMany({ where: { endDate: { lt: today() }, status: { not: "COMPLETED" } }, include: includeShape() }); let changed = 0; for (const row of rows) { await prisma.$transaction(async (tx) => { await tx.facultySkillAssignment.update({ where: { id: row.id }, data: { status: "OVERDUE", overdueMarkedAt: row.overdueMarkedAt || new Date() } }); await notifyOnce(tx, { kind: "FACULTY_SKILL_OVERDUE", tone: "amber", title: "Faculty Skill Development Behind Schedule", message: `${row.faculty.name} (${row.faculty.facultyId}) has a behind schedule ${row.skill.name} assignment. End Date: ${row.endDate}. Progress: ${summarize(row).progress}%.`, actionLabel: "View Assignment", targetBranchId: row.branchId, facultyId: row.faculty.facultyId, facultyName: row.faculty.name }, `faculty-skill-overdue:${row.id}`); }); changed += 1; } return { changed }; }
export async function exportAssignment(user, id, branchId) {
  const row = await getAssignment(user, id, branchId);
  if (String(user.role).toUpperCase() === "FACULTY") throw new AppError("Only Branch Admin users can export reports.", 403);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Skill Assignment Report");
  const summaryHeaders = ["Faculty Name", "Faculty ID", "Skill", "Duration", "Start Date", "End Date", "Total Topics", "Completed Topics", "In Progress Topics", "Pending Topics", "Progress", "Assignment Status"];
  const topicHeaders = ["Topic", "Start Date", "Expected Completion", "Actual Completed", "Study Hours", "Learning Objective", "Faculty Name", "Reference Link", "Status"];
  sheet.addRow(summaryHeaders);
  sheet.addRow([excelSafe(row.faculty.name), excelSafe(row.faculty.facultyId), excelSafe(row.skill.name), `${row.durationValue} month${row.durationValue === 1 ? "" : "s"}`, row.startDate, row.endDate, row.topics.length, row.completedTopics, row.inProgressTopics, row.pendingTopics, `${row.progress}%`, excelStatusLabel(row.status)]);
  sheet.addRow([]);
  sheet.addRow(topicHeaders);
  row.topics.forEach((topic) => sheet.addRow([excelSafe(topic.topicName), topic.startDate || "—", topic.expectedDate || "—", topic.completedDate || "—", topic.studyHours == null ? "—" : Number(topic.studyHours), excelSafe(topic.referenceType || "—"), excelSafe(topic.referenceName || "—"), excelSafe(topic.referenceUrl || "—"), excelStatusLabel(topic.status)]));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(4).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 4 }];
  sheet.columns.forEach((column) => { column.width = Math.min(45, Math.max(16, String(column.header || "").length + 4)); });
  return workbook;
}
export async function saveTopicLearningLog(user, assignmentId, topicId, payload = {}) {
  const current = await getAssignment(user, assignmentId, payload.branchId);
  const topic = current.topics.find((item) => item.id === topicId);
  if (!topic) throw new AppError("Topic not found or not authorized.", 404);
  const status = clean(payload.status || topic.status || "NOT_STARTED").toUpperCase();
  if (!STATUSES.has(status)) throw new AppError("Invalid topic status.", 400);
  const startDate = payload.startDate === undefined ? topic.startDate : dateOnly(payload.startDate);
  const expectedDate = payload.expectedDate === undefined ? topic.expectedDate : (payload.expectedDate ? dateOnly(payload.expectedDate) : null);
  const completedDate = payload.completedDate === undefined ? topic.completedDate : (payload.completedDate ? dateOnly(payload.completedDate) : null);
  if (payload.startDate && !startDate) throw new AppError("Start date must be a valid date.", 400);
  if (payload.expectedDate && !expectedDate) throw new AppError("Expected completion date must be a valid date.", 400);
  if (!startDate || !expectedDate) throw new AppError("Start date and expected completion date are required.", 400);
  if (startDate && expectedDate && expectedDate < startDate) throw new AppError("Expected completion date must be on or after start date.", 400);
  if (status === "COMPLETED" && !completedDate) throw new AppError("Actual completed date is required.", 400);
  if (completedDate && startDate && completedDate < startDate) throw new AppError("Actual completed date cannot precede start date.", 400);
  const referenceType = payload.referenceType === undefined ? (topic.referenceType || "") : clean(payload.referenceType);
  if (!referenceType) throw new AppError("Reference type is required.", 400);
  const referenceName = payload.referenceName === undefined ? (topic.referenceName || "") : clean(payload.referenceName);
  if (referenceType && !REFERENCE_TYPES.has(referenceType)) throw new AppError("Invalid reference type.", 400);
  const needsReferenceName = referenceType === "Faculty" || referenceType === "Other Faculty";
  if (needsReferenceName && !referenceName) throw new AppError("Reference Name is required for Faculty references.", 400);
  const referenceUrl = payload.referenceUrl === undefined ? (topic.referenceUrl || "") : clean(payload.referenceUrl);
  if (referenceUrl && !/^https?:\/\/[^\s]+$/i.test(referenceUrl)) throw new AppError("Reference link must be a valid URL.", 400);
  const studyHours = payload.studyHours === undefined ? (topic.studyHours == null ? null : Number(topic.studyHours)) : (payload.studyHours === null ? null : Number(payload.studyHours));
  if (studyHours !== null && (!Number.isFinite(studyHours) || studyHours <= 0 || studyHours > 24)) throw new AppError("Study Hours must be a positive number up to 24.", 400);
  const result = await prisma.$transaction(async (tx) => {
    await tx.facultySkillTopic.update({ where: { id: topicId }, data: { status, startDate: startDate || null, expectedDate: expectedDate || null, completedDate: completedDate || null, studyHours: studyHours === null ? null : Number(studyHours.toFixed(2)), learningSummary: payload.learningSummary === undefined ? topic.learningSummary : (clean(payload.learningSummary) || null), referenceType: referenceType || null, referenceName: needsReferenceName ? referenceName : null, referenceUrl: referenceUrl || null } });
    const allTopics = await tx.facultySkillTopic.findMany({ where: { assignmentId, active: true } });
    const completed = allTopics.filter((item) => item.status === "COMPLETED").length;
    const nextStatus = completed === allTopics.length ? "COMPLETED" : completed || allTopics.some((item) => item.status === "IN_PROGRESS") ? "IN_PROGRESS" : "NOT_STARTED";
    return tx.facultySkillAssignment.update({ where: { id: assignmentId }, data: { status: nextStatus, completedAt: nextStatus === "COMPLETED" ? (current.completedAt || new Date()) : null, updatedBy: user.id }, include: includeShape() });
  });
  return summarize(result);
}
