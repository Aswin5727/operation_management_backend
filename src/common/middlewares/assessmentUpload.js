import multer from "multer";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export const assessmentScreenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, callback) => {
    if (!allowed.has(file.mimetype)) return callback(new Error("Screenshot must be JPG, JPEG, PNG, or WEBP."));
    callback(null, true);
  },
});
