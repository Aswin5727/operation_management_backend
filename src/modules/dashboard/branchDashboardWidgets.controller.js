import asyncHandler from "../../common/utils/asyncHandler.js";
import { getBranchAdminWidgetConfig, resetBranchAdminWidgetConfig, saveBranchAdminWidgetConfig } from "./branchDashboardWidgets.service.js";

const send = (res, message, data) => res.json({ status: "success", message, data });
export const getBranchAdminWidgetsHandler = asyncHandler(async (req, res) => send(res, "Branch dashboard widgets fetched successfully", await getBranchAdminWidgetConfig(req.user)));
export const saveBranchAdminWidgetsHandler = asyncHandler(async (req, res) => send(res, "Branch dashboard widgets saved successfully", await saveBranchAdminWidgetConfig(req.user, req.body)));
export const resetBranchAdminWidgetsHandler = asyncHandler(async (req, res) => send(res, "Branch dashboard widgets reset successfully", await resetBranchAdminWidgetConfig(req.user)));
