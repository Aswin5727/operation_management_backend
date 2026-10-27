import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

const REPORT_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MINUTES = 330;
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const REPORT_SCOPES = new Set(["all", "admissions"]);
const REPORT_PERIODS = new Set(["month", "year", "custom"]);
const STAGES = ["COLD", "WARM", "HOT", "CLOSED", "OTHER"];
const VALID_STATUSES = new Set(['DRAFT', 'ACTIVE', 'FOLLOW_UP', 'NOT_ANSWERING', 'CONTACTED', 'INTERESTED', 'DEMO_SCHEDULED', 'DEMO_ATTENDED', 'ADMISSION_CONFIRMED', 'ENROLLED', 'LOST_LEAD', 'SWITCHED_OFF', 'OUT_OF_SERVICE', 'INCOMING_CALL_BLOCK', 'DND', 'NOT_REACHABLE', 'CALL_WAITING', 'CALL_LATER', 'UNAVAILABLE_COURSE', 'NOT_INTERESTED', 'WRONG_NO', 'CURRENTLY_NO_IDEA', 'FORWARD_TO_HR_TEAM', 'MAY_BE_IN_FUTURE', 'JOINED_IN_ANOTHER_INSTITUTION', 'CONVERTED', 'CLOSED', 'OTHER']);

function normalizeRole(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function todayInReportTimezone() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return parts;
}

function dateTextFromParts(year, month, day) {
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

function addDaysText(value, amount) {
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value, label) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new AppError(`${label} must be a valid date`, 400);
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) throw new AppError(`${label} must be a valid date`, 400);
  return raw;
}

function dateAtIstMidnight(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MINUTES * 60 * 1000);
}

