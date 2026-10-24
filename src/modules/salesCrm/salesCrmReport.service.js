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

export async function getMonthlySalesCrmReport(query = {}, actor = {}) {
  const range = monthRange(query);
  const branches = await allowedBranches(actor);
  if (branches && query.branchId && !branches.includes(query.branchId)) throw new AppError("You do not have access to this branch", 403);
  const where = { deletedAt: null, ...(branches ? { branchId: { in: query.branchId ? [query.branchId] : branches } } : query.branchId ? { branchId: query.branchId } : {}) };
  const leads = await prisma.lead.findMany({ where, select: { id: true, leadId: true, studentName: true, stage: true, status: true, branchId: true, assignedToId: true, createdAt: true, nextFollowUpDate: true, branch: { select: { branchName: true } }, assignedTo: { select: { fullName: true } }, followUps: { select: { createdAt: true } }, stageHistory: { select: { toStage: true, createdAt: true } }, activities: { select: { action: true, createdAt: true } } } });
  const inPeriod = (date) => date && new Date(date) >= range.start && new Date(date) < range.end;
  const newLeads = leads.filter((lead) => inPeriod(lead.createdAt));
  const converted = leads.filter((lead) => lead.activities.some((item) => item.action === "LEAD_CONVERTED" && inPeriod(item.createdAt)));
  const movedHot = new Set(leads.filter((lead) => lead.stageHistory.some((item) => item.toStage === "HOT" && inPeriod(item.createdAt))).map((lead) => lead.id));
  const completedFollowUps = leads.reduce((count, lead) => count + lead.followUps.filter((item) => inPeriod(item.createdAt)).length, 0);
  const pending = leads.filter((lead) => lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) >= range.end && lead.stage !== "CLOSED" && lead.status !== "CONVERTED");
  const overdue = leads.filter((lead) => lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < range.end && lead.stage !== "CLOSED" && lead.status !== "CONVERTED");
  const stageBreakdown = Object.fromEntries(["COLD", "WARM", "HOT", "CLOSED"].map((stage) => [stage, leads.filter((lead) => lead.stage === stage).length]));
  const performance = new Map();
  for (const lead of leads) { const key = lead.assignedToId || "UNASSIGNED"; const row = performance.get(key) || { assignedToId: lead.assignedToId, assignedTo: lead.assignedTo?.fullName || "Unassigned", assignedLeads: 0, newLeads: 0, completedFollowUps: 0, movedToHot: 0, convertedLeads: 0, pendingFollowUps: 0, overdueFollowUps: 0 }; row.assignedLeads += 1; if (inPeriod(lead.createdAt)) row.newLeads += 1; row.completedFollowUps += lead.followUps.filter((item) => inPeriod(item.createdAt)).length; if (lead.stageHistory.some((item) => item.toStage === "HOT" && inPeriod(item.createdAt))) row.movedToHot += 1; if (lead.activities.some((item) => item.action === "LEAD_CONVERTED" && inPeriod(item.createdAt))) row.convertedLeads += 1; if (pending.some((item) => item.id === lead.id)) row.pendingFollowUps += 1; if (overdue.some((item) => item.id === lead.id)) row.overdueFollowUps += 1; performance.set(key, row); }
  return { period: { year: range.year, month: range.month, start: range.start, end: range.end }, summary: { totalNewLeads: newLeads.length, stageBreakdown, convertedLeads: converted.length, movedToHot: movedHot.size, completedFollowUps, pendingFollowUps: pending.length, overdueFollowUps: overdue.length, conversionRate: newLeads.length ? Number(((converted.length / newLeads.length) * 100).toFixed(2)) : 0 }, performance: Array.from(performance.values()), leads: leads.map((lead) => ({ leadId: lead.leadId, studentName: lead.studentName, assignedTo: lead.assignedTo?.fullName || "Unassigned", branch: lead.branch?.branchName || "-", stage: lead.stage, status: lead.status, nextFollowUpDate: lead.nextFollowUpDate, followUpCount: lead.followUps.length, converted: lead.activities.some((item) => item.action === "LEAD_CONVERTED" && inPeriod(item.createdAt)) })) };
}
