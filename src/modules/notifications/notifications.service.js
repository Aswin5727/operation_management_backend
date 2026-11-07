import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { sendFacultyWeekOffApprovalEmail, sendFacultyWeekOffRejectionEmail } from "../../common/services/resendEmail.js";

const NOTIFICATION_KIND_MAP = {
  INSTITUTE_LEAVE: "institute-leave",
  BRANCH_CREATED: "branch-created",
  BRANCH_INVITATION_RESENT: "branch-mail",
  BRANCH_LOGIN: "branch-login",
  BRANCH_FACULTY_LOGIN: "branch-faculty-login",
  SALES_ADMIN_LOGIN: "sales-admin-login",
  FACULTY_COURSE_ASSIGNED: "faculty-course-assigned",
  COURSE_EDIT_REQUEST: "course-edit-request",
  COURSE_EDIT_REQUEST_ACCEPTED: "course-edit-request-accepted",
  COURSE_EDIT_REQUEST_REJECTED: "course-edit-request-rejected",
  COURSE_EDIT_MODULE_UPDATED: "course-edit-module-updated",
  FACULTY_LEAVE_REQUEST: "faculty-leave-request",
  FACULTY_REPORT_SHARED: "faculty-report-shared",
  SEQUENTIAL_COURSE_SCHEDULING_REQUIRED: "sequential-course-scheduling-required",
  STUDENT_DISCOUNT_APPLIED: "student-discount-applied",
  STUDENT_MOTIVATION: "student-motivation",
  STUDENT_DISCONTINUATION: "student-discontinuation",
  SALES_CRM_ADMISSION: "sales-crm-admission",
  SALES_CRM_BATCH_REQUEST: "sales-crm-batch-request",
  SALES_CRM_BATCH_REQUEST_UPDATE: "sales-crm-batch-request-update",
  LEAD_FOLLOW_UP_SCHEDULED: "lead-follow-up-scheduled",
  LEAD_FOLLOW_UP_DUE: "lead-follow-up-due",
  LEAD_FOLLOW_UP_OVERDUE: "lead-follow-up-overdue",
  SALES_CRM_MONTHLY_REPORT: "sales-crm-monthly-report",
  PENDING_STUDENT_ADMISSION_REMINDER: "pending-student-admission-reminder",
};

const BRANCH_ADMIN_VISIBLE_NOTIFICATION_KINDS = new Set([
  "BRANCH_INVITATION_RESENT",
  "BRANCH_LOGIN",
  "BRANCH_FACULTY_LOGIN",
  "SALES_ADMIN_LOGIN",
  "COURSE_EDIT_REQUEST",
  "COURSE_EDIT_MODULE_UPDATED",
  "FACULTY_LEAVE_REQUEST",
  "FACULTY_REPORT_SHARED",
  "SEQUENTIAL_COURSE_SCHEDULING_REQUIRED",
  "FACULTY_SKILL_COMPLETED",
  "FACULTY_SKILL_OVERDUE",
  "STUDENT_MOTIVATION",
  "STUDENT_DISCONTINUATION",
  "SALES_CRM_ADMISSION",
  "SALES_CRM_BATCH_REQUEST",
  "LEAD_FOLLOW_UP_SCHEDULED",
  "LEAD_FOLLOW_UP_DUE",
  "LEAD_FOLLOW_UP_OVERDUE",
]);
const DEFAULT_VISIBLE_NOTIFICATION_KINDS = new Set([
  "BRANCH_INVITATION_RESENT",
  "BRANCH_LOGIN",
]);
const SALES_ADMIN_VISIBLE_NOTIFICATION_KINDS = new Set([
  "LEAD_FOLLOW_UP_DUE",
  "LEAD_FOLLOW_UP_OVERDUE",
  "LEAD_FOLLOW_UP_SCHEDULED",
  "SALES_CRM_MONTHLY_REPORT",
  "PENDING_STUDENT_ADMISSION_REMINDER",
  "SALES_CRM_BATCH_REQUEST_UPDATE",
]);
const SUPER_ADMIN_VISIBLE_NOTIFICATION_KINDS = new Set([
  "BRANCH_CREATED",
  "BRANCH_INVITATION_RESENT",
  "BRANCH_LOGIN",
  "BRANCH_FACULTY_LOGIN",
  "FACULTY_COURSE_ASSIGNED",
  "COURSE_EDIT_REQUEST",
  "COURSE_EDIT_REQUEST_ACCEPTED",
  "COURSE_EDIT_REQUEST_REJECTED",
  "COURSE_EDIT_MODULE_UPDATED",
  "FACULTY_SKILL_ASSIGNED",
  "FACULTY_SKILL_COMPLETED",
  "FACULTY_SKILL_OVERDUE",
  "STUDENT_DISCOUNT_APPLIED",
  "STUDENT_DISCONTINUATION",
  "SALES_CRM_MONTHLY_REPORT",
  "CALL_RECORDING_SHARED",
  "LEAD_DELETED",
]);
const FACULTY_VISIBLE_NOTIFICATION_KINDS = new Set([
  "INSTITUTE_LEAVE",
  "FACULTY_LEAVE_REQUEST",
  "FACULTY_COURSE_ASSIGNED",
  "FACULTY_SKILL_ASSIGNED",
  "COURSE_EDIT_REQUEST_ACCEPTED",
  "COURSE_EDIT_REQUEST_REJECTED",
  "COURSE_EDIT_MODULE_UPDATED",
]);
const BRANCH_ADMIN_SCOPE_CACHE = new Map();
const BRANCH_ADMIN_SCOPE_CACHE_TTL_MS = 60 * 1000;
const LOGIN_SUCCESS_EVENT_TYPE = "LOGIN_SUCCESS";

