import asyncHandler from "../../common/utils/asyncHandler.js";
import { assignBranchAccess, createUserRoleAccount, listBranchAccessUsers } from "./userRoleManagement.service.js";

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
export { assignBranchAccessHandler, createUserRoleAccountHandler, listBranchAccessUsersHandler };
