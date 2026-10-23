import assert from "node:assert/strict";
import test from "node:test";

import { collectBranchStudentReportSummaries } from "../src/modules/branchStudents/reportSummaryBatch.js";

test("collects both report types while bounding concurrent students", async () => {
  let activeStudents = 0;
  let maxActiveStudents = 0;
  const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

  const rows = await collectBranchStudentReportSummaries(
    [{ id: "REC-1", studentId: "STU-1" }, { id: "REC-2", studentId: "STU-2" }, { id: "REC-3", studentId: "STU-3" }],
    {
      concurrency: 2,
      async getAcademicReport(studentId) {
        activeStudents += 1;
        maxActiveStudents = Math.max(maxActiveStudents, activeStudents);
        await wait(5);
        activeStudents -= 1;
        return { evaluations: [{ name: "Academic " + studentId }] };
      },
      async getSyllabusReport(studentId) {
        await wait(5);
        return { items: [{ testName: "Syllabus " + studentId }] };
      },
    },
  );

  assert.equal(rows.length, 3);
  assert.equal(maxActiveStudents, 2);
  assert.deepEqual(rows[1], {
    studentId: "STU-2",
    recordId: "REC-2",
    academicReport: { evaluations: [{ name: "Academic STU-2" }] },
    syllabusReport: { items: [{ testName: "Syllabus STU-2" }] },
  });
});

test("keeps a successful report when the other report type fails", async () => {
  const rows = await collectBranchStudentReportSummaries(
    [{ id: "REC-1", studentId: "STU-1" }],
    {
      getAcademicReport: async () => { throw new Error("academic report unavailable"); },
      getSyllabusReport: async () => ({ items: [{ testName: "Submitted" }] }),
    },
  );

  assert.deepEqual(rows, [{
    studentId: "STU-1",
    recordId: "REC-1",
    academicReport: {},
    syllabusReport: { items: [{ testName: "Submitted" }] },
  }]);
});