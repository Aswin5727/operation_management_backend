import ExcelJS from "exceljs";
import JSZip from "jszip";
import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { resolveBranchId } from "./branchAttendanceReports.repository.js";
import { applyAcademicImportValues, validateAcademicImportValues } from "./completedStudentAcademicImport.js";
import { applyPaymentImportValues, validatePaymentImportValues } from "./completedStudentPaymentImport.js";
import { COMPLETED_STUDENT_COLUMNS } from "./completedStudentReportColumns.js";
const MAX_ROWS = 100;
const CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
async function loadCompletedStudentWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
    return workbook;
  } catch (parseError) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      let repaired = false;
      const relationshipFiles = Object.keys(zip.files).filter((name) => /^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/i.test(name));
      for (const fileName of relationshipFiles) {
        const file = zip.file(fileName);
        if (!file) continue;
        const xml = await file.async("string");
        const normalizedXml = xml.replace(/Target=(['"])\/xl\/tables\/([^'"]+)\1/g, "Target=$1../tables/$2$1");
        if (normalizedXml !== xml) {
          zip.file(fileName, normalizedXml);
          repaired = true;
        }
      }
      if (!repaired) throw parseError;
      const repairedBuffer = await zip.generateAsync({ type: "nodebuffer" });
      const repairedWorkbook = new ExcelJS.Workbook();
      await repairedWorkbook.xlsx.load(repairedBuffer);
      return repairedWorkbook;
    } catch {
      throw new AppError("Unable to read this Excel file. Please save it as a valid .xlsx workbook and try again.", 400);
    }
  }
}
const FIELDS = [...COMPLETED_STUDENT_COLUMNS, ["admissionDate", "Admission Date"]];
const ALIASES = { admissionfees: "registrationFees", registrationfees: "registrationFees", registrationfee: "registrationFees", contact: "contactNumber", mobilenumber: "contactNumber", email: "emailId", parentname: "parentGuardian", parentguardian: "parentGuardian", parentspousenumber: "parentSpouseNumber", parentspouseno: "parentSpouseNumber", source: "databaseSource", project: "academicProject", academicproject: "academicProject", studentstatus: "studentStatus", dateofadmission: "admissionDate" };
const clean = (value) => value === null || value === undefined ? "" : String(value instanceof Date ? value.toISOString().slice(0, 10) : value).trim();
const key = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const courseKey = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
const missing = (value) => !clean(value) || ["-", "N/A"].includes(clean(value).toUpperCase());
const number = (value) => { if (missing(value)) return null; const parsed = Number(clean(value).replace(/[\u20B9,]/g, "")); return Number.isFinite(parsed) ? parsed : null; };
const DATE_FORMAT_HINT = "Use DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, or YYYY-MM-DD.";
const dateInfo = (value) => {
  if (missing(value)) return { value: "", invalid: false };
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? { value: "", invalid: true }
      : { value: value.toISOString().slice(0, 10), invalid: false };
  }
  // Reject arbitrary strings/numbers; JavaScript accepts ambiguous values such as 2.4.74537.
  const raw = clean(value);
  const isoMatch = raw.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
  const dmyMatch = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (!isoMatch && !dmyMatch) return { value: "", invalid: true };
  const year = Number(isoMatch ? isoMatch[1] : dmyMatch[3]);
  const month = Number(isoMatch ? isoMatch[2] : dmyMatch[2]);
  const day = Number(isoMatch ? isoMatch[3] : dmyMatch[1]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return { value: "", invalid: true };
  return { value: parsed.toISOString().slice(0, 10), invalid: false };
};
const date = (value) => dateInfo(value).value;
const numberInfo = (value) => { if (missing(value)) return { value: null, invalid: false }; const parsed = Number(clean(value).replace(/[\u20B9,]/g, "")); return { value: Number.isFinite(parsed) ? parsed : null, invalid: !Number.isFinite(parsed) }; };
const percentageInfo = (value) => { if (missing(value)) return { value: null, invalid: false }; const parsed = Number(clean(value).replace(/%/g, "").replace(/,/g, "")); return { value: Number.isFinite(parsed) ? parsed : null, invalid: !Number.isFinite(parsed) }; };

