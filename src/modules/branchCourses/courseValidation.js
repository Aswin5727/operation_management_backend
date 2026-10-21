import AppError from "../../common/errors/AppError.js";
import { normalizeBranchEntityId, getBranchPublicPrefix } from "../../common/utils/branchIdentifiers.js";
export const textKey = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
export const courseNameKey = (value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
export function courseFieldErrors(data, { partial = false, existing = {} } = {}) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  for (const field of ["courseCode", "courseType", "name", "mode", "status"]) {
    if (partial && data[field] === undefined) continue;
    if (typeof data[field] !== "string" || !data[field].trim()) add(field, field + " is required");
    else if (data[field].trim().length > 200) add(field, field + " must not exceed 200 characters");
  }
  if (data.mode && !["online", "offline", "hybrid"].includes(textKey(data.mode))) add("mode", "Mode must be Online, Offline or Hybrid");
  if (data.status && !["active", "inactive"].includes(textKey(data.status))) add("status", "Status must be Active or Inactive");
  for (const [field, minimum] of Object.entries({ duration: 1, hours: 1, actualFees: 0, registrationFees: 0, academicTestCount: 1, discount: 0 })) {
    if (partial && data[field] === undefined) continue;
    const value = data[field];
    if (field === "discount" && (value === "" || value == null)) continue;
    if (value === "" || value == null || typeof value === "boolean" || !Number.isInteger(Number(value)) || Number(value) < minimum || Number(value) > 2147483647) add(field, field + " must be a whole number between " + minimum + " and 2147483647");
  }
  const financial = { ...existing, ...data };
  if (!partial || ["actualFees", "registrationFees", "discount"].some((field) => data[field] !== undefined)) {
    if (Number(financial.discount || 0) > Number(financial.actualFees) + Number(financial.registrationFees)) add("discount", "Discount cannot exceed the standard fee plus registration fee");
    if (Number(financial.actualFees) + Number(financial.registrationFees) > 2147483647) add("actualFees", "Combined fee exceeds the supported maximum");
  }
  return errors;
}

export function normalizeCourseCode(value, branchId) {
  const code = normalizeBranchEntityId(value, branchId, "COU");
  const prefix = getBranchPublicPrefix(branchId) + "COU";
  const suffix = code.slice(prefix.length);
  if (!/^[0-9]+$/.test(suffix) || !Number.isSafeInteger(Number(suffix)) || Number(suffix) <= 0) {
    throw new AppError("Course Code must end in a positive numeric sequence", 400);
  }
  return prefix + String(Number(suffix)).padStart(3, "0");
}
