import AppError from "../errors/AppError.js";

const COMPANY_PREFIX = "CIS";

function compact(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeBranchId(value) {
  const raw = compact(value);
  const withoutCompanyPrefix = raw.startsWith(COMPANY_PREFIX)
    ? raw.slice(COMPANY_PREFIX.length)
    : raw;
  const match = withoutCompanyPrefix.match(/^([A-Z]{2,12})(\d{3})$/);

  if (!match) {
    throw new AppError("Branch ID must contain a 2-12 letter code followed by 3 numbers, for example SAI001", 400);
  }

  return `${COMPANY_PREFIX}${match[1]}${match[2]}`;
}

export function getBranchPublicPrefix(branchId) {
  const normalized = normalizeBranchId(branchId);
  return normalized.replace(/\d{3}$/, "");
}

export function buildBranchEntityId(branchId, entityPrefix, sequence) {
  const prefix = getBranchPublicPrefix(branchId);
  const entity = compact(entityPrefix);
  const number = Number(sequence);

  if (!entity || !Number.isInteger(number) || number <= 0) {
    throw new AppError("Unable to generate a valid branch record ID", 500);
  }

  return `${prefix}${entity}${String(number).padStart(3, "0")}`;
}

export function extractEntitySequence(value, branchId, entityPrefix) {
  const prefix = `${getBranchPublicPrefix(branchId)}${compact(entityPrefix)}`;
  const normalized = compact(value);
  const match = normalized.match(new RegExp(`^${prefix}(\\d+)$`, "i"));
  if (match) return Number(match[1]) || 0;

  const legacyMatch = normalized.match(new RegExp(`^(?:${compact(entityPrefix)}|${compact(entityPrefix)}-)(\\d+)$`, "i"));
  return legacyMatch ? Number(legacyMatch[1]) || 0 : 0;
}

export function normalizeBranchEntityId(value, branchId, entityPrefix) {
  const normalized = compact(value);
  const prefix = `${getBranchPublicPrefix(branchId)}${compact(entityPrefix)}`;
  if (normalized.startsWith(prefix)) return normalized;

  const match = normalized.match(/(?:[A-Z]+)?-?(\d+)$/i);
  if (!match) {
    throw new AppError(`Invalid ${entityPrefix} ID`, 400);
  }

  return `${prefix}${String(Number(match[1])).padStart(3, "0")}`;
}

export { COMPANY_PREFIX };
