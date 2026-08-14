import prisma from "../../config/prisma.js";

const NOTIFICATION_KIND_MAP = {
  BRANCH_CREATED: "branch-created",
  BRANCH_INVITATION_RESENT: "branch-mail",
  BRANCH_LOGIN: "branch-login",
};

const VISIBLE_NOTIFICATION_KINDS = new Set(["BRANCH_INVITATION_RESENT", "BRANCH_LOGIN"]);

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

export async function listNotifications(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 10)));
  const unreadOnly = String(query.unreadOnly || "").trim().toLowerCase() === "true";
  const kind = normalizeString(query.kind).toUpperCase();

  const where = {
    ...(unreadOnly ? { read: false } : {}),
    ...(kind
      ? { kind }
      : {
          kind: {
            in: Array.from(VISIBLE_NOTIFICATION_KINDS),
          },
        }),
  }

  const [total, rows, unreadCount] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({
      where: {
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

export async function markNotificationsAsRead(notificationIds = null) {
  const hasIds = Array.isArray(notificationIds) && notificationIds.length > 0;
  const now = new Date();

  const where = hasIds
    ? {
        id: {
          in: notificationIds.map((id) => String(id)).filter(Boolean),
        },
      }
    : {
        read: false,
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

export async function getUnreadNotificationCount() {
  return prisma.notification.count({
    where: {
      read: false,
      kind: {
        in: Array.from(VISIBLE_NOTIFICATION_KINDS),
      },
    },
  });
}
