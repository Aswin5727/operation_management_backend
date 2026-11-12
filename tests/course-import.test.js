import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import http from "node:http";
import ExcelJS from "exceljs";
import { distributeBasisPoints, distributePercentages, buildCourseInstallments } from "../src/modules/branchCourses/courseCalculations.js";
import { courseFieldErrors, normalizeCourseCode, validateImportCourseCode } from "../src/modules/branchCourses/courseValidation.js";

const databaseUrl = process.env.COURSE_TEST_DATABASE_URL;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.pathname === "/course_import_test", "Integration tests require an isolated local course_import_test database");
  process.env.DATABASE_URL = databaseUrl;
}
const { COURSE_SHEETS, validateCourseWorkbook, previewCourseWorkbook, createCourseTemplate, createCourseErrorReport, importCourseWorkbook, workbookHash, validateCourseUpload } = await import("../src/modules/branchCourses/courseImport.service.js");
const { prepareBranchCourse, createBranchCourseInTransaction, updateBranchCourseInTransaction, updateBranchCourseModulesOnly, lockCourseBranch } = await import("../src/modules/branchCourses/branchCourses.service.js");
const profile = { id: "branch-a", branchId: "CISSAI001" };
const template = { id: "master-three", branchId: profile.id, branchCourseId: null, templateName: "3 Installments", installmentCount: 3, dueRule: "Admission", allowCustomization: true, status: "ACTIVE", planType: "CUSTOM" };
function stub({ existing = [], templates = [template] } = {}) {
  return { branchCourse: { findMany: async () => existing }, branchInstallmentTemplate: { findMany: async () => templates, findFirst: async ({ where }) => templates.find((plan) => plan.id === where.id && plan.branchId === where.branchId && plan.status === where.status) || null } };
}
async function workbook(codes = ["CISSAICOU001"], change = () => {}) {
  const book = new ExcelJS.Workbook();
  for (const [name, headers] of Object.entries(COURSE_SHEETS)) book.addWorksheet(name).addRow(headers);
  for (const [courseIndex, code] of codes.entries()) {
    book.getWorksheet("Courses").addRow([code, "Technical", "Course " + (courseIndex + 1), "Online", 6, 500, 50000, 2000, 5000, 3, "Active"]);
    for (const name of ["Basics", "Advanced", "Project"]) {
      book.getWorksheet("Course Modules").addRow([code, name]);
      for (const submodule of ["Introduction", "Practice", "Review"]) book.getWorksheet("Course Submodules").addRow([code, name, submodule]);
    }
    book.getWorksheet("Payment Plans").addRow([code, "3 Installments"]);
  }
  await change(book);
  return Buffer.from(await book.xlsx.writeBuffer());
}
test("percentage distribution uses exact basis points and handles empty input", () => {
  for (const count of [1, 2, 3, 4, 6, 7, 99, 10000]) {
    const weights = distributeBasisPoints(count);
    assert.equal(weights.length, count);
    assert.equal(weights.reduce((sum, value) => sum + value, 0), 10000);
  }
  assert.deepEqual(distributePercentages(3), [33.33, 33.33, 33.34]);
  assert.deepEqual(distributePercentages(0), []);
  assert.throws(() => distributeBasisPoints(10001));
});
test("installment calculation preserves existing manual splits and exact totals", () => {
  assert.deepEqual(buildCourseInstallments(47000, 3), [16000, 16000, 15000]);
  for (const total of [0, 1, 999, 47000]) for (const count of [1, 3, 4, 120]) {
    const amounts = buildCourseInstallments(total, count);
    assert.equal(amounts.reduce((sum, value) => sum + value, 0), total);
    assert.ok(amounts.every((amount) => amount >= 0 && Number.isInteger(amount)));
  }
  assert.throws(() => buildCourseInstallments(1, 121));
});
test("course-code aliases normalize to one branch-specific code", () => {
  for (const value of ["cis-001", " CIS001 ", "COU001", "CISSAICOU0001"]) assert.equal(normalizeCourseCode(value, profile.branchId), "CISSAICOU001");
  for (const value of ["CIS-000", "CISSAICOUABC"]) assert.throws(() => normalizeCourseCode(value, profile.branchId));
});
test("course upload requires the branch-specific three-digit course ID format", () => {
  assert.equal(validateImportCourseCode("CISSAICOU003", profile.branchId), "CISSAICOU003");
  for (const value of ["CIS-003", "COU003", "CISSAICOU3", "CISSAICOU000", "cisSAICOU003"]) {
    assert.throws(() => validateImportCourseCode(value, profile.branchId), /must match the format/);
  }
});
test("course workbook rejects IDs outside the exact branch-specific format", async () => {
  const result = await validateCourseWorkbook(await workbook(["CIS-001"]), profile, stub());
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.sheet === "Courses" && error.column === "Course Code" && /must match the format/.test(error.message)));
});
test("shared field validation rejects zero academic tests and invalid modes", () => {
  const errors = courseFieldErrors({ academicTestCount: 0, duration: 0, mode: "Invalid", discount: 500, actualFees: 100, registrationFees: 0 }, { partial: true });
  for (const field of ["academicTestCount", "duration", "mode", "discount"]) assert.ok(errors.some((error) => error.field === field));
  assert.ok(courseFieldErrors({ discount: 101 }, { partial: true, existing: { actualFees: 100, registrationFees: 0 } }).some((error) => error.field === "discount"));
});
test("template has exactly four sheets and the required two payment columns", async () => {
  const result = await createCourseTemplate(profile, stub());
  const book = new ExcelJS.Workbook(); await book.xlsx.load(result.buffer);
  assert.deepEqual(book.worksheets.map((sheet) => sheet.name), Object.keys(COURSE_SHEETS));
  assert.deepEqual(book.getWorksheet("Payment Plans").getRow(1).values.slice(1), ["Course Code", "Payment Plan Name"]);
  assert.equal(book.getWorksheet("Payment Plans").columnCount, 2);
  assert.ok(book.getWorksheet("Payment Plans").getCell("B1").note.includes("3 Installments"));
});
test("preview groups identical module names by course and exposes final codes, plans and weights", async () => {
  const result = await validateCourseWorkbook(await workbook(["CISSAICOU001", " CISSAICOU002 "]), profile, stub());
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(result.totals, { courses: 2, modules: 6, submodules: 18, paymentPlans: 2, errors: 0 });
  assert.equal(result.courses[0].courseCode, "CISSAICOU001");
  assert.deepEqual(result.courses[0].modules.map((module) => module.percentage), [33.33, 33.33, 33.34]);
  assert.deepEqual(result.courses[0].modules[0].submodules.map((module) => module.percentage), [33.33, 33.33, 33.34]);
  assert.deepEqual(result.courses[0].paymentPlans.map((plan) => plan.templateName), ["3 Installments"]);
  assert.deepEqual(result.courses[0].paymentPlans[0].installments, [16000, 16000, 15000]);
});
test("same normalized course code invalidates both workbook rows even when course names differ", async () => {
  const result = await validateCourseWorkbook(await workbook(["CISSAICOU003", "CISSAICOU003"], (book) => {
    book.getWorksheet("Courses").getCell("C3").value = "Python vs Java";
  }), profile, stub());
  assert.equal(result.valid, false);
  assert.deepEqual(result.duplicateRowsBySheet.Courses, [2, 3]);
  assert.deepEqual(result.invalidRowsBySheet.Courses, [2, 3]);
  assert.ok(result.errors.some((error) => error.row === 2 && /Duplicate course code/.test(error.message)));
  assert.ok(result.errors.some((error) => error.row === 3 && /Duplicate course code/.test(error.message)));
});
for (const [name, change, expected] of [
  ["missing sheet", (book) => book.removeWorksheet("Payment Plans"), /Required sheet/],
  ["extra sheet", (book) => book.addWorksheet("Notes"), /exactly/],
  ["incorrect header", (book) => { book.getWorksheet("Courses").getCell("A1").value = "Code"; }, /Expected header/],
  ["extra payment column", (book) => { book.getWorksheet("Payment Plans").getCell("C1").value = "Count"; }, /Extra columns/],
  ["normalized duplicate codes", (book) => { book.getWorksheet("Courses").addRow(["CISSAICOU001", "Technical", "Another", "Online", 6, 500, 50000, 2000, 0, 1, "Active"]); }, /Duplicate course code/],
  ["invalid numbers", (book) => { book.getWorksheet("Courses").getCell("F2").value = "wrong"; }, /whole number/],
  ["invalid status", (book) => { book.getWorksheet("Courses").getCell("K2").value = "Pending"; }, /Status must be/],
  ["invalid course reference", (book) => { book.getWorksheet("Course Modules").getCell("A2").value = "CISSAICOU999"; }, /must be listed/],
  ["invalid module reference", (book) => { book.getWorksheet("Course Submodules").getCell("B2").value = "Unrelated"; }, /does not belong/],
  ["duplicate module", (book) => book.getWorksheet("Course Modules").addRow(["CISSAICOU001", " basics "]), /Duplicate module/],
  ["duplicate submodule", (book) => book.getWorksheet("Course Submodules").addRow(["CISSAICOU001", "Basics", " introduction "]), /Duplicate submodule/],
  ["duplicate payment plan", (book) => book.getWorksheet("Payment Plans").addRow(["CISSAICOU001", "3 Installments"]), /Duplicate payment plan/],
  ["formula cell", (book) => { book.getWorksheet("Courses").getCell("G2").value = { formula: "1+1", result: 2 }; }, /plain text/],
  ["empty submodule list", (book) => { const sheet = book.getWorksheet("Course Submodules"); sheet.eachRow((row, i) => { if (i > 1) row.values = []; }); }, /at least one submodule/],
]) {
  test("workbook validation rejects " + name, async () => {
    const result = await validateCourseWorkbook(await workbook(undefined, change), profile, stub());
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => expected.test(error.message)), JSON.stringify(result.errors));
    assert.ok(result.errors.every((error) => error.sheet && error.column && Number.isInteger(error.row)));
  });
}
test("payment plans supplied by Excel are accepted without an active branch template", async () => {
  const result = await validateCourseWorkbook(await workbook(undefined, (book) => {
    book.getWorksheet("Payment Plans").getCell("B2").value = "Custom Excel Plan";
  }), profile, stub({ templates: [] }));
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(result.courses[0].paymentPlans[0].templateName, "Custom Excel Plan");
  assert.equal(result.courses[0].paymentPlans[0].type, "custom");
  assert.equal(result.courses[0].paymentPlans[0].installmentCount, 1);
});
test("duplicate existing names, codes and ambiguous plan names are rejected", async () => {
  const result = await validateCourseWorkbook(await workbook(), profile, stub({ existing: [{ courseCode: "CISSAICOU001", name: "Course 1" }], templates: [template, { ...template, id: "duplicate" }] }));
  for (const pattern of [/Course code already exists in this branch/, /Course name already exists/]) assert.ok(result.errors.some((error) => pattern.test(error.message)));
});
test("receipt retries can validate their prior course rows without bypassing workbook duplicates", async () => {
  const result = await validateCourseWorkbook(await workbook(), profile, stub({ existing: [{ courseCode: "CISSAICOU001", name: "Course 1" }] }), {}, { allowExistingCourseCodes: ["CISSAICOU001"] });
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(result.payloads.length, 1);
});
test("preview accepts an existing receipt course so its Excel plans can be synchronized", async () => {
  const db = stub({ existing: [{ courseCode: "CISSAICOU001", name: "Course 1" }] });
  db.branchCourseImportReceipt = { findUnique: async () => ({ summary: { courses: [{ courseCode: "CISSAICOU001" }] } }) };
  const result = await previewCourseWorkbook(await workbook(), profile, db);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
});
test("invalid archives and file extensions are rejected and errors export as plain cells", async () => {
  assert.throws(() => validateCourseUpload({ buffer: Buffer.from("not a workbook"), originalname: "file.xlsx" }));
  assert.throws(() => validateCourseUpload({ buffer: Buffer.alloc(30), originalname: "file.csv" }));
  const result = await createCourseErrorReport([{ sheet: "Courses", row: 2, column: "Name", message: "=unsafe user text" }]);
  const book = new ExcelJS.Workbook(); await book.xlsx.load(result.buffer);
  assert.equal(book.worksheets[0].getCell("D2").value, "=unsafe user text");
});