function displayDate(value) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T00:00:00.000Z`));
}

function resolvePeriod(query = {}) {
  const period = String(query.period || "month").trim().toLowerCase();
  if (!REPORT_PERIODS.has(period)) throw new AppError("Choose a valid report period", 400);

  const today = todayInReportTimezone();
  let startText;
  let endText;
  let year = today.year;
  let month = today.month;

  if (period === "month") {
    year = Number.parseInt(query.year || today.year, 10);
    month = Number.parseInt(query.month || today.month, 10);
    if (!Number.isInteger(year) || year < 2000 || year > 2200) throw new AppError("Choose a valid report year", 400);
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new AppError("Choose a valid report month", 400);
    startText = dateTextFromParts(year, month, 1);
    endText = dateTextFromParts(year, month, new Date(Date.UTC(year, month, 0)).getUTCDate());
  } else if (period === "year") {
    year = Number.parseInt(query.year || today.year, 10);
    if (!Number.isInteger(year) || year < 2000 || year > 2200) throw new AppError("Choose a valid report year", 400);
    month = null;
    startText = dateTextFromParts(year, 1, 1);
    endText = dateTextFromParts(year, 12, 31);
  } else {
    startText = parseDateOnly(query.fromDate, "From date");
    endText = parseDateOnly(query.toDate, "To date");
    if (startText > endText) throw new AppError("From date must not be later than To date", 400);
    year = Number(startText.slice(0, 4));
    month = Number(startText.slice(5, 7));
  }

  const endExclusiveText = addDaysText(endText, 1);
  const label = period === "month"
    ? `${MONTH_NAMES[month - 1]} ${year}`
    : period === "year"
      ? String(year)
      : `${displayDate(startText)} - ${displayDate(endText)}`;

  return {
    type: period,
    year,
    month,
    start: dateAtIstMidnight(startText),
    end: dateAtIstMidnight(endExclusiveText),
    startText,
    endText,
    endExclusiveText,
    label,
  };
}

async function allowedBranches(actor) {
  const role = normalizeRole(actor?.role);
  if (["SUPERADMIN", "BUSINESSOWNER", "OPERATIONMANAGER"].includes(role)) return null;
  if (role === "SALESADMIN") {
    return (await prisma.salesAdminBranch.findMany({
      where: { salesAdminId: actor.userId, branch: { status: "ACTIVE" } },
      select: { branchId: true },
    })).map((row) => row.branchId);
  }
  if (role === "BRANCHADMIN" && actor.branchId) return [actor.branchId];
  throw new AppError("You do not have permission to view Sales CRM reports", 403);
}

function countByLead(rows = []) {
  return new Map(rows.map((row) => [row.leadId, Number(row?._count?._all || 0)]));
}

function buildWhere(scope, range, branches, query = {}) {
  const where = { deletedAt: null };
  if (branches) where.branchId = { in: branches };

  const branchId = String(query.branchId || "").trim();
  if (branchId) {
    if (branches && !branches.includes(branchId)) throw new AppError("You do not have access to this branch", 403);
    where.branchId = branchId;
  }

  const assignedToId = String(query.assignedToId || "").trim();
  const stage = String(query.stage || "").trim().toUpperCase();
  const status = String(query.status || "").trim().toUpperCase();
  if (assignedToId) where.assignedToId = assignedToId;
  if (stage && !STAGES.includes(stage)) throw new AppError('Choose a valid report stage', 400);
  if (stage) where.stage = stage;
  if (status && !VALID_STATUSES.has(status)) throw new AppError('Choose a valid report status', 400);
  if (status) where.status = status;

  if (scope === "admissions") {
    where.convertedStudent = { is: { admissionDate: { gte: range.startText, lt: range.endExclusiveText } } };
  } else {
    where.leadDate = { gte: range.start, lt: range.end };
  }

  return where;
}

/**
 * Build the report from a scoped cohort. Period metrics use the selected
 * period and the stage breakdown shows the current stage of that cohort.
 */
export async function getMonthlySalesCrmReport(query = {}, actor = {}) {
  const scope = String(query.scope || "all").trim().toLowerCase();
  if (!REPORT_SCOPES.has(scope)) throw new AppError("Choose a valid report type", 400);

  const range = resolvePeriod(query);
  const branches = await allowedBranches(actor);
  const where = buildWhere(scope, range, branches, query);
  if (normalizeRole(actor?.role) === 'SALESADMIN') where.assignedToId = actor.userId;
  const generatedAt = new Date();

  const leads = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      leadId: true,
      studentName: true,
      stage: true,
      status: true,
      assignedToId: true,
      leadDate: true,
      nextFollowUpDate: true,
      nextFollowUpTime: true,
      branch: { select: { branchName: true } },
      assignedTo: { select: { fullName: true } },
      convertedStudent: { select: { studentId: true, admissionDate: true } },
    },
    orderBy: [{ studentName: "asc" }, { leadDate: "asc" }],
  });

  const leadIds = leads.map((lead) => lead.id);
  const [followUpCounts, periodFollowUps, periodHotChanges, periodConversions] = leadIds.length
    ? await Promise.all([
      prisma.leadFollowUp.groupBy({ where: { leadId: { in: leadIds } }, by: ["leadId"], _count: { _all: true } }),
      prisma.leadFollowUp.groupBy({ where: { leadId: { in: leadIds }, createdAt: { gte: range.start, lt: range.end } }, by: ["leadId"], _count: { _all: true } }),
      prisma.leadStageHistory.groupBy({ where: { leadId: { in: leadIds }, toStage: "HOT", createdAt: { gte: range.start, lt: range.end } }, by: ["leadId"] }),
      prisma.leadActivity.groupBy({ where: { leadId: { in: leadIds }, action: { in: ["LEAD_CONVERTED", "LEAD_CONVERTED_TO_STUDENT"] }, createdAt: { gte: range.start, lt: range.end } }, by: ["leadId"] }),
    ])
    : [[], [], [], []];

  const followUpCountByLead = countByLead(followUpCounts);
  const periodFollowUpCountByLead = countByLead(periodFollowUps);
  const movedHotLeadIds = new Set(periodHotChanges.map((row) => row.leadId));
  const admissionDateLeadIds = new Set(leads.filter((lead) => {
    const admissionDate = String(lead.convertedStudent?.admissionDate || "").slice(0, 10);
    return admissionDate >= range.startText && admissionDate < range.endExclusiveText;
  }).map((lead) => lead.id));
  const convertedLeadIds = new Set([
    ...admissionDateLeadIds,
    ...periodConversions.map((row) => row.leadId),
  ]);
  const pending = leads.filter((lead) => lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) >= range.end && lead.stage !== "CLOSED" && lead.status !== "CONVERTED");
  const overdue = leads.filter((lead) => lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < range.end && lead.stage !== "CLOSED" && lead.status !== "CONVERTED");
  const pendingLeadIds = new Set(pending.map((lead) => lead.id));
  const overdueLeadIds = new Set(overdue.map((lead) => lead.id));
  const stageBreakdown = Object.fromEntries(STAGES.map((stage) => [stage, leads.filter((lead) => lead.stage === stage).length]));
  const totalRecords = leads.length;
  const convertedCount = convertedLeadIds.size;
  const activeLeads = leads.filter((lead) => !["CLOSED", "CONVERTED", "LOST_LEAD"].includes(String(lead.status || "").toUpperCase()) && String(lead.stage || "").toUpperCase() !== "CLOSED").length;
  const followUpsLogged = leads.reduce((count, lead) => count + (periodFollowUpCountByLead.get(lead.id) || 0), 0);
  const performance = new Map();

  for (const lead of leads) {
    const key = lead.assignedToId || "UNASSIGNED";
    const row = performance.get(key) || {
      assignedToId: lead.assignedToId,
      assignedTo: lead.assignedTo?.fullName || "Unassigned",
      assignedLeads: 0,
      newLeads: 0,
      completedFollowUps: 0,
      followUpsLogged: 0,
      movedToHot: 0,
      convertedLeads: 0,
      pendingFollowUps: 0,
      overdueFollowUps: 0,
    };
    row.assignedLeads += 1;
    row.newLeads += scope === "all" ? 1 : 0;
    row.followUpsLogged += periodFollowUpCountByLead.get(lead.id) || 0;
    row.completedFollowUps = row.followUpsLogged;
    if (movedHotLeadIds.has(lead.id)) row.movedToHot += 1;
    if (convertedLeadIds.has(lead.id)) row.convertedLeads += 1;
    if (pendingLeadIds.has(lead.id)) row.pendingFollowUps += 1;
    if (overdueLeadIds.has(lead.id)) row.overdueFollowUps += 1;
    performance.set(key, row);
  }

  const performanceRows = Array.from(performance.values()).map((row) => ({
    ...row,
    conversionRate: row.assignedLeads ? Number(((row.convertedLeads / row.assignedLeads) * 100).toFixed(2)) : 0,
  }));

  return {
    period: {
      type: range.type,
      year: range.year,
      month: range.month,
      label: range.label,
      start: range.startText,
      end: range.endText,
      fromDate: range.startText,
      toDate: range.endText,
    },
    meta: {
      generatedAt,
      timezone: REPORT_TIMEZONE,
      scope,
      branchId: String(query.branchId || "") || null,
      recordCount: totalRecords,
    },
    summary: {
      totalRecords,
      totalLeads: totalRecords,
      totalNewLeads: scope === "all" ? totalRecords : 0,
      activeLeads,
      stageBreakdown,
      convertedLeads: convertedCount,
      movedToHot: movedHotLeadIds.size,
      followUpsLogged,
      completedFollowUps: followUpsLogged,
      pendingFollowUps: pending.length,
      overdueFollowUps: overdue.length,
      conversionRate: totalRecords ? Number(((convertedCount / totalRecords) * 100).toFixed(2)) : 0,
    },
    performance: performanceRows,
    leads: leads.map((lead) => ({
      leadId: lead.leadId,
      studentName: lead.studentName,
      assignedTo: lead.assignedTo?.fullName || "Unassigned",
      branch: lead.branch?.branchName || "-",
      stage: lead.stage,
      status: lead.status,
      leadDate: lead.leadDate,
      nextFollowUpDate: lead.nextFollowUpDate,
      nextFollowUpTime: lead.nextFollowUpTime,
      admissionDate: lead.convertedStudent?.admissionDate || null,
      studentId: lead.convertedStudent?.studentId || null,
      followUpCount: followUpCountByLead.get(lead.id) || 0,
      periodFollowUpCount: periodFollowUpCountByLead.get(lead.id) || 0,
      converted: convertedLeadIds.has(lead.id),
      movedToHot: movedHotLeadIds.has(lead.id),
      pendingFollowUp: pendingLeadIds.has(lead.id),
      overdueFollowUp: overdueLeadIds.has(lead.id),
    })),
  };
}