function normalizeStudentStatus(value) {
  const normalized = key(value);
  if (["completed", "completedstudent", "completedstudents"].includes(normalized)) return "Completed Student";
  if (["discontinued", "discontinuedstudent", "discontinuedstudents"].includes(normalized)) return "Discontinued Student";
  return clean(value);
}
function canonicalHeader(value) {
  const normalized = key(value); if (ALIASES[normalized]) return ALIASES[normalized];
  const direct = FIELDS.find(([name, label]) => name === normalized || key(label) === normalized); if (direct) return direct[0];
  const assessment = normalized.match(/assessment(\d+)/); if (assessment) return `assessment${String(Number(assessment[1])).padStart(2, "0")}`;
  const installment = normalized.match(/(?:installment|instalment)(\d+)(paidamount|pendingamount|paymentdate|modeofcollection|mode|receiptnumber|receiptno)/); return installment ? `installment${Number(installment[1])}${installment[2]}` : "";
}
function readRows(workbook) {
  const sheet = workbook.worksheets[0]; if (!sheet) throw new AppError("The workbook has no worksheet.", 400); let headerRow = 0; sheet.eachRow((row, rowNumber) => { if (!headerRow && row.values.some((value) => key(value) === "studentid")) headerRow = rowNumber; }); if (!headerRow) throw new AppError("Student ID column is missing. Download and use the official template.", 400);
  const firstHeader = Array.from({ length: sheet.columnCount }, (_, index) => clean(sheet.getRow(headerRow).getCell(index + 1).value)); const secondHeader = Array.from({ length: sheet.columnCount }, (_, index) => clean(sheet.getRow(headerRow + 1).getCell(index + 1).value)); const hasGroupedHeader = secondHeader.some((value) => ["paidamount", "pendingamount", "paymentdate", "modeofcollection", "receiptnumber", "receiptno"].includes(key(value)));
  let parent = ""; const headers = firstHeader.map((value, index) => { if (value) parent = value; const child = secondHeader[index]; return hasGroupedHeader && child && key(parent).match(/(?:installment|instalment)\d+/) ? canonicalHeader(`${parent} ${child}`) : canonicalHeader(value); }); const dataStart = hasGroupedHeader ? headerRow + 2 : headerRow + 1;
  const unknownHeaders = []; let validationParent = ""; firstHeader.forEach((value, index) => { if (value) validationParent = value; const child = secondHeader[index]; const source = hasGroupedHeader && child && key(validationParent).match(/(?:installment|instalment)\d+/) ? `${validationParent} ${child}` : value; if (source && !headers[index]) unknownHeaders.push(clean(source)); }); if (unknownHeaders.length) throw new AppError(`Unknown column(s): ${[...new Set(unknownHeaders)].join(", ")}. Download the latest template and keep the column names unchanged.`, 400); const duplicates = headers.filter((header, index) => header && headers.indexOf(header) !== index); if (duplicates.length) throw new AppError(`Duplicate columns: ${[...new Set(duplicates)].join(", ")}`, 400); const rows = [];
  for (let rowNumber = dataStart; rowNumber <= sheet.rowCount; rowNumber += 1) { const row = sheet.getRow(rowNumber); if (!Array.from({ length: sheet.columnCount }, (_, index) => row.getCell(index + 1).value).some((value) => !missing(value))) continue; const data = { __rowNumber: rowNumber }; headers.forEach((header, index) => { if (header) data[header] = clean(row.getCell(index + 1).value); }); rows.push(data); } return rows;
}
function templateColumns() { const columns = FIELDS.map(([, label]) => label).concat(["Assessment-01 Percentage", "Assessment-02 Percentage", "Assessment-03 Percentage"]); for (let index = 1; index <= 3; index += 1) columns.push(`Installment ${index} - Paid Amount`, `Installment ${index} - Pending Amount`, `Installment ${index} - Payment Date`, `Installment ${index} - Mode of Collection`, `Installment ${index} - Receipt Number`); return columns; }

export async function completedStudentTemplate() { const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Completed Student Upload"); const columns = templateColumns(); sheet.addRow(["Completed Student Import Template"]); sheet.addRow(["Use one row per student-course record. Keep header names unchanged; use - only for optional unavailable values. Date columns: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, or YYYY-MM-DD."]); sheet.addRow(columns); sheet.mergeCells(1, 1, 1, columns.length); sheet.mergeCells(2, 1, 2, columns.length); sheet.getRow(1).font = { bold: true, size: 16, color: { argb: "FF17345F" } }; sheet.getRow(2).font = { italic: true, color: { argb: "FF64748B" } }; sheet.getRow(3).eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF24527A" } }; cell.alignment = { wrapText: true, vertical: "middle" }; }); columns.forEach((column, index) => { sheet.getColumn(index + 1).width = Math.min(28, Math.max(16, column.length + 3)); }); sheet.views = [{ state: "frozen", ySplit: 3 }]; const buffer = await workbook.xlsx.writeBuffer(); return { fileName: "completed-student-upload-template.xlsx", contentType: CONTENT_TYPE, buffer: Buffer.from(buffer) }; }

