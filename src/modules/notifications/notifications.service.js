import prisma from "../../config/prisma.js";

const NOTIFICATION_KIND_MAP = {
  BRANCH_CREATED: "branch-created",
  BRANCH_INVITATION_RESENT: "branch-mail",
  BRANCH_LOGIN: "branch-login",
  BRANCH_FACULTY_LOGIN: "branch-faculty-login",
  FACULTY_COURSE_ASSIGNED: "faculty-course-assigned",
};

const BRANCH_ADMIN_VISIBLE_NOTIFICATION_KINDS = new Set([
  "BRANCH_INVITATION_RESENT",
  "BRANCH_LOGIN",
  "BRANCH_FACULTY_LOGIN",
]);
const DEFAULT_VISIBLE_NOTIFICATION_KINDS = new Set([
  "BRANCH_INVITATION_RESENT",
  "BRANCH_LOGIN",
]);
const BRANCH_ADMIN_SCOPE_CACHE = new Map();
const BRANCH_ADMIN_SCOPE_CACHE_TTL_MS = 60 * 1000;
const LOGIN_SUCCESS_EVENT_TYPE = "LOGIN_SUCCESS";

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

function buildNotificationData({ kind, tone, title, message, actionLabel, branch = {}, createdBy = null }) {
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

  const scope = {
    targetBranchId: normalizeString(branch.id || branch.branchId),
    targetBranchEmail: normalizeEmail(branch.branchEmail),
    targetBranchName: normalizeString(branch.branchName),
  };

  BRANCH_ADMIN_SCOPE_CACHE.set(cacheKey, {
    scope,
    expiresAt: Date.now() + BRANCH_ADMIN_SCOPE_CACHE_TTL_MS,
  });

  return scope;
}

function getVisibleNotificationKindsForRole(user = {}) {
  const role = normalizeString(user?.role).toUpperCase();
  if (role === "BRANCH_ADMIN") {
    return BRANCH_ADMIN_VISIBLE_NOTIFICATION_KINDS;
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
  const isFaculty = String(user?.role || "").toUpperCase() === "FACULTY";
  const normalizedKind = normalizeString(kind).toUpperCase();

  if (isFaculty) {
    return {
      targetUserId: user.id,
      kind: "FACULTY_COURSE_ASSIGNED",
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

async function createNotification(data) {
  const record = await prisma.notification.create({
    data,
  });

  return normalizeNotificationRow(record);
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

export async function listNotifications(query = {}, user = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 10)));
  const unreadOnly = String(query.unreadOnly || "").trim().toLowerCase() === "true";
  const kind = normalizeString(query.kind).toUpperCase();

  const isFaculty = String(user?.role || "").toUpperCase() === "FACULTY";
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
        where: isFaculty
          ? {
              read: false,
              targetUserId: user.id,
              kind: "FACULTY_COURSE_ASSIGNED",
            }
          : Object.keys(branchScope).length > 0
            ? {
                read: false,
                ...branchScope,
                ...(kind
                  ? { kind }
                  : {
                      kind: {
                        in: Array.from(visibleKinds),
                      },
                    }),
              }
            : {
                read: false,
                ...(kind
                  ? { kind }
                  : {
                      kind: {
                        in: Array.from(visibleKinds),
                      },
                    }),
            },
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

  const facultyScope =
    user?.role === "FACULTY"
      ? {
        targetUserId: user.id,
        kind: "FACULTY_COURSE_ASSIGNED",
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
