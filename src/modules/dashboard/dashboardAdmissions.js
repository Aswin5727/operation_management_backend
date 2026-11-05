const COMPLETED_IMPORT_STATUSES = new Set(["COMPLETED", "DISCONTINUED"]);

export function isCompletedStudentImportRecord(student = {}) {
  if (student.isCompletedStudentImport === true || student.completedStudentImport === true) return true;
  const rootLifecycle = student.importedAcademicResults?.__importedLifecycleStatus;
  if (COMPLETED_IMPORT_STATUSES.has(String(rootLifecycle || "").trim().toUpperCase())) return true;
  const rootAcademicResults = student.importedAcademicResults;
  const hasLegacyImportedCompletion = !rootLifecycle
    && rootAcademicResults
    && typeof rootAcademicResults === "object"
    && !Array.isArray(rootAcademicResults)
    && Number(student.courseProgress) >= 100
    && Boolean(student.courseCompletedAt || student.courseEndDate);
  if (hasLegacyImportedCompletion) return true;
  return (Array.isArray(student.courseEnrollments) ? student.courseEnrollments : []).some((enrollment) => {
    const lifecycle = String(enrollment?.importedLifecycleStatus || "").trim().toUpperCase();
    if (COMPLETED_IMPORT_STATUSES.has(lifecycle)) return true;
    const academicResults = enrollment?.importedAcademicResults || rootAcademicResults;
    return !lifecycle
      && academicResults
      && typeof academicResults === "object"
      && !Array.isArray(academicResults)
      && Number(enrollment?.courseProgress ?? student.courseProgress) >= 100
      && Boolean(enrollment?.courseCompletedAt || student.courseCompletedAt || enrollment?.endDate || student.courseEndDate);
  });
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