function resolveBranchIdentity(branch = {}, fallback = {}) {
  const branchId = normalizeString(branch?.id || branch?.branchId || fallback?.id || fallback?.branchId);
  const branchEmail = normalizeEmail(branch?.branchEmail || fallback?.branchEmail);
  const branchName = normalizeString(branch?.branchName || fallback?.branchName);

  return {
    id: branchId,
    branchId,
    branchEmail,
    branchName,
  };
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeNotificationKind(value) {
  const raw = normalizeString(value);
  if (!raw) return "";
  const enumKind = raw.toUpperCase();
  if (Object.prototype.hasOwnProperty.call(NOTIFICATION_KIND_MAP, enumKind)) return enumKind;
  const slugKind = raw.toLowerCase();
  return Object.entries(NOTIFICATION_KIND_MAP).find(([, slug]) => slug === slugKind)?.[0] || enumKind;
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function formatNotificationTime(value) {
  const text = normalizeString(value);
  const match = text.match(/^(\d{1,3})(?::(\d{2}))?$/);
  if (!match) return text;
  const totalMinutes = match[2] ? Number(match[1]) * 60 + Number(match[2]) : Number(match[1]);
  if (totalMinutes < 0 || totalMinutes > 1439) return text;
  const hour = Math.floor(totalMinutes / 60);
  return `${String(hour % 12 || 12).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function normalizeReplacementNotificationMessage(message) {
  return normalizeString(message)
    .replace(/(from\s+)(\d{1,3}(?::\d{2})?)(\s+to\s+)(\d{1,3}(?::\d{2})?)/i, (_match, before, start, between, end) => `${before}${formatNotificationTime(start)}${between}${formatNotificationTime(end)}`)
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_match, year, month, day) => {
      const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
      return Number.isNaN(date.getTime()) ? _match : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
    });
}

function normalizeNotificationRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    kind: NOTIFICATION_KIND_MAP[row.kind] || String(row.kind || "").trim().toLowerCase(),
    tone: normalizeString(row.tone) || "blue",
    title: normalizeString(row.title),
    message: String(row.title || "").toLowerCase().includes("replacement") ? normalizeReplacementNotificationMessage(row.message) : normalizeString(row.message),
    actionLabel: normalizeString(row.actionLabel),
    requestId: normalizeString(row.requestId),
    leaveRequestId: normalizeString(row.leaveRequestId),
    requestStatus: normalizeString(row.requestStatus),
    requestTitle: normalizeString(row.requestTitle),
    requestReason: normalizeString(row.requestReason),
    requestDescription: normalizeString(row.requestDescription),
    branchCourseId: normalizeString(row.branchCourseId),
    branchCourseName: normalizeString(row.branchCourseName),
    moduleId: normalizeString(row.moduleId),
    moduleName: normalizeString(row.moduleName),
    subModuleId: normalizeString(row.subModuleId),
    subModuleName: normalizeString(row.subModuleName),
    facultyId: normalizeString(row.facultyId),
    facultyName: normalizeString(row.facultyName),
    studentId: normalizeString(row.studentId),
    studentName: normalizeString(row.studentName),
    courseName: normalizeString(row.courseName),
    courseProgress: normalizeString(row.courseProgress),
    paidProgress: normalizeString(row.paidProgress),
    dueAmount: normalizeString(row.dueAmount),
    dueDate: normalizeString(row.dueDate),
    targetBranchId: normalizeString(row.targetBranchId),
    targetBranchEmail: normalizeEmail(row.targetBranchEmail),
    targetBranchName: normalizeString(row.targetBranchName),
    timezone: normalizeString(row.timezone) || "Asia/Kolkata",
    targetUserId: normalizeString(
      row.targetUserId,
    ),
    facultySkillAssignmentId: normalizeString(row.facultySkillAssignmentId),
    read: Boolean(row.read),
    readAt: row.readAt || null,
      createdAt: row.createdAt,
  };
}

function buildNotificationData({
  kind,
  tone,
  title,
  message,
  actionLabel,
  branch = {},
  createdBy = null,
  extras = {},
}) {
  return {
    kind,
    tone,
    title,
    message,
    actionLabel,
    targetBranchId: normalizeString(branch.id || branch.branchId),
    targetBranchEmail: normalizeEmail(branch.branchEmail),
    targetBranchName: normalizeString(branch.branchName),
    createdBy: createdBy || null,
    ...extras,
  };
}

async function buildBranchAdminScope(user = {}) {
  const role = normalizeString(user?.role).toUpperCase();
  if (role !== "BRANCH_ADMIN") {
    return {};
  }

  const normalizedEmail = normalizeEmail(user?.email);
  const normalizedUserId = normalizeString(user?.id);
  const cacheKey = `${normalizedUserId}:${normalizedEmail}`;
  const cachedScope = BRANCH_ADMIN_SCOPE_CACHE.get(cacheKey);
  if (cachedScope && cachedScope.expiresAt > Date.now()) {
    return cachedScope.scope;
  }

  const branch = await prisma.branch.findFirst({
    where: {
      OR: [
        ...(normalizedUserId ? [{ adminUserId: normalizedUserId }] : []),
        ...(normalizedEmail
          ? [
              {
                branchEmail: {
                  equals: normalizedEmail,
                  mode: "insensitive",
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      branchId: true,
      branchEmail: true,
      branchName: true,
      roleAccess: true,
    },
  });

  if (!branch) {
    const fallbackScope = normalizedEmail
      ? { targetBranchEmail: normalizedEmail }
      : {};

    BRANCH_ADMIN_SCOPE_CACHE.set(cacheKey, {
      scope: fallbackScope,
      expiresAt: Date.now() + BRANCH_ADMIN_SCOPE_CACHE_TTL_MS,
    });

    return fallbackScope;
  }

  user.roleAccess = branch.roleAccess || "BRANCH_ADMIN_ONLY";

  // Branch ID is the canonical tenant boundary. Older notifications may not
  // have email/name populated, so requiring all three fields hides valid rows.
  // Keep email as a fallback only when the branch record cannot be resolved.
  const scope = branch.id
    ? { targetBranchId: normalizeString(branch.id) }
    : {
        targetBranchId: normalizeString(branch.branchId),
        targetBranchEmail: normalizeEmail(branch.branchEmail),
      };

  BRANCH_ADMIN_SCOPE_CACHE.set(cacheKey, {
    scope,
    expiresAt: Date.now() + BRANCH_ADMIN_SCOPE_CACHE_TTL_MS,
  });

  return scope;
}

const BRANCH_ADMIN_FOLLOW_UP_KINDS = [
  "LEAD_FOLLOW_UP_SCHEDULED",
  "LEAD_FOLLOW_UP_DUE",
  "LEAD_FOLLOW_UP_OVERDUE",
];
const BRANCH_ADMIN_FOLLOW_UP_MARKER_PREFIXES = [
  "LEAD_FOLLOW_UP_SCHEDULED:",
  "LEAD_FOLLOW_UP_REMINDER:",
  "LEAD_FOLLOW_UP_DAILY:",
  "LEAD_FOLLOW_UP_OVERDUE:",
];

async function buildBranchAdminFollowUpOwnershipFilter(user = {}, branchScope = {}) {
  if (normalizeString(user?.role).toUpperCase() !== "BRANCH_ADMIN" || !user?.id || !branchScope?.targetBranchId) return {};

  const salesAdminLeads = await prisma.lead.findMany({
    where: {
      branchId: branchScope.targetBranchId,
      deletedAt: null,
      assignedTo: { is: { role: "SALES_ADMIN" } },
    },
    select: { id: true },
  });
  if (!salesAdminLeads.length) return {};

  const staleRows = salesAdminLeads.flatMap(({ id }) => BRANCH_ADMIN_FOLLOW_UP_MARKER_PREFIXES.map((prefix) => ({
    kind: { in: BRANCH_ADMIN_FOLLOW_UP_KINDS },
    requestDescription: { startsWith: prefix + id + ":" },
  })));
  return staleRows.length ? { NOT: { OR: staleRows } } : {};
}
function getVisibleNotificationKindsForRole(user = {}) {
  const role = normalizeString(user?.role).toUpperCase();
  if (role === "SUPER_ADMIN") {
    return SUPER_ADMIN_VISIBLE_NOTIFICATION_KINDS;
  }

  if (role === "BRANCH_ADMIN") {
    if (user?.roleAccess === "BRANCH_ADMIN_SALES_ADMIN") {
      return new Set([
        ...BRANCH_ADMIN_VISIBLE_NOTIFICATION_KINDS,
        ...SALES_ADMIN_VISIBLE_NOTIFICATION_KINDS,
      ]);
    }
    return BRANCH_ADMIN_VISIBLE_NOTIFICATION_KINDS;
  }

  if (role === "STUDENT") return new Set(["INSTITUTE_LEAVE", "EXAM_SCHEDULED", "EXAM_RETEST_ASSIGNED", "ASSESSMENT_AVAILABLE", "ASSESSMENT_REASSESSMENT_ASSIGNED", "ACADEMIC_TEST_CREATED", "SEQUENTIAL_COURSE_SCHEDULING_REQUIRED", "STUDENT_DISCONTINUATION"]);

  if (role === "FACULTY") {
    return FACULTY_VISIBLE_NOTIFICATION_KINDS;
  }

  if (role === "SALES_ADMIN") {
    return SALES_ADMIN_VISIBLE_NOTIFICATION_KINDS;
  }

  return DEFAULT_VISIBLE_NOTIFICATION_KINDS;
}

export function buildNotificationWhere({
  user = {},
  branchScope = {},
  visibleKinds = DEFAULT_VISIBLE_NOTIFICATION_KINDS,
  unreadOnly = false,
  kind = "",
} = {}) {
  const role = normalizeString(user?.role).toUpperCase();
  const isFaculty = ["FACULTY", "STUDENT"].includes(role);
  const normalizedKind = normalizeNotificationKind(kind);
  const isSuperAdmin = normalizeString(user?.role).toUpperCase() === "SUPER_ADMIN";
  const superAdminDiscontinuationScope = isSuperAdmin
    ? {
        OR: [
          { kind: { not: "STUDENT_DISCONTINUATION" } },
          {
            kind: "STUDENT_DISCONTINUATION",
            requestDescription: { startsWith: "DISCONTINUATION_SUPER_REVIEW:" },
          },
        ],
      }
    : {};

  if (isFaculty) {
    return {
      targetUserId: user.id,
      ...(normalizedKind
        ? { kind: normalizedKind }
        : {
            kind: {
              in: Array.from(visibleKinds),
            },
          }),
      ...(unreadOnly ? { read: false } : {}),
    };
  }

  if (role === "SALES_ADMIN") {
    return {
      targetUserId: user.id,
      ...(normalizedKind ? { kind: normalizedKind } : { kind: { in: Array.from(visibleKinds) } }),
      ...(unreadOnly ? { read: false } : {}),
    };
  }

  if (role === "BRANCH_ADMIN") {
    const followUpKinds = new Set(["LEAD_FOLLOW_UP_SCHEDULED", "LEAD_FOLLOW_UP_DUE", "LEAD_FOLLOW_UP_OVERDUE"]);
    const branchOnlyKinds = Array.from(visibleKinds).filter((value) => !followUpKinds.has(value));
    const recipientScopes = [
      ...(Object.keys(branchScope).length ? [branchScope] : []),
      ...(user?.id ? [{ targetUserId: user.id }] : []),
    ];
    const recipientScope = recipientScopes.length > 1
      ? { OR: recipientScopes }
      : recipientScopes[0] || { targetUserId: "__unresolved_branch_admin__" };
    const ownUserScope = user?.id ? { targetUserId: user.id } : { targetUserId: "__unresolved_branch_admin__" };

    // Follow-up reminders belong to the assigned lead user only.
    if (normalizedKind && followUpKinds.has(normalizedKind)) {
      return {
        ...ownUserScope,
        kind: normalizedKind,
        ...(unreadOnly ? { read: false } : {}),
      };
    }

    if (user?.roleAccess === "BRANCH_ADMIN_SALES_ADMIN") {
      const salesKinds = Array.from(SALES_ADMIN_VISIBLE_NOTIFICATION_KINDS);
      const branchKinds = Array.from(BRANCH_ADMIN_VISIBLE_NOTIFICATION_KINDS);
      const branchKindsWithoutFollowUps = branchKinds.filter((value) => !followUpKinds.has(value));
      const ownKinds = [...new Set([...branchKinds, ...salesKinds])];
      const scope = normalizedKind
        ? (salesKinds.includes(normalizedKind) ? ownUserScope : recipientScope)
        : {
            OR: [
              ...(Object.keys(branchScope).length && branchKindsWithoutFollowUps.length
                ? [{ ...branchScope, kind: { in: branchKindsWithoutFollowUps } }]
                : []),
              ...(user?.id ? [{ targetUserId: user.id, kind: { in: ownKinds } }] : []),
            ],
          };

      return {
        ...scope,
        ...(!normalizedKind
          ? {
              NOT: {
                kind: "COURSE_EDIT_MODULE_UPDATED",
                message: {
                  contains: "module progress",
                  mode: "insensitive",
                },
              },
            }
          : {}),
        ...(unreadOnly ? { read: false } : {}),
        ...(normalizedKind ? { kind: normalizedKind } : {}),
      };
    }

    const scope = !normalizedKind && Array.from(visibleKinds).some((value) => followUpKinds.has(value))
      ? {
          OR: [
            ...(Object.keys(branchScope).length && branchOnlyKinds.length
              ? [{ ...branchScope, kind: { in: branchOnlyKinds } }]
              : []),
            ...(user?.id ? [{ targetUserId: user.id, kind: { in: Array.from(visibleKinds) } }] : []),
          ],
        }
      : recipientScope;

    return {
      ...scope,
      ...(!normalizedKind
        ? {
            NOT: {
              kind: "COURSE_EDIT_MODULE_UPDATED",
              message: {
                contains: "module progress",
                mode: "insensitive",
              },
            },
          }
        : {}),
      ...(unreadOnly ? { read: false } : {}),
      ...(normalizedKind
        ? { kind: normalizedKind }
        : { kind: { in: Array.from(visibleKinds) } }),
    };
  }

  if (Object.keys(branchScope).length > 0) {
    return {
      OR: [
        branchScope,
        ...(user?.id ? [{ targetUserId: user.id }] : []),
      ],
      ...(normalizeString(user?.role).toUpperCase() === "BRANCH_ADMIN" && !normalizedKind
        ? {
            NOT: {
              kind: "COURSE_EDIT_MODULE_UPDATED",
              message: {
                contains: "module progress",
                mode: "insensitive",
              },
            },
          }
        : {}),
      ...(unreadOnly ? { read: false } : {}),
      ...(normalizedKind
        ? { kind: normalizedKind }
        : {
            kind: {
              in: Array.from(visibleKinds),
            },
          }),
    };
  }

  return {
    ...(unreadOnly ? { read: false } : {}),
    ...(normalizedKind
      ? { kind: normalizedKind }
      : {
          kind: {
            in: Array.from(visibleKinds),
          },
        }),
    ...superAdminDiscontinuationScope,
  };
}

function normalizeDateKey(value, label) {
  const dateKey = normalizeString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new AppError(`${label} must use YYYY-MM-DD format`, 400);
  }
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== dateKey) {
    throw new AppError(`${label} is not a valid calendar date`, 400);
  }
  return dateKey;
}

function shiftDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateKeyInTimezone(value, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function localMidnightToUtc(dateKey, timeZone) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const assumedUtc = Date.UTC(year, month - 1, day);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(assumedUtc)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  const localAtAssumedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour === 24 ? 0 : parts.hour, parts.minute, parts.second);
  return new Date(assumedUtc - (localAtAssumedUtc - assumedUtc));
}

function combineNotificationWhere(...conditions) {
  const parts = conditions.filter((condition) => condition && Object.keys(condition).length);
  return parts.length > 1 ? { AND: parts } : parts[0] || {};
}

async function getSalesAdminDateFilter(query, user) {
  const preset = normalizeString(query.datePreset).toLowerCase();
  const fromValue = normalizeString(query.fromDate);
  const toValue = normalizeString(query.toDate);
  if (!preset && !fromValue && !toValue) return null;

  let fromDate = "";
  let toDate = "";
  const links = await prisma.salesAdminBranch.findMany({
    where: { salesAdminId: user.id },
    select: { branchId: true, branch: { select: { timezone: true } } },
  });
  const timeZones = new Map();
  for (const link of links) {
    const zone = normalizeString(link.branch?.timezone) || "Asia/Kolkata";
    const branchIds = timeZones.get(zone) || [];
    branchIds.push(link.branchId);
    timeZones.set(zone, branchIds);
  }
  if (!timeZones.size) timeZones.set("Asia/Kolkata", []);

  let customRange = false;
  let customFromDate = "";
  let customToDate = "";
  if (preset === "custom" || fromValue || toValue) {
    if (!fromValue || !toValue) throw new AppError("Choose both From Date and To Date", 400);
    customFromDate = normalizeDateKey(fromValue, "From Date");
    customToDate = normalizeDateKey(toValue, "To Date");
    if (customFromDate > customToDate) throw new AppError("From Date cannot be later than To Date", 400);
    customRange = true;
  } else if (!["today", "yesterday", "last7days", "thismonth"].includes(preset)) {
    throw new AppError("Date preset is invalid", 400);
  }

  const clauses = [];
  for (const [timeZone, branchIds] of timeZones) {
    let fromDate = customFromDate;
    let toDate = customToDate;
    if (!customRange) {
      const today = dateKeyInTimezone(new Date(), timeZone);
      if (preset === "today") fromDate = toDate = today;
      else if (preset === "yesterday") fromDate = toDate = shiftDateKey(today, -1);
      else if (preset === "last7days") { fromDate = shiftDateKey(today, -6); toDate = today; }
      else { fromDate = `${today.slice(0, 7)}-01`; toDate = today; }
    }
    const createdAt = {
      gte: localMidnightToUtc(fromDate, timeZone),
      lt: localMidnightToUtc(shiftDateKey(toDate, 1), timeZone),
    };
    clauses.push(branchIds.length
      ? { targetBranchId: { in: branchIds }, createdAt }
      : { targetBranchId: null, createdAt });
  }
  if (Array.from(timeZones.values()).some((branchIds) => branchIds.length > 0)) {
    const fallbackZone = links[0]?.branch?.timezone || "Asia/Kolkata";
    const today = dateKeyInTimezone(new Date(), fallbackZone);
    let fallbackFrom = customFromDate;
    let fallbackTo = customToDate;
    if (!customRange) {
      if (preset === "today") fallbackFrom = fallbackTo = today;
      else if (preset === "yesterday") fallbackFrom = fallbackTo = shiftDateKey(today, -1);
      else if (preset === "last7days") { fallbackFrom = shiftDateKey(today, -6); fallbackTo = today; }
      else { fallbackFrom = `${today.slice(0, 7)}-01`; fallbackTo = today; }
    }
    clauses.push({ targetBranchId: null, createdAt: { gte: localMidnightToUtc(fallbackFrom, fallbackZone), lt: localMidnightToUtc(shiftDateKey(fallbackTo, 1), fallbackZone) } });
  }
  return { OR: clauses };
}

async function normalizeRowsWithTimezones(rows) {
  const branchIds = [...new Set(rows.map((row) => normalizeString(row.targetBranchId)).filter(Boolean))];
  const branches = branchIds.length
    ? await prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, timezone: true } })
    : [];
  const timezoneByBranch = new Map(branches.map((branch) => [branch.id, branch.timezone || "Asia/Kolkata"]));
  return rows.map((row) => normalizeNotificationRow({
    ...row,
    timezone: timezoneByBranch.get(row.targetBranchId) || "Asia/Kolkata",
  })).filter(Boolean);
}

function buildSyntheticBranchNotificationId(prefix, sourceId) {
  return `synthetic-${prefix}-${String(sourceId || "").trim()}`
}

function normalizeEmailList(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeEmail(value))
        .filter(Boolean),
    ),
  )
}

async function buildFallbackBranchNotifications(user = {}, branchScope = {}) {
  const role = normalizeString(user?.role).toUpperCase();
  if (role !== "BRANCH_ADMIN") {
    return [];
  }

  const branch = await prisma.branch.findFirst({
    where: {
      OR: [
        ...(branchScope.targetBranchId ? [{ id: branchScope.targetBranchId }] : []),
        ...(branchScope.targetBranchEmail
          ? [
              {
                branchEmail: {
                  equals: branchScope.targetBranchEmail,
                  mode: "insensitive",
                },
              },
            ]
          : []),
        ...(user?.id ? [{ adminUserId: user.id }] : []),
      ],
    },
    select: {
      id: true,
      branchId: true,
      branchName: true,
      branchAdminName: true,
      branchEmail: true,
    },
  });

  if (!branch) {
    return [];
  }

  const branchFacultyRows = await prisma.branchFaculty.findMany({
    where: {
      branchId: branch.id,
      status: "ACTIVE",
    },
    select: {
      facultyId: true,
      name: true,
      email: true,
    },
  });

  const facultyEmails = normalizeEmailList(branchFacultyRows.map((row) => row.email));
  const branchAdminEmail = normalizeEmail(user?.email || branch.branchEmail);

  if (!facultyEmails.length && !branchAdminEmail) {
    return [];
  }

  const loginEvents = await prisma.loginEvent.findMany({
    where: {
      success: true,
      eventType: LOGIN_SUCCESS_EVENT_TYPE,
      user: {
        OR: [
          ...(branchAdminEmail
            ? [
                {
                  email: {
                    equals: branchAdminEmail,
                    mode: "insensitive",
                  },
                },
              ]
            : []),
          ...(facultyEmails.length
            ? [
                {
                  email: {
                    in: facultyEmails,
                    mode: "insensitive",
                  },
                },
              ]
            : []),
        ],
      },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          userCode: true,
        },
      },
    },
  });

  const earliestEventByUserId = new Map();
  for (const event of loginEvents) {
    if (!event?.user?.id) continue;
    if (!earliestEventByUserId.has(event.user.id)) {
      earliestEventByUserId.set(event.user.id, event);
    }
  }

  const fallbackNotifications = [];
  const branchAdminEvent = Array.from(earliestEventByUserId.values()).find(
    (event) => String(event?.user?.role || "").toUpperCase() === "BRANCH_ADMIN",
  );

  if (branchAdminEvent) {
    fallbackNotifications.push({
      id: buildSyntheticBranchNotificationId("branch-login", branchAdminEvent.id),
      kind: "branch-login",
      tone: "green",
      title: `${branch.branchName || branch.branchId || "Branch"} is active`,
      message: `${branchAdminEvent.user.fullName || branch.branchAdminName || "Branch admin"} logged in with ${branchAdminEvent.user.email || branch.branchEmail || "their branch account"}.`,
      actionLabel: "Logged in",
      targetBranchId: branch.id,
      targetBranchEmail: branch.branchEmail,
      targetBranchName: branch.branchName,
      read: false,
      createdAt: branchAdminEvent.createdAt,
    });
  }

  for (const [index, row] of branchFacultyRows.entries()) {
    const matchedEvent = Array.from(earliestEventByUserId.values()).find(
      (event) => normalizeEmail(event?.user?.email) === normalizeEmail(row.email),
    );

    if (!matchedEvent) continue;

    fallbackNotifications.push({
      id: buildSyntheticBranchNotificationId("branch-faculty-login", matchedEvent.id),
      kind: "branch-faculty-login",
      tone: "blue",
      title: `Faculty ${row.name || matchedEvent.user.fullName || row.email || "Faculty"} logged in`,
      message: `Faculty ${row.name || matchedEvent.user.fullName || "Faculty"} logged in to ${branch.branchName || branch.branchId || "your branch"}.`,
      actionLabel: "Faculty login",
      targetBranchId: branch.id,
      targetBranchEmail: branch.branchEmail,
      targetBranchName: branch.branchName,
      facultyId: row.facultyId || matchedEvent.user.userCode || "",
      facultyEmail: row.email || matchedEvent.user.email || "",
      facultyName: row.name || matchedEvent.user.fullName || "",
      read: false,
      createdAt: matchedEvent.createdAt,
      _fallbackIndex: index,
    });
  }

  return fallbackNotifications.sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export async function createNotification(data, prismaClient = prisma) {
  // Notification.requestId is a foreign key for CourseEditRequest only.
  // Other workflows (such as temporary week-off requests) use the same
  // notification payload shape but have their own request table.
  const safeData = { ...data };
  if (safeData.kind === "FACULTY_SKILL_ASSIGNED") safeData.message = String(safeData.message || "").replace(/\.(?=\s*(?:\n|$))/g, "");
  if (safeData.requestId) {
    const linkedRequest = await prismaClient.courseEditRequest.findUnique({
      where: { id: safeData.requestId },
      select: { id: true },
    });
    if (!linkedRequest) safeData.requestId = null;
  }
  if (["Week-Off Request Approved", "Week-Off Request Rejected"].includes(data?.title) && data?.requestId && data?.targetUserId) {
    const weekOffRequest = await prismaClient.facultyWeekOffRequest.findUnique({ where: { id: data.requestId } });
    const recipient = await prismaClient.user.findUnique({ where: { id: data.targetUserId }, select: { email: true, fullName: true } });
    if (weekOffRequest?.facultyEmail || recipient?.email) {
      const emailPayload = {
        to: weekOffRequest?.facultyEmail || recipient.email,
        fullName: weekOffRequest?.facultyName || recipient.fullName,
        requestedWeekStartDate: weekOffRequest?.requestedWeekStartDate,
        requestedWeekEndDate: weekOffRequest?.requestedWeekEndDate,
        requestedWeekOffDay: weekOffRequest?.requestedWeekOffDay,
        requestedWeekOffDate: weekOffRequest?.requestedWeekOffDate,
      };
      const emailPromise = data.title === "Week-Off Request Approved"
        ? sendFacultyWeekOffApprovalEmail({ ...emailPayload, defaultWeekOffDay: weekOffRequest?.defaultWeekOffDay, defaultWeekOffDate: weekOffRequest?.defaultWeekOffDate })
        : sendFacultyWeekOffRejectionEmail({ ...emailPayload, rejectionReason: data.requestReason });
      void emailPromise.catch((error) => console.warn(`Faculty week-off ${data.title === "Week-Off Request Approved" ? "approval" : "rejection"} email failed`, error?.message || error));
    }
  }
  const record = await prismaClient.notification.create({
    data: safeData,
  });

  return normalizeNotificationRow(record);
}

async function findCourseEditNotification(prismaClient, kind, requestId) {
  if (!requestId || !prismaClient?.notification?.findFirst) return null;

  const existing = await prismaClient.notification.findFirst({
    where: { kind, requestId },
    orderBy: { createdAt: "desc" },
  });

  return existing ? normalizeNotificationRow(existing) : null;
}

export async function createBranchCreatedNotification(branch = {}, actor = {}) {
  return createNotification(
    buildNotificationData({
      kind: "BRANCH_CREATED",
      tone: "blue",
      title: `${branch.branchName || branch.branchId || "Branch"} created`,
      message: `Invitation sent to ${branch.branchEmail || "the registered email address"}.`,
      actionLabel: "Created",
      branch,
      createdBy: actor?.userId || actor?.id || null,
    }),
  );
}

export async function createBranchInvitationResentNotification(branch = {}, actor = {}) {
  return createNotification(
    buildNotificationData({
      kind: "BRANCH_INVITATION_RESENT",
      tone: "amber",
      title: `Invitation active for ${branch.branchName || branch.branchId || "Branch"}`,
      message: `Branch invitation is now active for ${branch.branchEmail || "the registered email address"}.`,
      actionLabel: "Mail sent",
      branch,
      createdBy: actor?.userId || actor?.id || null,
    }),
  );
}

export async function createBranchLoginNotification(branch = {}, actor = {}) {
  return createNotification(
    buildNotificationData({
      kind: "BRANCH_LOGIN",
      tone: "green",
      title: `${branch.branchName || branch.branchId || "Branch"} is active`,
      message: `${branch.branchAdminName || branch.fullName || "Branch admin"} logged in with ${branch.branchEmail || "their branch account"}.`,
      actionLabel: "Logged in",
      branch,
      createdBy: actor?.userId || actor?.id || null,
    }),
  );
}

export async function createBranchFacultyLoginNotification(branch = {}, faculty = {}, actor = {}) {
  const facultyLabel = faculty?.name || faculty?.fullName || "Faculty";
  return createNotification(
    buildNotificationData({
      kind: "BRANCH_FACULTY_LOGIN",
      tone: "blue",
      title: `Faculty ${facultyLabel} logged in`,
      message: `Faculty ${facultyLabel} logged in to ${branch?.branchName || branch?.branchId || "your branch"}.`,
      actionLabel: "Faculty login",
      branch,
      createdBy: actor?.userId || actor?.id || null,
    }),
  );
}

export async function createCourseEditRequestNotification({
  request = {},
  branchCourse = {},
  faculty = {},
  actor = {},
  prismaClient = prisma,
}) {
  const existing = await findCourseEditNotification(
    prismaClient,
    "COURSE_EDIT_REQUEST",
    request?.id,
  );
  if (existing) return existing;

  const branch = resolveBranchIdentity(branchCourse?.branch || {}, {
    id: request?.branchId || branchCourse?.branchId || "",
    branchId: request?.branchId || branchCourse?.branchId || "",
  });

  return createNotification(
    buildNotificationData({
      kind: "COURSE_EDIT_REQUEST",
      tone: "amber",
      title: "Edit Request Received",
      message: `Faculty has requested permission to edit modules and sub-modules of ${branchCourse?.name || "the course"}.`,
      actionLabel: "Review request",
      branch,
      createdBy: actor?.userId || actor?.id || null,
      extras: {
        requestId: request?.id || null,
        requestStatus: request?.status || "PENDING",
        requestTitle: request?.title || "",
        requestReason: request?.reason || "",
        requestDescription: request?.description || "",
        branchCourseId: branchCourse?.id || "",
        branchCourseName: branchCourse?.name || "",
        facultyId: faculty?.facultyId || faculty?.id || "",
        facultyName: faculty?.facultyName || faculty?.name || "",
      },
    }),
    prismaClient,
  );
}

export async function createCourseEditRequestAcceptedNotification({
  request = {},
  branchCourse = {},
  faculty = {},
  actor = {},
  prismaClient = prisma,
}) {
  const branch = resolveBranchIdentity(branchCourse?.branch || {}, {
    id: request?.branchId || branchCourse?.branchId || "",
    branchId: request?.branchId || branchCourse?.branchId || "",
  });

  return createNotification(
    buildNotificationData({
      kind: "COURSE_EDIT_REQUEST_ACCEPTED",
      tone: "green",
      title: "Edit Request Approved",
      message: `You can now edit the Modules and Sub Modules of ${branchCourse?.name || "the course"}.`,
      actionLabel: "Open Edit",
      branch,
      createdBy: actor?.userId || actor?.id || null,
      extras: {
        targetUserId: faculty?.userId || faculty?.id || null,
        requestId: request?.id || null,
        requestStatus: request?.status || "ACCEPTED",
        requestTitle: request?.title || "",
        requestReason: request?.reason || "",
        requestDescription: request?.description || "",
        branchCourseId: branchCourse?.id || "",
        branchCourseName: branchCourse?.name || "",
        facultyId: faculty?.facultyId || faculty?.id || "",
        facultyName: faculty?.facultyName || faculty?.name || "",
      },
    }),
    prismaClient,
  );
}

export async function createCourseEditRequestRejectedNotification({
  request = {},
  branchCourse = {},
  faculty = {},
  actor = {},
  responseNote = "",
  prismaClient = prisma,
}) {
  const branch = resolveBranchIdentity(branchCourse?.branch || {}, {
    id: request?.branchId || branchCourse?.branchId || "",
    branchId: request?.branchId || branchCourse?.branchId || "",
  });

  return createNotification(
    buildNotificationData({
      kind: "COURSE_EDIT_REQUEST_REJECTED",
      tone: "red",
      title: "Edit Request Rejected",
      message: responseNote || `Your request to edit ${branchCourse?.name || "the course"} was rejected.`,
      actionLabel: "View status",
      branch,
      createdBy: actor?.userId || actor?.id || null,
      extras: {
        targetUserId: faculty?.userId || faculty?.id || null,
        requestId: request?.id || null,
        requestStatus: request?.status || "REJECTED",
        requestTitle: request?.title || "",
        requestReason: request?.reason || "",
        requestDescription: request?.description || "",
        branchCourseId: branchCourse?.id || "",
        branchCourseName: branchCourse?.name || "",
        facultyId: faculty?.facultyId || faculty?.id || "",
        facultyName: faculty?.facultyName || faculty?.name || "",
      },
    }),
    prismaClient,
  );
}

export async function createCourseEditModuleUpdatedNotification({
  request = {},
  branch: branchContext = {},
  branchCourse = {},
  faculty = {},
  module = {},
  subModule = {},
  actor = {},
  updatedFields = [],
  prismaClient = prisma,
}) {
  const existing = await findCourseEditNotification(
    prismaClient,
    "COURSE_EDIT_MODULE_UPDATED",
    request?.id,
  );
  if (existing) return existing;

  const moduleLabel = module?.title || "a module";
  const facultyLabel = faculty?.facultyName || faculty?.name || request?.facultyName || actor?.fullName || "Faculty";
  const courseLabel = branchCourse?.name || "the course";
  const normalizedFields = Array.isArray(updatedFields) ? updatedFields.filter(Boolean) : [];
  const hasSubModuleAdded = normalizedFields.includes("sub-module added");
  const hasSubModuleRemoved = normalizedFields.includes("sub-module removed");
  const changeLine = hasSubModuleAdded && subModule?.title
    ? `Added: Sub-module - ${subModule.title}`
    : hasSubModuleRemoved && subModule?.title
      ? `Removed: Sub-module - ${subModule.title}`
      : normalizedFields.length
        ? `Updated: ${normalizedFields.join(", ")}`
        : "Updated: Course module content";
  const notificationMessage = [
    `Faculty Name: ${facultyLabel}`,
    `Course Name: ${courseLabel}`,
    `Module Name: ${moduleLabel}`,
    changeLine,
  ].join("\n");
  const branchReference = request?.branchId || branchCourse?.branchId || "";
  let persistedBranch = branchCourse?.branch || branchContext || null;

  // The module-only course update returns a lean course record without its
  // branch relation. Resolve it here so the notification is fully scoped and
  // remains visible to the correct branch admin.
  if (!persistedBranch && branchReference && prismaClient?.branch?.findFirst) {
    persistedBranch = await prismaClient.branch.findFirst({
      where: {
        OR: [{ id: branchReference }, { branchId: branchReference }],
      },
      select: {
        id: true,
        branchId: true,
        branchName: true,
        branchEmail: true,
      },
    });
  }

  const branch = resolveBranchIdentity(persistedBranch || {}, {
    id: branchReference,
    branchId: branchReference,
  });

  return createNotification(
    buildNotificationData({
      kind: "COURSE_EDIT_MODULE_UPDATED",
      tone: "blue",
      title: "Course Module Updated",
      message: notificationMessage,
      actionLabel: "View update",
      branch,
      createdBy: actor?.userId || actor?.id || null,
      extras: {
        requestId: request?.id || null,
        requestStatus: request?.status || "COMPLETED",
        requestTitle: request?.title || "",
        requestReason: request?.reason || "",
        requestDescription: request?.description || "",
        branchCourseId: branchCourse?.id || "",
        branchCourseName: branchCourse?.name || "",
        moduleId: module?.id || "",
        moduleName: module?.title || "",
        subModuleId: subModule?.id || "",
        subModuleName: subModule?.title || "",
        facultyId: faculty?.facultyId || faculty?.id || "",
        facultyName: faculty?.facultyName || faculty?.name || "",
      },
    }),
    prismaClient,
  );
}

export async function createFacultyLeaveRequestNotification({ request = {}, branch = {}, faculty = {}, actor = {}, prismaClient = prisma }) {
  return createNotification(buildNotificationData({
    kind: "FACULTY_LEAVE_REQUEST",
    tone: "amber",
    title: "Faculty Leave Request",
    message: `${faculty?.name || request?.facultyName || "Faculty"} submitted a ${String(request?.durationType || "").toLowerCase().replaceAll("_", " ")} request for ${request?.fromDate || "selected dates"}.`,
    actionLabel: "View Request",
    branch,
    createdBy: actor?.userId || actor?.id || null,
    extras: {
      leaveRequestId: request?.id || null,
      facultyId: faculty?.facultyId || request?.facultyId || "",
      facultyName: faculty?.name || request?.facultyName || "",
      requestStatus: request?.status || "PENDING",
      requestReason: request?.reason || "",
      requestDescription: request?.durationType || "",
      // Target the branch admin account directly as well as the branch scope.
      // This prevents a valid leave request from being hidden when an older
      // branch notification has incomplete scope metadata.
      targetUserId: branch?.adminUserId || null,
    },
  }), prismaClient);
}

export async function createFacultyLeaveRequestChangeNotification({ request = {}, branch = {}, faculty = {}, action = "edited", changes = [], prismaClient = prisma }) {
  const edited = action === "edited";
  const title = edited ? "Faculty Leave Request Edited" : "Faculty Leave Request Cancelled";
  const facultyName = faculty?.name || request?.facultyName || "Faculty";
  const changedSentences = changes.map((change) => {
    const separatorIndex = change.indexOf(" changed: ");
    if (separatorIndex < 0) return `The requested ${change.replace(/ changed$/, "")} has been changed.`;
    const field = change.slice(0, separatorIndex);
    const values = change.slice(separatorIndex + " changed: ".length).split(" â†’ ");
    return `The requested ${field} has been changed from ${values[0] || "-"} to ${values[1] || "-"}.`;
  });
  const dateLabel = `${request?.fromDate || "-"}${request?.fromDate !== request?.toDate ? ` - ${request?.toDate || "-"}` : ""}`;
  return createNotification(buildNotificationData({
    kind: "FACULTY_LEAVE_REQUEST",
    tone: edited ? "blue" : "slate",
    title,
    message: edited ? `${facultyName} has edited their leave request. ${changedSentences.join(" ") || "The requested details have been changed."}` : `${facultyName} has cancelled their leave request, scheduled for ${dateLabel}.`,
    actionLabel: "View Request",
    branch,
    extras: {
      leaveRequestId: request?.id || null,
      facultyId: faculty?.facultyId || request?.facultyId || "",
      facultyName,
      requestStatus: request?.status || (edited ? "PENDING" : "CANCELLED"),
      requestReason: request?.reason || "",
      requestDescription: edited ? changedSentences.join(" ") : `${facultyName} has cancelled their leave request, scheduled for ${dateLabel}.`,
    },
  }), prismaClient);
}

function academicScheduleEndDate(schedule = {}) {
  const date = normalizeString(schedule.testDate);
  const match = normalizeString(schedule.endTime).toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!date || !match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (match[3] === "PM" && hour < 12) hour += 12;
  if (match[3] === "AM" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;

  const parsed = new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function ensureFacultyAcademicTestCompletionNotifications(user = {}) {
  const facultyIds = [user?.id, user?.userCode].map(normalizeString).filter(Boolean);
  if (!facultyIds.length || !prisma?.academicScheduledTest?.findMany) return;

  const schedules = await prisma.academicScheduledTest.findMany({
    where: {
      facultyId: { in: facultyIds },
      status: { not: "CANCELLED" },
    },
    orderBy: { endTime: "asc" },
  });
  const completedSchedules = schedules.filter((schedule) => {
    const end = academicScheduleEndDate(schedule);
    return end && end.getTime() <= Date.now();
  });
  if (!completedSchedules.length) return;

  const courseIds = [...new Set(completedSchedules.map((schedule) => schedule.branchCourseId).filter(Boolean))];
  const courses = courseIds.length
    ? await prisma.branchCourse.findMany({ where: { id: { in: courseIds } }, select: { id: true, name: true } })
    : [];
  const courseNames = new Map(courses.map((course) => [course.id, course.name]));

  for (const schedule of completedSchedules) {
    const existing = await prisma.notification.findFirst({
      where: {
        kind: "FACULTY_REPORT_SHARED",
        academicTestId: schedule.id,
        targetUserId: user.id,
      },
      select: { id: true },
    });
    if (existing) continue;

    const courseName = courseNames.get(schedule.branchCourseId) || "the course";
    await createNotification({
      kind: "FACULTY_REPORT_SHARED",
      tone: "green",
      title: "Academic Test Completed",
      message: `Test ${schedule.testNumber} for ${courseName} has ended. Student results are now available to view.`,
      actionLabel: "View Result",
      targetUserId: user.id,
      academicTestId: schedule.id,
      branchCourseId: schedule.branchCourseId,
      branchCourseName: courseName,
      batchId: schedule.branchBatchId,
      facultyId: schedule.facultyId,
      createdBy: user.id,
    });
  }
}

async function ensureSequentialCourseSchedulingNotifications(user = {}) {
  const role = normalizeString(user?.role).toUpperCase();
  if (!["BRANCH_ADMIN", "STUDENT"].includes(role)) return;

  const branchScope = role === "BRANCH_ADMIN" ? await buildBranchAdminScope(user) : {};
  let branchRecord = null;
  let branchLookupIds = [];
  let students = [];
  if (role === "BRANCH_ADMIN") {
    const scopedBranchId = normalizeString(branchScope.targetBranchId);
    if (!scopedBranchId) return;
    branchRecord = await prisma.branch.findFirst({
      where: { OR: [{ id: scopedBranchId }, { branchId: scopedBranchId }] },
      select: { id: true, branchId: true },
    });
    branchLookupIds = [...new Set([branchRecord?.id, branchRecord?.branchId, scopedBranchId].map(normalizeString).filter(Boolean))];
    if (!branchLookupIds.length) return;
    students = await prisma.branchStudent.findMany({
      where: { branchId: { in: branchLookupIds }, arrangementType: "SEQUENTIAL", recordStatus: "ACTIVE" },
      include: {
        branch: { select: { id: true, branchId: true, branchName: true, branchEmail: true, adminUserId: true, timezone: true } },
        courseEnrollments: { orderBy: { sequenceOrder: "asc" } },
      },
    });
  } else {
    const email = normalizeEmail(user?.email);
    if (!email) return;
    const student = await prisma.branchStudent.findFirst({
      where: { emailAddress: { equals: email, mode: "insensitive" }, arrangementType: "SEQUENTIAL", recordStatus: "ACTIVE" },
      include: {
        branch: { select: { id: true, branchId: true, branchName: true, branchEmail: true, adminUserId: true, timezone: true } },
        courseEnrollments: { orderBy: { sequenceOrder: "asc" } },
      },
    });
    if (student) students = [student];
  }

  for (const student of students) {
    const enrollments = Array.isArray(student.courseEnrollments) ? student.courseEnrollments : [];
    const firstCourse = enrollments.find((enrollment) => Number(enrollment.sequenceOrder) === 1);
    if (!firstCourse) continue;
    // Notify only for the next pending course whose full sequence of earlier
    // courses is complete. This prevents Course 3+ from being scheduled when
    // only Course 1 has completed.
    const upcomingCourse = enrollments.find((candidate) => {
      const sequenceOrder = Number(candidate.sequenceOrder);
      if (sequenceOrder <= 1 || candidate.status !== "PENDING") return false;
      const precedingCourses = enrollments.filter((enrollment) => Number(enrollment.sequenceOrder) < sequenceOrder);
      if (precedingCourses.length !== sequenceOrder - 1) return false;
      return precedingCourses.every((enrollment) => {
        const isPrimaryCourse = String(enrollment.courseId || "") === String(student.courseId || "");
        const progress = enrollment.courseProgress ?? (isPrimaryCourse ? student.courseProgress : null);
        const completedAt = enrollment.courseCompletedAt || (isPrimaryCourse ? student.courseCompletedAt : null);
        return Boolean(completedAt) || Number(progress) >= 100;
      });
    });
    if (!upcomingCourse) continue;

    const studentUser = await prisma.user.findFirst({
      where: { email: { equals: student.emailAddress, mode: "insensitive" }, role: "STUDENT", active: true },
      select: { id: true },
    });
    const recipients = [
      {
        targetUserId: student.branch?.adminUserId || null,
        // Use the canonical Branch primary key for notification scoping.
        // Some legacy student records keep the branch code in branchId.
        targetBranchId: student.branch?.id || student.branchId,
        targetBranchEmail: student.branch?.branchEmail || "",
        targetBranchName: student.branch?.branchName || "",
        audience: "branch",
      },
      ...(studentUser ? [{ targetUserId: studentUser.id, audience: "student" }] : []),
    ];

    for (const recipient of recipients) {
      if (!recipient.targetUserId && !recipient.targetBranchId) continue;
      const marker = `sequential-course-scheduling:${student.id}:${upcomingCourse.id}:${recipient.audience}`;
      const isBranch = recipient.audience === "branch";
      const existing = await prisma.notification.findFirst({
        where: { kind: "SEQUENTIAL_COURSE_SCHEDULING_REQUIRED", requestDescription: marker },
        select: { id: true, targetBranchId: true },
      });
      if (existing) {
        if (isBranch && String(existing.targetBranchId || "") !== String(recipient.targetBranchId || "")) {
          await prisma.notification.update({ where: { id: existing.id }, data: { targetBranchId: recipient.targetBranchId } });
        }
        continue;
      }

      const completedCourse = enrollments.filter((enrollment) => Number(enrollment.sequenceOrder) < Number(upcomingCourse.sequenceOrder)).at(-1) || firstCourse;
      await createNotification({
        kind: "SEQUENTIAL_COURSE_SCHEDULING_REQUIRED",
        tone: "amber",
        title: isBranch ? "Schedule the student's next course" : "Your next course is ready to be scheduled",
        message: isBranch
          ? `${student.studentName} (${student.studentId}) has completed ${completedCourse.courseName || "the previous course"}. Please assign faculty, batch, payment plan, and schedule for ${upcomingCourse.courseName || "the next course"}.`
          : `You have completed ${completedCourse.courseName || "your previous course"}. Your branch administrator will assign faculty, batch, payment plan, and schedule for ${upcomingCourse.courseName || "your next course"}.`,
        actionLabel: isBranch ? "Schedule next course" : "View course",
        // Branch notifications are scoped by targetBranchId. Do not require
        // a branch-admin user relation here because older branch records may
        // have a missing/stale adminUserId mapping. Student notifications
        // still target the student's user account directly.
        ...(recipient.targetUserId && !isBranch ? { targetUser: { connect: { id: recipient.targetUserId } } } : {}),
        targetBranchId: recipient.targetBranchId,
        targetBranchEmail: recipient.targetBranchEmail,
        targetBranchName: recipient.targetBranchName,
        branchCourseId: upcomingCourse.courseId,
        branchCourseName: upcomingCourse.courseName || "",
        batchId: upcomingCourse.batchId || "",
        requestDescription: marker,
        createdBy: null,
      });
    }
  }
}

export async function notifySequentialCourseSchedulingForStudent(studentId) {
  const student = await prisma.branchStudent.findUnique({
    where: { id: normalizeString(studentId) },
    include: {
      branch: { select: { id: true, branchId: true, branchName: true, branchEmail: true, adminUserId: true } },
    },
  });
  if (!student || String(student.arrangementType || "").toUpperCase() !== "SEQUENTIAL") return;

  if (student.branch?.adminUserId || student.branch?.branchEmail) {
    await ensureSequentialCourseSchedulingNotifications({
      id: student.branch.adminUserId || "",
      email: student.branch.branchEmail || "",
      role: "BRANCH_ADMIN",
    });
  }

  const studentUser = await prisma.user.findFirst({
    where: { email: { equals: student.emailAddress, mode: "insensitive" }, role: "STUDENT", active: true },
    select: { id: true, email: true, role: true },
  });
  if (studentUser) await ensureSequentialCourseSchedulingNotifications(studentUser);
}

export async function listNotifications(query = {}, user = {}) {
  const requestedPage = Number.parseInt(query.page || "1", 10);
  const requestedLimit = Number.parseInt(query.limit || "10", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 10;
  const unreadOnly = String(query.unreadOnly || "").trim().toLowerCase() === "true";
  const kind = normalizeNotificationKind(query.kind);
  const status = normalizeString(query.status).toLowerCase();
  if (status && !["all", "unread", "read"].includes(status)) throw new AppError("Notification status filter is invalid", 400);
  const statusWhere = status === "unread" ? { read: false } : status === "read" ? { read: true } : null;

  const isFaculty = ["FACULTY", "STUDENT"].includes(normalizeString(user?.role).toUpperCase());
  if (normalizeString(user?.role).toUpperCase() === "FACULTY") {
    await ensureFacultyAcademicTestCompletionNotifications(user);
  }
  await ensureSequentialCourseSchedulingNotifications(user);
  const branchScope = await buildBranchAdminScope(user);
  const visibleKinds = getVisibleNotificationKindsForRole(user);
  const leadFollowUpOwnershipFilter = await buildBranchAdminFollowUpOwnershipFilter(user, branchScope);
  const baseWhere = combineNotificationWhere(buildNotificationWhere({
    user,
    branchScope,
    visibleKinds,
    unreadOnly,
    kind,
  }), leadFollowUpOwnershipFilter);
  const dateWhere = normalizeString(user?.role).toUpperCase() === "SALES_ADMIN"
    ? await getSalesAdminDateFilter(query, user)
    : null;
  if (normalizeString(user?.role).toUpperCase() !== "SALES_ADMIN" && (query.datePreset || query.fromDate || query.toDate)) {
    throw new AppError("Date filters are available only for Sales Admin notifications", 400);
  }
  const where = combineNotificationWhere(baseWhere, statusWhere, dateWhere);
  const filteredUnreadWhere = combineNotificationWhere(
    buildNotificationWhere({ user, branchScope, visibleKinds, unreadOnly: true, kind }),
    leadFollowUpOwnershipFilter,
    dateWhere,
  );
  const sort = normalizeString(query.sort).toLowerCase();
  if (sort && !["newest", "oldest"].includes(sort)) throw new AppError("Notification sort is invalid", 400);
  const orderBy = { createdAt: sort === "oldest" ? "asc" : "desc" };

  let total = 0;
  let rows = [];
  let unreadCount = 0;

  try {
    [total, rows, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: filteredUnreadWhere }),
    ]);
  } catch (error) {
    if (!isFaculty && Object.keys(branchScope).length > 0 && !kind) {
      const syntheticRows = await buildFallbackBranchNotifications(user, branchScope);
      return {
        data: syntheticRows,
        meta: {
          page,
          limit,
          total: syntheticRows.length,
          totalPages: Math.max(1, Math.ceil(syntheticRows.length / limit)),
          unreadCount: syntheticRows.filter((notification) => !notification.read).length,
        },
      };
    }

    throw error;
  }

  const shouldRetryWideBranchQuery =
    !isFaculty &&
    Object.keys(branchScope).length > 0 &&
    total === 0 &&
    !kind;

  if (shouldRetryWideBranchQuery) {
    const wideWhere = buildNotificationWhere({
      user,
      branchScope: {},
      visibleKinds,
      unreadOnly,
      kind,
    });
    const scopedWideWhere = combineNotificationWhere(wideWhere, leadFollowUpOwnershipFilter, statusWhere, dateWhere);
    const wideUnreadWhere = combineNotificationWhere(
      buildNotificationWhere({ user, branchScope: {}, visibleKinds, unreadOnly: true, kind }),
      leadFollowUpOwnershipFilter,
      dateWhere,
    );

    const [wideTotal, wideRows, wideUnreadCount] = await Promise.all([
      prisma.notification.count({ where: scopedWideWhere }),
      prisma.notification.findMany({
        where: scopedWideWhere,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: wideUnreadWhere }),
    ]);

    return {
      data: await normalizeRowsWithTimezones(wideRows),
      meta: {
        page,
        limit,
        total: wideTotal,
        totalPages: Math.max(1, Math.ceil(wideTotal / limit)),
        unreadCount: wideUnreadCount,
      filteredUnreadCount: wideUnreadCount,
      },
    };
  }

  const shouldUseSyntheticBranchFallback =
    !isFaculty &&
    Object.keys(branchScope).length > 0 &&
    rows.length === 0 &&
    !kind;

  if (shouldUseSyntheticBranchFallback) {
    const syntheticRows = await buildFallbackBranchNotifications(user, branchScope);

    return {
      data: syntheticRows,
      meta: {
        page,
        limit,
        total: syntheticRows.length,
        totalPages: Math.max(1, Math.ceil(syntheticRows.length / limit)),
        unreadCount: syntheticRows.filter((notification) => !notification.read).length,
      },
    };
  }

  return {
    data: await normalizeRowsWithTimezones(rows),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      unreadCount,
      filteredUnreadCount: unreadCount,
    },
  };
}

export async function markNotificationsAsRead(
  notificationIds = null,
  user = {},
) {
  const hasIds = Array.isArray(notificationIds) && notificationIds.length > 0;
  const now = new Date();
  const branchScope = await buildBranchAdminScope(user);
  const visibleKinds = getVisibleNotificationKindsForRole(user);

  const accessScope = combineNotificationWhere(
    buildNotificationWhere({
      user,
      branchScope,
      visibleKinds,
      unreadOnly: !hasIds,
    }),
    await buildBranchAdminFollowUpOwnershipFilter(user, branchScope),
  );
  const where = hasIds
    ? {
        AND: [
          accessScope,
          {
            id: {
              in: notificationIds.map((id) => String(id)).filter(Boolean),
            },
          },
        ],
      }
    : accessScope;

  const result = await prisma.notification.updateMany({
    where,
    data: {
      read: true,
      readAt: now,
    },
  });

  return result;
}

export async function getUnreadNotificationCount(
  user = {},
) {
  const branchScope = await buildBranchAdminScope(user);
  const visibleKinds = getVisibleNotificationKindsForRole(user);
  const where = combineNotificationWhere(
    buildNotificationWhere({
      user,
      branchScope,
      visibleKinds,
      unreadOnly: true,
    }),
    await buildBranchAdminFollowUpOwnershipFilter(user, branchScope),
  );

  let count = 0;
  try {
    count = await prisma.notification.count({
      where,
    });
  } catch (error) {
    if (normalizeString(user?.role).toUpperCase() !== "FACULTY" && Object.keys(branchScope).length > 0) {
      const syntheticRows = await buildFallbackBranchNotifications(user, branchScope);
      return syntheticRows.filter((notification) => !notification.read).length;
    }

    throw error;
  }

  if (normalizeString(user?.role).toUpperCase() !== "FACULTY" && Object.keys(branchScope).length > 0 && count === 0) {
    const syntheticRows = await buildFallbackBranchNotifications(user, branchScope);
    return syntheticRows.filter((notification) => !notification.read).length;
  }

  return count;
}
export async function createFacultyCourseAssignedNotification({
  facultyUserId,
  facultyName,
  courseName,
  actorId = null,
}) {
  return createNotification({
    kind: "FACULTY_COURSE_ASSIGNED",
    tone: "green",
    title: "Course Assigned",
    message: `${courseName} has been assigned to you.`,
    actionLabel: "View Course",
    targetUserId: facultyUserId,
    createdBy: actorId,
  });
}

export async function createFeeProgressAlertNotification({
  branch = {},
  student = {},
  facultyUserId = null,
  actorId = null,
  courseProgress = null,
  paidProgress = null,
  dueAmount = null,
  dueDate = null,
  nextInstallmentNumber = null,
  tone = "amber",
  prismaClient = prisma,
}) {
  const studentName = normalizeString(student?.studentName || student?.fullName || "Student");
  const studentId = normalizeString(student?.studentId || student?.id || "");
  const courseName = normalizeString(student?.courseName || student?.courseInterested || student?.course || "Course");
  const courseProgressNumber = Number(courseProgress);
  const paidProgressNumber = Number(paidProgress);
  if (Number.isFinite(courseProgressNumber) && Number.isFinite(paidProgressNumber) && courseProgressNumber <= 0 && paidProgressNumber <= 0) {
    return null;
  }
  const progressGap = Number.isFinite(courseProgressNumber) && Number.isFinite(paidProgressNumber)
    ? Math.max(0, courseProgressNumber - paidProgressNumber)
    : null;

  const title = progressGap && progressGap > 0
    ? `${studentName} fee progress is behind course progress`
    : `${studentName} payment progress updated`;

  const message = progressGap && progressGap > 0
    ? `Course progress is ${Math.round(progressGap)}% ahead of paid progress. Please follow up the next installment for ${studentName}.`
    : `Payment progress has been updated for ${studentName}.`;

  return createNotification(
    buildNotificationData({
      kind: "COURSE_EDIT_MODULE_UPDATED",
      tone,
      title,
      message,
      actionLabel: "Review student",
      branch,
      createdBy: actorId,
      extras: {
        targetUserId: facultyUserId || null,
        studentId,
        studentName,
        courseName,
        courseProgress: Number.isFinite(courseProgressNumber) ? String(Math.round(courseProgressNumber)) : "",
        paidProgress: Number.isFinite(paidProgressNumber) ? String(Math.round(paidProgressNumber)) : "",
        dueAmount: Number.isFinite(Number(dueAmount)) ? String(Number(dueAmount)) : "",
        dueDate: normalizeString(dueDate),
        requestTitle: nextInstallmentNumber ? `Installment ${nextInstallmentNumber}` : "",
      },
    }),
    prismaClient,
  );
}


