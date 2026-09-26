import asyncHandler from "../../common/utils/asyncHandler.js";
import * as service from "./academicTests.service.js";

const send = (res, data, status = 200) => res.status(status).json({ status: "success", data });
export const list = asyncHandler(async (req, res) => send(res, await service.listAcademicTests(req.user)));
export const getById = asyncHandler(async (req, res) => send(res, await service.getAcademicTest(req.user, req.params.id)));
export const create = asyncHandler(async (req, res) => send(res, await service.createAcademicTest(req.user, req.body), 201));
export const update = asyncHandler(async (req, res) => send(res, await service.updateAcademicTest(req.user, req.params.id, req.body)));
export const remove = asyncHandler(async (req, res) => send(res, await service.deleteAcademicTest(req.user, req.params.id)));
