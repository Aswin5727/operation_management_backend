import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { createNotification } from "../notifications/notifications.service.js";

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const text = (value) => String(value ?? "").trim();
const dateOnly = (value) => text(value).slice(0, 10);

function validDate(value, field) {
  const date = dateOnly(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) throw new AppError(`${field} must be a valid date`, 400);
  return date;
}
function addDays(value, days) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
function monday(value) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7)); return date.toISOString().slice(0, 10); }
function dayDate(start, day) { const index = DAYS.indexOf(text(day).toUpperCase()); if (index < 1 || index > 5) throw new AppError("Week-off days must be Monday through Friday", 400); return addDays(start, index - 1); }
function currentDateInTimezone(timezone = DEFAULT_TIMEZONE) { try { return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date()); } catch { return new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE }).format(new Date()); } }

async function facultyContext(user) {
  const email = text(user?.email).toLowerCase();
  const faculty = await prisma.branchFaculty.findFirst({ where: { status: "ACTIVE", OR: [{ email: { equals: email, mode: "insensitive" } }, { facultyId: text(user?.userCode) }] }, select: { facultyId: true, branchId: true, name: true, email: true, weeklyOffDay: true } });
  if (!faculty) throw new AppError("Active faculty profile not found", 404);
  return faculty;
}

async function weekOffRequestWindow(faculty, weekStartDate) {
  const branch = await prisma.branch.findUnique({ where: { id: faculty.branchId }, select: { timezone: true } });
  const timezone = text(branch?.timezone) || DEFAULT_TIMEZONE;
  const originalWeekOffDate = dayDate(weekStartDate, faculty.weeklyOffDay);
  const currentDate = currentDateInTimezone(timezone);
  return { eligible: currentDate <= originalWeekOffDate, defaultWeeklyOffDay: text(faculty.weeklyOffDay).toUpperCase(), originalWeekOffDate, cutoffDateTime: `${originalWeekOffDate}T23:59:59`, timezone, reason: currentDate <= originalWeekOffDate ? null : "WEEK_OFF_ALREADY_COMPLETED" };
}
function throwClosedWindow(window) { if (!window.eligible) throw new AppError("Week-off request period has ended. Your regular weekly-off for this week has already been completed.", 400); }
async function branchScope(user) { if (text(user?.role).toUpperCase() === "SUPER_ADMIN") return {}; const branch = await prisma.branch.findFirst({ where: { adminUserId: user.id }, select: { id: true } }); if (!branch) throw new AppError("Branch access could not be resolved", 403); return { branchId: branch.id }; }

export async function createWeekOffRequest(user, payload = {}) {
  const faculty = await facultyContext(user);
  const suppliedStart = validDate(payload.requestedWeekStartDate, "Requested week");
  const start = monday(suppliedStart); const end = addDays(start, 4);
  if (suppliedStart !== start || dateOnly(payload.requestedWeekEndDate) !== end) throw new AppError("Requested week must be an exact Monday-Friday range", 400);
  const window = await weekOffRequestWindow(faculty, start); throwClosedWindow(window);
  const defaultDay = window.defaultWeeklyOffDay; const requestedDay = text(payload.requestedWeekOffDay).toUpperCase(); const currentDate = window.originalWeekOffDate; const requestedDate = dayDate(start, requestedDay);
  if (requestedDay === defaultDay) throw new AppError("Please select a different day from your current weekly-off", 400);
  if (dateOnly(payload.requestedWeekOffDate) !== requestedDate) throw new AppError("Requested week-off date does not match the selected week and day", 400);
  const reason = text(payload.reason); if (!reason) throw new AppError("Reason is required", 400);
  const duplicate = await prisma.facultyWeekOffRequest.findUnique({ where: { facultyId_requestedWeekStartDate_requestedWeekEndDate: { facultyId: faculty.facultyId, requestedWeekStartDate: start, requestedWeekEndDate: end } } });
  if (duplicate && ["PENDING", "APPROVED"].includes(duplicate.status)) throw new AppError("A temporary week-off request already exists for this week", 409);
  const created = await prisma.facultyWeekOffRequest.create({ data: { facultyUserId: user.id, branchId: faculty.branchId, facultyId: faculty.facultyId, facultyName: faculty.name, facultyEmail: faculty.email, requestedWeekStartDate: start, requestedWeekEndDate: end, defaultWeekOffDay: defaultDay, defaultWeekOffDate: currentDate, requestedWeekOffDay: requestedDay, requestedWeekOffDate: requestedDate, reason } });
  const branch = await prisma.branch.findUnique({ where: { id: faculty.branchId }, select: { adminUserId: true } });
  await createNotification({ kind: "FACULTY_LEAVE_REQUEST", tone: "amber", title: "New Week-Off Request", message: `${faculty.name} has requested a temporary week-off change for ${start} - ${end}. Current week-off: ${defaultDay}. Requested week-off: ${requestedDay}.`, actionLabel: "Review Request", targetUserId: branch?.adminUserId || null, targetBranchId: faculty.branchId, facultyId: faculty.facultyId, facultyName: faculty.name, requestId: created.id, requestStatus: created.status, requestReason: reason });
  return created;
}

