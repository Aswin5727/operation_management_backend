import ExcelJS from "exceljs";
import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

const CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ROLE = (actor) => String(actor?.role || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const text = (value) => String(value ?? "").trim();
const safeCell = (value) => value === null || value === undefined || value === "" ? "-" : value;

async function permittedBranches(actor) {
  const role = ROLE(actor);
  if (role === "SUPERADMIN") return null;
  if (role === "SALESADMIN") {
    return (await prisma.salesAdminBranch.findMany({
      where: { salesAdminId: actor.userId, branch: { status: "ACTIVE" } },
      select: { branchId: true },
    })).map((row) => row.branchId);
  }
  if (role === "BRANCHADMIN" && actor.branchId) return [actor.branchId];
  throw new AppError("You do not have permission to export lead reports", 403);
}

function parseDateOnly(value, label) {
  const raw = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new AppError(`${label} must be a valid date`, 400);
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) throw new AppError(`${label} must be a valid date`, 400);
  return raw;
}

function dateAtIstMidnight(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - 330 * 60 * 1000);
}

function addDaysText(value, amount) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

function resolvePeriod(query = {}) {
  const period = text(query.period || "month").toLowerCase();
  if (!["month", "year", "custom"].includes(period)) throw new AppError("Choose a valid report period", 400);
  const now = new Date();
  const nowParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  let fromText;
  let toText;
  let label;
  if (period === "month") {
    const year = Number.parseInt(text(query.year || nowParts.year), 10);
    const month = Number.parseInt(text(query.month || nowParts.month), 10);
    if (!Number.isInteger(year) || year < 2000 || year > 2200) throw new AppError("Choose a valid report year", 400);
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new AppError("Choose a valid report month", 400);
    fromText = `${year}-${String(month).padStart(2, "0")}-01`;
    toText = `${year}-${String(month).padStart(2, "0")}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;
    label = `${MONTH_NAMES[month - 1]} ${year}`;
  } else if (period === "year") {
    const year = Number.parseInt(text(query.year || nowParts.year), 10);
    if (!Number.isInteger(year) || year < 2000 || year > 2200) throw new AppError("Choose a valid report year", 400);
    fromText = `${year}-01-01`;
    toText = `${year}-12-31`;
    label = String(year);
  } else {
    fromText = parseDateOnly(query.fromDate, "From date");
    toText = parseDateOnly(query.toDate, "To date");
    if (fromText > toText) throw new AppError("From date must not be later than To date", 400);
    label = `${fromText} to ${toText}`;
  }
  const toExclusiveText = addDaysText(toText, 1);
  const from = dateAtIstMidnight(fromText);
  const to = dateAtIstMidnight(toText);
  const toExclusive = dateAtIstMidnight(toExclusiveText);
  return { period, from, to, toExclusive, fromText, toText, toExclusiveText, label };
}
function formatDate(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return safeCell(value);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Calcutta", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Calcutta", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).format(value);
}

function formatPaymentStatus(value) {
  const raw = text(value);
  if (!raw) return "-";
  const knownLabels = {
    NOT_PAID: "Not Paid",
    INITIAL_PAYMENT: "Initial Payment",
    PARTIALLY_PAID: "Partially Paid",
    PAID: "Paid",
  };
  const normalized = raw.toUpperCase();
  if (knownLabels[normalized]) return knownLabels[normalized];
  return raw
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function addMetadataRow(sheet, rowNumber, cells) {
  cells.forEach(([label, value], index) => {
    const labelCell = sheet.getCell(rowNumber, index * 2 + 1);
    const valueCell = sheet.getCell(rowNumber, index * 2 + 2);
    labelCell.value = label;
    valueCell.value = safeCell(value);
    labelCell.font = { bold: true, color: { argb: "FF1F4E78" } };
    valueCell.font = { color: { argb: "FF334155" } };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2FB" } };
    valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FBFF" } };
    labelCell.alignment = { vertical: "middle" };
    valueCell.alignment = { vertical: "middle" };
  });
}

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF24527A" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF17345F" } } };
  });
  row.height = 30;
}

const columns = [
  ["leadId", "Lead ID"],
  ["studentName", "Lead / Student Name"],
  ["phoneNumber", "Phone Number"],
  ["alternativeNumber", "Alternative Number"],
  ["email", "Email"],
  ["leadStatus", "Lead Status"],
  ["leadStage", "Lead Stage"],
  ["leadSource", "Lead Source"],
  ["branchName", "Branch"],
  ["courseName", "Course"],
  ["assignedTo", "Assigned To"],
  ["leadDate", "Lead Date"],
  ["followUpDate", "Next Follow-up Date"],
  ["paymentStatus", "Payment Status"],
  ["paymentAmount", "Payment Amount"],
  ["admissionStatus", "Admission Status"],
  ["studentId", "Admission Student ID"],
  ["admissionDate", "Admission Date"],
  ["batchName", "Batch Name"],
  ["admissionPhone", "Admission Phone"],
  ["admissionEmail", "Admission Email"],
  ["courseAmount", "Admission Course Amount"],
  ["admissionRecordStatus", "Admission Record Status"],
];

function rowValue(lead, key) {
  const student = lead.convertedStudent;
  const values = {
    leadId: lead.leadId,
    studentName: lead.studentName,
    phoneNumber: lead.phoneNumber,
    alternativeNumber: lead.alternativeNumber,
    email: lead.email,
    leadStatus: lead.status,
    leadStage: lead.stage,
    leadSource: lead.leadSource,
    branchName: lead.branch?.branchName,
    courseName: lead.course?.name || student?.courseName || student?.course?.name,
    assignedTo: lead.assignedTo?.fullName,
    leadDate: formatDate(lead.leadDate),
    followUpDate: formatDate(lead.nextFollowUpDate),
    paymentStatus: formatPaymentStatus(lead.paymentStatus),
    paymentAmount: lead.paymentAmount,
    admissionStatus: lead.admissionStatus,
    studentId: student?.studentId,
    admissionDate: formatDate(student?.admissionDate),
    batchName: student?.batchName,
    admissionPhone: student?.mobileNumber,
    admissionEmail: student?.emailAddress,
    courseAmount: student?.courseAmount,
    admissionRecordStatus: student?.recordStatus,
  };
  return safeCell(values[key]);
}

function reportWhere(scope, period, allowedBranches, query) {
  const where = { deletedAt: null };
  if (allowedBranches) where.branchId = { in: allowedBranches };
  const branchId = text(query.branchId);
  if (branchId) {
    if (allowedBranches && !allowedBranches.includes(branchId)) throw new AppError("You do not have access to this branch", 403);
    where.branchId = branchId;
  }
  if (scope === "admissions") {
    where.convertedStudent = { is: { admissionDate: { gte: period.fromText, lt: period.toExclusiveText } } };
  } else {
    where.leadDate = { gte: period.from, lt: period.toExclusive };
  }
  if (text(query.courseId)) where.courseId = text(query.courseId);
  if (text(query.stage)) where.stage = text(query.stage).toUpperCase();
  if (text(query.status)) where.status = text(query.status).toUpperCase();
  if (text(query.leadSource)) where.leadSource = text(query.leadSource).toUpperCase();
  if (text(query.assignedToId)) where.assignedToId = text(query.assignedToId);
  return where;
}

function addBranchSalesAdminScope(where, branchId) {
  if (!branchId) return;
  where.assignedTo = {
    role: "SALES_ADMIN",
    salesAdminBranches: { some: { branchId } },
  };
}
export async function generateLeadExcelReport(query = {}, actor) {
  const scope = text(query.scope || "all").toLowerCase();
  if (!["all", "admissions"].includes(scope)) throw new AppError("Choose a valid lead report type", 400);
  const period = resolvePeriod(query);
  const allowedBranches = await permittedBranches(actor);
  const where = reportWhere(scope, period, allowedBranches, query);
  if (ROLE(actor) === "SALESADMIN") where.assignedToId = actor.userId;
  if (ROLE(actor) === "BRANCHADMIN") addBranchSalesAdminScope(where, allowedBranches?.[0]);
  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ studentName: "asc" }, { leadDate: "asc" }],
    include: {
      branch: { select: { branchName: true } },
      course: { select: { name: true } },
      assignedTo: { select: { fullName: true } },
      convertedStudent: { select: { studentId: true, mobileNumber: true, emailAddress: true, admissionDate: true, courseName: true, batchName: true, courseAmount: true, recordStatus: true, course: { select: { name: true } } } },
    },
  });
  if (!leads.length) {
    const reportName = scope === "admissions" ? "admission students" : "leads";
    throw new AppError(`No ${reportName} found for ${period.label}.`, 404);
  }
  const downloadedAt = new Date();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CISPRO";
  workbook.created = downloadedAt;
  workbook.modified = downloadedAt;
  const sheet = workbook.addWorksheet(scope === "admissions" ? "Admission Students" : "All Leads");
  const reportTitle = scope === "admissions" ? "Admission Students Report" : "All Leads Report";
  const lastColumn = columns.length;
  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.getCell(1, 1).value = reportTitle;
  sheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: "FF17345F" } };
  sheet.getCell(1, 1).alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 28;
  sheet.mergeCells(2, 1, 2, lastColumn);
  const selectedPeriodLabel = period.period === "custom" ? "Selected Period: Custom Date Range" : `Selected Period: ${period.period === "month" ? "Month" : "Year"} - ${period.label}`;
  sheet.getCell(2, 1).value = selectedPeriodLabel;
  sheet.getCell(2, 1).font = { bold: true, color: { argb: "FF1F4E78" } };
  sheet.getCell(2, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F6FC" } };
  const periodMetadata = period.period === "custom"
    ? [["From Date", formatDate(period.from)], ["To Date", formatDate(period.to)], ["Downloaded On", formatDateTime(downloadedAt)]]
    : [["Downloaded On", formatDateTime(downloadedAt)]];
  addMetadataRow(sheet, 3, periodMetadata);
  addMetadataRow(sheet, 4, [["Report Type", scope === "admissions" ? "Admission Students" : "All Leads"], ["Total Records", leads.length]]);
  columns.forEach(([key, header], index) => { sheet.getCell(6, index + 1).value = header; });
  styleHeader(sheet.getRow(6));
  leads.forEach((lead) => { const row = sheet.addRow(columns.map(([key]) => rowValue(lead, key))); row.eachCell((cell) => { cell.alignment = { vertical: "top", wrapText: true }; cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } }; }); });
  sheet.views = [{ state: "frozen", ySplit: 6 }];
  sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: columns.length } };
  columns.forEach(([key, header], index) => { const maxLength = Math.max(header.length, ...leads.slice(0, 200).map((lead) => String(rowValue(lead, key)).length)); sheet.getColumn(index + 1).width = Math.min(34, Math.max(14, maxLength + 2)); });
  const rawBuffer = await workbook.xlsx.writeBuffer();
  const scopeName = scope === "admissions" ? "Admission_Students" : "All_Leads";
  const periodName = period.period === "month"
    ? `Month_${period.label.replace(/\s+/g, "_")}`
    : period.period === "year"
      ? `Year_${period.label}`
      : `Custom_${period.fromText}_to_${period.toText}`;
  const fileName = `${scopeName}_${periodName}.xlsx`;
  return { fileName, contentType: CONTENT_TYPE, buffer: Buffer.from(rawBuffer) };
}