async function buildImportLookup(rows, branchId) {
  const dataRows = rows.map((row) => row?.data || row).filter(Boolean);
  const studentIds = [...new Set(dataRows.map((row) => clean(row.studentId)).filter(Boolean))];
  const courseKeys = [...new Set(dataRows.map((row) => courseKey(row.course)).filter(Boolean))];
  const mobileNumbers = [...new Set(dataRows.map((row) => clean(row.contactNumber).replace(/\D/g, "")).filter(Boolean))];
  const emailAddresses = [...new Set(dataRows.map((row) => clean(row.emailId).toLowerCase()).filter(Boolean))];
  const receipts = [...new Set(dataRows.flatMap((row) => Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;
    return clean(row["installment" + number + "receiptnumber"]) || clean(row["installment" + number + "receiptno"]);
  })).filter(Boolean))];

  const [students, courses, contactStudents, payments, installments] = await Promise.all([
    studentIds.length ? prisma.branchStudent.findMany({ where: { branchId, studentId: { in: studentIds } }, include: { courseEnrollments: true } }) : [],
    courseKeys.length ? prisma.branchCourse.findMany({ where: { branchId, nameKey: { in: courseKeys } } }) : [],
    mobileNumbers.length || emailAddresses.length
      ? prisma.branchStudent.findMany({ where: { OR: [...(mobileNumbers.length ? [{ mobileNumber: { in: mobileNumbers } }] : []), ...(emailAddresses.length ? [{ emailAddress: { in: emailAddresses } }] : [])] }, select: { id: true, studentId: true, mobileNumber: true, emailAddress: true } })
      : [],
    receipts.length ? prisma.branchStudentPayment.findMany({ where: { receiptNumber: { in: receipts } } }) : [],
    studentIds.length ? prisma.branchStudentInstallment.findMany({ where: { branchStudent: { branchId, studentId: { in: studentIds } } }, orderBy: { updatedAt: "desc" } }) : [],
  ]);

  return {
    studentsByStudentId: new Map(students.map((student) => [clean(student.studentId), student])),
    coursesByNameKey: new Map(courses.map((course) => [course.nameKey, course])),
    contactStudentsByMobile: new Map(contactStudents.filter((student) => student.mobileNumber).map((student) => [clean(student.mobileNumber).replace(/\D/g, ""), student])),
    contactStudentsByEmail: new Map(contactStudents.filter((student) => student.emailAddress).map((student) => [clean(student.emailAddress).toLowerCase(), student])),
    paymentsByReceipt: new Map(payments.map((payment) => [clean(payment.receiptNumber), payment])),
    installmentsByStudent: new Map(students.map((student) => [student.id, installments.filter((item) => item.branchStudentId === student.id)])),
  };
}

