import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  getUnreadNotificationCount,
  listNotifications,
  markNotificationsAsRead,
} from "./notifications.service.js";

const listNotificationsHandler = asyncHandler(async (req, res) => {
  const [result, unreadCount] = await Promise.all([
    listNotifications(req.query || {}, req.user || {}),
    getUnreadNotificationCount(req.user || {}),
  ]);

  res.status(200).json({
    data: result.data,
    meta: {
      ...result.meta,
      unreadCount,
      roleAccess: req.user?.roleAccess || null,
    },
  });
});

const markNotificationsAsReadHandler = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const notificationIds = Array.isArray(body.notificationIds) ? body.notificationIds : null;

  const result = await markNotificationsAsRead(notificationIds, req.user || {});
  const unreadCount = await getUnreadNotificationCount(req.user || {});

  res.status(200).json({
    message: "Notifications updated successfully",
    data: {
      updatedCount: result.count,
      unreadCount,
    },
  });
});

export {
  listNotificationsHandler,
  markNotificationsAsReadHandler,
};
