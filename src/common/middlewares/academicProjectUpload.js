import multer from "multer";

const allowed = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
  "image/jpeg",
  "image/png",
]);

export const academicProjectUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowed.has(file.mimetype)) return callback(new Error("Project file must be PDF, DOC, DOCX, ZIP, JPG, or PNG."));
    callback(null, true);
  },
});
