import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import {
  sendFacultyCourseAssignmentEmail,
} from "../../common/services/resendEmail.js";

import { buildCourseInstallments as buildBalancedInstallments, distributePercentages } from "./courseCalculations.js";
import { syncCourseHierarchy } from "./courseHierarchy.js";
import { courseFieldErrors, normalizeCourseCode } from "./courseValidation.js";

const RECORD_STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const BRANCH_COURSE_HIERARCHY_KEYS = ["models", "modules", "courseModels"];
const BRANCH_INSTALLMENT_TEMPLATE_KEYS = [
  "installmentTemplate",
  "templateName",
  "planName",
  "installmentCount",
  "installments",
  "installmentAmounts",
  "dueRule",
  "allowCustomization",
];

const BRANCH_INSTALLMENT_TEMPLATE_FIELD_KEYS = [
  "templateName",
  "planName",
  "installmentCount",
  "installments",
  "installmentAmounts",
  "dueRule",
  "allowCustomization",
];
const PLAN_TYPES = new Set(["FULL_PAYMENT", "CUSTOM"]);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeKey(value) {
  return normalizeString(value).toLowerCase().replace(/\s+/g, " ");
}

function normalizeCourseNameKey(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
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
  if (!Number.isSafeInteger(parsed) || parsed > 2147483647) {
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
    throw new AppError("Invalid course status", 400);
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

function normalizeBranchCoursePaymentPlanType(value = "") {
  return normalizeString(value).toLowerCase() === "custom" ? "custom" : "template";
}

function normalizeBranchCoursePaymentPlanInstallments(_values = [], finalFee = 0, installmentCount = 1) {
  return buildBalancedInstallments(finalFee, installmentCount);
}

function normalizeBranchCoursePaymentPlanSelection(plan = {}, finalFee = 0, index = 0) {
  const type = normalizeBranchCoursePaymentPlanType(plan?.type ?? plan?.planType);
  const installmentCount = Math.max(
    1,
    Number(
      parseOptionalInt(plan?.installmentCount ?? plan?.count, `Payment plan ${index + 1} installment count`, {
        allowZero: false,
      }) ?? 1,
    ) || 1,
  );
  const templateName = parseOptionalText(plan?.templateName ?? plan?.planName)
    || (type === "custom" ? "Custom" : "Payment Plan");

  return {
    id: parseOptionalText(plan?.id) || `payment-plan-${index + 1}`,
    type,
    planType: installmentCount <= 1 ? "FULL_PAYMENT" : "CUSTOM",
    templateId: parseOptionalText(plan?.templateId ?? plan?.id),
    templateName,
    installmentCount,
    installments: normalizeBranchCoursePaymentPlanInstallments(plan?.installments, finalFee, installmentCount),
    dueRule: parseOptionalText(plan?.dueRule) || "Admission",
    allowCustomization:
      typeof plan?.allowCustomization === "boolean"
        ? plan.allowCustomization
        : true,
    status: parseStatus(plan?.status ?? "ACTIVE"),
  };
}

function parseBranchCoursePaymentPlans(payload = {}, finalFee = 0) {
  const candidate = payload || {};
  const sourcePlans = Array.isArray(candidate.paymentPlans)
    ? candidate.paymentPlans
    : Array.isArray(candidate.paymentPlanSelections)
      ? candidate.paymentPlanSelections
      : Array.isArray(candidate.installmentPlans)
        ? candidate.installmentPlans
        : [];

  const fallbackPlans = sourcePlans.length
    ? sourcePlans
    : candidate?.installmentTemplate && typeof candidate.installmentTemplate === "object"
      ? [candidate.installmentTemplate]
      : [];

  return fallbackPlans.map((plan, index) =>
    normalizeBranchCoursePaymentPlanSelection(plan, finalFee, index),
  );
}



function hasInstallmentTemplatePayload(payload = {}) {
  const template = payload?.installmentTemplate;

  if (template && typeof template === "object") {
    return true;
  }

  return BRANCH_INSTALLMENT_TEMPLATE_FIELD_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );
}

function parseBranchInstallmentValues(candidate = {}) {
  const sourceValues = [];

  if (Array.isArray(candidate.installments) && candidate.installments.length) {
    sourceValues.push(...candidate.installments);
  } else if (Array.isArray(candidate.installmentAmounts) && candidate.installmentAmounts.length) {
    sourceValues.push(...candidate.installmentAmounts);
  } else {
    Object.entries(candidate)
      .map(([key, value]) => {
        const match = key.match(/^installment(\d+)$/i);
        if (!match) return null;
        return {
          index: Number(match[1]),
          value,
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.index - right.index)
      .forEach(({ value }) => {
        sourceValues.push(value);
      });
  }

  return sourceValues
    .map((value, index) =>
      parseOptionalInt(value, `Installment ${index + 1}`, { allowZero: true }),
    )
    .filter((value) => value !== null);
}

function parseBranchInstallmentTemplate(candidate = {}, course = null, existingTemplate = null) {
  const templateSource = candidate.installmentTemplate && typeof candidate.installmentTemplate === "object"
    ? candidate.installmentTemplate
    : candidate;

  if (!hasInstallmentTemplatePayload(templateSource)) {
    return null;
  }

  const normalizedTemplateName = parseOptionalText(
    templateSource.templateName ?? templateSource.planName ?? existingTemplate?.templateName,
  ) || "Standard Installment Plan";

  const parsedInstallments = parseBranchInstallmentValues(templateSource);
  const rawInstallmentCount = templateSource.installmentCount ?? templateSource.count ?? existingTemplate?.installmentCount;
  const installmentCount = parsedInstallments.length > 0
    ? parsedInstallments.length
    : parseOptionalInt(rawInstallmentCount, "Installment count", { allowZero: false }) ?? null;

  if (!installmentCount || installmentCount <= 0) {
    throw new AppError("Installment count must be greater than zero", 400);
  }

  const effectiveInstallments = parsedInstallments.length
    ? parsedInstallments
    : buildBalancedInstallments(course?.afterDiscount ?? 0, installmentCount);

  if (effectiveInstallments.length !== installmentCount) {
    throw new AppError("Installment count must match installment values", 400);
  }

  const installmentTotal = effectiveInstallments.reduce((total, amount) => total + amount, 0);
  const finalFee = Number(course?.afterDiscount ?? 0);

  if (Number.isFinite(finalFee) && installmentTotal !== finalFee) {
    throw new AppError("Installment totals must match the discounted fee", 400);
  }

  const dueRule = parseOptionalText(templateSource.dueRule ?? existingTemplate?.dueRule);
  const planType = parsePlanType(
    templateSource.planType
      ?? templateSource.templateType
      ?? (installmentCount === 1 ? "FULL_PAYMENT" : "CUSTOM"),
  );
  const allowCustomization =
    typeof templateSource.allowCustomization === "boolean"
      ? templateSource.allowCustomization
      : Boolean(existingTemplate?.allowCustomization ?? true);
  const status = parseStatus(templateSource.status ?? existingTemplate?.status ?? "ACTIVE");

  return {
    templateName: normalizedTemplateName,
    planType,
    installmentCount,
    installments: effectiveInstallments,
    dueRule,
    allowCustomization,
    status,
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
  };
}

async function resolveBranchProfile(actor) {
  const profile = await getCurrentBranchProfile(actor);
  if (!profile?.id) {
    throw new AppError("Branch profile not found", 404);
  }
  return profile;
}

function normalizeBranchCourseSubmodules(submodules = []) {
  return Array.isArray(submodules)
    ? submodules.map((submodule, submoduleIndex) => {
        const title = parseRequiredText(
          submodule?.title ?? submodule?.name ?? submodule?.submoduleName,
          `Submodule ${submoduleIndex + 1} title`,
        );

        return {
          id: parseOptionalText(submodule?.id),
          title,
          titleKey: normalizeKey(title),
          description: parseOptionalText(submodule?.description),
          sequenceNo: parseOptionalInt(submodule?.sequenceNo ?? submoduleIndex + 1, `Submodule ${submoduleIndex + 1} sequence number`, { allowZero: false }),
          status: parseStatus(submodule?.status ?? "ACTIVE"),
        };
      })
    : [];
}

function normalizeBranchCourseModules(modules = []) {
  return Array.isArray(modules)
    ? modules.map((module, moduleIndex) => {
        const title = parseRequiredText(
          module?.title ?? module?.name ?? module?.moduleName,
          `Module ${moduleIndex + 1} title`,
        );

        const submodules = normalizeBranchCourseSubmodules(module?.submodules ?? module?.submodels ?? []);
        if (submodules.length > 10000) throw new AppError("A module supports at most 10,000 submodules", 400);
        if (!submodules.length) throw new AppError("Every module requires at least one submodule", 400);
        const seenSubmoduleKeys = new Set();

        for (const submodule of submodules) {
          if (seenSubmoduleKeys.has(submodule.titleKey)) {
            throw new AppError(`Submodule title already exists in module ${moduleIndex + 1}`, 409);
          }
          seenSubmoduleKeys.add(submodule.titleKey);
        }

        return {
          id: parseOptionalText(module?.id),
          title,
          titleKey: normalizeKey(title),
          description: parseOptionalText(module?.description),
          sequenceNo: parseOptionalInt(module?.sequenceNo ?? moduleIndex + 1, `Module ${moduleIndex + 1} sequence number`, { allowZero: false }),
          status: parseStatus(module?.status ?? "ACTIVE"),
          submodules,
        };
      })
    : [];
}

function extractBranchCourseHierarchy(payload = {}) {
  const hasHierarchy = BRANCH_COURSE_HIERARCHY_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

  if (!hasHierarchy) {
    return {
      hasHierarchy: false,
      modules: [],
    };
  }

  const rawModules =
    payload.models ??
    payload.modules ??
    payload.courseModels ??
    [];

  const modules = normalizeBranchCourseModules(rawModules);
  if (modules.length > 1000) throw new AppError("A course supports at most 1,000 modules", 400);
  const seenModuleKeys = new Set();

  for (const module of modules) {
    if (seenModuleKeys.has(module.titleKey)) {
      throw new AppError("Module title already exists in this course payload", 409);
    }
    seenModuleKeys.add(module.titleKey);
  }

  if (!modules.length) {
    throw new AppError("At least one module is required", 400);
  }

  return {
    hasHierarchy: true,
    modules,
  };
}

function toBranchCourseSubmodule(submodule = {}, percentage = 0) {
  return {
    id: submodule.id,
    title: submodule.title,
    description: submodule.description,
    sequenceNo: submodule.sequenceNo,
    status: submodule.status,
    percentage: Number.isInteger(submodule.percentageBasisPoints) ? submodule.percentageBasisPoints / 100 : percentage,
    createdAt: submodule.createdAt,
    updatedAt: submodule.updatedAt,
  };
}

function toBranchCourseModule(module = {}, percentage = 0) {
  const submodules = Array.isArray(module.submodules) ? module.submodules : [];
  const submodulePercentages = distributePercentages(submodules.length);

  return {
    id: module.id,
    title: module.title,
    description: module.description,
    sequenceNo: module.sequenceNo,
    status: module.status,
    percentage: Number.isInteger(module.percentageBasisPoints) ? module.percentageBasisPoints / 100 : percentage,
    submodules: submodules.map((submodule, submoduleIndex) =>
      toBranchCourseSubmodule(submodule, submodulePercentages[submoduleIndex] ?? 0),
    ),
    createdAt: module.createdAt,
    updatedAt: module.updatedAt,
  };
}

function buildBranchCourseHierarchyResponse(modules = []) {
  const normalizedModules = Array.isArray(modules) ? modules : [];
  const modulePercentages = distributePercentages(normalizedModules.length);

  return normalizedModules.map((module, moduleIndex) =>
    toBranchCourseModule(module, modulePercentages[moduleIndex] ?? 0),
  );
}

function toBranchCourseSummary(course) {
  const modules = buildBranchCourseHierarchyResponse(course.modules || []);
  return {
    id: course.id,
    branchId: course.branchId,
    courseCode: course.courseCode,
    name: course.name,
    nameKey: course.nameKey,
    courseType: course.courseType,
    academicTestCount: course.academicTestCount ?? 0,
    description: course.description,
    mode: course.mode,
    duration: course.duration,
    hours: course.hours,
    actualFees: course.actualFees,
    registrationFees: course.registrationFees,
    discount: course.discount,
    afterDiscount: course.afterDiscount,
    paymentPlans: Array.isArray(course.paymentPlans) ? course.paymentPlans : [],
    paymentPlanSelections: Array.isArray(course.paymentPlanSelections) ? course.paymentPlanSelections : [],
    status: course.status,
    installmentTemplate: toBranchInstallmentTemplateSummary(course.installmentTemplate),

    assignedFaculty: Array.isArray(course.branchFaculties)
      ? course.branchFaculties.map((faculty) => ({
        id: faculty.facultyId,
        dbId: faculty.id,
        name: faculty.name,
        email: faculty.email,
        status: faculty.status,
      }))
      : [],

    modules,
    moduleCount: course._count?.modules ?? course.moduleCount ?? modules.length ?? 0,
    assignedFacultyCount: course._count?.branchFaculties ?? course.assignedFacultyCount ?? course.branchFaculties?.length ?? 0,
    batches: 0,
    students: 0,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}
function toBranchCourseDetail(course) {
  return toBranchCourseSummary(course);
}

function buildBranchCourseWhere(query, actor = null) {
  const where = {};
  const search = normalizeString(query.search);

  if (query.status) {
    where.status = parseStatus(query.status);
  }

  if (search) {
    const numeric = Number(search);
    const conditions = [
      { courseCode: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { nameKey: { contains: normalizeKey(search), mode: "insensitive" } },
      { courseType: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { mode: { contains: search, mode: "insensitive" } },
    ];

    if (Number.isInteger(numeric)) {
      conditions.push(
        { duration: numeric },
        { hours: numeric },
        { actualFees: numeric },
        { registrationFees: numeric },
        { discount: numeric },
        { afterDiscount: numeric },
      );
    }

    where.OR = conditions;
  }

  return resolveBranchProfile(actor).then((branchProfile) => ({
    ...where,
    branchId: branchProfile.id,
  }));
}

function buildBranchCourseOrderBy(sortBy, sortOrder) {
  switch (normalizeString(sortBy).toLowerCase()) {
    case "coursecode":
      return { courseCode: sortOrder };
    case "name":
      return { name: sortOrder };
    case "mode":
      return { mode: sortOrder };
    case "duration":
      return { duration: sortOrder };
    case "hours":
      return { hours: sortOrder };
    case "updatedat":
      return { updatedAt: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

async function ensureUniqueCourseName(nameKey, branchId, excludeId = null, db = prisma) {
  const existingCourses = await db.branchCourse.findMany({
    where: {
      branchId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true, nameKey: true },
  });

  const existing = existingCourses.find((course) =>
    normalizeCourseNameKey(course.name || course.nameKey) === normalizeCourseNameKey(nameKey),
  );
  if (existing) {
    throw new AppError("Course name already exists", 409);
  }
}

async function ensureUniqueCourseCode(courseCode, branchId, excludeId = null, db = prisma, publicBranchId = null) {
  const normalized = normalizeString(courseCode);
  if (!normalized) throw new AppError("Course code is required", 400);
  const courses = await db.branchCourse.findMany({
    where: { branchId, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { courseCode: true },
  });
  const exists = courses.some((course) => {
    try { return normalizeCourseCode(course.courseCode, publicBranchId) === normalized; }
    catch { return normalizeString(course.courseCode).toUpperCase() === normalized.toUpperCase(); }
  });
  if (exists) throw new AppError("Course code already exists", 409);
}

function buildBranchCoursePayload(payload = {}, existingCourse = null) {
  const candidate = { ...existingCourse, ...payload };
  const fieldErrors = courseFieldErrors(payload, { partial: Boolean(existingCourse), existing: existingCourse || {} });
  if (fieldErrors.length) throw new AppError(fieldErrors[0].message, 400);
  const courseCode = parseRequiredText(candidate.courseCode ?? existingCourse?.courseCode, "Course code");
  const courseType = parseRequiredText(candidate.courseType ?? existingCourse?.courseType, "Course type");
  const name = parseRequiredText(candidate.name ?? candidate.courseName ?? existingCourse?.name, "Course name");
  const description = parseOptionalText(candidate.description ?? existingCourse?.description);
  const modeText = parseRequiredText(candidate.mode ?? existingCourse?.mode, "Mode");
  const mode = modeText.charAt(0).toUpperCase() + modeText.slice(1).toLowerCase();
  const duration = parseOptionalInt(candidate.duration ?? existingCourse?.duration, "Duration");
  const hours = parseOptionalInt(candidate.hours ?? existingCourse?.hours, "Hours");
  const actualFees = parseOptionalInt(candidate.actualFees ?? existingCourse?.actualFees, "Actual fees");
  const registrationFees = parseOptionalInt(
    candidate.registrationFees ?? existingCourse?.registrationFees,
    "Registration fees",
  );
  const discount = parseOptionalInt(candidate.discount ?? existingCourse?.discount ?? 0, "Discount", {
    allowZero: true,
  }) ?? 0;
  const afterDiscount =
    actualFees !== null && registrationFees !== null
      ? Math.max(actualFees + registrationFees - discount, 0)
      : existingCourse?.afterDiscount ?? null;
  const status = parseStatus(candidate.status ?? existingCourse?.status ?? "ACTIVE");
  const academicTestCount = parseOptionalInt(
    candidate.academicTestCount ?? existingCourse?.academicTestCount ?? 0,
    "Academic Test count",
    { allowZero: true },
  ) ?? 0;
  const hasPlans = ["paymentPlans", "paymentPlanSelections", "installmentPlans", "installmentTemplate"].some((key) => Object.hasOwn(payload, key));
  const paymentPlans = parseBranchCoursePaymentPlans(hasPlans ? payload : candidate, afterDiscount ?? 0);

  return {
    courseCode,
    courseType,
    name,
    nameKey: normalizeCourseNameKey(name),
    description,
    mode,
    duration,
    hours,
    actualFees,
    registrationFees,
    discount,
    afterDiscount,
    paymentPlans,
    paymentPlanSelections: paymentPlans,
    status,
    academicTestCount,
  };
}

export function buildBranchCourseHierarchyPayload(payload = {}) {
  const { hasHierarchy, modules } = extractBranchCourseHierarchy(payload);

  if (!hasHierarchy) {
    return null;
  }

  return modules.map((module, moduleIndex) => ({
    id: module.id,
    title: module.title,
    titleKey: module.titleKey,
    description: module.description,
    sequenceNo: module.sequenceNo ?? moduleIndex + 1,
    status: module.status,
    submodules: module.submodules.map((submodule, subIndex) => ({
      id: submodule.id,
      title: submodule.title,
      titleKey: submodule.titleKey,
      description: submodule.description,
      sequenceNo: submodule.sequenceNo ?? subIndex + 1,
      status: submodule.status,
    })),
  }));
}

const replaceBranchCourseHierarchy = syncCourseHierarchy;

function getBranchCourseInclude() {
  return {
    installmentTemplate: {
      select: {
        id: true,
        branchId: true,
        branchCourseId: true,
        templateName: true,
        planType: true,
        installmentCount: true,
        installments: true,
        dueRule: true,
        allowCustomization: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    },
    branchFaculties: {
      select: {
        id: true,
        facultyId: true,
        name: true,
        email: true,
        status: true,
      },
      orderBy: {
        name: "asc",
      },
    },
    modules: {
      orderBy: {
        sequenceNo: "asc",
      },
      include: {
        submodules: {
          orderBy: {
            sequenceNo: "asc",
          },
        },
      },
    },
    _count: {
      select: {
        branchFaculties: true,
        modules: true,
      },
    },
  };
}

function buildBranchCourseListQuery(query = {}, branchId) {
  const pagination = buildPagination(query);
  const sortOrder = parseSortOrder(query.sortOrder, "desc");
  const sortBy = query.sortBy || "createdAt";
  const where = {
    branchId,
  };

  const search = normalizeString(query.search);
  if (query.status) {
    where.status = parseStatus(query.status);
  }

  if (search) {
    const numeric = Number(search);
    const conditions = [
      { courseCode: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { mode: { contains: search, mode: "insensitive" } },
      { nameKey: { contains: normalizeKey(search), mode: "insensitive" } },
      { courseType: { contains: search, mode: "insensitive" } },
    ];

    if (Number.isInteger(numeric)) {
      conditions.push(
        { duration: numeric },
        { hours: numeric },
        { actualFees: numeric },
        { registrationFees: numeric },
        { discount: numeric },
        { afterDiscount: numeric },
      );
    }

    where.OR = conditions;
  }

  return {
    where,
    orderBy: buildBranchCourseOrderBy(sortBy, sortOrder),
    ...pagination,
  };
}

export async function listBranchCourses(query, actor) {
  const branchProfile = await resolveBranchProfile(actor);
  const { where, orderBy, skip, take, page, limit } = buildBranchCourseListQuery(query, branchProfile.id);

  const [total, rows] = await Promise.all([
    prisma.branchCourse.count({ where }),
    prisma.branchCourse.findMany({
      where,
      orderBy,
      skip,
      take,
      include: getBranchCourseInclude(),
    })
  ]);

  return {
    data: rows.map(toBranchCourseSummary),
    meta: buildPaginationMeta(total, page, limit),
  };
}


export async function lockCourseBranch(tx, branchId) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${branchId}, 0))`;
}

export async function resolveCoursePaymentPlans(db, branchId, plans, finalFee, existingPlans = []) {
  if (!Array.isArray(plans) || !plans.length) throw new AppError("Select at least one payment plan", 400);
  const seen = new Set();
  const normalized = [];
  for (const [index, plan] of plans.entries()) {
    let source = plan;
    if (normalizeString(plan.type).toLowerCase() !== "custom") {
      const templateId = normalizeString(plan.templateId || plan.id);
      const template = await db.branchInstallmentTemplate.findFirst({ where: { id: templateId, branchId, status: "ACTIVE" } });
      const historical = existingPlans.find((item) => (item.templateId || item.id) === templateId);
      if (!template && !historical) throw new AppError("Payment plan is unavailable. Select an active plan from this branch.", 400);
      const resolved = template || historical;
      source = { ...resolved, id: plan.id || resolved.id, templateId, type: "template" };
    }
    const count = Number(source.installmentCount);
    const result = normalizeBranchCoursePaymentPlanSelection({ ...source, installments: buildBalancedInstallments(finalFee, count) }, finalFee, index);
    const key = result.type === "custom" ? "custom:" + count : result.templateId;
    if (seen.has(key)) throw new AppError("Duplicate payment plan", 400);
    seen.add(key);
    normalized.push(result);
  }
  return normalized;
}

export async function prepareBranchCourse(payload, branchProfile, db = prisma, existingCourse = null) {
  const parsed = buildBranchCoursePayload(payload, existingCourse);
  parsed.courseCode = normalizeCourseCode(parsed.courseCode, branchProfile.branchId);
  const hierarchy = buildBranchCourseHierarchyPayload(payload);
  if (!existingCourse && !hierarchy) throw new AppError("At least one module is required", 400);
  const historicalPlans = existingCourse?.paymentPlans || existingCourse?.paymentPlanSelections || [];
  const hasExplicitPlans = ["paymentPlans", "paymentPlanSelections", "installmentPlans", "installmentTemplate"].some((key) => Object.hasOwn(payload, key));
  parsed.paymentPlans = existingCourse && !hasExplicitPlans && !parsed.paymentPlans.length ? [] :
    await resolveCoursePaymentPlans(db, branchProfile.id, parsed.paymentPlans, parsed.afterDiscount ?? 0, historicalPlans);
  parsed.paymentPlanSelections = parsed.paymentPlans;
  const installmentTemplate = parsed.paymentPlans.length ? parseBranchInstallmentTemplate({ installmentTemplate: parsed.paymentPlans[0] }, parsed) : null;
  return { parsed, hierarchy, installmentTemplate };
}

export async function createBranchCourseInTransaction(tx, payload, branchProfile, actorId = null) {
  const { parsed, hierarchy, installmentTemplate } = await prepareBranchCourse(payload, branchProfile, tx);
  const branchId = branchProfile.id;
  await ensureUniqueCourseName(parsed.nameKey, branchId, null, tx);
  await ensureUniqueCourseCode(parsed.courseCode, branchId, null, tx, branchProfile.branchId);
  const course = await tx.branchCourse.create({ data: { ...parsed, branchId, createdBy: actorId, updatedBy: actorId } });
  await syncCourseHierarchy(tx, course.id, hierarchy, actorId);
  await tx.branchInstallmentTemplate.create({ data: { ...installmentTemplate, branchId, branchCourseId: course.id, createdBy: actorId, updatedBy: actorId } });
  return toBranchCourseDetail(await tx.branchCourse.findFirst({ where: { id: course.id, branchId }, include: getBranchCourseInclude() }));
}

export async function createBranchCourse(payload, actor) {
  const profile = await resolveBranchProfile(actor);
  try {
    return await prisma.$transaction(async (tx) => {
      await lockCourseBranch(tx, profile.id);
      return createBranchCourseInTransaction(tx, payload, profile, actor?.id ?? null);
    }, { maxWait: 10000, timeout: 30000 });
  } catch (error) {
    if (error.code === "P2002") throw new AppError("Course code or name already exists in this branch", 409);
    throw error;
  }
}

export async function getBranchCourse(courseId, actor) {
  const branchProfile = await resolveBranchProfile(actor);
  const course = await prisma.branchCourse.findFirst({
    where: {
      id: courseId,
      branchId: branchProfile.id,
    },
    include: getBranchCourseInclude(),
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  return toBranchCourseDetail(course);
}

export async function updateBranchCourseInTransaction(tx, courseId, payload, profile, actorId = null) {
  const existingCourse = await tx.branchCourse.findFirst({ where: { id: courseId, branchId: profile.id } });
  if (!existingCourse) throw new AppError("Course not found", 404);
  if (payload.expectedUpdatedAt && new Date(payload.expectedUpdatedAt).getTime() !== existingCourse.updatedAt.getTime()) {
    throw new AppError("This course changed since it was opened. Reopen it before saving.", 409);
  }
  const { parsed, hierarchy, installmentTemplate } = await prepareBranchCourse(payload, profile, tx, existingCourse);
  await ensureUniqueCourseName(parsed.nameKey, profile.id, courseId, tx);
  await ensureUniqueCourseCode(parsed.courseCode, profile.id, courseId, tx, profile.branchId);
  const course = await tx.branchCourse.update({ where: { id: courseId }, data: { ...parsed, updatedBy: actorId } });
  if (hierarchy) await syncCourseHierarchy(tx, course.id, hierarchy, actorId);
  if (installmentTemplate) {
    await tx.branchInstallmentTemplate.upsert({
      where: { branchCourseId: course.id },
      create: { ...installmentTemplate, branchId: profile.id, branchCourseId: course.id, createdBy: actorId, updatedBy: actorId },
      update: { ...installmentTemplate, updatedBy: actorId },
    });
  }
  return toBranchCourseDetail(await tx.branchCourse.findFirst({ where: { id: course.id, branchId: profile.id }, include: getBranchCourseInclude() }));
}
export async function updateBranchCourse(courseId, payload, actor) {
  const profile = await resolveBranchProfile(actor);
  try {
    return await prisma.$transaction(async (tx) => {
      await lockCourseBranch(tx, profile.id);
      return updateBranchCourseInTransaction(tx, courseId, payload, profile, actor?.id ?? null);
    }, { maxWait: 10000, timeout: 30000 });
  } catch (error) {
    if (error.code === "P2002") throw new AppError("Course code or name already exists in this branch", 409);
    throw error;
  }
}

export async function updateBranchCourseModulesOnly(courseId, payload, actor, options = {}) {
  const branchId = normalizeString(options.branchId) || null;
  const branchProfile = branchId
    ? { id: branchId }
    : await resolveBranchProfile(actor);
  const existingCourse = await prisma.branchCourse.findFirst({
    where: {
      id: courseId,
      branchId: branchProfile.id,
    },
  });

  if (!existingCourse) {
    throw new AppError("Course not found", 404);
  }

  const hierarchy = buildBranchCourseHierarchyPayload(payload);
  if (!hierarchy) {
    throw new AppError("Modules are required", 400);
  }

  const actorId = actor?.id ?? null;

  const updated = await prisma.$transaction(
    async (tx) => {
    await lockCourseBranch(tx, branchProfile.id);
    await replaceBranchCourseHierarchy(tx, courseId, hierarchy, actorId);
    await tx.branchCourse.update({ where: { id: courseId }, data: { updatedBy: actorId } });

    return tx.branchCourse.findFirst({
      where: {
        id: courseId,
        branchId: branchProfile.id,
      },
      include: getBranchCourseInclude(),
    });
    },
    { maxWait: 10000, timeout: 30000 },
  );

  return toBranchCourseDetail(updated);
}

export async function deleteBranchCourse(courseId, actor) {
  const branchProfile = await resolveBranchProfile(actor);
  const existingCourse = await prisma.branchCourse.findFirst({
    where: {
      id: courseId,
      branchId: branchProfile.id,
    },
    include: getBranchCourseInclude(),
  });

  if (!existingCourse) {
    throw new AppError("Course not found", 404);
  }

  await prisma.branchCourse.delete({
    where: { id: courseId },
  });


  return toBranchCourseDetail(existingCourse);
}


export async function assignFacultyToBranchCourse(
  courseId,
  facultyIds = [],
  actor,
) {
  const branchProfile = await resolveBranchProfile(actor);

  const course = await prisma.branchCourse.findFirst({
    where: {
      id: courseId,
      branchId: branchProfile.id,
    },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  if (!Array.isArray(facultyIds)) {
    throw new AppError("facultyIds must be an array", 400);
  }

  const normalizedFacultyIds = [
    ...new Set(
      facultyIds
        .map((id) => normalizeString(id))
        .filter(Boolean),
    ),
  ];

  const facultyRows = await prisma.branchFaculty.findMany({
    where: {
      branchId: branchProfile.id,
      OR: [
        {
          id: {
            in: normalizedFacultyIds,
          },
        },
        {
          facultyId: {
            in: normalizedFacultyIds,
          },
        },
      ],
    },
    select: {
      id: true,
      facultyId: true,
      name: true,
      email: true,
      status: true,
    },
  });

  const resolvedFacultyRows = [];
  const unresolvedFacultyIds = [];

  for (const facultyId of normalizedFacultyIds) {
    const matchedFaculty = facultyRows.find((faculty) => faculty.id === facultyId || faculty.facultyId === facultyId);

    if (!matchedFaculty) {
      unresolvedFacultyIds.push(facultyId);
      continue;
    }

    if (!resolvedFacultyRows.some((faculty) => faculty.id === matchedFaculty.id)) {
      resolvedFacultyRows.push(matchedFaculty);
    }
  }

  if (unresolvedFacultyIds.length) {
    throw new AppError(
      "One or more selected faculty members were not found in this branch.",
      400,
    );
  }

  const actorId = actor?.id ?? null;

  const result = await prisma.$transaction(async (tx) => {
    // Remove the current faculty assignment for this course.
    await tx.branchFaculty.updateMany({
      where: {
        branchId: branchProfile.id,
        branchCourseId: course.id,
      },
      data: {
        branchCourseId: null,
        updatedBy: actorId,
      },
    });

    // Assign selected faculty to this course.
    if (resolvedFacultyRows.length) {
      await tx.branchFaculty.updateMany({
        where: {
          branchId: branchProfile.id,
          id: {
            in: resolvedFacultyRows.map((faculty) => faculty.id),
          },
        },
        data: {
          branchCourseId: course.id,
          updatedBy: actorId,
        },
      });
    }

    // Create faculty notifications.
    for (const faculty of resolvedFacultyRows) {
      const facultyUser = await tx.user.findUnique({
        where: {
          email: faculty.email,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (
        facultyUser &&
        facultyUser.role === "FACULTY"
      ) {
        await tx.notification.create({
          data: {
            kind: "FACULTY_COURSE_ASSIGNED",
            tone: "green",
            title: "Course Assigned",
            message: `${course.name} has been assigned to you.`,
            actionLabel: "View Course",
            targetUserId: facultyUser.id,
            createdBy: actorId,
          },
        });
      }
    }

    return tx.branchCourse.findUnique({
      where: {
        id: course.id,
      },
      include: {
        branchFaculties: {
          select: {
            id: true,
            facultyId: true,
            name: true,
            email: true,
            status: true,
          },
          orderBy: {
            name: "asc",
          },
        },
      },
    });
  });

  // Email after DB transaction succeeds.
  for (const faculty of facultyRows) {
    void sendFacultyCourseAssignmentEmail({
      to: faculty.email,
      fullName: faculty.name,
      facultyId: faculty.facultyId,
      courseName: course.name,
    }).catch((error) => {
      console.warn(
        "Faculty course assignment email failed",
        error,
      );
    });
  }

  return toBranchCourseSummary(result);
}
