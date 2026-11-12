import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { buildBranchEntityId } from "../../common/utils/branchIdentifiers.js";
import { courseFieldErrors, courseNameKey, textKey, normalizeCourseCode, validateImportCourseCode } from "./courseValidation.js";
import { distributePercentages } from "./courseCalculations.js";
import { prepareBranchCourse, createBranchCourseInTransaction, lockCourseBranch } from "./branchCourses.service.js";

export const COURSE_IMPORT_MAX_BYTES = 8 * 1024 * 1024;
export const COURSE_IMPORT_LIMITS = { Courses: 100, "Course Modules": 1000, "Course Submodules": 10000, "Payment Plans": 1000 };
export const COURSE_SHEETS = {
  Courses: ["Course Code", "Course Type", "Course Name", "Mode", "Duration in Months", "Total Course Hours", "Standard Course Fee", "Registration Fee", "Discount", "Academic Test Count", "Status"],
  "Course Modules": ["Course Code", "Module Name"],
  "Course Submodules": ["Course Code", "Module Name", "Submodule Name"],
  "Payment Plans": ["Course Code", "Payment Plan Name"],
};
const FIELDS = ["courseCode", "courseType", "name", "mode", "duration", "hours", "actualFees", "registrationFees", "discount", "academicTestCount", "status"];
const CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function paymentPlanAlias(value) {
  const key = textKey(value).replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\s+plan$/, "").trim();
  if (/^full (?:payment|installments?|instalments?)$/.test(key)) return { planType: "FULL_PAYMENT" };
  const match = key.match(/^(\d+)\s+(?:installments?|instalments?)$/);
  return match ? { installmentCount: Number(match[1]) } : null;
}

function acceptedPaymentPlanAliases(template, templates) {
  const aliases = [];
  const sameType = templates.filter((candidate) => String(candidate.planType || "").toUpperCase() === String(template.planType || "").toUpperCase());
  const sameCount = templates.filter((candidate) => Number(candidate.installmentCount) === Number(template.installmentCount));
  if (String(template.planType || "").toUpperCase() === "FULL_PAYMENT" && sameType.length === 1) aliases.push("Full Payment", "Full Payment Plan");
  if (Number(template.installmentCount) > 1 && sameCount.length === 1) aliases.push(`${template.installmentCount} Installment`, `${template.installmentCount} Installments`, `${template.installmentCount} Installment Plan`, `${template.installmentCount} Installments Plan`);
  const canonicalNames = new Set(templates.map((candidate) => textKey(candidate.templateName)));
  return aliases.filter((alias) => !canonicalNames.has(textKey(alias)));
}

function paymentPlanOptionNames(templates) {
  const names = [];
  for (const template of templates) {
    for (const name of [template.templateName, ...acceptedPaymentPlanAliases(template, templates)]) {
      if (!names.some((existing) => textKey(existing) === textKey(name))) names.push(name);
    }
  }
  return names;
}

function matchPaymentPlanTemplates(templates, value) {
  const exact = templates.filter((plan) => textKey(plan.templateName) === textKey(value));
  if (exact.length) return exact;
  const alias = paymentPlanAlias(value);
  if (!alias) return [];
  return templates.filter((plan) => alias.planType
    ? String(plan.planType || "").toUpperCase() === alias.planType
    : Number(plan.installmentCount) === alias.installmentCount);
}

function excelPaymentPlan(value, row) {
  const name = String(value ?? '').trim();
  const alias = paymentPlanAlias(name);
  const installmentCount = alias?.installmentCount || (alias?.planType === 'FULL_PAYMENT' ? 1 : 1);
  return {
    id: `excel-payment-plan-${row}`,
    type: 'custom',
    planType: installmentCount <= 1 ? 'FULL_PAYMENT' : 'CUSTOM',
    templateName: name,
    installmentCount,
    dueRule: 'Admission',
    allowCustomization: true,
    status: 'ACTIVE',
  };
}

