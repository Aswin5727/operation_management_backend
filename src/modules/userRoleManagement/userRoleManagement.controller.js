import asyncHandler from "../../common/utils/asyncHandler.js";
import { assignBranchAccess, createUserRoleAccount, listAdminChangeHistory, listBranchAccessUsers, listUserChangeHistory, replaceBranchAdmin, requestEmailChange, verifyEmailChange } from "./userRoleManagement.service.js";

const createUserRoleAccountHandler = asyncHandler(async (req, res) => {
  const data = await createUserRoleAccount(req.body || {}, req.auth || {});
  res.status(201).json({ message: data.invitationSent === false ? "Account created, but the invitation email could not be sent" : "Account created and invitation sent", data });
});




const listBranchAccessUsersHandler = asyncHandler(async (req, res) => {
  res.status(200).json({ data: await listBranchAccessUsers(req.query.accountType) });
});

const assignBranchAccessHandler = asyncHandler(async (req, res) => {
  const data = await assignBranchAccess(req.params.branchId, req.body || {}, req.auth || {});
  res.status(200).json({ message: "Branch access updated", data });
});
const replaceBranchAdminHandler = asyncHandler(async (req, res) => {
  const data = await replaceBranchAdmin(req.params.branchId, req.body || {}, req.auth || {});
  res.status(200).json({ message: "Branch Admin replaced successfully", data });
});
const requestEmailChangeHandler = asyncHandler(async (req, res) => {
  const data = await requestEmailChange(req.params.userId, req.body || {}, req.auth || {});
  res.status(200).json({ message: "Email verification sent", data });
});
const verifyEmailChangeHandler = asyncHandler(async (req, res) => {
  const data = await verifyEmailChange(req.body?.token || req.query?.token);
  res.status(200).json({ message: "Email address verified successfully", data });
});
const listAdminChangeHistoryHandler = asyncHandler(async (req, res) => {
  res.status(200).json({ data: await listAdminChangeHistory(req.params.branchId) });
});
const listUserChangeHistoryHandler = asyncHandler(async (req, res) => {
  res.status(200).json({ data: await listUserChangeHistory(req.params.userId) });
});
export { assignBranchAccessHandler, createUserRoleAccountHandler, listAdminChangeHistoryHandler, listBranchAccessUsersHandler, listUserChangeHistoryHandler, replaceBranchAdminHandler, requestEmailChangeHandler, verifyEmailChangeHandler };