export async function listMyWeekOffRequests(user) { const faculty = await facultyContext(user); return prisma.facultyWeekOffRequest.findMany({ where: { facultyUserId: user.id, facultyId: faculty.facultyId }, orderBy: { createdAt: "desc" } }); }
export async function listBranchWeekOffRequests(user) { return prisma.facultyWeekOffRequest.findMany({ where: await branchScope(user), orderBy: { createdAt: "desc" } }); }
export async function getWeekOffRequest(user, id) { const item = await prisma.facultyWeekOffRequest.findFirst({ where: { id, ...(await branchScope(user)) } }); if (!item) throw new AppError("Week-off request not found", 404); return item; }
async function reviewContext(user, id) { const item = await getWeekOffRequest(user, id); if (item.status !== "PENDING") throw new AppError(`Request is already ${item.status.toLowerCase()}`, 409); return item; }

export async function approveWeekOffRequest(user, id) { const item = await reviewContext(user, id); return prisma.$transaction(async (tx) => { const approved = await tx.facultyWeekOffRequest.updateMany({ where: { id, status: "PENDING" }, data: { status: "APPROVED", approvedAt: new Date(), approvedBy: user.id } }); if (!approved.count) throw new AppError("Request is no longer pending", 409); const result = await tx.facultyWeekOffRequest.findUnique({ where: { id } }); await createNotification({ kind: "FACULTY_LEAVE_REQUEST", tone: "green", title: "Week-Off Request Approved", message: `Your temporary week-off request for ${item.requestedWeekStartDate} - ${item.requestedWeekEndDate} has been approved. Your week-off is ${item.requestedWeekOffDay}, ${item.requestedWeekOffDate}.`, actionLabel: "View Calendar", targetUserId: item.facultyUserId, targetBranchId: item.branchId, facultyId: item.facultyId, facultyName: item.facultyName, requestId: item.id, requestStatus: "APPROVED" }, tx); return result; }); }
export async function rejectWeekOffRequest(user, id, rejectionReason) { const item = await reviewContext(user, id); const reason = text(rejectionReason); if (!reason) throw new AppError("Rejection reason is required", 400); const rejected = await prisma.facultyWeekOffRequest.update({ where: { id }, data: { status: "REJECTED", rejectedAt: new Date(), rejectedBy: user.id, rejectionReason: reason } }); await createNotification({ kind: "FACULTY_LEAVE_REQUEST", tone: "red", title: "Week-Off Request Rejected", message: `Your temporary week-off request for ${item.requestedWeekStartDate} - ${item.requestedWeekEndDate} was rejected. Reason: ${reason}`, actionLabel: "View Request", targetUserId: item.facultyUserId, targetBranchId: item.branchId, facultyId: item.facultyId, facultyName: item.facultyName, requestId: item.id, requestStatus: "REJECTED", requestReason: reason }); return rejected; }
