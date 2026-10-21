import express from "express";
import multer from "multer";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { USER_ROLES } from "../../common/constants/roles.js";
import asyncHandler from "../../common/utils/asyncHandler.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import { courseFinancialPreview } from "./courseCalculations.js";
import { COURSE_IMPORT_MAX_BYTES, validateCourseUpload, createCourseTemplate, previewCourseWorkbook, validateCourseWorkbook, publicCoursePreview, importCourseWorkbook, createCourseErrorReport } from "./courseImport.service.js";

function importHandler(callback) {
  return asyncHandler(async (req, res) => {
    try { return await callback(req, res); }
    catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Course upload is temporarily unavailable. Please try again.", 503);
    }
  });
}
const router = express.Router();
router.use(authenticate, authorize(USER_ROLES.BRANCH_ADMIN, USER_ROLES.SUPER_ADMIN));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: COURSE_IMPORT_MAX_BYTES, files: 1, fields: 2, fieldSize: 8 * 1024 * 1024 } });
function receiveWorkbook(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (error) return next(new AppError(error.code === "LIMIT_FILE_SIZE" ? "The workbook must be 8 MB or smaller" : "Upload one .xlsx file only", 400));
    try { validateCourseUpload(req.file); next(); } catch (failure) { next(failure); }
  });
}
function readEdits(req) {
  if (!req.body?.edits) return {};
  try { return JSON.parse(req.body.edits); } catch { throw new AppError("Course edits are invalid. Reopen the preview and try again.", 400); }
}
async function profileFor(user) {
  const profile = await getCurrentBranchProfile(user);
  if (!profile?.id) throw new AppError("Branch profile not found", 404);
  return profile;
}
function excel(res, result) {
  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", 'attachment; filename="' + result.fileName + '"');
  res.setHeader("Cache-Control", "no-store");
  return res.send(result.buffer);
}
router.get("/template", importHandler(async (req, res) => excel(res, await createCourseTemplate(await profileFor(req.user)))));
router.post("/preview", receiveWorkbook, importHandler(async (req, res) => res.json({ status: "success", data: publicCoursePreview(await previewCourseWorkbook(req.file.buffer, await profileFor(req.user), undefined, readEdits(req))) })));
router.post("/import", receiveWorkbook, importHandler(async (req, res) => res.json({ status: "success", data: await importCourseWorkbook({ buffer: req.file.buffer, profile: await profileFor(req.user), actorId: req.user.id, previewHash: req.body.previewHash, edits: readEdits(req) }) })));
router.post("/error-report", receiveWorkbook, importHandler(async (req, res) => {
  const result = await validateCourseWorkbook(req.file.buffer, await profileFor(req.user), undefined, readEdits(req));
  return excel(res, await createCourseErrorReport(result.errors));
}));
router.post("/calculations", importHandler(async (req, res) => res.json({ status: "success", data: courseFinancialPreview(req.body || {}) })));
export default router;
