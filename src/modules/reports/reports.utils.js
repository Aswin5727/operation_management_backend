import AppError from "../../common/errors/AppError.js";

const LOCAL_TIME_ZONE = "Asia/Calcutta";

function normalizeString(value) {
  return String(value ?? "").trim();
}

function parseRequiredId(value, fieldName) {
  const text = normalizeString(value);

  if (!text) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  return text;
}

function parseDateParam(value, fieldName) {
  const text = normalizeString(value);

  if (!text) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new AppError(`${fieldName} must be in YYYY-MM-DD format`, 400);
  }

  return text;
}

function parseDateRange(query = {}) {
  const fromDate = parseDateParam(query.fromDate, "fromDate");
  const toDate = parseDateParam(query.toDate, "toDate");

  if (fromDate > toDate) {
    throw new AppError("Invalid date range: fromDate must be less than or equal to toDate", 400);
  }

  return { fromDate, toDate };
}

function formatDateTime(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LOCAL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(loginAt, logoutAt) {
  if (!loginAt || !logoutAt) {
    return "";
  }

  const start = new Date(loginAt);
  const end = new Date(logoutAt);
  const diffMs = end.getTime() - start.getTime();

  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function buildReportFileName(parts = []) {
  return parts
    .flat()
    .map((part) =>
      normalizeString(part)
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, ""),
    )
    .filter(Boolean)
    .join("_")
    .concat(".xlsx");
}

function toDisplayValue(value, fallback = "-") {
  const text = normalizeString(value);
  return text || fallback;
}

export {
  buildReportFileName,
  formatDateTime,
  formatDuration,
  normalizeString,
  parseDateRange,
  parseRequiredId,
  toDisplayValue,
};
