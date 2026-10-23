import multer from "multer";

const allowedMimeTypes = new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/aacp"]);
const allowedExtensions = /\.(mp3|wav|m4a|aac)$/i;

export const leadRecordingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(String(file.mimetype || "").toLowerCase()) || !allowedExtensions.test(file.originalname || "")) return callback(new Error("Call recording must be an MP3, WAV, M4A, or AAC file."));
    callback(null, true);
  },
});
