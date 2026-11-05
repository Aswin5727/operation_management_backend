import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

const BRANCH_ADMIN_WIDGETS = [
  ["this_month_admissions", "This Month Admissions", "Student Management"],
  ["batch_availability", "Batch Availability", "Batch Management"],
  ["total_revenue", "Total Revenue", "Fees"],
  ["total_collected", "Total Collected", "Fees"],
  ["outstanding", "Outstanding", "Fees"],
  ["due_today", "Due Today", "Fees"],
  ["due_this_week", "Due This Week", "Fees"],
  ["overdue_amount", "Overdue Amount", "Fees"],
  ["collection_percentage", "Collection %", "Fees"],
].map(([widgetKey, widgetName, category]) => ({
  widgetKey, widgetName, category, description: `${widgetName} on the branch dashboard`, allowedRoles: ["BRANCH_ADMIN"],
}));

async function resolveWidgetOwnerUserId(user) {
  const role = String(user?.role || "").toUpperCase();
  const userId = String(user?.userId || user?.id || "").trim();

  if (role === "BRANCH_ADMIN") {
    if (!userId) throw new AppError("Authentication required", 401);
    return userId;
  }

  // Super Admin branch view edits the selected branch admin's widget layout,
  // rather than creating a separate global layout for the Super Admin.
  if (["SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER"].includes(role) && user?.impersonatedBranchId) {
    const branch = await prisma.branch.findFirst({
      where: { OR: [{ id: user.impersonatedBranchId }, { branchId: user.impersonatedBranchId }] },
      select: { adminUserId: true },
    });
    if (!branch?.adminUserId) throw new AppError("Branch admin profile not found", 404);
    return branch.adminUserId;
  }

  throw new AppError("You do not have permission for this action", 403);
}

async function ensureWidgetCatalog() {
  const currentKeys = BRANCH_ADMIN_WIDGETS.map((widget) => widget.widgetKey);
  await prisma.$transaction(BRANCH_ADMIN_WIDGETS.map((widget) => prisma.dashboardWidget.upsert({
    where: { widgetKey: widget.widgetKey }, create: widget, update: { widgetName: widget.widgetName, category: widget.category, description: widget.description, allowedRoles: widget.allowedRoles, isActive: true },
  })).concat(prisma.dashboardWidget.updateMany({
    where: { allowedRoles: { has: "BRANCH_ADMIN" }, widgetKey: { notIn: currentKeys } },
    data: { isActive: false },
  })));
  return prisma.dashboardWidget.findMany({ where: { isActive: true, allowedRoles: { has: "BRANCH_ADMIN" } }, orderBy: { createdAt: "asc" } });
}

function toConfig(widget, preference, fallbackOrder) {
  return { widgetKey: widget.widgetKey, widgetName: widget.widgetName, category: widget.category, description: widget.description, isVisible: preference?.isVisible ?? true, displayOrder: preference?.displayOrder ?? fallbackOrder };
}

export async function getBranchAdminWidgetConfig(user) {
  const userId = await resolveWidgetOwnerUserId(user);
  const widgets = await ensureWidgetCatalog();
  const preferences = await prisma.userDashboardWidget.findMany({ where: { userId }, include: { widget: true }, orderBy: { displayOrder: "asc" } });
  const preferenceMap = new Map(preferences.map((item) => [item.widgetId, item]));
  return widgets.map((widget, index) => toConfig(widget, preferenceMap.get(widget.id), index + 1)).sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function saveBranchAdminWidgetConfig(user, payload = {}) {
  const userId = await resolveWidgetOwnerUserId(user);
  const requested = Array.isArray(payload.widgets) ? payload.widgets : [];
  const keys = requested.map((item) => String(item?.widgetKey || "").trim()).filter(Boolean);
  if (!keys.length || new Set(keys).size !== keys.length) throw new AppError("Widget configuration must contain unique widgets", 400);
  const widgets = await ensureWidgetCatalog();
  const allowed = new Map(widgets.map((widget) => [widget.widgetKey, widget]));
  if (keys.some((key) => !allowed.has(key))) throw new AppError("One or more widgets are not allowed for this role", 403);
  await prisma.$transaction(async (tx) => {
    await tx.userDashboardWidget.deleteMany({ where: { userId } });
    await tx.userDashboardWidget.createMany({ data: requested.map((item, index) => ({ userId, widgetId: allowed.get(String(item.widgetKey).trim()).id, isVisible: Boolean(item.isVisible), displayOrder: index + 1 })) });
  });
  return getBranchAdminWidgetConfig(user);
}

export async function resetBranchAdminWidgetConfig(user) {
  const userId = await resolveWidgetOwnerUserId(user);
  await prisma.userDashboardWidget.deleteMany({ where: { userId } });
  return getBranchAdminWidgetConfig(user);
}
