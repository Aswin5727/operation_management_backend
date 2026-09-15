import prisma from "../../config/prisma.js";

const NOTIFICATION_KIND_MAP = {
  INSTITUTE_LEAVE: "institute-leave",
  BRANCH_CREATED: "branch-created",
  BRANCH_INVITATION_RESENT: "branch-mail",
  BRANCH_LOGIN: "branch-login",
  BRANCH_FACULTY_LOGIN: "branch-faculty-login",
  FACULTY_COURSE_ASSIGNED: "faculty-course-assigned",
  COURSE_EDIT_REQUEST: "course-edit-request",
  COURSE_EDIT_REQUEST_ACCEPTED: "course-edit-request-accepted",
  COURSE_EDIT_REQUEST_REJECTED: "course-edit-request-rejected",
  COURSE_EDIT_MODULE_UPDATED: "course-edit-module-updated",
  FACULTY_LEAVE_REQUEST: "faculty-leave-request",
};

const BRANCH_ADMIN_VISIBLE_NOTIFICATION_KINDS = new Set([
  "BRANCH_INVITATION_RESENT",
  "BRANCH_LOGIN",
  "BRANCH_FACULTY_LOGIN",
  "COURSE_EDIT_REQUEST",
  "COURSE_EDIT_MODULE_UPDATED",
  "FACULTY_LEAVE_REQUEST",
]);
const DEFAULT_VISIBLE_NOTIFICATION_KINDS = new Set([
  "BRANCH_INVITATION_RESENT",
  "BRANCH_LOGIN",
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
]);
const FACULTY_VISIBLE_NOTIFICATION_KINDS = new Set([
  "INSTITUTE_LEAVE",
  "FACULTY_COURSE_ASSIGNED",
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

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeNotificationRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    kind: NOTIFICATION_KIND_MAP[row.kind] || String(row.kind || "").trim().toLowerCase(),
    tone: normalizeString(row.tone) || "blue",
    title: normalizeString(row.title),
    message: normalizeString(row.message),
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
    targetUserId: normalizeString(
      row.targetUserId,
    ),
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

function getVisibleNotificationKindsForRole(user = {}) {
  const role = normalizeString(user?.role).toUpperCase();
  if (role === "SUPER_ADMIN") {
    return SUPER_ADMIN_VISIBLE_NOTIFICATION_KINDS;
  }

  if (role === "BRANCH_ADMIN") {
    return BRANCH_ADMIN_VISIBLE_NOTIFICATION_KINDS;
  }

  if (role === "STUDENT") return new Set(["INSTITUTE_LEAVE"]);

  if (role === "FACULTY") {
    return FACULTY_VISIBLE_NOTIFICATION_KINDS;
  }

  return DEFAULT_VISIBLE_NOTIFICATION_KINDS;
}

function buildNotificationWhere({
  user = {},
  branchScope = {},
  visibleKinds = DEFAULT_VISIBLE_NOTIFICATION_KINDS,
  unreadOnly = false,
  kind = "",
} = {}) {
  const isFaculty = ["FACULTY", "STUDENT"].includes(String(user?.role || "").toUpperCase());
  const normalizedKind = normalizeString(kind).toUpperCase();

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

  if (Object.keys(branchScope).length > 0) {
    return {
      ...branchScope,
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
  };
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

async function createNotification(data, prismaClient = prisma) {
  const record = await prismaClient.notification.create({
    data,
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
  const subModuleLabel = subModule?.title ? ` / ${subModule.title}` : "";
  const fieldLabel = Array.isArray(updatedFields) && updatedFields.length ? ` (${updatedFields.join(", ")})` : "";
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
      message: `Faculty updated ${moduleLabel}${subModuleLabel} in ${branchCourse?.name || "the course"}${fieldLabel}.`,
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
    },
  }), prismaClient);
}

export async function listNotifications(query = {}, user = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 10)));
  const unreadOnly = String(query.unreadOnly || "").trim().toLowerCase() === "true";
  const kind = normalizeString(query.kind).toUpperCase();

  const isFaculty = ["FACULTY", "STUDENT"].includes(String(user?.role || "").toUpperCase());
  const branchScope = await buildBranchAdminScope(user);
  const visibleKinds = getVisibleNotificationKindsForRole(user);
  const where = buildNotificationWhere({
    user,
    branchScope,
    visibleKinds,
    unreadOnly,
    kind,
  });

  let total = 0;
  let rows = [];
  let unreadCount = 0;

  try {
    [total, rows, unreadCount] = await prisma.$transaction([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({
        where: buildNotificationWhere({
          user,
          branchScope,
          visibleKinds,
          unreadOnly: true,
          kind,
        }),
      }),
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

    const [wideTotal, wideRows, wideUnreadCount] = await prisma.$transaction([
      prisma.notification.count({ where: wideWhere }),
      prisma.notification.findMany({
        where: wideWhere,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({
        where: buildNotificationWhere({
          user,
          branchScope: {},
          visibleKinds,
          unreadOnly: true,
          kind,
        }),
      }),
    ]);

    return {
      data: wideRows.map(normalizeNotificationRow).filter(Boolean),
      meta: {
        page,
        limit,
        total: wideTotal,
        totalPages: Math.max(1, Math.ceil(wideTotal / limit)),
        unreadCount: wideUnreadCount,
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
    data: rows.map(normalizeNotificationRow).filter(Boolean),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      unreadCount,
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

  const facultyScope =
    ["FACULTY", "STUDENT"].includes(user?.role)
      ? {
          targetUserId: user.id,
          kind: {
            in: Array.from(visibleKinds),
          },
        }
      : Object.keys(branchScope).length > 0
        ? branchScope
        : {}

  const where = hasIds
    ? {
      id: {
        in: notificationIds
          .map((id) => String(id))
          .filter(Boolean),
      },

      ...facultyScope,
    }
    : {
      read: false,
      ...facultyScope,
    };

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
  const where = buildNotificationWhere({
    user,
    branchScope,
    visibleKinds,
    unreadOnly: true,
  });

  let count = 0;
  try {
    count = await prisma.notification.count({
      where,
    });
  } catch (error) {
    if (String(user?.role || "").toUpperCase() !== "FACULTY" && Object.keys(branchScope).length > 0) {
      const syntheticRows = await buildFallbackBranchNotifications(user, branchScope);
      return syntheticRows.filter((notification) => !notification.read).length;
    }

    throw error;
  }

  if (String(user?.role || "").toUpperCase() !== "FACULTY" && Object.keys(branchScope).length > 0 && count === 0) {
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