// Keep only the payment plans explicitly assigned to the course in the Excel
// workbook. Branch-level templates are available for future edits, but must
// not be silently assigned to every imported course.
function mergeActiveBranchPaymentPlans(course) {
  const plans = Array.isArray(course?.data?.paymentPlans) ? course.data.paymentPlans : [];
  const merged = [];
  const seenIds = new Set();
  const seenNames = new Set();

  const add = (plan) => {
    const custom = String(plan?.type || '').toLowerCase() === 'custom';
    const templateId = custom ? '' : textKey(plan?.templateId || plan?.id);
    const templateName = textKey(plan?.templateName || plan?.planName);
    if (!templateId && !templateName) return;
    if ((templateId && seenIds.has(templateId)) || (templateName && seenNames.has(templateName))) return;
    if (templateId) seenIds.add(templateId);
    if (templateName) seenNames.add(templateName);
    const normalized = { ...plan };
    if (custom) {
      delete normalized.templateId;
      normalized.type = 'custom';
    } else {
      normalized.templateId = plan.templateId || plan.id;
      normalized.type = 'template';
    }
    merged.push(normalized);
  };

  plans.forEach(add);
  course.data.paymentPlans = merged;
}
export const workbookHash = (buffer) => createHash("sha256").update(buffer).digest("hex");
const EDIT_COLUMNS = Object.fromEntries(Object.entries(COURSE_SHEETS).map(([sheet, headers]) => [sheet, new Map(headers.map((header, index) => [header, index + 1]))]));
function normalizeCourseEdits(input = {}) {
  let source = input;
  if (typeof input === "string") { try { source = JSON.parse(input); } catch { throw new AppError("Sheet edits are invalid. Reopen the preview and try again.", 400); } }
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new AppError("Sheet edits are invalid.", 400);
  // Accept the original Courses-only edit shape for clients already on an open preview.
  if (Object.keys(source).length && Object.keys(source).every((key) => /^\d+$/.test(key))) source = { Courses: source };
  for (const sheet of Object.keys(source)) if (!Object.hasOwn(COURSE_SHEETS, sheet)) throw new AppError("Sheet edits contain an unknown sheet.", 400);
  const normalized = {};
  let editedRows = 0;
  for (const [sheet] of Object.entries(COURSE_SHEETS)) {
    const rowMap = source[sheet];
    if (rowMap == null) continue;
    if (typeof rowMap !== "object" || Array.isArray(rowMap)) throw new AppError("Sheet edits are invalid.", 400);
    const entries = Object.entries(rowMap);
    if (entries.length > COURSE_IMPORT_LIMITS[sheet]) throw new AppError(sheet + " has too many edited rows.", 400);
    const rows = {};
    for (const [rowText, columns] of entries.sort(([left], [right]) => Number(left) - Number(right))) {
      const row = Number(rowText);
      if (!Number.isInteger(row) || row < 2 || row > COURSE_IMPORT_LIMITS[sheet] + 1001 || !columns || typeof columns !== "object" || Array.isArray(columns)) throw new AppError(sheet + " edits contain an invalid row.", 400);
      const target = {};
      for (const [header, value] of Object.entries(columns)) {
        if (!EDIT_COLUMNS[sheet].has(header) || (typeof value !== "string" && typeof value !== "number") || (typeof value === "number" && !Number.isFinite(value)) || String(value).length > 200) throw new AppError(sheet + " edits contain an invalid column value.", 400);
        target[header] = value;
      }
      if (Object.keys(target).length) { rows[row] = Object.fromEntries(Object.entries(target).sort(([left], [right]) => EDIT_COLUMNS[sheet].get(left) - EDIT_COLUMNS[sheet].get(right))); editedRows += 1; }
    }
    if (Object.keys(rows).length) normalized[sheet] = rows;
  }
  if (editedRows > Object.values(COURSE_IMPORT_LIMITS).reduce((sum, limit) => sum + limit, 0)) throw new AppError("Too many worksheet rows were edited.", 400);
  return normalized;
}
function courseUploadHash(buffer, edits) {
  const normalized = normalizeCourseEdits(edits);
  if (!Object.keys(normalized).length) return workbookHash(buffer);
  return createHash("sha256").update(buffer).update("\0").update(JSON.stringify(normalized)).digest("hex");
}
function applyCourseEdits(workbook, edits) {
  const normalized = normalizeCourseEdits(edits);
  for (const sheetName of Object.keys(normalized)) if (!workbook.getWorksheet(sheetName)) throw new AppError("The " + sheetName + " sheet is missing, so its edits cannot be applied.", 400);
  const courseCodeChanges = [];
  const courseSheet = workbook.getWorksheet("Courses");
  for (const [rowText, columns] of Object.entries(normalized.Courses || {})) {
    if (!Object.hasOwn(columns, "Course Code")) continue;
    const row = Number(rowText), oldCode = String(courseSheet.getCell(row, 1).value ?? "").trim(), newCode = String(columns["Course Code"] ?? "");
    if (oldCode && oldCode !== newCode.trim()) courseCodeChanges.push({ oldCode, newCode });
  }
  const moduleRenames = [];
  const originalModuleSheet = workbook.getWorksheet("Course Modules");
  for (const [rowText, columns] of Object.entries(normalized["Course Modules"] || {})) {
    if (!Object.hasOwn(columns, "Module Name")) continue;
    const row = Number(rowText), oldCode = String(originalModuleSheet.getCell(row, 1).value ?? "").trim(), oldName = String(originalModuleSheet.getCell(row, 2).value ?? "").trim(), newName = String(columns["Module Name"] ?? "");
    if (oldName && oldName !== newName.trim()) moduleRenames.push({ oldCode, oldName, newName });
  }
  for (const [sheetName, rowMap] of Object.entries(normalized)) {
    const sheet = workbook.getWorksheet(sheetName);
    for (const [rowText, columns] of Object.entries(rowMap)) {
      const row = Number(rowText);
      for (const [header, value] of Object.entries(columns)) sheet.getCell(row, EDIT_COLUMNS[sheetName].get(header)).value = value;
    }
  }
  for (const { oldCode, newCode } of courseCodeChanges) {
    for (const sheetName of ["Course Modules", "Course Submodules", "Payment Plans"]) workbook.getWorksheet(sheetName)?.eachRow((row, number) => {
      if (number > 1 && String(row.getCell(1).value ?? "").trim() === oldCode) row.getCell(1).value = newCode;
    });
  }
  const submoduleSheet = workbook.getWorksheet("Course Submodules");
  for (const { oldCode, oldName, newName } of moduleRenames) {
    const newCode = courseCodeChanges.find((change) => change.oldCode === oldCode)?.newCode || oldCode;
    submoduleSheet?.eachRow((child, number) => {
      if (number > 1 && String(child.getCell(1).value ?? "").trim() === newCode && String(child.getCell(2).value ?? "").trim() === oldName) child.getCell(2).value = newName;
    });
  }
  return normalized;
}
export function validateCourseUpload(file) {
  if (!file?.buffer?.length) throw new AppError("Choose a non-empty .xlsx file", 400);
  if (!/\.xlsx$/i.test(file.originalname || "")) throw new AppError("Only .xlsx workbooks are supported", 400);
  if (file.buffer.length > COURSE_IMPORT_MAX_BYTES) throw new AppError("The workbook must be 8 MB or smaller", 400);
  const mime = String(file.mimetype || "").toLowerCase();
  if (mime && ![CONTENT_TYPE, "application/octet-stream", "application/zip", "application/x-zip-compressed"].includes(mime)) throw new AppError("Invalid Excel file type", 400);
  validateWorkbookArchive(file.buffer);
}
// Check ZIP directory sizes before ExcelJS decompresses anything.
export function validateWorkbookArchive(buffer) {
  if (buffer.length > COURSE_IMPORT_MAX_BYTES || buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) throw new AppError("Invalid .xlsx workbook", 400);
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new AppError("Invalid or encrypted workbook", 400);
  const entries = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16), expanded = 0;
  if (!entries || entries > 200) throw new AppError("Workbook contains too many archive entries", 400);
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50) throw new AppError("Invalid workbook archive", 400);
    const length = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 46, offset + 46 + length).toString("utf8");
    if (buffer.readUInt16LE(offset + 8) & 1 || /vbaProject/i.test(name)) throw new AppError("Encrypted or macro-enabled workbooks are unsupported", 400);
    expanded += buffer.readUInt32LE(offset + 24);
    if (expanded > 48 * 1024 * 1024) throw new AppError("Workbook expands beyond the 48 MB processing limit", 400);
    offset += 46 + length + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
}
function errorAt(errors, sheet, row, column, message) { errors.push({ sheet, row, column, message }); }
function cellValue(cell, errors, sheet, row, column) {
  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "object") {
    errorAt(errors, sheet, row, column, "Use a plain text or number value; formulas, dates and linked cells are unsupported");
    return "";
  }
  if (typeof value === "boolean") {
    errorAt(errors, sheet, row, column, "Use a text or number value");
    return "";
  }
  return typeof value === "string" ? value.trim() : value;
}
function styleSheet(sheet, headers) {
  sheet.addRow(headers);
  sheet.getRow(1).height = 34;
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF17345F" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  headers.forEach((header, i) => { sheet.getColumn(i + 1).width = Math.max(22, header.length + 3); });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
}
function excelResult(buffer, fileName) { return { buffer: Buffer.from(buffer), fileName, contentType: CONTENT_TYPE }; }
export async function createCourseTemplate(profile, db = prisma) {
  const plans = await db.branchInstallmentTemplate.findMany({ where: { branchId: profile.id, branchCourseId: null, status: "ACTIVE" }, orderBy: { templateName: "asc" } });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CISPRO";
  for (const [name, headers] of Object.entries(COURSE_SHEETS)) {
    const sheet = workbook.addWorksheet(name);
    styleSheet(sheet, headers);
    sheet.getCell("A1").note = "Use the same course code on all four sheets. Example: " + buildBranchEntityId(profile.branchId, "COU", 1) + ". New courses only; existing codes are rejected.";
  }
  const courses = workbook.getWorksheet("Courses");
  courses.getCell("I1").note = "Discount is a whole currency amount, not a percentage. Blank means zero. No GST.";
  courses.getCell("J1").note = "At least one academic test is required.";
  for (let row = 2; row <= 101; row++) {
    courses.getCell(row, 4).dataValidation = { type: "list", allowBlank: false, formulae: ['"Online,Offline,Hybrid"'], showErrorMessage: true, error: "Choose Online, Offline or Hybrid" };
    courses.getCell(row, 11).dataValidation = { type: "list", allowBlank: false, formulae: ['"Active,Inactive"'], showErrorMessage: true, error: "Choose Active or Inactive" };
  }
  const payment = workbook.getWorksheet("Payment Plans");
  const names = paymentPlanOptionNames(plans);
  payment.getCell("B1").note = names.length ? "Use an active branch plan name or supported alias: " + names.join("; ") : "Create an active branch payment plan before importing. Names must match existing branch templates.";
  const list = names.join(",");
  if (names.length && list.length <= 250 && names.every((name) => !/[,"]/.test(name))) {
    for (let row = 2; row <= 1001; row++) payment.getCell(row, 2).dataValidation = { type: "list", formulae: ['"' + list + '"'], showErrorMessage: true, error: "Choose an active payment plan name or supported alias" };
  }
  return excelResult(await workbook.xlsx.writeBuffer(), "course-upload-template.xlsx");
}
export async function validateCourseWorkbook(buffer, profile, db = prisma, edits = {}, { allowExistingCourseCodes = [] } = {}) {
  validateWorkbookArchive(buffer);
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(Buffer.from(buffer)); } catch (error) {
    const reason = String(error?.message || error || "Unknown Excel parser error").replace(/\s+/g, " ").slice(0, 300);
    console.error("[course-import] Excel workbook parse failed", { bytes: buffer?.length || 0, reason });
    throw new AppError("Could not read this Excel workbook. It may be damaged, encrypted, or saved in a different format. Download the Course Excel template, edit it, save as Excel Workbook (*.xlsx), and upload it again.", 400);
  }
  const normalizedEdits = applyCourseEdits(workbook, edits);
  const errors = [], rows = {};
  const names = Object.keys(COURSE_SHEETS);
  if (workbook.worksheets.length !== 4 || workbook.worksheets.some((sheet) => !names.includes(sheet.name))) errorAt(errors, "Workbook", 0, "Sheets", "Use exactly these four sheets: " + names.join(", "));
  for (const [name, headers] of Object.entries(COURSE_SHEETS)) {
    const sheet = workbook.getWorksheet(name);
    rows[name] = [];
    if (!sheet) { errorAt(errors, name, 1, "Sheet", "Required sheet is missing"); continue; }
    if (sheet.rowCount > COURSE_IMPORT_LIMITS[name] + 1001 || sheet.columnCount > 100) throw new AppError(name + " exceeds the worksheet processing limits", 400);
    headers.forEach((header, i) => {
      if (String(sheet.getRow(1).getCell(i + 1).value ?? "").trim() !== header) errorAt(errors, name, 1, header, "Expected header: " + header);
    });
    sheet.getRow(1).eachCell((cell, i) => { if (i > headers.length && cell.value != null) errorAt(errors, name, 1, "Headers", "Extra columns are not supported"); });
    sheet.eachRow((row, number) => {
      if (number === 1) return;
      const nonempty = row.values.some((value) => value != null && String(value).trim() !== "");
      if (!nonempty) return;
      if (rows[name].length >= COURSE_IMPORT_LIMITS[name]) throw new AppError(name + " supports at most " + COURSE_IMPORT_LIMITS[name] + " data rows", 400);
      const values = headers.map((header, i) => cellValue(row.getCell(i + 1), errors, name, number, header));
      row.eachCell((cell, i) => { if (i > headers.length && cell.value != null) errorAt(errors, name, number, "Columns", "Remove values outside the template columns"); });
      rows[name].push({ row: number, values });
    });
  }
  const [existing, templates] = await Promise.all([
    db.branchCourse.findMany({ where: { branchId: profile.id }, select: { courseCode: true, name: true } }),
    db.branchInstallmentTemplate.findMany({ where: { branchId: profile.id, branchCourseId: null, status: "ACTIVE" }, orderBy: { templateName: "asc" } }),
  ]);
  const templateNameCounts = new Map();
  for (const template of templates) {
    const key = textKey(template.templateName);
    templateNameCounts.set(key, (templateNameCounts.get(key) || 0) + 1);
  }
  const availablePaymentPlans = templates
    .filter((template) => templateNameCounts.get(textKey(template.templateName)) === 1)
    .map((template) => ({ templateName: template.templateName, installmentCount: template.installmentCount, planType: template.planType, aliases: acceptedPaymentPlanAliases(template, templates) }));
  const ambiguousPaymentPlanNames = [...templateNameCounts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
  const existingCodes = new Set(existing.map((course) => {
    try { return textKey(normalizeCourseCode(course.courseCode, profile.branchId)); } catch { return textKey(course.courseCode); }
  }));
  const existingNames = new Set(existing.map((course) => courseNameKey(course.name)));
  const previouslyImportedCodes = new Set(allowExistingCourseCodes.map((value) => {
    try { return textKey(normalizeCourseCode(String(value), profile.branchId)); } catch { return textKey(value); }
  }));
  const courseMap = new Map(), duplicateCourseRows = new Set(), seenNames = new Set(), courses = [];
  const codeFor = (value, sheet, row) => {
    try {
      if (!String(value).trim()) throw new Error("Course Code is required");
      return validateImportCourseCode(String(value), profile.branchId);
    } catch (error) { errorAt(errors, sheet, row, "Course Code", error.message); return null; }
  };
  for (const { row, values } of rows.Courses) {
    const data = Object.fromEntries(FIELDS.map((field, i) => [field, values[i]]));
    for (const error of courseFieldErrors(data)) errorAt(errors, "Courses", row, COURSE_SHEETS.Courses[FIELDS.indexOf(error.field)], error.message);
    const code = codeFor(data.courseCode, "Courses", row);
    const nameKey = courseNameKey(data.name);
    if (code) {
      const firstCourse = courseMap.get(code);
      if (firstCourse) {
        const message = "Duplicate course code in this workbook after normalization: " + code;
        if (!duplicateCourseRows.has(firstCourse.row)) {
          errorAt(errors, "Courses", firstCourse.row, "Course Code", message);
          duplicateCourseRows.add(firstCourse.row);
        }
        errorAt(errors, "Courses", row, "Course Code", message);
      }
      if (existingCodes.has(textKey(code)) && !previouslyImportedCodes.has(textKey(code))) errorAt(errors, "Courses", row, "Course Code", "Course code already exists in this branch after normalization: " + code);
    }
    if (seenNames.has(nameKey)) errorAt(errors, "Courses", row, "Course Name", "Duplicate course name in this workbook");
    else if (existingNames.has(nameKey) && !previouslyImportedCodes.has(textKey(code))) errorAt(errors, "Courses", row, "Course Name", "Course name already exists in this branch");
    seenNames.add(nameKey);
    const course = { row, enteredCode: String(data.courseCode), data: { ...data, courseCode: code || String(data.courseCode), discount: data.discount || 0, modules: [], paymentPlans: [] }, moduleMap: new Map() };
    courses.push(course);
    if (code && !courseMap.has(code)) courseMap.set(code, course);
  }
  if (!courses.length) errorAt(errors, "Courses", 2, "Course Code", "Add at least one course");
  const parent = (value, sheet, row) => {
    const code = codeFor(value, sheet, row);
    const course = courseMap.get(code);
    if (code && !course) errorAt(errors, sheet, row, "Course Code", "Course must be listed in this workbook's Courses sheet");
    return course;
  };
  for (const { row, values: [code, title] } of rows["Course Modules"]) {
    const course = parent(code, "Course Modules", row);
    const key = textKey(title);
    if (!key || String(title).length > 200) errorAt(errors, "Course Modules", row, "Module Name", "Module name is required and must not exceed 200 characters");
    if (!course || !key) continue;
    if (course.moduleMap.has(key)) { errorAt(errors, "Course Modules", row, "Module Name", "Duplicate module in this course"); continue; }
    const module = { name: String(title), submodules: [], row, submoduleKeys: new Set() };
    course.moduleMap.set(key, module); course.data.modules.push(module);
  }
  for (const { row, values: [code, moduleName, title] } of rows["Course Submodules"]) {
    const course = parent(code, "Course Submodules", row), module = course?.moduleMap.get(textKey(moduleName));
    if (!String(moduleName).trim()) errorAt(errors, "Course Submodules", row, "Module Name", "Module Name is required");
    else if (course && !module) errorAt(errors, "Course Submodules", row, "Module Name", "Module does not belong to this course");
    const key = textKey(title);
    if (!key || String(title).length > 200) errorAt(errors, "Course Submodules", row, "Submodule Name", "Submodule name is required and must not exceed 200 characters");
    if (!module || !key) continue;
    if (module.submoduleKeys.has(key)) errorAt(errors, "Course Submodules", row, "Submodule Name", "Duplicate submodule in this module");
    else { module.submoduleKeys.add(key); module.submodules.push({ name: String(title) }); }
  }
  for (const { row, values: [code, name] } of rows["Payment Plans"]) {
    const course = parent(code, "Payment Plans", row);
    if (!textKey(name)) { errorAt(errors, "Payment Plans", row, "Payment Plan Name", "Payment Plan Name is required"); continue; }
    const matches = matchPaymentPlanTemplates(templates, name);
    if (!course) continue;
    if (matches.length === 1) {
      if (course.data.paymentPlans.some((plan) => plan.templateId === matches[0].id)) { errorAt(errors, "Payment Plans", row, "Payment Plan Name", "Duplicate payment plan for this course"); continue; }
      course.data.paymentPlans.push({ ...matches[0], templateId: matches[0].id, type: "template" });
    } else {
      const custom = excelPaymentPlan(name, `${course.row}-${row}`);
      if (course.data.paymentPlans.some((plan) => textKey(plan.templateName) === textKey(custom.templateName))) { errorAt(errors, "Payment Plans", row, "Payment Plan Name", "Duplicate payment plan for this course"); continue; }
      course.data.paymentPlans.push(custom);
    }
  }
  const preview = [];
  for (const course of courses) {
    const { data, row } = course;
    mergeActiveBranchPaymentPlans(course);
    if (!data.modules.length) errorAt(errors, "Course Modules", 0, "Module Name", "Add at least one module for course " + data.courseCode);
    for (const module of data.modules) if (!module.submodules.length) errorAt(errors, "Course Submodules", 0, "Submodule Name", "Add at least one submodule for module \"" + module.name + "\" in course " + data.courseCode);
    if (!data.paymentPlans.length) errorAt(errors, "Payment Plans", 0, "Payment Plan Name", "Add a valid active payment plan for course " + data.courseCode);
    if (!errors.some((error) => error.sheet === "Courses" && error.row === row) && data.modules.length && data.paymentPlans.length && data.modules.every((module) => module.submodules.length)) {
      try {
        const prepared = await prepareBranchCourse(data, profile, db);
        course.data = { ...prepared.parsed, modules: prepared.hierarchy };
      } catch (error) { errorAt(errors, "Courses", row, "Course", error instanceof AppError ? error.message : "Unable to validate payment configuration. Please try again."); }
    }
    const moduleWeights = distributePercentages(data.modules.length);
    preview.push({
      row, enteredCode: course.enteredCode, ...course.data,
      modules: (course.data.modules || []).map((module, i) => ({
        ...module, percentage: moduleWeights[i],
        submodules: module.submodules.map((submodule, j) => ({ ...submodule, percentage: distributePercentages(module.submodules.length)[j] })),
        submoduleKeys: undefined,
      })),
    });
  }
  const invalidCourseRows = new Set();
  for (const course of courses) {
    const hasStructuralIssue = !course.data.modules.length
      || course.data.modules.some((module) => !module.submodules.length)
      || !course.data.paymentPlans.length;
    if (hasStructuralIssue || errors.some((error) => error.sheet === "Courses" && error.row === course.row)) invalidCourseRows.add(course.row);
  }
  for (const error of errors) {
    if (error.sheet === "Courses" || error.row < 2) continue;
    const row = rows[error.sheet]?.find((entry) => entry.row === error.row);
    if (!row) continue;
    try {
      const code = normalizeCourseCode(String(row.values[0] ?? ""), profile.branchId);
      const owner = courseMap.get(code);
      if (owner) invalidCourseRows.add(owner.row);
    } catch { /* the row is counted invalid in its own sheet; its course code is already invalid */ }
  }
  const duplicateMessage = (message) => /duplicate|already exists|matches multiple active branch templates/i.test(message);
  const invalidRowsBySheet = {};
  const duplicateRowsBySheet = {};
  const validationCounts = {};
  for (const sheetName of Object.keys(COURSE_SHEETS)) {
    const total = rows[sheetName].length;
    const invalidRows = sheetName === "Courses"
      ? invalidCourseRows
      : new Set(errors.filter((error) => error.sheet === sheetName && error.row >= 2).map((error) => error.row));
    const duplicateRows = new Set(errors.filter((error) => error.sheet === sheetName && error.row >= 2 && duplicateMessage(error.message)).map((error) => error.row));
    const invalid = Math.min(total, invalidRows.size);
    invalidRowsBySheet[sheetName] = [...invalidRows].sort((a, b) => a - b);
    duplicateRowsBySheet[sheetName] = [...duplicateRows].sort((a, b) => a - b);
    validationCounts[sheetName] = { total, valid: total - invalid, invalid };
  }
  const sheets = Object.fromEntries(Object.keys(COURSE_SHEETS).map((sheetName) => [sheetName, {
    headers: COURSE_SHEETS[sheetName],
    rows: rows[sheetName].map(({ row, values }) => ({ row, values: Object.fromEntries(COURSE_SHEETS[sheetName].map((header, index) => [header, values[index]])) })),
  }]));
  return {
    valid: errors.length === 0, previewHash: courseUploadHash(buffer, normalizedEdits), errors, courses: preview, sheets,
    availablePaymentPlans, ambiguousPaymentPlanNames, validationCounts, invalidRowsBySheet, duplicateRowsBySheet,
    totals: { courses: courses.length, modules: rows["Course Modules"].length, submodules: rows["Course Submodules"].length, paymentPlans: rows["Payment Plans"].length, errors: errors.length },
    limits: COURSE_IMPORT_LIMITS,
    payloads: courses.map((course) => course.data),
  };
}
export function publicCoursePreview(result) { const { payloads, ...preview } = result; return preview; }
export async function previewCourseWorkbook(buffer, profile, db = prisma, edits = {}) {
  const normalizedEdits = normalizeCourseEdits(edits);
  // Existing branch course codes and names must remain duplicates during
  // preview. Import receipts are used only by the guarded import transaction;
  // they must never make an already-existing course look valid to the user.
  const hash = courseUploadHash(buffer, normalizedEdits);
  const receipt = db.branchCourseImportReceipt?.findUnique
    ? await db.branchCourseImportReceipt.findUnique({ where: { branchId_uploadHash: { branchId: profile.id, uploadHash: hash } }, select: { summary: true } })
    : null;
  const allowExistingCourseCodes = Array.isArray(receipt?.summary?.courses)
    ? receipt.summary.courses.map((course) => course.courseCode).filter(Boolean)
    : [];
  const result = await validateCourseWorkbook(buffer, profile, db, normalizedEdits, { allowExistingCourseCodes });
  if (receipt && allowExistingCourseCodes.length && result.sheets?.Courses?.rows) {
    const existingRows = db.branchCourse?.findMany
      ? await db.branchCourse.findMany({ where: { branchId: profile.id, courseCode: { in: allowExistingCourseCodes } }, select: { courseCode: true } })
      : [];
    const existingCodes = new Set(existingRows.map((course) => textKey(course.courseCode)));
    const receiptDuplicateRows = result.sheets.Courses.rows
      .filter((row) => existingCodes.has(textKey(row.values?.['Course Code'])))
      .map((row) => row.row);
    result.duplicateRowsBySheet = {
      ...result.duplicateRowsBySheet,
      Courses: [...new Set([...(result.duplicateRowsBySheet?.Courses || []), ...receiptDuplicateRows])].sort((a, b) => a - b),
    };
  }
  return result;
}

async function activateImportedPaymentPlans(tx, payloads, profile, actorId) {
  const plans = new Map();
  for (const payload of payloads) {
    for (const plan of Array.isArray(payload?.paymentPlans) ? payload.paymentPlans : []) {
      if (String(plan?.type || '').toLowerCase() !== 'custom') continue;
      const name = String(plan.templateName || plan.planName || '').trim();
      if (!name) continue;
      const key = textKey(name);
      if (!plans.has(key)) {
        plan.templateName = name;
        plans.set(key, plan);
      }
    }
  }

  for (const plan of plans.values()) {
    const existing = await tx.branchInstallmentTemplate.findFirst({
      where: { branchId: profile.id, branchCourseId: null, templateName: { equals: plan.templateName, mode: 'insensitive' } },
    });
    const data = {
      templateName: plan.templateName,
      planType: plan.planType || (Number(plan.installmentCount) <= 1 ? 'FULL_PAYMENT' : 'CUSTOM'),
      installmentCount: Math.max(1, Number(plan.installmentCount) || 1),
      installments: Array.isArray(plan.installments) ? plan.installments : [],
      dueRule: plan.dueRule || 'Admission',
      allowCustomization: plan.allowCustomization !== false,
      status: 'ACTIVE',
      updatedBy: actorId,
    };
    if (existing) {
      const activeTemplate = await tx.branchInstallmentTemplate.update({ where: { id: existing.id }, data });
      plan.id = activeTemplate.id;
      plan.templateId = activeTemplate.id;
      plan.type = 'template';
    } else {
      const activeTemplate = await tx.branchInstallmentTemplate.create({ data: { ...data, branchId: profile.id, branchCourseId: null, createdBy: actorId } });
      plan.id = activeTemplate.id;
      plan.templateId = activeTemplate.id;
      plan.type = 'template';
    }
  }
}

async function syncExistingImportedCourses(tx, payloads, profile, actorId) {
  await activateImportedPaymentPlans(tx, payloads, profile, actorId);
  for (const payload of payloads) {
    const course = await tx.branchCourse.findFirst({ where: { branchId: profile.id, courseCode: payload.courseCode } });
    if (!course) continue;
    const paymentPlans = Array.isArray(payload.paymentPlans) ? payload.paymentPlans : [];
    await tx.branchCourse.update({
      where: { id: course.id },
      data: { paymentPlans, paymentPlanSelections: paymentPlans, updatedBy: actorId },
    });
    const primary = paymentPlans[0];
    if (!primary) continue;
    const templateData = {
      templateName: primary.templateName || primary.planName || 'Payment Plan',
      planType: primary.planType || (Number(primary.installmentCount) <= 1 ? 'FULL_PAYMENT' : 'CUSTOM'),
      installmentCount: Math.max(1, Number(primary.installmentCount) || 1),
      installments: Array.isArray(primary.installments) ? primary.installments : [],
      dueRule: primary.dueRule || 'Admission',
      allowCustomization: primary.allowCustomization !== false,
      status: 'ACTIVE',
      updatedBy: actorId,
    };
    const linkedTemplate = await tx.branchInstallmentTemplate.findFirst({ where: { branchId: profile.id, branchCourseId: course.id } });
    if (linkedTemplate) await tx.branchInstallmentTemplate.update({ where: { id: linkedTemplate.id }, data: templateData });
    else await tx.branchInstallmentTemplate.create({ data: { ...templateData, branchId: profile.id, branchCourseId: course.id, createdBy: actorId } });
  }
}

export async function importCourseWorkbook({ buffer, profile, actorId, previewHash, edits = {}, db = prisma }) {
  const normalizedEdits = normalizeCourseEdits(edits);
  const hash = courseUploadHash(buffer, normalizedEdits);
  if (previewHash !== hash) throw new AppError("The file changed. Validate it again before importing.", 400);
  try {
    return await db.$transaction(async (tx) => {
      await lockCourseBranch(tx, profile.id);
      const receipt = await tx.branchCourseImportReceipt.findUnique({ where: { branchId_uploadHash: { branchId: profile.id, uploadHash: hash } } });
      if (receipt) {
        const receiptCourses = Array.isArray(receipt.summary?.courses) ? receipt.summary.courses : [];
        const receiptIds = receiptCourses.map((course) => course.id).filter(Boolean);
        const byId = await tx.branchCourse.findMany({
          where: { branchId: profile.id, id: { in: receiptIds } },
          select: { id: true, courseCode: true, name: true },
        });
        const byReceiptId = new Map(byId.map((course) => [course.id, course]));
        const missingById = receiptCourses.filter((course) => !byReceiptId.has(course.id));
        const byCode = missingById.length ? await tx.branchCourse.findMany({
          where: { branchId: profile.id, courseCode: { in: missingById.map((course) => course.courseCode).filter(Boolean) } },
          select: { id: true, courseCode: true, name: true },
        }) : [];
        const byReceiptCode = new Map(byCode.map((course) => [textKey(course.courseCode), course]));
        const resolved = new Map();
        const missing = [];
        for (const importedCourse of receiptCourses) {
          const current = byReceiptId.get(importedCourse.id) || byReceiptCode.get(textKey(importedCourse.courseCode));
          if (current) resolved.set(importedCourse.id || textKey(importedCourse.courseCode), current);
          else missing.push(importedCourse);
        }
        if (!missing.length) {
          const result = await validateCourseWorkbook(buffer, profile, tx, normalizedEdits, {
            allowExistingCourseCodes: receiptCourses.map((course) => course.courseCode).filter(Boolean),
          });
          if (!result.valid) return { ...publicCoursePreview(result), imported: false };
          await syncExistingImportedCourses(tx, result.payloads, profile, actorId);
          const courses = receiptCourses.map((course) => resolved.get(course.id || textKey(course.courseCode))).filter(Boolean);
          return { ...receipt.summary, courses, alreadyImported: true, plansSynced: true };
        }

        // A receipt makes this exact workbook safe to retry. Keep surviving rows and
        // recreate only receipt rows whose course record was actually removed.
        const result = await validateCourseWorkbook(buffer, profile, tx, normalizedEdits, {
          allowExistingCourseCodes: receiptCourses.map((course) => course.courseCode).filter(Boolean),
        });
        if (!result.valid) return { ...publicCoursePreview(result), imported: false };
        const missingCodes = new Set(missing.map((course) => {
          try { return textKey(normalizeCourseCode(String(course.courseCode), profile.branchId)); } catch { return textKey(course.courseCode); }
        }));
        const payloads = result.payloads.filter((course) => {
          try { return missingCodes.has(textKey(normalizeCourseCode(String(course.courseCode), profile.branchId))); } catch { return false; }
        });
        if (payloads.length !== missing.length) throw new AppError("Some deleted courses could not be matched to the original workbook. Revalidate the file and try again.", 409);
        await activateImportedPaymentPlans(tx, payloads, profile, actorId);
        for (const payload of payloads) {
          const course = await createBranchCourseInTransaction(tx, payload, profile, actorId);
          const restored = { id: course.id, courseCode: course.courseCode, name: course.name };
          const original = missing.find((entry) => textKey(entry.courseCode) === textKey(payload.courseCode));
          if (original) resolved.set(original.id || textKey(original.courseCode), restored);
        }
        const courses = receiptCourses.map((course) => resolved.get(course.id || textKey(course.courseCode))).filter(Boolean);
        if (courses.length !== receiptCourses.length) throw new AppError("The original import receipt could not be fully restored. Refresh Course Management and try again.", 409);
        const summary = { ...receipt.summary, imported: true, courses };
        await tx.branchCourseImportReceipt.update({ where: { id: receipt.id }, data: { summary } });
        return { ...summary, restoredMissingCourses: missing.length };
      }
      const result = await validateCourseWorkbook(buffer, profile, tx, normalizedEdits);
      if (!result.valid) return { ...publicCoursePreview(result), imported: false };
      const imported = [];
      await activateImportedPaymentPlans(tx, result.payloads, profile, actorId);
      for (const payload of result.payloads) {
        const course = await createBranchCourseInTransaction(tx, payload, profile, actorId);
        imported.push({ id: course.id, courseCode: course.courseCode, name: course.name });
      }
      const summary = { imported: true, courses: imported, totals: result.totals };
      await tx.branchCourseImportReceipt.create({ data: { branchId: profile.id, uploadHash: hash, summary, createdBy: actorId } });
      return summary;
    }, { maxWait: 10000, timeout: 90000 });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.code === "P2002") throw new AppError("A course code or name now exists. Revalidate the workbook.", 409);
    throw new AppError("Import failed and all course changes were rolled back. Please try again.", 500);
  }
}
export async function createCourseErrorReport(errors) {
  if (!Array.isArray(errors) || errors.length > 30000) throw new AppError("Invalid error report", 400);
  const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet("Validation Errors");
  styleSheet(sheet, ["Sheet", "Row", "Column", "Error"]);
  errors.forEach((error) => sheet.addRow([String(error.sheet || ""), Number(error.row) || "", String(error.column || ""), String(error.message || "")]));
  sheet.getColumn(4).width = 90;
  return excelResult(await workbook.xlsx.writeBuffer(), "course-import-errors.xlsx");
}
