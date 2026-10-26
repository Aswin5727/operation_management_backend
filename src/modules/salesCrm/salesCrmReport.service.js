import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

function monthRange(query = {}) {
  const now = new Date();
  const year = Number.parseInt(query.year || String(now.getUTCFullYear()), 10);
  const month = Math.min(12, Math.max(1, Number.parseInt(query.month || String(now.getUTCMonth() + 1), 10)));
  if (!Number.isInteger(year) || year < 2000 || year > 2200) throw new AppError("Invalid report year", 400);
  return { year, month, start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

async function allowedBranches(actor) {
  const role = String(actor?.role || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (["SUPERADMIN", "BUSINESSOWNER", "OPERATIONMANAGER"].includes(role)) return null;
  if (role === "SALESADMIN") return (await prisma.salesAdminBranch.findMany({ where: { salesAdminId: actor.userId }, select: { branchId: true } })).map((row) => row.branchId);
  if (role === "BRANCHADMIN" && actor.branchId) return [actor.branchId];
  throw new AppError("You do not have permission to view Sales CRM reports", 403);
}

function countByLead(rows = []) {
  return new Map(rows.map((row) => [row.leadId, Number(row?._count?._all || 0)]));
}

/**
 * Build the monthly report without loading every child record into Node.
 * The old nested findMany returned the complete follow-up, stage-history and
 * activity arrays for every lead. That becomes very expensive as the CRM
 * grows and can exhaust the Neon pool before the response is sent.
 */
export async function getMonthlySalesCrmReport(query = {}, actor = {}) {
  const range = monthRange(query);
  const branches = await allowedBranches(actor);
  if (branches && query.branchId && !branches.includes(query.branchId)) throw new AppError("You do not have access to this branch", 403);
  const where = { deletedAt: null, ...(branches ? { branchId: { in: query.branchId ? [query.branchId] : branches } } : query.branchId ? { branchId: query.branchId } : {}) };

  // Keep the lead list and the scalar relations needed by the table. Child
  // collections are fetched below as database-side counts instead of arrays.
  const leads = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      leadId: true,
      studentName: true,
      stage: true,
      status: true,
      assignedToId: true,
      createdAt: true,
      nextFollowUpDate: true,
      branch: { select: { branchName: true } },
      assignedTo: { select: { fullName: true } },
    },
  });

  const leadIds = leads.map((lead) => lead.id);
  const [followUpCounts, periodFollowUps, periodHotChanges, periodConversions] = leadIds.length
    ? await Promise.all([
      prisma.leadFollowUp.groupBy({ where: { leadId: { in: leadIds } }, by: ["leadId"], _count: { _all: true } }),
      prisma.leadFollowUp.groupBy({ where: { leadId: { in: leadIds }, createdAt: { gte: range.start, lt: range.end } }, by: ["leadId"], _count: { _all: true } }),
      prisma.leadStageHistory.groupBy({ where: { leadId: { in: leadIds }, toStage: "HOT", createdAt: { gte: range.start, lt: range.end } }, by: ["leadId"] }),
      prisma.leadActivity.groupBy({ where: { leadId: { in: leadIds }, action: "LEAD_CONVERTED", createdAt: { gte: range.start, lt: range.end } }, by: ["leadId"] }),
    ])
    : [[], [], [], []];

  const followUpCountByLead = countByLead(followUpCounts);
  const completedFollowUpCountByLead = countByLead(periodFollowUps);
  const movedHotLeadIds = new Set(periodHotChanges.map((row) => row.leadId));
  const convertedLeadIds = new Set(periodConversions.map((row) => row.leadId));
  const inPeriod = (date) => date && new Date(date) >= range.start && new Date(date) < range.end;
  const newLeads = leads.filter((lead) => inPeriod(lead.createdAt));
  const converted = leads.filter((lead) => convertedLeadIds.has(lead.id));
  const movedHot = new Set(leads.filter((lead) => movedHotLeadIds.has(lead.id)).map((lead) => lead.id));
  const completedFollowUps = leads.reduce((count, lead) => count + (completedFollowUpCountByLead.get(lead.id) || 0), 0);
  const pending = leads.filter((lead) => lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) >= range.end && lead.stage !== "CLOSED" && lead.status !== "CONVERTED");
  const overdue = leads.filter((lead) => lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < range.end && lead.stage !== "CLOSED" && lead.status !== "CONVERTED");
  const pendingLeadIds = new Set(pending.map((lead) => lead.id));
  const overdueLeadIds = new Set(overdue.map((lead) => lead.id));
  const stageBreakdown = Object.fromEntries(["COLD", "WARM", "HOT", "CLOSED"].map((stage) => [stage, leads.filter((lead) => lead.stage === stage).length]));
  const performance = new Map();

  for (const lead of leads) {
    const key = lead.assignedToId || "UNASSIGNED";
    const row = performance.get(key) || { assignedToId: lead.assignedToId, assignedTo: lead.assignedTo?.fullName || "Unassigned", assignedLeads: 0, newLeads: 0, completedFollowUps: 0, movedToHot: 0, convertedLeads: 0, pendingFollowUps: 0, overdueFollowUps: 0 };
    row.assignedLeads += 1;
    if (inPeriod(lead.createdAt)) row.newLeads += 1;
    row.completedFollowUps += completedFollowUpCountByLead.get(lead.id) || 0;
    if (movedHotLeadIds.has(lead.id)) row.movedToHot += 1;
    if (convertedLeadIds.has(lead.id)) row.convertedLeads += 1;
    if (pendingLeadIds.has(lead.id)) row.pendingFollowUps += 1;
    if (overdueLeadIds.has(lead.id)) row.overdueFollowUps += 1;
    performance.set(key, row);
  }

  return {
    period: { year: range.year, month: range.month, start: range.start, end: range.end },
    summary: { totalNewLeads: newLeads.length, stageBreakdown, convertedLeads: converted.length, movedToHot: movedHot.size, completedFollowUps, pendingFollowUps: pending.length, overdueFollowUps: overdue.length, conversionRate: newLeads.length ? Number(((converted.length / newLeads.length) * 100).toFixed(2)) : 0 },
    performance: Array.from(performance.values()),
    leads: leads.map((lead) => ({ leadId: lead.leadId, studentName: lead.studentName, assignedTo: lead.assignedTo?.fullName || "Unassigned", branch: lead.branch?.branchName || "-", stage: lead.stage, status: lead.status, nextFollowUpDate: lead.nextFollowUpDate, followUpCount: followUpCountByLead.get(lead.id) || 0, converted: convertedLeadIds.has(lead.id) })),
  };
}