async function context(row, branchId, lookup = null) {
  if (lookup) return { student: lookup.studentsByStudentId.get(clean(row.studentId)) || null, course: !missing(row.course) ? lookup.coursesByNameKey.get(courseKey(row.course)) || null : null };
  const student = await prisma.branchStudent.findFirst({ where: { branchId, studentId: clean(row.studentId) }, include: { courseEnrollments: true } });
  const course = !missing(row.course) ? await prisma.branchCourse.findFirst({ where: { branchId, nameKey: courseKey(row.course) } }) : null;
  return { student, course };
}
function columnLabelForError(field) { const match = field.match(/^assessment(\d+)$/); return match ? `Assessment-${String(Number(match[1])).padStart(2, "0")} Percentage` : field; }
function conditional(data, errors) { const status = key(data.currentStatus); if (status === "collegestudent") { if (missing(data.educationLevel)) errors.push("Education Level is required for College Student."); if (missing(data.educationStatus)) errors.push("Education Status is required for College Student."); if (key(data.educationStatus) === "passedout" && missing(data.passedOutYear)) errors.push("Passed Out Year is required when Education Status is Passed Out."); } if (status === "fresher" && missing(data.passedOutYear)) errors.push("Passed Out Year is required for Fresher."); if (status === "employee" && missing(data.designation)) errors.push("Designation is required for Employee."); if (status === "employee" && missing(data.companyName)) errors.push("Company Name is required for Employee."); }
async function validate(raw, branchId, seen, { allowMissingContact = false, lookup = null } = {}) {
  const data = { ...raw };
  const rowNumber = data.__rowNumber;
  delete data.__rowNumber;
  data.studentStatus = normalizeStudentStatus(data.studentStatus);
  const errors = [];
  const warnings = [];
  const requiredFields = ["studentId", "studentName", "parentGuardian", "qualification", "currentStatus", "course", "courseStartingDate", "courseEndingDate", "studentStatus"];
  requiredFields.forEach((field) => { if (missing(data[field])) errors.push(`${FIELDS.find(([name]) => name === field)?.[1] || field} is required.`); });
  if (missing(data.contactNumber)) errors.push("Contact Number is missing. Confirm before importing with an empty value.");
  if (missing(data.emailId)) errors.push("Email ID is missing. Confirm before importing with an empty value.");
  if (!missing(data.contactNumber) && !/^\d{10}$/.test(clean(data.contactNumber).replace(/\D/g, ""))) errors.push("Contact Number must contain exactly 10 digits.");
  if (!missing(data.emailId) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean(data.emailId))) errors.push("Email ID is invalid.");
  if (!["completedstudent", "discontinuedstudent"].includes(key(data.studentStatus))) errors.push("Student Status must be Completed Student or Discontinued Student.");
  const startInfo = dateInfo(data.courseStartingDate);
  const endInfo = dateInfo(data.courseEndingDate);
  const admissionDateInfo = dateInfo(data.admissionDate);
  if (admissionDateInfo.invalid) errors.push(`Admission Date is invalid. ${DATE_FORMAT_HINT}`);
  if (startInfo.invalid) errors.push(`Course Starting Date is invalid. ${DATE_FORMAT_HINT}`);
  if (endInfo.invalid) errors.push(`Course Ending Date is invalid. ${DATE_FORMAT_HINT}`);
  if (startInfo.value && endInfo.value && startInfo.value > endInfo.value) errors.push("Course Ending Date cannot be before Course Starting Date.");
  const certificateDateInfo = dateInfo(data.certificateIssuedDate);
  if (certificateDateInfo.invalid) errors.push(`Certificate Issued Date is invalid. ${DATE_FORMAT_HINT}`);
  const numericRules = [
    ["attendance", 0, 100, "Attendance"],
    ["courseFees", 0, null, "Course Fees"],
    ["registrationFees", 0, null, "Registration Fees"],
    ["totalFees", 0, null, "Total Fees"],
  ];
  numericRules.forEach(([field, min, max, label]) => { const parsed = field === "attendance" ? percentageInfo(data[field]) : numberInfo(data[field]); if (parsed.invalid) errors.push(`${label} must be a valid number.`); else if (parsed.value !== null && (parsed.value < min || (max !== null && parsed.value > max))) errors.push(`${label} must be between ${min}${max === null ? " or above" : ` and ${max}`}.`); });
  if (!missing(data.passedOutYear) && !/^(19|20)\d{2}$/.test(clean(data.passedOutYear))) errors.push("Passed Out Year must be a valid four-digit year.");
  Object.keys(data).filter((field) => /^assessment\d+$/.test(field) || field === "academicProject").forEach((field) => { const parsed = percentageInfo(data[field]); if (parsed.invalid) errors.push(`${field === "academicProject" ? "Academic Project" : columnLabelForError(field)} must be a valid number.`); else if (parsed.value !== null && (parsed.value < 0 || parsed.value > 100)) errors.push(`${field === "academicProject" ? "Academic Project" : columnLabelForError(field)} must be between 0 and 100.`); });
  conditional(data, errors);
  const hasAcademicValue = Object.entries(data).some(([field, value]) => (/^assessment\d+$/.test(field) || field === "academicProject") && !missing(value));
  // Academic values are optional for historical completed rows; no warning is needed when absent.
  const totalFeeValue = numberInfo(data.totalFees).value;
  const courseFeeValue = numberInfo(data.courseFees).value;
  if (totalFeeValue !== null && courseFeeValue !== null && totalFeeValue < courseFeeValue) warnings.push("Warning: Total Fees is lower than Course Fees.");
  const duplicateKey = `${key(data.studentId)}::${key(data.course)}`;
  if (seen.has(duplicateKey)) errors.push(`Duplicate student-course row; first seen at row ${seen.get(duplicateKey)}.`); else if (duplicateKey !== "::") seen.set(duplicateKey, rowNumber);
  // Completed uploads are historical snapshots. Do not reject a row because
  // its student, course, batch, or academic setup is no longer in this branch.
  const { student, course } = await context(data, branchId, lookup);
  const uniqueContactValues = [
    !missing(data.contactNumber) ? { mobileNumber: clean(data.contactNumber).replace(/\D/g, "") } : null,
    !missing(data.emailId) ? { emailAddress: clean(data.emailId).toLowerCase() } : null,
  ].filter(Boolean);
  if (uniqueContactValues.length) {
    const conflictingStudent = lookup
      ? (uniqueContactValues.map((item) => item.mobileNumber ? lookup.contactStudentsByMobile.get(item.mobileNumber) : lookup.contactStudentsByEmail.get(item.emailAddress)).find(Boolean) || null)
      : await prisma.branchStudent.findFirst({ where: { OR: uniqueContactValues } });
    if (conflictingStudent && conflictingStudent.id !== student?.id) {
      if (uniqueContactValues.some((item) => item.mobileNumber && item.mobileNumber === clean(conflictingStudent.mobileNumber).replace(/\D/g, ""))) errors.push("Contact Number already belongs to another student.");
      if (uniqueContactValues.some((item) => item.emailAddress && item.emailAddress === String(conflictingStudent.emailAddress || "").toLowerCase())) errors.push("Email ID already belongs to another student.");
    }
  }
  await validatePaymentImportValues(prisma, student, data, errors, course?.id, lookup);
  // Allow re-uploading historical rows that were previously stored only on
  // the student record without a catalog course. This refreshes missing
  // source, batch, installment and academic values instead of blocking them
  // as duplicates. Catalog-linked duplicate courses remain protected.
  const sameCourseAlreadyExists = Boolean(student && ((course && (student.courseId === course.id || student.courseEnrollments.some((item) => item.courseId === course.id))) || (!course && student.courseId && courseKey(student.courseName) === courseKey(data.course))));
  if (sameCourseAlreadyExists) errors.push("Duplicate completed student-course record already exists.");
  if (allowMissingContact) {
    for (let index = errors.length - 1; index >= 0; index -= 1) {
      if (/^(Contact Number|Email ID) is missing\./i.test(errors[index])) errors.splice(index, 1);
    }
  }
  // Historical imports use only row-level validation. Existing branch records\n  // must not make an old completed row invalid.
  return { rowNumber, data: { ...data, admissionDate: admissionDateInfo.value, courseStartingDate: startInfo.value, courseEndingDate: endInfo.value, certificateIssuedDate: certificateDateInfo.value }, valid: errors.length === 0, errors, warnings, studentId: clean(data.studentId), courseName: course?.name || clean(data.course) };
}
export async function previewCompletedStudentImport({ buffer, user }) { if (!buffer?.length) throw new AppError("Please choose an .xlsx file.", 400); const workbook = await loadCompletedStudentWorkbook(buffer); const rows = readRows(workbook); if (!rows.length) throw new AppError("The workbook has no data rows.", 400); if (rows.length > MAX_ROWS) throw new AppError(`Only ${MAX_ROWS} records can be imported at a time.`, 400); const branchId = await resolveBranchId(user); const lookup = await buildImportLookup(rows, branchId); const seen = new Map(); const validated = []; for (const row of rows) validated.push(await validate(row, branchId, seen, { lookup })); return { maxRows: MAX_ROWS, totalRows: validated.length, validRows: validated.filter((row) => row.valid).length, invalidRows: validated.filter((row) => !row.valid).length, warningRows: validated.filter((row) => row.warnings?.length).length, rows: validated }; }
function optional(data, field, current) { return missing(data[field]) ? current : clean(data[field]); }
async function apply(tx, row, branchId, user, lookup = null) {
  const data = row.data;
  const isDiscontinued = ["discontinued", "discontinuedstudent", "discontinuedstudents"].includes(key(data.studentStatus));
  let student = lookup ? lookup.studentsByStudentId.get(clean(data.studentId)) || null : await tx.branchStudent.findFirst({ where: { branchId, studentId: clean(data.studentId) }, include: { courseEnrollments: true } });
  const course = !missing(data.course) ? (lookup ? lookup.coursesByNameKey.get(courseKey(data.course)) || null : await tx.branchCourse.findFirst({ where: { branchId, nameKey: courseKey(data.course) } })) : null;
  const existingEnrollment = student && course ? student.courseEnrollments.find((item) => item.courseId === course.id) : null;
  const isPrimaryCourse = Boolean(student && course && String(student.courseId || "") === String(course.id));
  const end = date(data.courseEndingDate);
  const start = date(data.courseStartingDate);
  const sharedStudentData = {
    admissionDate: date(data.admissionDate) || date(student?.admissionDate) || start,
    studentName: optional(data, 'studentName', student?.studentName || clean(data.studentName)),
    parentName: optional(data, 'parentGuardian', student?.parentName),
    parentSpouseNumber: optional(data, 'parentSpouseNumber', student?.parentSpouseNumber),
    mobileNumber: clean(data.contactNumber).replace(/\D/g, '') || student?.mobileNumber,
    emailAddress: optional(data, 'emailId', student?.emailAddress) || null,
    qualification: optional(data, 'qualification', student?.qualification),
    passedOutYear: optional(data, 'passedOutYear', student?.passedOutYear),
    currentStatus: optional(data, 'currentStatus', student?.currentStatus),
    designation: optional(data, 'designation', student?.designation),
    companyName: optional(data, 'companyName', student?.companyName),
    purpose: optional(data, 'purpose', student?.purpose),
    educationLevel: optional(data, 'educationLevel', student?.educationLevel),
    educationStatus: optional(data, 'educationStatus', student?.educationStatus),
    linkedInUrl: optional(data, 'linkedInUrl', student?.linkedInUrl),
    source: optional(data, 'databaseSource', optional(data, 'source', student?.source)),
    importedAcademicResults: Object.fromEntries(Object.entries(data).filter(([field, value]) => (/^assessment\d+$/.test(field) || field === "academicProject") && !missing(value)).map(([field, value]) => [field, percentageInfo(value).value])),
    remarks: optional(data, 'remarks', student?.remarks),
    updatedBy: user?.id || null,
  };
  const courseData = {
    courseName: course?.name || clean(data.course),
    batchName: optional(data, 'batchName', existingEnrollment?.batchName || student?.batchName),
    startDate: start || existingEnrollment?.startDate || null,
    endDate: end || existingEnrollment?.endDate || null,
    scheduleType: optional(data, 'scheduleMode', existingEnrollment?.scheduleType),
    mode: optional(data, 'scheduleMode', existingEnrollment?.mode),
    batchTiming: optional(data, 'batchTiming', existingEnrollment?.batchTiming),
    facultyName: optional(data, 'facultyName', existingEnrollment?.facultyName),
    totalCourseAmount: Number(number(data.totalFees) ?? number(data.courseFees) ?? existingEnrollment?.totalCourseAmount ?? 0) || null,
    courseProgress: 100,
    courseCompletedAt: end ? new Date(`${end}T00:00:00.000Z`) : existingEnrollment?.courseCompletedAt || null,
    importedLifecycleStatus: isDiscontinued ? "DISCONTINUED" : "COMPLETED",
  };

  if (!student) {
    student = await tx.branchStudent.create({
      data: {
        branchId,
        studentId: clean(data.studentId),
        admissionDate: date(data.admissionDate) || start,
        courseId: course?.id || null,
        courseName: courseData.courseName,
        courseStartDate: courseData.startDate,
        courseEndDate: courseData.endDate,
        courseMode: courseData.mode,
        batchName: courseData.batchName,
        batchTiming: courseData.batchTiming,
        facultyName: courseData.facultyName,
        courseAmount: courseData.totalCourseAmount,
        courseProgress: 100,
        courseCompletedAt: courseData.courseCompletedAt,
        ...sharedStudentData,
      },
      include: { courseEnrollments: true },
    });
    if (lookup) lookup.studentsByStudentId.set(clean(student.studentId), student);
  } else if (isPrimaryCourse) {
    await tx.branchStudent.update({ where: { id: student.id }, data: {
      ...sharedStudentData,
      courseStartDate: courseData.startDate,
      courseEndDate: courseData.endDate,
      batchName: courseData.batchName,
      courseProgress: courseData.courseProgress,
      courseCompletedAt: courseData.courseCompletedAt,
    } });
  } else {
    await tx.branchStudent.update({ where: { id: student.id }, data: sharedStudentData });
  }

  let targetEnrollment = existingEnrollment;
  if (course && targetEnrollment) {
    targetEnrollment = await tx.branchStudentCourse.update({ where: { id: targetEnrollment.id }, data: courseData });
  } else if (course) {
    targetEnrollment = await tx.branchStudentCourse.create({ data: { branchStudentId: student.id, branchId, courseId: course.id, ...courseData, status: 'ACTIVE' } });
  }
  if (course) await applyAcademicImportValues(tx, student, course, targetEnrollment, data);
  await applyPaymentImportValues(tx, student, branchId, course?.id, data, lookup);
  return { studentId: student.studentId, course: course?.name || clean(data.course), primaryCourse: isPrimaryCourse };
}
export async function importCompletedStudents({ rows, user, dryRun = false, allowMissingContact = false }) { if (!Array.isArray(rows) || !rows.length) throw new AppError("No rows were selected for import.", 400); if (rows.length > MAX_ROWS) throw new AppError(`Only ${MAX_ROWS} records can be imported at a time.`, 400); const branchId = await resolveBranchId(user); const lookup = await buildImportLookup(rows, branchId); const seen = new Map(); const checked = []; for (const row of rows) checked.push(await validate({ ...(row.data || row), __rowNumber: row.rowNumber }, branchId, seen, { allowMissingContact, lookup })); const invalid = checked.filter((row) => !row.valid); if (invalid.length) return { importedRows: 0, validRows: checked.length - invalid.length, invalidRows: invalid.length, warningRows: checked.filter((row) => row.warnings?.length).length, rows: checked, message: "Import stopped. Fix all validation errors and revalidate before importing." }; if (dryRun) return { importedRows: 0, validRows: checked.length, invalidRows: 0, warningRows: checked.filter((row) => row.warnings?.length).length, rows: checked, message: "Validation passed." }; const imported = await prisma.$transaction(async (tx) => { const result = []; for (const row of checked) result.push(await apply(tx, row, branchId, user, lookup)); return result; }, { maxWait: 15000, timeout: 120000 }); return { importedRows: imported.length, invalidRows: 0, warningRows: checked.filter((row) => row.warnings?.length).length, rows: checked, imported }; }

