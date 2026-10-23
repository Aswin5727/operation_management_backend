const DEFAULT_CONCURRENCY = 4;

export async function collectBranchStudentReportSummaries(
  students = [],
  {
    getAcademicReport,
    getSyllabusReport,
    concurrency = DEFAULT_CONCURRENCY,
  } = {},
) {
  const rows = Array.isArray(students) ? students : [];
  if (!rows.length) return [];
  if (typeof getAcademicReport !== "function" || typeof getSyllabusReport !== "function") {
    throw new TypeError("Both student report loaders are required.");
  }

  const output = new Array(rows.length);
  const workerCount = Math.min(
    rows.length,
    Math.max(1, Math.floor(Number(concurrency) || DEFAULT_CONCURRENCY)),
  );
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= rows.length) return;

      const student = rows[index];
      const studentId = String(student?.studentId || "").trim();
      if (!studentId) {
        output[index] = null;
        continue;
      }

      const [academicResult, syllabusResult] = await Promise.allSettled([
        getAcademicReport(studentId),
        getSyllabusReport(studentId),
      ]);

      output[index] = {
        studentId,
        recordId: String(student?.id || "").trim(),
        academicReport: academicResult.status === "fulfilled"
          ? academicResult.value || {}
          : {},
        syllabusReport: syllabusResult.status === "fulfilled"
          ? syllabusResult.value || {}
          : {},
      };
    }
  };

  await Promise.all(Array.from({ length: workerCount }, worker));
  return output.filter(Boolean);
}