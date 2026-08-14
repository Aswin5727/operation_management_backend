import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  getUnreadNotificationCount,
  listNotifications,
  markNotificationsAsRead,
} from "./notifications.service.js";

const listNotificationsHandler = asyncHandler(async (req, res) => {
  const result = await listNotifications(req.query || {});

  res.status(200).json({
    data: result.data,
    meta: result.meta,
  });
});

const markNotificationsAsReadHandler = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const notificationIds = Array.isArray(body.notificationIds) ? body.notificationIds : null;

  const result = await markNotificationsAsRead(notificationIds);
  const unreadCount = await getUnreadNotificationCount();

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
