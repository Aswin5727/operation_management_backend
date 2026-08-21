import prisma from "../../config/prisma.js";

const NOTIFICATION_KIND_MAP = {
  BRANCH_CREATED: "branch-created",
  BRANCH_INVITATION_RESENT: "branch-mail",
  BRANCH_LOGIN: "branch-login",
  BRANCH_FACULTY_LOGIN: "branch-faculty-login",
  FACULTY_COURSE_ASSIGNED: "faculty-course-assigned",
};

const VISIBLE_NOTIFICATION_KINDS = new Set(["BRANCH_INVITATION_RESENT", "BRANCH_LOGIN", "BRANCH_FACULTY_LOGIN"]);
const BRANCH_ADMIN_SCOPE_CACHE = new Map();
const BRANCH_ADMIN_SCOPE_CACHE_TTL_MS = 60 * 1000;

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
  return createNotification(
    buildNotificationData({
      kind: "BRANCH_FACULTY_LOGIN",
      tone: "blue",
      title: `${faculty?.name || faculty?.fullName || "Faculty"} logged in`,
      message: `${faculty?.name || faculty?.fullName || "Faculty"} logged in to ${branch?.branchName || branch?.branchId || "your branch"}.`,
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

  const where = isFaculty
    ? {
        targetUserId: user.id,
        kind: "FACULTY_COURSE_ASSIGNED",
        ...(unreadOnly ? { read: false } : {}),
      }
    : Object.keys(branchScope).length > 0
      ? {
          ...branchScope,
          ...(unreadOnly ? { read: false } : {}),
          ...(kind
            ? { kind }
            : {
                kind: {
                  in: Array.from(VISIBLE_NOTIFICATION_KINDS),
                },
              }),
        }
    : {
        ...(unreadOnly ? { read: false } : {}),
        ...(kind
          ? { kind }
          : {
              kind: {
                in: Array.from(VISIBLE_NOTIFICATION_KINDS),
              },
            }),
      };

  const [total, rows, unreadCount] = await prisma.$transaction([
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
                      in: Array.from(VISIBLE_NOTIFICATION_KINDS),
                    },
                  }),
            }
        : {
            read: false,
            ...(kind
              ? { kind }
              : {
                  kind: {
                    in: Array.from(VISIBLE_NOTIFICATION_KINDS),
                  },
                }),
          },
    }),
  ]);

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
  const where =
    user?.role === "FACULTY"
      ? {
          read: false,
          targetUserId: user.id,
          kind: "FACULTY_COURSE_ASSIGNED",
        }
      : Object.keys(branchScope).length > 0
        ? {
            read: false,
            ...branchScope,
            kind: {
              in: Array.from(
                VISIBLE_NOTIFICATION_KINDS,
              ),
            },
          }
      : {
          read: false,
          kind: {
            in: Array.from(
              VISIBLE_NOTIFICATION_KINDS,
            ),
          },
        };

  return prisma.notification.count({
    where,
  });
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