test("PostgreSQL import, rollback, edit and API regression", { skip: !databaseUrl }, async (t) => {
  const { PrismaClient } = await import("../prisma-client-v2/index.js");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  t.after(async () => { await db.$disconnect(); const { default: globalDb } = await import("../src/config/prisma.js"); await globalDb.$disconnect(); });
  await db.branchCourseImportReceipt.deleteMany();
  await db.branch.deleteMany();
  await db.user.deleteMany();
  const actor = await db.user.create({ data: { userCode: "TEST-ADMIN", fullName: "Test Admin", email: "test-admin@example.test", role: "BRANCH_ADMIN", passwordHash: "test-only" } });
  const faculty = await db.user.create({ data: { userCode: "TEST-FACULTY", fullName: "Test Faculty", email: "test-faculty@example.test", role: "FACULTY", passwordHash: "test-only" } });
  const branch = await db.branch.create({ data: { ...profile, branchName: "Test Branch", branchAdminName: actor.fullName, branchEmail: actor.email, branchPhone: "9000000001", branchAddress: "Test", adminUserId: actor.id } });
  await db.branchInstallmentTemplate.create({ data: { ...template, installments: [] } });
  let created, firstBuffer, fresh;
  await t.test("imports complete workbook with persisted percentages and correct relationships", async () => {
    firstBuffer = await workbook(["CIS-101", "CIS-102"]);
    created = await importCourseWorkbook({ buffer: firstBuffer, profile: branch, actorId: actor.id, previewHash: workbookHash(firstBuffer), db });
    assert.equal(created.imported, true);
    assert.equal(await db.branchCourse.count(), 2);
    fresh = await db.branchCourse.findUnique({ where: { id: created.courses[0].id }, include: { modules: { orderBy: { sequenceNo: "asc" }, include: { submodules: true } }, installmentTemplate: true } });
    assert.deepEqual(fresh.modules.map((module) => module.percentageBasisPoints), [3333, 3333, 3334]);
    assert.ok(fresh.modules.every((module) => module.submodules.every((submodule) => submodule.branchCourseModuleId === module.id)));
    assert.equal(fresh.modules[0].submodules.reduce((sum, submodule) => sum + submodule.percentageBasisPoints, 0), 10000);
    assert.deepEqual(fresh.paymentPlans[0].installments, [16000, 16000, 15000]);
    assert.deepEqual(fresh.installmentTemplate.installments, fresh.paymentPlans[0].installments);
  });
  await t.test("retry of the same workbook does not create duplicates", async () => {
    const repeat = await importCourseWorkbook({ buffer: firstBuffer, profile: branch, actorId: actor.id, previewHash: workbookHash(firstBuffer), db });
    assert.equal(repeat.alreadyImported, true);
    assert.equal(await db.branchCourse.count(), 2);
  });
  await t.test("retry restores only courses removed after an earlier import", async () => {
    await db.branchCourse.delete({ where: { id: created.courses[1].id } });
    assert.equal(await db.branchCourse.count({ where: { branchId: branch.id } }), 1);
    const restored = await importCourseWorkbook({ buffer: firstBuffer, profile: branch, actorId: actor.id, previewHash: workbookHash(firstBuffer), db });
    assert.equal(restored.imported, true);
    assert.equal(restored.restoredMissingCourses, 1);
    assert.equal(restored.courses.length, 2);
    assert.equal(await db.branchCourse.count({ where: { branchId: branch.id } }), 2);
    const receipt = await db.branchCourseImportReceipt.findUnique({ where: { branchId_uploadHash: { branchId: branch.id, uploadHash: workbookHash(firstBuffer) } } });
    assert.deepEqual(receipt.summary.courses.map((course) => course.id), restored.courses.map((course) => course.id));
    const repeat = await importCourseWorkbook({ buffer: firstBuffer, profile: branch, actorId: actor.id, previewHash: workbookHash(firstBuffer), db });
    assert.equal(repeat.alreadyImported, true);
    assert.equal(await db.branchCourse.count({ where: { branchId: branch.id } }), 2);
  });
  await t.test("validation errors block every course in a workbook", async () => {
    const buffer = await workbook(["CIS-201", "CIS-202"], (book) => { book.getWorksheet("Courses").getCell("J3").value = 0; });
    const result = await importCourseWorkbook({ buffer, profile: branch, actorId: actor.id, previewHash: workbookHash(buffer), db });
    assert.equal(result.imported, false); assert.equal(await db.branchCourse.count(), 2);
  });
  await t.test("database failure on the second course rolls back the first hierarchy and receipt", async () => {
    const buffer = await workbook(["CIS-301", "CIS-302"], (book) => { book.getWorksheet("Courses").getCell("C2").value = "Rollback A"; book.getWorksheet("Courses").getCell("C3").value = "Rollback B"; });
    const failing = { $transaction: (callback, options) => db.$transaction(async (tx) => {
      let calls = 0;
      const proxy = new Proxy(tx, { get(target, key) { if (key === "branchCourse") return new Proxy(target.branchCourse, { get(model, method) { if (method === "create") return async (args) => { if (++calls === 2) throw new Error("simulated database failure"); return model.create(args); }; return model[method]; } }); return target[key]; } });
      return callback(proxy);
    }, options) };
    await assert.rejects(importCourseWorkbook({ buffer, profile: branch, actorId: actor.id, previewHash: workbookHash(buffer), db: failing }), /rolled back/);
    assert.equal(await db.branchCourse.count(), 2);
    assert.equal(await db.branchCourseImportReceipt.count(), 1);
  });
  await t.test("manual creation uses identical validation, calculations and persistence", async () => {
    const source = (await validateCourseWorkbook(await workbook(["CIS-401"], (book) => { book.getWorksheet("Courses").getCell("C2").value = "Manual Course"; }), branch, db)).payloads[0];
    const manual = await db.$transaction((tx) => createBranchCourseInTransaction(tx, source, branch, actor.id));
    assert.deepEqual(manual.paymentPlans[0].installments, fresh.paymentPlans[0].installments);
    assert.deepEqual(manual.modules.map((module) => module.percentage), [33.33, 33.33, 33.34]);
    const invalid = { ...source, academicTestCount: 0 };
    await assert.rejects(prepareBranchCourse(invalid, branch, db), /academicTestCount/);
  });
  await t.test("editing preserves module, submodule and exam IDs and recalculates weights", async () => {
    const first = fresh.modules[0];
    const exam = await db.exam.create({ data: { branchCourseId: fresh.id, moduleId: first.id, facultyId: faculty.id, marksPerQuestion: 1, totalQuestions: 1, totalMarks: 1 } });
    const work = await db.facultyTodayWorkEntry.create({ data: { facultyUserId: faculty.id, branchId: branch.id, courseId: fresh.id, courseName: fresh.name, moduleId: first.id, moduleName: first.title, submoduleIds: [first.submodules[0].id], studentIds: [], workDate: "2026-10-21", courseProgress: 11.11 } });
    const beforeIds = fresh.modules.map((module) => module.id);
    const input = { name: "Edited Course", modules: [...fresh.modules.map((module) => ({ ...module, name: module.title })), { name: "New Module", submodules: [{ name: "New Topic" }] }] };
    const updated = await db.$transaction(async (tx) => { await lockCourseBranch(tx, branch.id); return updateBranchCourseInTransaction(tx, fresh.id, input, branch, actor.id); });
    assert.deepEqual(updated.modules.slice(0, 3).map((module) => module.id), beforeIds);
    assert.deepEqual(updated.modules.map((module) => module.percentage), [25, 25, 25, 25]);
    assert.equal(updated.modules[0].submodules[0].id, first.submodules[0].id);
    assert.equal((await db.exam.findUnique({ where: { id: exam.id } })).moduleId, first.id);
    assert.equal((await db.facultyTodayWorkEntry.findUnique({ where: { id: work.id } })).courseProgress, 11.11);
    const removal = { modules: updated.modules.slice(1) };
    await assert.rejects(db.$transaction((tx) => updateBranchCourseInTransaction(tx, fresh.id, removal, branch, actor.id)), /cannot be deleted/);
    const removeChild = { modules: updated.modules.map((module, i) => i ? module : { ...module, submodules: module.submodules.slice(1) }) };
    await assert.rejects(db.$transaction((tx) => updateBranchCourseInTransaction(tx, fresh.id, removeChild, branch, actor.id)), /cannot be deleted/);
    const expandedModules = updated.modules.map((module, index) => index ? module : {
      ...module, submodules: [...module.submodules, ...Array.from({ length: 7 }, (_, i) => ({ name: "Extra Topic " + i }))],
    });
    const expanded = await db.$transaction((tx) => updateBranchCourseInTransaction(tx, fresh.id, { modules: expandedModules }, branch, actor.id));
    assert.deepEqual(expanded.modules[0].submodules.map((item) => item.percentage), Array(10).fill(10));
    assert.equal(expanded.modules[0].submodules[0].id, first.submodules[0].id);
    const reduced = expanded.modules.map((module, index) => index ? module : { ...module, submodules: module.submodules.slice(0, 3) });
    const afterSubmoduleDelete = await db.$transaction((tx) => updateBranchCourseInTransaction(tx, fresh.id, { modules: reduced }, branch, actor.id));
    assert.deepEqual(afterSubmoduleDelete.modules[0].submodules.map((item) => item.percentage), [33.33, 33.33, 33.34]);
    const deleteUnused = await db.$transaction((tx) => updateBranchCourseInTransaction(tx, fresh.id, { modules: updated.modules.slice(0, 3) }, branch, actor.id));
    assert.deepEqual(deleteUnused.modules.map((module) => module.percentage), [33.33, 33.33, 33.34]);
    await assert.rejects(db.$transaction((tx) => updateBranchCourseInTransaction(tx, fresh.id, { expectedUpdatedAt: "2000-01-01T00:00:00.000Z", name: "Stale" }, branch, actor.id)), /changed since/);
  });
  await t.test("same code in another branch is allowed and references remain branch-scoped", async () => {
    const second = await db.branch.create({ data: { branchId: "CISMDU001", branchName: "Other", branchAdminName: "Other", branchEmail: "other@example.test", branchPhone: "9000000002", branchAddress: "Other" } });
    const otherTemplate = await db.branchInstallmentTemplate.create({ data: { ...template, id: "other-plan", branchId: second.id, installments: [] } });
    const buffer = await workbook(["CIS-101"]);
    const preview = await validateCourseWorkbook(buffer, second, db);
    assert.equal(preview.valid, true, JSON.stringify(preview.errors));
    const result = await importCourseWorkbook({ buffer, profile: second, actorId: actor.id, previewHash: workbookHash(buffer), db });
    const saved = await db.branchCourse.findUnique({ where: { id: result.courses[0].id } });
    assert.equal(saved.branchId, second.id); assert.equal(saved.paymentPlans[0].templateId, otherTemplate.id);
  });
  await t.test("approved module-only edits advance the course version and preserve IDs", async () => {
    const before = await db.branchCourse.findUnique({ where: { id: fresh.id }, include: { modules: { include: { submodules: true }, orderBy: { sequenceNo: "asc" } } } });
    const updated = await updateBranchCourseModulesOnly(fresh.id, { modules: before.modules }, faculty, { branchId: branch.id });
    assert.ok(new Date(updated.updatedAt).getTime() > before.updatedAt.getTime());
    assert.deepEqual(updated.modules.map((module) => module.id), before.modules.map((module) => module.id));
  });
  await t.test("concurrent identical imports create one workbook only", async () => {
    const buffer = await workbook(["CIS-601"], (book) => { book.getWorksheet("Courses").getCell("C2").value = "Concurrent Course"; });
    const input = { buffer, profile: branch, actorId: actor.id, previewHash: workbookHash(buffer), db };
    const results = await Promise.all([importCourseWorkbook(input), importCourseWorkbook(input)]);
    assert.equal(results.filter((result) => result.alreadyImported).length, 1);
    assert.equal(await db.branchCourse.count({ where: { branchId: branch.id, courseCode: "CISSAICOU601" } }), 1);
  });
  await t.test("historical plans remain editable when their master becomes inactive", async () => {
    await db.branchInstallmentTemplate.update({ where: { id: template.id }, data: { status: "INACTIVE" } });
    const result = await db.$transaction((tx) => updateBranchCourseInTransaction(tx, fresh.id, { description: "Preserve historical plans" }, branch, actor.id));
    assert.equal(result.paymentPlans[0].templateId, template.id);
    await db.branchInstallmentTemplate.update({ where: { id: template.id }, data: { status: "ACTIVE" } });
  });
  await t.test("HTTP endpoints enforce authentication/roles and accept real multipart workbooks", async () => {
    const { default: app } = await import("../app.js");
    const { createAccessToken } = await import("../src/common/utils/tokens.js");
    const server = http.createServer(app); await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = "http://127.0.0.1:" + server.address().port + "/api/v1/branch-courses/import";
    try {
      assert.equal((await fetch(base + "/template")).status, 401);
      const facultyToken = createAccessToken({ id: faculty.id, role: faculty.role, refreshTokenVersion: 0 });
      assert.equal((await fetch(base + "/template", { headers: { Authorization: "Bearer " + facultyToken } })).status, 403);
      const token = createAccessToken({ id: actor.id, role: actor.role, refreshTokenVersion: 0 });
      const headers = { Authorization: "Bearer " + token };
      const response = await fetch(base + "/template", { headers });
      assert.equal(response.status, 200); assert.match(response.headers.get("content-type"), /spreadsheetml/);
      const buffer = await workbook(["CIS-501"], (book) => { book.getWorksheet("Courses").getCell("C2").value = "API Course"; });
      const form = new FormData(); form.append("file", new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "courses.xlsx");
      const preview = await fetch(base + "/preview", { method: "POST", headers, body: form });
      const body = await preview.json(); assert.equal(preview.status, 200); assert.equal(body.data.valid, true, JSON.stringify(body));
      form.append("previewHash", body.data.previewHash);
      const imported = await fetch(base + "/import", { method: "POST", headers, body: form });
      const summary = await imported.json(); assert.equal(summary.data.imported, true, JSON.stringify(summary));
      const detail = await fetch(base.replace("/import", "") + "/" + summary.data.courses[0].id, { headers });
      assert.equal(detail.status, 200); assert.equal((await detail.json()).data.modules.length, 3);
    } finally { await new Promise((resolve) => server.close(resolve)); }
  });
  await t.test("additive migration backfills percentages without changing IDs", async () => {
    const migration = await readFile(new URL("../prisma/migrations/20261021000000_course_import_percentages/migration.sql", import.meta.url), "utf8");
    const { Client } = await import("pg"); const client = new Client({ connectionString: databaseUrl }); await client.connect();
    try {
      await client.query('BEGIN; CREATE SCHEMA migration_check; SET LOCAL search_path TO migration_check; CREATE TABLE "BranchCourseModule" (id TEXT PRIMARY KEY, "branchCourseId" TEXT, "sequenceNo" INT); CREATE TABLE "BranchCourseSubmodule" (id TEXT PRIMARY KEY, "branchCourseModuleId" TEXT, "sequenceNo" INT); INSERT INTO "BranchCourseModule" VALUES (\'m1\',\'c1\',1),(\'m2\',\'c1\',2),(\'m3\',\'c1\',3); INSERT INTO "BranchCourseSubmodule" VALUES (\'s1\',\'m1\',1),(\'s2\',\'m1\',2);');
      await client.query(migration);
      assert.deepEqual((await client.query('SELECT id, "percentageBasisPoints" AS weight FROM "BranchCourseModule" ORDER BY id')).rows, [{ id: "m1", weight: 3333 }, { id: "m2", weight: 3333 }, { id: "m3", weight: 3334 }]);
      assert.equal((await client.query('SELECT SUM("percentageBasisPoints")::INT AS total FROM "BranchCourseSubmodule"')).rows[0].total, 10000);
    } finally { await client.query("ROLLBACK"); await client.end(); }
  });
});
