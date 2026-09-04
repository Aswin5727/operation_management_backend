import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";

const RECORD_STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const PLAN_TYPES = new Set(["FULL_PAYMENT", "CUSTOM"]);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeKey(value) {
  return normalizeString(value).toLowerCase().replace(/\s+/g, " ");
}

function parsePage(value) {
  const parsed = Number(value ?? 1);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

function parseLimit(value) {
  const parsed = Number(value ?? 10);
  if (!Number.isInteger(parsed) || parsed < 1) return 10;
  return Math.min(parsed, 100);
}

function parseSortOrder(value, defaultOrder = "desc") {
  const order = normalizeString(value).toLowerCase();
  return order === "asc" || order === "desc" ? order : defaultOrder;
}

function buildPagination({ page, limit }) {
  const safePage = parsePage(page);
  const safeLimit = parseLimit(limit);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

function buildPaginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function parseRequiredText(value, fieldName) {
  const text = normalizeString(value);
  if (!text) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return text;
}

function parseOptionalText(value) {
  const text = normalizeString(value);
  return text ? text : null;
}

function parseOptionalInt(value, fieldName, { allowZero = true } = {}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new AppError(`${fieldName} must be an integer`, 400);
  }

  if (allowZero) {
    if (parsed < 0) {
      throw new AppError(`${fieldName} must be zero or greater`, 400);
    }
    return parsed;
  }

  if (parsed <= 0) {
    throw new AppError(`${fieldName} must be greater than zero`, 400);
  }

  return parsed;
}

function parseStatus(value) {
  const status = normalizeString(value).toUpperCase() || "ACTIVE";
  if (!RECORD_STATUSES.has(status)) {
    throw new AppError("Invalid status", 400);
  }
  return status;
}

function parsePlanType(value, fallback = "CUSTOM") {
  const planType = normalizeString(value).toUpperCase() || normalizeString(fallback).toUpperCase() || "CUSTOM";
  if (!PLAN_TYPES.has(planType)) {
    throw new AppError("Invalid plan type", 400);
  }
  return planType;
}

function parseInstallmentTemplatePayload(payload = {}, existingTemplate = null) {
  const templateSource = payload?.installmentTemplate && typeof payload.installmentTemplate === "object"
    ? payload.installmentTemplate
    : payload;

  const templateName = parseOptionalText(templateSource.templateName ?? templateSource.planName ?? existingTemplate?.templateName);
  if (!templateName) {
    throw new AppError("Template name is required", 400);
  }

  const planType = parsePlanType(templateSource.planType ?? templateSource.templateType ?? existingTemplate?.planType);
  const rawInstallmentCount = templateSource.installmentCount ?? templateSource.count ?? existingTemplate?.installmentCount;
  const parsedCount = parseOptionalInt(rawInstallmentCount, "Installment count", { allowZero: false });
  const installmentCount = planType === "FULL_PAYMENT" ? 1 : (parsedCount ?? null);

  if (!installmentCount || installmentCount <= 0) {
    throw new AppError("Installment count must be greater than zero", 400);
  }

  const dueRule = parseOptionalText(templateSource.dueRule ?? existingTemplate?.dueRule) || "Admission";
  const allowCustomization =
    typeof templateSource.allowCustomization === "boolean"
      ? templateSource.allowCustomization
      : typeof existingTemplate?.allowCustomization === "boolean"
        ? existingTemplate.allowCustomization
        : true;
  const status = parseStatus(templateSource.status ?? existingTemplate?.status ?? "ACTIVE");
  const branchCourseId = parseOptionalText(templateSource.branchCourseId ?? existingTemplate?.branchCourseId);

  return {
    templateName,
    planType,
    installmentCount,
    installments: [],
    dueRule,
    allowCustomization,
    status,
    branchCourseId,
  };
}

function toBranchInstallmentTemplateSummary(template = null) {
  if (!template) return null;

  return {
    id: template.id,
    branchId: template.branchId,
    branchCourseId: template.branchCourseId,
    templateName: template.templateName,
    planType: template.planType,
    installmentCount: template.installmentCount,
    installments: Array.isArray(template.installments) ? template.installments : [],
    dueRule: template.dueRule,
    allowCustomization: Boolean(template.allowCustomization),
    status: template.status,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    course: template.branchCourse
      ? {
          id: template.branchCourse.id,
          courseCode: template.branchCourse.courseCode,
          name: template.branchCourse.name,
        }
      : null,
  };
}

function buildOrderBy(sortBy, sortOrder) {
  const normalizedSortBy = normalizeKey(sortBy) || "createdat";
  const order = parseSortOrder(sortOrder, "desc");

  switch (normalizedSortBy) {
    case "template name":
    case "templatename":
      return { templateName: order };
    case "installment count":
    case "installmentcount":
      return { installmentCount: order };
    case "status":
      return { status: order };
    case "updatedat":
    case "updated at":
      return { updatedAt: order };
    default:
      return { createdAt: order };
  }
}

function buildInclude() {
  return {
    branchCourse: {
      select: {
        id: true,
        courseCode: true,
        name: true,
      },
    },
  };
}

async function ensureUniqueTemplateName(branchId, templateName, excludeId = null) {
  const existing = await prisma.branchInstallmentTemplate.findFirst({
    where: {
      branchId,
      templateName: {
        equals: templateName,
        mode: "insensitive",
      },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError("Installment template name already exists", 409);
  }
}

async function ensureBranchCourseBelongsToBranch(branchId, branchCourseId) {
  if (!branchCourseId) return null;

  const branchCourse = await prisma.branchCourse.findFirst({
    where: {
      id: branchCourseId,
      branchId,
    },
    select: {
      id: true,
      courseCode: true,
      name: true,
    },
  });

  if (!branchCourse) {
    throw new AppError("Course not found for this branch", 404);
  }

  return branchCourse;
}

export async function listBranchInstallmentTemplates(query, actor) {
  const branchProfile = await getCurrentBranchProfile(actor);
  if (!branchProfile?.id) {
    throw new AppError("Branch profile not found", 404);
  }

  const pagination = buildPagination(query);
  const where = {
    branchId: branchProfile.id,
  };

  const search = normalizeString(query?.search);
  if (query?.status) {
    where.status = parseStatus(query.status);
  }

  if (search) {
    where.OR = [
      { templateName: { contains: search, mode: "insensitive" } },
      { dueRule: { contains: search, mode: "insensitive" } },
      { branchCourse: { name: { contains: search, mode: "insensitive" } } },
      { branchCourse: { courseCode: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.branchInstallmentTemplate.count({ where }),
    prisma.branchInstallmentTemplate.findMany({
      where,
      orderBy: buildOrderBy(query?.sortBy, query?.sortOrder),
      skip: pagination.skip,
      take: pagination.take,
      include: buildInclude(),
    }),
  ]);

  return {
    data: rows.map(toBranchInstallmentTemplateSummary),
    meta: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
}

export async function createBranchInstallmentTemplate(payload, actor) {
  const branchProfile = await getCurrentBranchProfile(actor);
  if (!branchProfile?.id) {
    throw new AppError("Branch profile not found", 404);
  }

  const parsed = parseInstallmentTemplatePayload(payload);
  await ensureUniqueTemplateName(branchProfile.id, parsed.templateName);

  if (parsed.branchCourseId) {
    await ensureBranchCourseBelongsToBranch(branchProfile.id, parsed.branchCourseId);
  }

  const actorId = actor?.id ?? null;
  const created = await prisma.branchInstallmentTemplate.create({
    data: {
      branchId: branchProfile.id,
      branchCourseId: parsed.branchCourseId || null,
      templateName: parsed.templateName,
      planType: parsed.planType,
      installmentCount: parsed.installmentCount,
      installments: parsed.installments,
      dueRule: parsed.dueRule,
      allowCustomization: parsed.allowCustomization,
      status: parsed.status,
      createdBy: actorId,
      updatedBy: actorId,
    },
    include: buildInclude(),
  });

  return toBranchInstallmentTemplateSummary(created);
}

export async function getBranchInstallmentTemplate(templateId, actor) {
  const branchProfile = await getCurrentBranchProfile(actor);
  if (!branchProfile?.id) {
    throw new AppError("Branch profile not found", 404);
  }

  const template = await prisma.branchInstallmentTemplate.findFirst({
    where: {
      id: templateId,
      branchId: branchProfile.id,
    },
    include: buildInclude(),
  });

  if (!template) {
    throw new AppError("Installment template not found", 404);
  }

  return toBranchInstallmentTemplateSummary(template);
}

export async function updateBranchInstallmentTemplate(templateId, payload, actor) {
  const branchProfile = await getCurrentBranchProfile(actor);
  if (!branchProfile?.id) {
    throw new AppError("Branch profile not found", 404);
  }

  const existingTemplate = await prisma.branchInstallmentTemplate.findFirst({
    where: {
      id: templateId,
      branchId: branchProfile.id,
    },
  });

  if (!existingTemplate) {
    throw new AppError("Installment template not found", 404);
  }

  const parsed = parseInstallmentTemplatePayload(payload, existingTemplate);
  await ensureUniqueTemplateName(branchProfile.id, parsed.templateName, templateId);

  if (parsed.branchCourseId) {
    await ensureBranchCourseBelongsToBranch(branchProfile.id, parsed.branchCourseId);
  }

  const actorId = actor?.id ?? null;
  const updated = await prisma.branchInstallmentTemplate.update({
    where: { id: templateId },
    data: {
      branchId: branchProfile.id,
      branchCourseId: parsed.branchCourseId || null,
      templateName: parsed.templateName,
      planType: parsed.planType,
      installmentCount: parsed.installmentCount,
      installments: parsed.installments,
      dueRule: parsed.dueRule,
      allowCustomization: parsed.allowCustomization,
      status: parsed.status,
      updatedBy: actorId,
    },
    include: buildInclude(),
  });

  return toBranchInstallmentTemplateSummary(updated);
}











export async function deleteBranchInstallmentTemplate(templateId, actor) {
  const branchProfile = await getCurrentBranchProfile(actor);
  if (!branchProfile?.id) {
    throw new AppError("Branch profile not found", 404);
  }

  const existingTemplate = await prisma.branchInstallmentTemplate.findFirst({
    where: {
      id: templateId,
      branchId: branchProfile.id,
    },
    include: buildInclude(),
  });

  if (!existingTemplate) {
    throw new AppError("Installment template not found", 404);
  }

  await prisma.branchInstallmentTemplate.delete({
    where: { id: templateId },
  });

  return toBranchInstallmentTemplateSummary(existingTemplate);
}