export async function completedStudentFailedRowsReport({ rows = [] }) {
  const failedRows = rows.filter((row) => !row?.valid || row?.errors?.length);
  if (!failedRows.length) throw new AppError("There are no invalid rows to download.", 400);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Import Errors");
  const columns = ["Row Number", "Student ID", "Student Name", "Course", "Validation Status", "Error Reason"];
  sheet.addRow(["Completed Student Import - Failed Rows"]);
  sheet.addRow(["Fix these rows and upload the corrected records again."]);
  sheet.addRow(columns);
  sheet.mergeCells(1, 1, 1, columns.length); sheet.mergeCells(2, 1, 2, columns.length);
  sheet.getRow(1).font = { bold: true, size: 15, color: { argb: "FF17345F" } };
  sheet.getRow(2).font = { italic: true, color: { argb: "FF64748B" } };
  sheet.getRow(3).eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB42318" } }; cell.alignment = { wrapText: true }; });
  failedRows.forEach((row) => sheet.addRow([row.rowNumber, row.data?.studentId || row.studentId || "-", row.data?.studentName || "-", row.data?.course || row.courseName || "-", "Invalid", (row.errors || ["Validation failed"]).join(" | ")]));
  sheet.eachRow((row, rowNumber) => { if (rowNumber >= 4) row.eachCell((cell) => { cell.alignment = { vertical: "top", wrapText: true }; cell.border = { top: { style: "thin", color: { argb: "FFD0D5DD" } }, bottom: { style: "thin", color: { argb: "FFD0D5DD" } }, left: { style: "thin", color: { argb: "FFD0D5DD" } }, right: { style: "thin", color: { argb: "FFD0D5DD" } } }; }); });
  [12, 22, 25, 22, 18, 80].forEach((width, index) => { sheet.getColumn(index + 1).width = width; }); sheet.views = [{ state: "frozen", ySplit: 3 }];
  const buffer = await workbook.xlsx.writeBuffer(); return { fileName: "completed-student-import-errors.xlsx", contentType: CONTENT_TYPE, buffer: Buffer.from(buffer) };
}