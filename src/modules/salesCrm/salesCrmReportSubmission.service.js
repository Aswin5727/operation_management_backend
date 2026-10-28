import crypto from "node:crypto";
import ExcelJS from "exceljs";
import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { createNotification } from "../notifications/notifications.service.js";
import { getMonthlySalesCrmReport } from "./salesCrmReport.service.js";

const REPORT_TYPES = new Set(["MONTHLY_SALES", "LEAD_MANAGEMENT", "FOLLOW_UP", "ADMISSION", "COMPREHENSIVE"]);
const clean = (value) => String(value ?? "").trim();
const dateOnly = (value, label) => { const raw = clean(value); if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new AppError(`${label} must be a valid date`, 400); const date = new Date(`${raw}T00:00:00.000Z`); if (Number.isNaN(date.getTime())) throw new AppError(`${label} must be a valid date`, 400); return raw; };
const displayDate = (value) => new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00.000Z`));
const displayTime = (value) => { const raw = clean(value); if (!raw) return "-"; const parts = raw.split(":").map(Number); if (parts.length < 2 || parts.some(Number.isNaN)) return raw; const hours = parts[0]; const minutes = String(parts[1]).padStart(2, "0"); return `${String(hours % 12 || 12).padStart(2, "0")}:${minutes} ${hours >= 12 ? "PM" : "AM"}`; };
const reportTypeLabel = (value) => ({ MONTHLY_SALES: "Monthly Sales Report", LEAD_MANAGEMENT: "Lead Management Report", FOLLOW_UP: "Follow-up Report", ADMISSION: "Admission Report", COMPREHENSIVE: "Comprehensive Sales CRM Report" }[value] || value);

function addSheet(workbook, name, columns, rows) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(columns.map((column) => column.header));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
  rows.forEach((row) => sheet.addRow(columns.map((column) => row[column.key] ?? "-")));
  columns.forEach((column, index) => { sheet.getColumn(index + 1).width = Math.min(38, Math.max(14, column.header.length + 4, ...rows.map((row) => String(row[column.key] ?? "-").length + 2))); });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return sheet;
}

async function buildWorkbook({ report, reportType, reportName, fromDate, toDate, branchName }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CISPRO";
  addSheet(workbook, "Summary", [{ key: "field", header: "Report Field" }, { key: "value", header: "Value" }], [
    { field: "Report Name", value: reportName }, { field: "Report Type", value: reportTypeLabel(reportType) }, { field: "From Date", value: fromDate }, { field: "To Date", value: toDate }, { field: "Branch", value: branchName || "All permitted branches" }, { field: "Generated At", value: new Date().toISOString() },
    { field: "Total Leads", value: report.summary?.totalLeads || 0 }, { field: "HOT Leads", value: report.summary?.stageBreakdown?.HOT || 0 }, { field: "WARM Leads", value: report.summary?.stageBreakdown?.WARM || 0 }, { field: "COLD Leads", value: report.summary?.stageBreakdown?.COLD || 0 }, { field: "CLOSED Leads", value: report.summary?.stageBreakdown?.CLOSED || 0 }, { field: "Follow-ups Completed", value: report.summary?.completedFollowUps || 0 }, { field: "Follow-ups Pending", value: report.summary?.pendingFollowUps || 0 }, { field: "Admissions Converted", value: report.summary?.convertedLeads || 0 }, { field: "Students Created", value: report.summary?.convertedLeads || 0 },
  ]);
  if (reportType !== "ADMISSION") addSheet(workbook, "Leads", [{ key: "leadId", header: "Lead ID" }, { key: "studentId", header: "Student ID" }, { key: "studentName", header: "Student Name" }, { key: "phoneNumber", header: "Phone Number" }, { key: "email", header: "Email" }, { key: "courseName", header: "Course Name" }, { key: "branch", header: "Branch" }, { key: "leadSource", header: "Lead Source" }, { key: "stage", header: "Lead Stage" }, { key: "status", header: "Lead Status" }, { key: "assignedTo", header: "Assigned Sales Admin" }, { key: "leadDate", header: "Lead Created Date" }, { key: "nextFollowUpDate", header: "Next Follow-up Date" }], report.leads || []);
  if (reportType !== "LEAD_MANAGEMENT" && reportType !== "FOLLOW_UP") addSheet(workbook, "Admissions", [{ key: "leadId", header: "Lead ID" }, { key: "studentId", header: "Student ID" }, { key: "studentName", header: "Student Name" }, { key: "branch", header: "Branch" }, { key: "admissionDate", header: "Admission Date" }, { key: "assignedTo", header: "Assigned Sales Admin" }, { key: "admissionCourseName", header: "Course Name" }, { key: "batchName", header: "Batch Name" }, { key: "facultyName", header: "Faculty Name" }, { key: "paymentMode", header: "Payment Status / Mode" }, { key: "trainingMode", header: "Training Mode" }], (report.leads || []).filter((row) => row.converted));
  if (reportType === "FOLLOW_UP" || reportType === "COMPREHENSIVE") {
    const followUpRows = (report.leads || []).flatMap((lead) => (lead.followUps || []).map((followUp) => ({ leadId: lead.leadId, studentName: lead.studentName, phoneNumber: lead.phoneNumber, email: lead.email, branch: lead.branch, courseName: lead.courseName, followUpDate: followUp.followUpDate, callStatus: followUp.callStatus, nextFollowUpDate: followUp.nextFollowUpDate, nextFollowUpTime: displayTime(followUp.nextFollowUpTime), notes: followUp.notes, assignedTo: lead.assignedTo })));
    addSheet(workbook, "Follow-ups", [{ key: "leadId", header: "Lead ID" }, { key: "studentName", header: "Student Name" }, { key: "phoneNumber", header: "Phone Number" }, { key: "email", header: "Email" }, { key: "branch", header: "Branch" }, { key: "courseName", header: "Course Name" }, { key: "followUpDate", header: "Follow-up Date" }, { key: "callStatus", header: "Follow-up Status" }, { key: "nextFollowUpDate", header: "Next Follow-up Date" }, { key: "nextFollowUpTime", header: "Next Follow-up Time" }, { key: "notes", header: "Follow-up Notes" }, { key: "assignedTo", header: "Assigned Sales Admin" }], followUpRows);
  }
  return workbook.xlsx.writeBuffer();
}

async function permittedBranchName(branchId) {
  if (!branchId) return "";
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { branchName: true } });
  if (!branch) throw new AppError("Selected branch was not found", 404);
  return branch.branchName;
}

export async function submitSalesCrmReport(payload = {}, actor = {}) {
  const submittedById = actor.userId || actor.id;
  if (!submittedById) throw new AppError("Authenticated user is required", 401);
  const reportType = clean(payload.reportType || "COMPREHENSIVE").toUpperCase();
  if (!REPORT_TYPES.has(reportType)) throw new AppError("Choose a valid report type", 400);
  const fromDate = dateOnly(payload.fromDate, "From date");
  const toDate = dateOnly(payload.toDate, "To date");
  if (fromDate > toDate) throw new AppError("From date must not be later than To date", 400);
  const reportName = clean(payload.reportName) || reportTypeLabel(reportType);
  const branchId = clean(payload.branchId) || "";
  const branchName = await permittedBranchName(branchId);
  const idempotencyKey = clean(payload.idempotencyKey) || crypto.createHash("sha256").update([submittedById, reportType, reportName, fromDate, toDate, branchId].join("|")).digest("hex");
  const existing = await prisma.salesCrmReportSubmission.findUnique({ where: { idempotencyKey }, select: { id: true, status: true } });
  if (existing) return { id: existing.id, status: existing.status, duplicate: true };
  const query = { period: "custom", fromDate, toDate, scope: reportType === "ADMISSION" ? "admissions" : "all", ...(branchId ? { branchId } : {}) };
  const report = await getMonthlySalesCrmReport(query, actor);
  const fileData = await buildWorkbook({ report, reportType, reportName, fromDate, toDate, branchName });
  const sender = await prisma.user.findUnique({ where: { id: submittedById }, select: { id: true, fullName: true, role: true } });
  if (!sender) throw new AppError("Sender account was not found", 404);
  const fileName = `${reportName.replace(/[^a-z0-9]+/gi, "_")}_${fromDate}_to_${toDate}.xlsx`;
  const superAdmins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN", active: true }, select: { id: true } });
  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.salesCrmReportSubmission.create({ data: { idempotencyKey, salesAdminId: submittedById, submittedById, branchId: branchId || null, reportName, reportType, fromDate, toDate, fileName, fileData: Buffer.from(fileData), message: clean(payload.message) || null, status: "SUBMITTED" } });
    for (const admin of superAdmins) await createNotification({ kind: "SALES_CRM_MONTHLY_REPORT", tone: "blue", title: "New Sales Report Received", message: `${sender.fullName} has submitted a ${reportTypeLabel(reportType)} for ${displayDate(fromDate)} to ${displayDate(toDate)}.`, actionLabel: "View report", targetUserId: admin.id, requestDescription: `SALES_CRM_REPORT:${created.id}:${submittedById}`, createdBy: submittedById }, tx);
    return created;
  });
  return { id: submission.id, reportName, reportType, fileName, fromDate, toDate, status: submission.status };
}

export async function listSalesCrmReports(salesAdminId, query = {}) {
  const where = { salesAdminId };
  if (query.status) where.status = clean(query.status).toUpperCase();
  if (query.reportType) where.reportType = clean(query.reportType).toUpperCase();
  if (query.branchId) where.branchId = clean(query.branchId);
  const rows = await prisma.salesCrmReportSubmission.findMany({ where, orderBy: { createdAt: "desc" }, select: { id: true, salesAdminId: true, submittedById: true, branchId: true, reportName: true, reportType: true, fromDate: true, toDate: true, fileName: true, fileFormat: true, message: true, status: true, viewedAt: true, downloadedAt: true, createdAt: true, updatedAt: true } });
  return { data: rows, meta: { total: rows.length } };
}

export async function getSalesCrmReport(reportId, mode = "view") {
  const report = await prisma.salesCrmReportSubmission.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError("Report submission not found", 404);
  if (mode === "download") { await prisma.salesCrmReportSubmission.update({ where: { id: reportId }, data: { downloadedAt: new Date(), status: "DOWNLOADED" } }); return report; }
  if (!report.viewedAt) await prisma.salesCrmReportSubmission.update({ where: { id: reportId }, data: { viewedAt: new Date(), status: "VIEWED" } });
  const { fileData, ...safe } = report;
  return safe;
}
