const COMPLETED_IMPORT_STATUSES = new Set(["COMPLETED", "DISCONTINUED"]);

export function isCompletedStudentImportRecord(student = {}) {
  if (student.isCompletedStudentImport === true || student.completedStudentImport === true) return true;
  return (Array.isArray(student.courseEnrollments) ? student.courseEnrollments : [])
    .some((enrollment) => COMPLETED_IMPORT_STATUSES.has(String(enrollment?.importedLifecycleStatus || "").trim().toUpperCase()));
}

function isoDate(value) {
  const candidate = String(value || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return "";
  const [year, month, day] = candidate.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.toISOString().slice(0, 10) === candidate ? candidate : "";
}

export function isAdmissionInRange(student = {}, startDate = "", endDate = "", excludedStudentIds = null) {
  const studentId = String(student.id || "").trim();
  if (studentId && excludedStudentIds?.has(studentId)) return false;
  const admissionDate = isoDate(student.admissionDate) || isoDate(student.courseStartDate);
  if (!admissionDate) return false;
  return (!startDate || admissionDate >= startDate) && (!endDate || admissionDate <= endDate);
}
