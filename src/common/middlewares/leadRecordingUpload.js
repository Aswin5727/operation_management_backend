import multer from "multer";

const allowedMimeTypes = new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/aacp", "audio/ogg", "application/ogg"]);
const allowedExtensions = /\.(mp3|wav|m4a|aac|ogg)$/i;
export const LEAD_RECORDING_MAX_FILES = Math.max(1, Number(process.env.LEAD_RECORDING_MAX_FILES || 10));
export const LEAD_RECORDING_MAX_SIZE = Math.max(1, Number(process.env.LEAD_RECORDING_MAX_SIZE_BYTES || 25 * 1024 * 1024));

const uploadOptions = {
  storage: multer.memoryStorage(),
  limits: { fileSize: LEAD_RECORDING_MAX_SIZE, files: LEAD_RECORDING_MAX_FILES },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(String(file.mimetype || "").toLowerCase()) || !allowedExtensions.test(file.originalname || "")) return callback(new Error("Call recording must be an MP3, WAV, M4A, or AAC file."));
    callback(null, true);
  },
};

export const leadRecordingUpload = multer(uploadOptions);
export const leadRecordingsUpload = multer(uploadOptions);
