import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import { syncStudentCourseEnd } from "../instituteLeave/instituteLeave.service.js";
import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import AppError from "../../common/errors/AppError.js";
import { hashPassword } from "../../common/utils/password.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import {
  sendStudentCredentialsEmail,
  sendStudentPaymentReceiptEmail,
  sendStudentPaymentDueEmail,
} from "../../common/services/resendEmail.js";
import {
  buildBranchEntityId,
  extractEntitySequence,
  getBranchPublicPrefix,
  normalizeBranchEntityId,
} from "../../common/utils/branchIdentifiers.js";
import {
  createFeeProgressAlertNotification,
} from "../notifications/notifications.service.js";

const RECORD_STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const CURRENT_STATUSES = new Set(["Student", "Employee", "Other"]);
const PROGRESS_ALERT_TOLERANCE = 5;
const DUE_REMINDER_WINDOW_DAYS = 7;
const DUE_REMINDER_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeSearchKey(value) {
  return normalizeString(value).toLowerCase().replace(/\s+/g, " ");
}

function parseRequiredText(value, fieldName) {
  const text = normalizeString(value);
  if (!text) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return text;
}

function parseOptionalText(value) {
  const text = normalizeString(value);
  return text ? text : null;
}

function parseOptionalUrl(value) {
  const text = normalizeString(value);
  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid URL protocol");
    }
    return url.toString();
  } catch {
    throw new AppError("LinkedIn URL must be a valid http or https URL", 400);
  }
}

function parseEmail(value) {
  const email = parseRequiredText(value, "Email address").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Enter a valid email address", 400);
  }
  return email;
}

function parsePhone(value, fieldName = "Mobile number") {
  const phone = parseRequiredText(value, fieldName);
  if (!/^\d{10}$/.test(phone)) {
    throw new AppError(`${fieldName} must be a 10-digit number`, 400);
  }
  return phone;
}

function parseStatus(value) {
  const status = normalizeString(value).toUpperCase() || "ACTIVE";
  if (!RECORD_STATUSES.has(status)) {
    throw new AppError("Invalid status", 400);
  }
  return status;
}

function parseCurrentStatus(value) {
  const text = normalizeString(value);
  if (!CURRENT_STATUSES.has(text)) {
    throw new AppError("Invalid current status", 400);
  }
  return text;
}

function parseDateString(value, fieldName) {
  const text = parseRequiredText(value, fieldName);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new AppError(`${fieldName} must be in YYYY-MM-DD format`, 400);
  }
  return text;
}

function parseOptionalProgress(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new AppError("Course progress must be a number", 400);
  }

  if (parsed < 0 || parsed > 100) {
    throw new AppError("Course progress must be between 0 and 100", 400);
  }

  return Math.round(parsed);
}

function parsePage(value) {
  const parsed = Number(value ?? 1);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

function parseLimit(value) {
  const parsed = Number(value ?? 10);
  if (!Number.isInteger(parsed) || parsed < 1) return 10;
  return Math.min(parsed, 100);
}

function parseSortOrder(value, defaultOrder = "desc") {
  const order = normalizeString(value).toLowerCase();
  return order === "asc" || order === "desc" ? order : defaultOrder;
}

function buildPagination({ page, limit }) {
  const safePage = parsePage(page);
  const safeLimit = parseLimit(limit);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

function buildPaginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function displayStatus(value) {
  switch (value) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    default:
      return value;
  }
}

function normalizeStudentId(value) {
  return normalizeString(value).toUpperCase();
}

function generateStudentIdFromSequence(sequenceNumber, branchId) {
  return buildBranchEntityId(branchId, "STU", sequenceNumber);
}

async function generateNextStudentId(branchId) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { branchId: true } });
  const [branchStudents, loginUsers] = await Promise.all([
    prisma.branchStudent.findMany({
      where: { branchId },
      select: { studentId: true },
    }),
    branch?.branchId
      ? prisma.user.findMany({
          where: {
            userCode: {
              startsWith: `${getBranchPublicPrefix(branch.branchId)}STU`,
            },
          },
          select: { userCode: true },
        })
      : [],
  ]);

  let highest = 0;

  branchStudents.forEach((record) => {
    const numeric = extractEntitySequence(record.studentId, branch.branchId, "STU");
    if (Number.isInteger(numeric) && numeric > highest) {
      highest = numeric;
    }
  });

  loginUsers.forEach((user) => {
    const numeric = extractEntitySequence(user.userCode, branch.branchId, "STU");
    if (Number.isInteger(numeric) && numeric > highest) {
      highest = numeric;
    }
  });

  return generateStudentIdFromSequence(highest + 1, branch.branchId);
}

async function isStudentIdTaken(branchId, studentId) {
  const normalizedStudentId = normalizeStudentId(studentId);

  if (!normalizedStudentId) {
    return false;
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { branchId: true },
  });

  const branchUserCode = branch?.branchId
    ? buildBranchStudentUserCode(branch.branchId, normalizedStudentId)
    : normalizedStudentId;

  const [branchStudent, loginUser] = await Promise.all([
    prisma.branchStudent.findFirst({
      where: {
        branchId,
        studentId: normalizedStudentId,
      },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: {
        OR: [
          { userCode: normalizedStudentId },
          { userCode: branchUserCode },
        ],
      },
      select: { id: true },
    }),
  ]);

  return Boolean(branchStudent || loginUser);
}

async function generateUniqueStudentId(branchId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = await generateNextStudentId(branchId);
    // eslint-disable-next-line no-await-in-loop
    if (!(await isStudentIdTaken(branchId, candidate))) {
      return candidate;
    }
  }

  throw new AppError("Unable to generate unique student ID", 500);
}

function calculateFeeProgressSnapshot(student = {}) {
  const installments = Array.isArray(student.installments) ? student.installments : [];
  const normalizedInstallments = installments
    .map((installment, index) => ({
      installmentNumber: Number(installment?.installmentNumber || index + 1) || index + 1,
      amount: Number(String(installment?.amount ?? 0).replace(/,/g, "")) || 0,
      amountPaid: Number(String(installment?.amountPaid ?? 0).replace(/,/g, "")) || 0,
      dueDate: normalizeString(installment?.dueDate),
      status: normalizeString(installment?.status || "Pending"),
      dueReminderSentAt: installment?.dueReminderSentAt ? new Date(installment.dueReminderSentAt) : null,
      id: installment?.id || null,
    }))
    .sort((left, right) => left.installmentNumber - right.installmentNumber);

  const totalAmount = normalizedInstallments.length
    ? normalizedInstallments.reduce((sum, installment) => sum + installment.amount, 0)
    : Number(String(student.courseAmount ?? student.totalAmount ?? 0).replace(/,/g, "")) || 0;

  const paidAmount = normalizedInstallments.length
    ? normalizedInstallments.reduce((sum, installment) => sum + Math.min(installment.amountPaid, installment.amount), 0)
    : 0;

  const feeProgress = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;
  const nextInstallment = normalizedInstallments.find((installment) => installment.amountPaid < installment.amount) || null;
  const dueAmount = nextInstallment ? Math.max(nextInstallment.amount - nextInstallment.amountPaid, 0) : 0;

  return {
    totalAmount,
    paidAmount,
    feeProgress,
    nextInstallment,
    dueAmount,
  };
}

function buildLedgerDate(value, fallback = new Date()) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date(fallback) : new Date(value);
  }

  const text = normalizeString(value);
  if (!text) {
    return new Date(fallback);
  }

  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const asDateOnly = new Date(`${text}T00:00:00`);
  if (!Number.isNaN(asDateOnly.getTime())) {
    return asDateOnly;
  }

  return new Date(fallback);
}

function buildBranchStudentLedgerKey(studentId, suffix) {
  return `${normalizeString(studentId)}:${normalizeString(suffix)}`;
}

function resolveBranchStudentLedgerCourseAmount(student = {}) {
  const courseAmount = Number(student.courseAmount ?? 0);
  if (Number.isFinite(courseAmount) && courseAmount > 0) {
    return Math.round(courseAmount);
  }

  const installmentTotal = Array.isArray(student.installments)
    ? student.installments.reduce((sum, installment) => {
      const amount = Number(installment?.amount ?? 0);
      return Number.isFinite(amount) ? sum + Math.max(amount, 0) : sum;
    }, 0)
    : 0;

  return installmentTotal > 0 ? Math.round(installmentTotal) : 0;
}

function normalizeBranchStudentLedgerDescription(payment = {}) {
  const payAgainst = normalizeString(payment.payAgainst);
  if (payAgainst) {
    return payAgainst;
  }

  const installmentNumber = Number(payment.installment?.installmentNumber ?? 0);
  if (Number.isFinite(installmentNumber) && installmentNumber > 0) {
    return `Installment ${installmentNumber}`;
  }

  return "Payment";
}

function sortBranchStudentLedgerEntries(entries = []) {
  return [...entries].sort((left, right) => {
    const leftDate = buildLedgerDate(left.entryDate || left.paymentDate || left.createdAt || left.updatedAt || left.createdAt);
    const rightDate = buildLedgerDate(right.entryDate || right.paymentDate || right.createdAt || right.updatedAt || right.createdAt);

    const leftTime = leftDate.getTime();
    const rightTime = rightDate.getTime();
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    const leftPriority = String(left.entryType || "").toUpperCase() === "DEBIT" ? 0 : 1;
    const rightPriority = String(right.entryType || "").toUpperCase() === "DEBIT" ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return String(left.ledgerKey || left.id || "").localeCompare(String(right.ledgerKey || right.id || ""));
  });
}

const BRANCH_STUDENT_LEDGER_TABLE = Prisma.raw('"BranchStudentLedgerEntry"');

async function fetchBranchStudentLedgerRows(db, branchStudentId) {
  return db.$queryRaw(Prisma.sql`
    SELECT *
    FROM ${BRANCH_STUDENT_LEDGER_TABLE}
    WHERE "branchStudentId" = ${branchStudentId}
    ORDER BY "entryDate" ASC NULLS LAST, "createdAt" ASC, "ledgerKey" ASC
  `);
}

async function upsertBranchStudentLedgerEntry(db, data = {}) {
  const now = new Date();
  await db.$executeRaw(Prisma.sql`
    INSERT INTO ${BRANCH_STUDENT_LEDGER_TABLE} (
      "id",
      "ledgerKey",
      "branchId",
      "branchStudentId",
      "paymentId",
      "installmentId",
      "entryNo",
      "entryType",
      "description",
      "debit",
      "credit",
      "amount",
      "runningBalance",
      "studentBalanceAfter",
      "entryDate",
      "paymentDate",
      "referenceType",
      "referenceId",
      "paymentMode",
      "receiptNumber",
      "payAgainst",
      "transactionReference",
      "notes",
      "createdBy",
      "updatedBy",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${normalizeString(data.id) || crypto.randomUUID()},
      ${normalizeString(data.ledgerKey)},
      ${normalizeString(data.branchId)},
      ${normalizeString(data.branchStudentId)},
      ${data.paymentId ?? null},
      ${data.installmentId ?? null},
      ${Number(data.entryNo ?? 0)},
      ${normalizeString(data.entryType)},
      ${normalizeString(data.description)},
      ${Number(data.debit ?? 0)},
      ${Number(data.credit ?? 0)},
      ${Number(data.amount ?? 0)},
      ${Number(data.runningBalance ?? 0)},
      ${Number(data.studentBalanceAfter ?? 0)},
      ${data.entryDate ?? null},
      ${data.paymentDate ?? null},
      ${data.referenceType ?? null},
      ${data.referenceId ?? null},
      ${data.paymentMode ?? null},
      ${data.receiptNumber ?? null},
      ${data.payAgainst ?? null},
      ${data.transactionReference ?? null},
      ${data.notes ?? null},
      ${data.createdBy ?? null},
      ${data.updatedBy ?? null},
      ${now},
      ${now}
    )
    ON CONFLICT ("ledgerKey") DO UPDATE SET
      "branchId" = EXCLUDED."branchId",
      "paymentId" = EXCLUDED."paymentId",
      "installmentId" = EXCLUDED."installmentId",
      "entryNo" = EXCLUDED."entryNo",
      "entryType" = EXCLUDED."entryType",
      "description" = EXCLUDED."description",
      "debit" = EXCLUDED."debit",
      "credit" = EXCLUDED."credit",
      "amount" = EXCLUDED."amount",
      "runningBalance" = EXCLUDED."runningBalance",
      "studentBalanceAfter" = EXCLUDED."studentBalanceAfter",
      "entryDate" = EXCLUDED."entryDate",
      "paymentDate" = EXCLUDED."paymentDate",
      "referenceType" = EXCLUDED."referenceType",
      "referenceId" = EXCLUDED."referenceId",
      "paymentMode" = EXCLUDED."paymentMode",
      "receiptNumber" = EXCLUDED."receiptNumber",
      "payAgainst" = EXCLUDED."payAgainst",
      "transactionReference" = EXCLUDED."transactionReference",
      "notes" = EXCLUDED."notes",
      "updatedBy" = EXCLUDED."updatedBy",
      "updatedAt" = EXCLUDED."updatedAt"
  `);
}

async function recomputeBranchStudentLedgerBalances(db, branchStudentId) {
  const rows = await fetchBranchStudentLedgerRows(db, branchStudentId);
  const sortedRows = sortBranchStudentLedgerEntries(rows);
  let runningBalance = 0;

  for (let index = 0; index < sortedRows.length; index += 1) {
    const row = sortedRows[index];
    runningBalance += Number(row.debit ?? 0) - Number(row.credit ?? 0);

    if (
      Number(row.entryNo ?? 0) !== index + 1 ||
      Number(row.runningBalance ?? 0) !== runningBalance ||
      Number(row.studentBalanceAfter ?? 0) !== runningBalance
    ) {
      // eslint-disable-next-line no-await-in-loop
      await db.$executeRaw(Prisma.sql`
        UPDATE ${BRANCH_STUDENT_LEDGER_TABLE}
        SET
          "entryNo" = ${index + 1},
          "runningBalance" = ${runningBalance},
          "studentBalanceAfter" = ${runningBalance},
          "updatedAt" = ${new Date()}
        WHERE "id" = ${row.id}
      `);
    }
  }

  return fetchBranchStudentLedgerRows(db, branchStudentId);
}

async function materializeBranchStudentLedgerEntries(db, student, { includePayments = true } = {}) {
  const branchStudentId = String(student?.id || "").trim();
  const branchId = String(student?.branchId || "").trim();

  if (!branchStudentId || !branchId) {
    throw new AppError("Branch student is required for ledger materialization", 400);
  }

  const studentCourseAmount = resolveBranchStudentLedgerCourseAmount(student);
  const studentCreatedAt = buildLedgerDate(student.admissionDate || student.createdAt || new Date());

  if (studentCourseAmount > 0) {
    await upsertBranchStudentLedgerEntry(db, {
      ledgerKey: buildBranchStudentLedgerKey(branchStudentId, "course-fee"),
      branchId,
      branchStudentId,
      entryType: "DEBIT",
      description: "Course Fee",
      debit: studentCourseAmount,
      credit: 0,
      amount: studentCourseAmount,
      entryDate: studentCreatedAt,
      referenceType: "course-fee",
      referenceId: branchStudentId,
      createdBy: student.createdBy ?? null,
      updatedBy: student.updatedBy ?? null,
    });
  }

  if (includePayments) {
    const payments = Array.isArray(student.payments) ? student.payments : [];

    for (const payment of payments) {
      const amount = Math.max(Number(payment.amount ?? 0), 0);
      if (amount <= 0) {
        continue;
      }

      const paymentDate = buildLedgerDate(payment.paymentDate || payment.createdAt || new Date());
      const installmentNumber = Number(payment.installment?.installmentNumber ?? 0);
      const payAgainst = normalizeString(payment.payAgainst)
        || (Number.isFinite(installmentNumber) && installmentNumber > 0 ? `Installment ${installmentNumber}` : "");

      // eslint-disable-next-line no-await-in-loop
      await upsertBranchStudentLedgerEntry(db, {
        ledgerKey: buildBranchStudentLedgerKey(branchStudentId, `payment-${payment.id}`),
        branchId,
        branchStudentId,
        paymentId: payment.id,
        installmentId: payment.installmentId || null,
        entryType: "CREDIT",
        description: normalizeBranchStudentLedgerDescription(payment),
        debit: 0,
        credit: amount,
        amount,
        entryDate: paymentDate,
        paymentDate,
        referenceType: "payment",
        referenceId: payment.id,
        paymentMode: normalizeString(payment.paymentMode),
        receiptNumber: normalizeString(payment.receiptNumber),
        payAgainst,
        transactionReference: normalizeString(payment.transactionReference),
        notes: normalizeString(payment.notes),
        createdBy: payment.createdBy ?? null,
        updatedBy: payment.updatedBy ?? null,
      });
    }
  }

  return recomputeBranchStudentLedgerBalances(db, branchStudentId);
}

const BRANCH_STUDENT_LEDGER_TABLE_DDL = [
  `
    CREATE TABLE IF NOT EXISTS "BranchStudentLedgerEntry" (
      "id" TEXT PRIMARY KEY,
      "ledgerKey" TEXT NOT NULL UNIQUE,
      "branchId" TEXT NOT NULL,
      "branchStudentId" TEXT NOT NULL,
      "paymentId" TEXT,
      "installmentId" TEXT,
      "entryNo" INTEGER NOT NULL DEFAULT 0,
      "entryType" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "debit" INTEGER NOT NULL DEFAULT 0,
      "credit" INTEGER NOT NULL DEFAULT 0,
      "amount" INTEGER NOT NULL DEFAULT 0,
      "runningBalance" INTEGER NOT NULL DEFAULT 0,
      "studentBalanceAfter" INTEGER NOT NULL DEFAULT 0,
      "entryDate" TIMESTAMP(3),
      "paymentDate" TIMESTAMP(3),
      "referenceType" TEXT,
      "referenceId" TEXT,
      "paymentMode" TEXT,
      "receiptNumber" TEXT,
      "payAgainst" TEXT,
      "transactionReference" TEXT,
      "notes" TEXT,
      "createdBy" TEXT,
      "updatedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BranchStudentLedgerEntry_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE,
      CONSTRAINT "BranchStudentLedgerEntry_branchStudentId_fkey"
        FOREIGN KEY ("branchStudentId") REFERENCES "BranchStudent"("id") ON DELETE CASCADE
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS "BranchStudentLedgerEntry_branchId_idx"
    ON "BranchStudentLedgerEntry" ("branchId")
  `,
  `
    CREATE INDEX IF NOT EXISTS "BranchStudentLedgerEntry_branchStudentId_entryDate_entryNo_idx"
    ON "BranchStudentLedgerEntry" ("branchStudentId", "entryDate", "entryNo")
  `,
  `
    CREATE INDEX IF NOT EXISTS "BranchStudentLedgerEntry_branchStudentId_createdAt_idx"
    ON "BranchStudentLedgerEntry" ("branchStudentId", "createdAt")
  `,
];

export async function ensureBranchStudentLedgerTable() {
  for (const statement of BRANCH_STUDENT_LEDGER_TABLE_DDL) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.$executeRawUnsafe(statement);
  }
}

function parseLedgerDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toLedgerDateString(value) {
  const date = parseLedgerDate(value);
  return date ? date.toISOString() : null;
}

function toLedgerDisplayDate(value) {
  const date = parseLedgerDate(value);
  return date ? date.toISOString() : "";
}

function normalizeLedgerText(value) {
  return normalizeString(value);
}

function resolveBranchStudentLedgerFeeAmount(student = {}) {
  const explicitCourseAmount = Number(student.courseAmount ?? 0);
  if (Number.isFinite(explicitCourseAmount) && explicitCourseAmount > 0) {
    return explicitCourseAmount;
  }

  const installmentTotal = Array.isArray(student.installments)
    ? student.installments.reduce((sum, installment) => {
      const amount = Number(installment?.amount ?? 0);
      return Number.isFinite(amount) ? sum + Math.max(amount, 0) : sum;
    }, 0)
    : 0;

  if (installmentTotal > 0) {
    return installmentTotal;
  }

  const paymentTotal = Array.isArray(student.payments)
    ? student.payments.reduce((sum, payment) => {
      const amount = Number(payment?.amount ?? 0);
      return Number.isFinite(amount) ? sum + Math.max(amount, 0) : sum;
    }, 0)
    : 0;

  return paymentTotal > 0 ? paymentTotal : 0;
}

function resolveBranchStudentLedgerDescription(payment = {}) {
  const payAgainst = normalizeLedgerText(payment.payAgainst);
  if (payAgainst) {
    return payAgainst;
  }

  const installmentNumber = Number(payment.installment?.installmentNumber ?? 0);
  if (Number.isFinite(installmentNumber) && installmentNumber > 0) {
    return `Installment ${installmentNumber}`;
  }

  return "Payment";
}

function buildBranchStudentLedgerEntries(student = {}) {
  const payments = Array.isArray(student.payments) ? student.payments : [];
  const studentName = normalizeString(student.studentName);
  const studentId = normalizeString(student.studentId);
  const courseName = normalizeString(student.courseName || student.courseInterested || student.course?.name || "");
  const feeAmount = resolveBranchStudentLedgerFeeAmount(student);
  const baseDate = toLedgerDateString(student.admissionDate || student.createdAt || new Date()) || toLedgerDateString(new Date());

  const rows = [];
  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let entryNo = 0;

  const pushRow = (row = {}) => {
    const debit = Math.max(Number(row.debit ?? 0), 0);
    const credit = Math.max(Number(row.credit ?? 0), 0);

    totalDebit += debit;
    totalCredit += credit;
    runningBalance += debit - credit;
    entryNo += 1;

    rows.push({
      id: normalizeString(row.id || `${student.id || studentId || "ledger"}-${entryNo}`),
      studentRecordId: normalizeString(row.studentRecordId || student.id || ""),
      branchId: normalizeString(row.branchId || student.branchId || ""),
      studentId,
      studentName,
      course: courseName,
      description: normalizeString(row.description || ""),
      entryType: normalizeString(row.entryType || (credit > 0 ? "CREDIT" : "DEBIT")).toUpperCase(),
      debit,
      credit,
      amount: Number(row.amount ?? debit ?? credit ?? 0),
      runningBalance,
      studentBalanceAfter: runningBalance,
      paymentMode: normalizeString(row.paymentMode || ""),
      receiptNumber: normalizeString(row.receiptNumber || ""),
      payAgainst: normalizeString(row.payAgainst || ""),
      transactionReference: normalizeString(row.transactionReference || ""),
      notes: normalizeString(row.notes || ""),
      referenceType: normalizeString(row.referenceType || ""),
      referenceId: normalizeString(row.referenceId || ""),
      dateRaw: toLedgerDateString(row.dateRaw || row.paymentDateRaw || row.paymentDate || row.createdAt || row.date || baseDate) || baseDate,
      date: toLedgerDisplayDate(row.date || row.paymentDate || row.createdAt || row.dateRaw || baseDate) || baseDate,
      status: normalizeString(row.status || ""),
      entryNo,
    });
  };

  if (feeAmount > 0) {
    pushRow({
      id: `${student.id || studentId || "ledger"}-course-fee`,
      description: "Course Fee",
      debit: feeAmount,
      amount: feeAmount,
      entryType: "DEBIT",
      referenceType: "course-fee",
      dateRaw: baseDate,
      date: baseDate,
    });
  }

  const sortedPayments = payments
    .filter((payment) => Number(payment?.amount ?? 0) > 0)
    .sort((left, right) => {
      const leftTime = new Date(left.paymentDate || left.createdAt || 0).getTime();
      const rightTime = new Date(right.paymentDate || right.createdAt || 0).getTime();

      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return normalizeString(left.receiptNumber || left.id || "").localeCompare(
        normalizeString(right.receiptNumber || right.id || ""),
      );
    });

  sortedPayments.forEach((payment) => {
    const amount = Number(payment.amount ?? 0);
    const paymentDate = toLedgerDateString(payment.paymentDate || payment.createdAt || new Date()) || baseDate;
    const description = resolveBranchStudentLedgerDescription(payment);
    const installmentNumber = Number(payment.installment?.installmentNumber ?? 0);

    pushRow({
      id: payment.id || payment.receiptNumber || `${student.id || studentId || "ledger"}-${paymentDate}-${amount}`,
      description,
      credit: amount,
      amount,
      entryType: "CREDIT",
      referenceType: "payment",
      referenceId: payment.id || payment.receiptNumber || "",
      paymentMode: payment.paymentMode || "",
      receiptNumber: payment.receiptNumber || "",
      payAgainst: payment.payAgainst || (Number.isFinite(installmentNumber) && installmentNumber > 0 ? `Installment ${installmentNumber}` : ""),
      transactionReference: payment.transactionReference || "",
      notes: payment.notes || "",
      dateRaw: paymentDate,
      date: paymentDate,
      createdAt: payment.createdAt || paymentDate,
      paymentDate: payment.paymentDate || paymentDate,
    });
  });

  return {
    student: {
      id: student.id,
      branchId: student.branchId,
      studentId,
      studentName,
      courseName,
    },
    entries: rows,
    summary: {
      totalDebit,
      totalCredit,
      outstandingBalance: runningBalance,
      entryCount: rows.length,
      paymentCount: sortedPayments.length,
      studentCount: 1,
    },
  };
}

async function loadBranchStudentForLedger(studentId, actor) {
  const { where } = await ensureBranchStudentAccess(actor, studentId);

  const student = await prisma.branchStudent.findFirst({
    where,
    include: {
      installments: {
        orderBy: { installmentNumber: "asc" },
      },
      payments: {
        orderBy: [
          { paymentDate: "asc" },
          { createdAt: "asc" },
          { id: "asc" },
        ],
        include: {
          installment: {
            select: {
              installmentNumber: true,
              amount: true,
              dueDate: true,
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new AppError("Branch student not found", 404);
  }

  return student;
}

export async function getBranchStudentLedger(studentId, actor = null) {
  const student = await loadBranchStudentForLedger(studentId, actor);

  const updatedEntries = await prisma.$transaction(async (tx) => {
    const materialized = await materializeBranchStudentLedgerEntries(tx, student);
    return materialized;
  });

  const entries = sortBranchStudentLedgerEntries(updatedEntries).map((entry) => ({
    id: entry.id,
    ledgerKey: entry.ledgerKey,
    branchId: entry.branchId,
    branchStudentId: entry.branchStudentId,
    paymentId: entry.paymentId,
    installmentId: entry.installmentId,
    entryNo: entry.entryNo,
    entryType: entry.entryType,
    description: entry.description,
    debit: Number(entry.debit ?? 0),
    credit: Number(entry.credit ?? 0),
    amount: Number(entry.amount ?? 0),
    runningBalance: Number(entry.runningBalance ?? 0),
    studentBalanceAfter: Number(entry.studentBalanceAfter ?? 0),
    entryDate: entry.entryDate,
    paymentDate: entry.paymentDate,
    referenceType: entry.referenceType,
    referenceId: entry.referenceId,
    paymentMode: entry.paymentMode,
    receiptNumber: entry.receiptNumber,
    payAgainst: entry.payAgainst,
    transactionReference: entry.transactionReference,
    notes: entry.notes,
    createdBy: entry.createdBy,
    updatedBy: entry.updatedBy,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }));

  const summary = entries.reduce((acc, entry) => {
    acc.totalDebit += Number(entry.debit ?? 0);
    acc.totalCredit += Number(entry.credit ?? 0);
    acc.outstandingBalance = Number(entry.runningBalance ?? acc.outstandingBalance ?? 0);
    acc.entryCount += 1;
    if (Number(entry.credit ?? 0) > 0) {
      acc.paymentCount += 1;
    }
    return acc;
  }, {
    totalDebit: 0,
    totalCredit: 0,
    outstandingBalance: 0,
    entryCount: 0,
    paymentCount: 0,
    studentCount: 1,
  });

  return {
    student: {
      id: student.id,
      branchId: student.branchId,
      studentId: student.studentId,
      studentName: student.studentName,
      courseName: student.courseName || student.courseInterested || "",
    },
    entries,
    summary,
  };
}

export async function listBranchLedger(query = {}, actor = null) {
  const branchProfile = await getBranchContext(actor);
  const normalizedStudentId = normalizeString(query.studentId);
  const search = normalizeSearchKey(query.search);
  const branchId = normalizeString(query.branchId || branchProfile?.id);

  if (normalizedStudentId) {
    return getBranchStudentLedger(normalizedStudentId, actor);
  }

  // Dashboard aggregation only needs persisted ledger rows. The regular
  // ledger view materializes each student's ledger for backwards compatibility,
  // but doing that here creates an N+1 query/write operation for every student.
  if (String(query.fast || '').toLowerCase() === 'true' || String(query.fast || '') === '1') {
    const ledgerWhere = branchId ? { branchId } : {};
    if (search) {
      ledgerWhere.OR = [
        { branchStudent: { studentId: { contains: search, mode: "insensitive" } } },
        { branchStudent: { studentName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const entries = await prisma.branchStudentLedgerEntry.findMany({
      where: ledgerWhere,
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }, { entryNo: "desc" }],
      take: Math.min(Math.max(Number(query.limit) || 500, 1), 5000),
      select: {
        id: true,
        ledgerKey: true,
        branchId: true,
        branchStudentId: true,
        paymentId: true,
        installmentId: true,
        entryNo: true,
        entryType: true,
        description: true,
        debit: true,
        credit: true,
        amount: true,
        runningBalance: true,
        studentBalanceAfter: true,
        entryDate: true,
        paymentDate: true,
        paymentMode: true,
        receiptNumber: true,
        payAgainst: true,
        transactionReference: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        branchStudent: { select: { studentId: true, studentName: true, courseName: true } },
      },
    });

    const normalizedEntries = entries.map((entry) => ({
      ...entry,
      studentId: entry.branchStudent?.studentId || "",
      studentName: entry.branchStudent?.studentName || "",
      course: entry.branchStudent?.courseName || "",
      dateRaw: entry.entryDate || entry.paymentDate || entry.createdAt,
      date: entry.entryDate || entry.paymentDate || entry.createdAt,
    }));

    return {
      entries: normalizedEntries,
      summary: normalizedEntries.reduce((acc, entry) => {
        acc.totalDebit += Number(entry.debit || 0);
        acc.totalCredit += Number(entry.credit || 0);
        acc.entryCount += 1;
        if (Number(entry.credit || 0) > 0) acc.paymentCount += 1;
        return acc;
      }, { totalDebit: 0, totalCredit: 0, outstandingBalance: Number(normalizedEntries[0]?.runningBalance || 0), entryCount: 0, paymentCount: 0, studentCount: 0 }),
    };
  }

  const where = branchId ? { branchId } : {};

  if (search) {
    where.OR = [
      { studentId: { contains: search, mode: "insensitive" } },
      { studentName: { contains: search, mode: "insensitive" } },
      { courseName: { contains: search, mode: "insensitive" } },
    ];
  }

  const students = await prisma.branchStudent.findMany({
    where,
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: {
      id: true,
      branchId: true,
      studentId: true,
      studentName: true,
      courseName: true,
    },
  });

  let entries = [];
  for (const student of students) {
    // eslint-disable-next-line no-await-in-loop
    const ledger = await getBranchStudentLedger(student.id, actor);
    entries = entries.concat(ledger.entries);
  }

  const summary = entries.reduce((acc, entry) => {
    acc.totalDebit += Number(entry.debit ?? 0);
    acc.totalCredit += Number(entry.credit ?? 0);
    acc.outstandingBalance = Number(entry.runningBalance ?? acc.outstandingBalance ?? 0);
    acc.entryCount += 1;
    if (Number(entry.credit ?? 0) > 0) {
      acc.paymentCount += 1;
    }
    return acc;
  }, {
    totalDebit: 0,
    totalCredit: 0,
    outstandingBalance: 0,
    entryCount: 0,
    paymentCount: 0,
    studentCount: students.length,
  });

  return {
    entries,
    summary,
  };
}

function getReminderWindowDaysUntilDue(dueDateText) {
  const text = normalizeString(dueDateText);
  if (!text) {
    return null;
  }

  const dueDate = new Date(`${text}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diffDays) ? diffDays : null;
}

async function resolveBranchStudentFacultyUser(student = {}, branchId = "") {
  const normalizedBranchId = normalizeString(branchId || student.branchId);
  const facultyId = normalizeString(student.facultyId);
  const facultyName = normalizeString(student.facultyName);

  if (!normalizedBranchId || (!facultyId && !facultyName)) {
    return null;
  }

  const branchFaculty = await prisma.branchFaculty.findFirst({
    where: {
      branchId: normalizedBranchId,
      status: "ACTIVE",
      OR: [
        ...(facultyId ? [{ facultyId }] : []),
        ...(facultyName ? [{ name: { equals: facultyName, mode: "insensitive" } }] : []),
      ],
    },
    select: {
      email: true,
      name: true,
      facultyId: true,
    },
  });

  if (!branchFaculty?.email) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      email: {
        equals: branchFaculty.email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });
}

function shouldSendDueReminder(nextInstallment = null) {
  if (!nextInstallment) {
    return false;
  }

  const dueDateText = normalizeString(nextInstallment.dueDate);
  if (!dueDateText) {
    return false;
  }

  if (nextInstallment.dueReminderSentAt) {
    return false;
  }

  const diffDays = getReminderWindowDaysUntilDue(dueDateText);
  if (diffDays === null) {
    return false;
  }

  return diffDays >= 0 && diffDays <= DUE_REMINDER_WINDOW_DAYS;
}

async function markInstallmentDueReminderSent(installmentId) {
  if (!installmentId) {
    return;
  }

  await prisma.branchStudentInstallment.update({
    where: { id: installmentId },
    data: {
      dueReminderSentAt: new Date(),
    },
  });
}

export async function sendBranchStudentDueReminderEmails() {
  const students = await prisma.branchStudent.findMany({
    where: {
      recordStatus: "ACTIVE",
      emailAddress: { not: "" },
    },
    include: {
      installments: {
        orderBy: { installmentNumber: "asc" },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  let sentCount = 0;

  for (const student of students) {
    const feeSnapshot = calculateFeeProgressSnapshot(student);
    const nextInstallment = feeSnapshot.nextInstallment;

    if (!shouldSendDueReminder(nextInstallment) || !student.emailAddress) {
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await sendStudentPaymentDueEmail({
      to: student.emailAddress,
      fullName: student.studentName,
      studentId: student.studentId,
      courseName: student.courseName || student.courseInterested || "",
      feeProgress: feeSnapshot.feeProgress,
      courseProgress: student.courseProgress,
      dueAmount: feeSnapshot.dueAmount,
      dueDate: nextInstallment?.dueDate || "",
      installmentNumber: nextInstallment?.installmentNumber || null,
    });

    // eslint-disable-next-line no-await-in-loop
    await markInstallmentDueReminderSent(nextInstallment.id);
    sentCount += 1;
  }

  return {
    scannedCount: students.length,
    sentCount,
  };
}

export function startBranchStudentDueReminderScheduler() {
  const runSweep = () => {
    void sendBranchStudentDueReminderEmails().catch((error) => {
      console.warn("Branch student due reminder sweep failed", error);
    });
  };

  runSweep();

  const timer = setInterval(runSweep, DUE_REMINDER_SWEEP_INTERVAL_MS);
  timer.unref?.();

  return timer;
}

async function notifyProgressAlignment(studentRecord, branchProfile, actor) {
  if (!studentRecord?.id || !branchProfile?.id) {
    return;
  }

  const courseProgress = Number(studentRecord.courseProgress);
  if (!Number.isFinite(courseProgress)) {
    return;
  }

  const feeSnapshot = calculateFeeProgressSnapshot(studentRecord);
  if (feeSnapshot.totalAmount <= 0) {
    return;
  }

  const paidProgress = feeSnapshot.feeProgress;
  if (courseProgress < Math.max(0, paidProgress - PROGRESS_ALERT_TOLERANCE)) {
    return;
  }

  const facultyUser = await resolveBranchStudentFacultyUser(studentRecord, branchProfile.id);

  await createFeeProgressAlertNotification({
    branch: {
      id: branchProfile.id,
      branchId: branchProfile.branchId,
      branchEmail: branchProfile.branchEmail,
      branchName: branchProfile.branchName,
    },
    student: studentRecord,
    facultyUserId: facultyUser?.id || null,
    actorId: actor?.id ?? null,
    courseProgress,
    paidProgress,
    dueAmount: feeSnapshot.dueAmount,
    dueDate: feeSnapshot.nextInstallment?.dueDate || "",
    nextInstallmentNumber: feeSnapshot.nextInstallment?.installmentNumber || null,
    tone: "amber",
  });
}

async function normalizeBranchStudentIdentifiers(branchProfile, actorId = null) {
  if (!branchProfile?.id) {
    return [];
  }

  const branchCode = normalizeString(branchProfile.branchId || branchProfile.branchCode || branchProfile.id).toUpperCase();
  const rows = await prisma.branchStudent.findMany({
    where: { branchId: branchProfile.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const planned = rows.map((row, index) => ({
    row,
    nextStudentId: generateStudentIdFromSequence(index + 1, branchProfile.branchId),
  }));

  const needsMigration = planned.some(({ row, nextStudentId }) => row.studentId !== nextStudentId);
  if (!needsMigration) {
    return rows;
  }

  return prisma.$transaction(async (tx) => {
    for (const { row, nextStudentId } of planned) {
      if (row.studentId === nextStudentId) {
        continue;
      }

      const loginUser = await tx.user.findFirst({
        where: {
          OR: [
            { email: row.emailAddress },
            { userCode: row.studentId },
            { userCode: buildBranchStudentUserCode(branchCode, row.studentId) },
          ],
        },
        select: { id: true },
      });

      await tx.branchStudent.update({
        where: { id: row.id },
        data: {
          studentId: nextStudentId,
          updatedBy: actorId,
        },
      });

      if (loginUser) {
        await tx.user.update({
          where: { id: loginUser.id },
          data: {
            userCode: buildBranchStudentUserCode(branchCode, nextStudentId),
            updatedBy: actorId,
          },
        });
      }
    }

    return tx.branchStudent.findMany({
      where: { branchId: branchProfile.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  });
}

function buildBranchStudentPayload(payload = {}, existing = null) {
  const candidate = existing ? { ...existing, ...payload } : payload;
  const studentName = parseRequiredText(candidate.studentName, "Student name");
  const emailAddress = parseEmail(candidate.emailAddress);
  const mobileNumber = parsePhone(candidate.mobileNumber);
  const parentSpouseNumber = candidate.parentSpouseNumber ? parsePhone(candidate.parentSpouseNumber, "Parent / spouse number") : null;
  const countryCode = parseRequiredText(candidate.countryCode, "Country code").toUpperCase();
  const country = parseRequiredText(candidate.country, "Country");
  const stateCode = parseRequiredText(candidate.stateCode, "State code").toUpperCase();
  const state = parseRequiredText(candidate.state, "State");
  const city = parseRequiredText(candidate.city, "City");
  const address = parseRequiredText(candidate.address, "Address");
  const linkedInUrl = parseOptionalUrl(candidate.linkedInUrl);
  const qualification = parseRequiredText(candidate.qualification, "Qualification");
  const passedOutYear = parseRequiredText(candidate.passedOutYear, "Passed out year");
  const currentStatus = parseCurrentStatus(candidate.currentStatus);
  const designation = currentStatus === "Employee" ? parseRequiredText(candidate.designation, "Designation") : parseOptionalText(candidate.designation);
  const source = parseRequiredText(candidate.source, "Source");
  const sourceOther = source === "Others" ? parseRequiredText(candidate.sourceOther, "Source details") : parseOptionalText(candidate.sourceOther);
  const remarks = parseOptionalText(candidate.remarks);
  const admissionDate = parseDateString(candidate.admissionDate, "Admission date");
  const courseStartDate = parseOptionalText(candidate.courseStartDate);
  const classSchedule = parseOptionalText(candidate.classSchedule);
  const courseMode = parseOptionalText(candidate.courseMode);
  const totalWorkingDaysValue = candidate.totalWorkingDays === undefined || candidate.totalWorkingDays === null || candidate.totalWorkingDays === ''
    ? null
    : Number(candidate.totalWorkingDays);
  if (totalWorkingDaysValue !== null && (!Number.isInteger(totalWorkingDaysValue) || totalWorkingDaysValue <= 0)) {
    throw new AppError("Total working days must be a positive whole number", 400);
  }
  const courseEndDate = parseOptionalText(candidate.courseEndDate);
  const recordStatus = parseStatus(candidate.recordStatus || candidate.status || "ACTIVE");
  const courseProgress = parseOptionalProgress(candidate.courseProgress);

  if (currentStatus === "Employee" && !designation) {
    throw new AppError("Designation is required for employees", 400);
  }

  if (source === "Others" && !sourceOther) {
    throw new AppError("Source details are required when source is Others", 400);
  }
  const studentData = {
    studentName,
    emailAddress,
    mobileNumber,
    parentSpouseNumber,
    countryCode,
    country,
    stateCode,
    state,
    city,
    address,
    linkedInUrl,
    qualification,
    passedOutYear,
    currentStatus,
    designation,
    source,
    sourceOther,
    remarks,
    admissionDate,
    courseStartDate,
    classSchedule,
    courseProgress,
    recordStatus,
    courseId: parseOptionalText(candidate.courseId),
    courseName: parseOptionalText(candidate.courseName),
    courseMode,
    totalWorkingDays: totalWorkingDaysValue,
    courseEndDate,
    batchId: parseOptionalText(candidate.batchId || candidate.batchEntryId),
    batchName: parseOptionalText(candidate.batchName || candidate.batch),
    batchTiming: parseOptionalText(candidate.batchTiming || candidate.batchTime),
    facultyId: parseOptionalText(candidate.facultyId),
    facultyName: parseOptionalText(candidate.facultyName),
    courseAmount: candidate.courseAmount && Number.isFinite(Number(String(candidate.courseAmount).replace(/,/g, ''))) 
      ? Number(String(candidate.courseAmount).replace(/,/g, '')) 
      : null,
    paymentMode: parseOptionalText(candidate.paymentMode) || "Installment",
    paymentPlanId: parseOptionalText(candidate.paymentPlanId),
    paymentPlan: parseOptionalText(candidate.paymentPlan),
  };

  let installmentSchedule = [];
  if (Array.isArray(candidate.installmentSchedule)) {
    installmentSchedule = candidate.installmentSchedule.map((inst, index) => ({
      installmentNumber: index + 1,
      amount: Number(String(inst.amount).replace(/,/g, '')) || 0,
      dueDate: parseOptionalText(inst.dueDate),
      status: parseOptionalText(inst.status) || "Pending",
      paymentMethod: parseOptionalText(inst.paymentMethod),
      remarks: parseOptionalText(inst.remarks),
      paidAt: inst.paidAt ? new Date(inst.paidAt) : null,
    }));
  }

  return { studentData, installmentSchedule };
}

async function getBranchContext(actor) {
  const role = normalizeString(actor?.role).toUpperCase();

  if (role !== "BRANCH_ADMIN") {
    return null;
  }

  const branchProfile = await getCurrentBranchProfile(actor);
  if (!branchProfile?.id) {
    throw new AppError("Branch profile not found", 404);
  }

  return branchProfile;
}

function buildBranchStudentWhere(query = {}, branchProfile = null) {
  const where = {};
  const search = normalizeString(query.search);

  if (query.status) {
    where.recordStatus = parseStatus(query.status);
  }

  if (search) {
    where.OR = [
      { studentId: { contains: search, mode: "insensitive" } },
      { studentName: { contains: search, mode: "insensitive" } },
      { emailAddress: { contains: search, mode: "insensitive" } },
      { mobileNumber: { contains: search, mode: "insensitive" } },
      { parentSpouseNumber: { contains: search, mode: "insensitive" } },
      { country: { contains: search, mode: "insensitive" } },
      { state: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { qualification: { contains: search, mode: "insensitive" } },
      { passedOutYear: { contains: search, mode: "insensitive" } },
      { currentStatus: { contains: search, mode: "insensitive" } },
      { designation: { contains: search, mode: "insensitive" } },
      { source: { contains: search, mode: "insensitive" } },
      { sourceOther: { contains: search, mode: "insensitive" } },
    ];
  }

  if (branchProfile?.id) {
    where.branchId = branchProfile.id;
  } else if (query.branchId) {
    where.branchId = normalizeString(query.branchId);
  }

  const batchId = normalizeString(query.batchId || query.batchEntryId);
  if (batchId) {
    where.batchId = batchId;
  }

  return where;
}

function buildBranchStudentOrderBy(sortBy, sortOrder) {
  switch (normalizeSearchKey(sortBy)) {
    case "studentid":
      return { studentId: sortOrder };
    case "studentname":
      return { studentName: sortOrder };
    case "emailaddress":
      return { emailAddress: sortOrder };
    case "mobilenumber":
      return { mobileNumber: sortOrder };
    case "admissiondate":
      return { admissionDate: sortOrder };
    case "updatedat":
      return { updatedAt: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

function toBranchStudentSummary(record) {
  return {
    id: record.id,
    branchId: record.branchId,
    studentId: record.studentId,
    studentName: record.studentName,
    emailAddress: record.emailAddress,
    mobileNumber: record.mobileNumber,
    parentSpouseNumber: record.parentSpouseNumber,
    countryCode: record.countryCode,
    country: record.country,
    stateCode: record.stateCode,
    state: record.state,
    city: record.city,
    address: record.address,
    linkedInUrl: record.linkedInUrl,
    qualification: record.qualification,
    passedOutYear: record.passedOutYear,
    currentStatus: record.currentStatus,
    designation: record.designation,
    source: record.source,
    sourceOther: record.sourceOther,
    remarks: record.remarks,
    admissionDate: record.admissionDate,
    courseStartDate: record.courseStartDate,
    classSchedule: record.classSchedule,
    courseProgress: record.courseProgress,
    courseId: record.courseId,
    courseName: record.courseName,
    courseMode: record.courseMode,
    totalWorkingDays: record.totalWorkingDays,
    courseEndDate: record.courseEndDate,
    courseDuration: record.course?.duration ?? record.courseDuration ?? null,
    course: record.course
      ? {
          id: record.course.id,
          name: record.course.name,
          courseCode: record.course.courseCode,
          duration: record.course.duration,
          hours: record.course.hours,
          mode: record.course.mode,
          status: record.course.status,
        }
      : null,
    batchId: record.batchId,
    batchName: record.batchName,
    batchTiming: record.batchTiming,
    facultyId: record.facultyId,
    facultyName: record.facultyName,
    courseAmount: record.courseAmount,
    paymentMode: record.paymentMode,
    paymentPlanId: record.paymentPlanId,
    paymentPlan: record.paymentPlan,
    status: displayStatus(record.recordStatus),
    recordStatus: record.recordStatus,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    installmentSchedule: Array.isArray(record.installments) ? record.installments : [],
  };
}

async function ensureAvailableBatchCapacity(batch, excludeStudentId = null) {
  const studentWhere = {
    branchId: batch.branchId,
    batchId: batch.batchId,
    recordStatus: 'ACTIVE',
    ...(excludeStudentId ? { NOT: { id: excludeStudentId } } : {}),
  }
  const totalStudentCount = await prisma.branchStudent.count({ where: studentWhere })
  if (totalStudentCount >= Number(batch?.totalSeats || 0)) throw new AppError('This batch has reached its total seat capacity.', 400)
}

async function ensureUniqueBranchStudentIdentity({ emailAddress, mobileNumber }, branchId, excludeId = null, excludeUserId = null) {
  const existing = await prisma.branchStudent.findFirst({
    where: {
      branchId,
      OR: [{ emailAddress }, { mobileNumber }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, emailAddress: true, mobileNumber: true },
  });

  if (existing) {
    if (existing.emailAddress === emailAddress) {
      throw new AppError("Student email already exists in this branch", 409);
    }

    if (existing.mobileNumber === mobileNumber) {
      throw new AppError("Student mobile number already exists in this branch", 409);
    }
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: emailAddress },
        { phone: mobileNumber },
      ],
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true, email: true, phone: true },
  });

  if (existingUser) {
    if (existingUser.email === emailAddress) {
      throw new AppError("Student email already exists", 409);
    }

    if (existingUser.phone === mobileNumber) {
      throw new AppError("Student mobile number already exists", 409);
    }
  }
}

function createTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

function createResetTokenArtifacts() {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + config.credentialResetTokenExpiresMinutes * 60 * 1000);

  return { resetToken, tokenHash, expiresAt };
}

function buildBranchStudentUserCode(branchCode, studentId) {
  return normalizeBranchEntityId(studentId, branchCode, "STU");
}

async function findBranchStudentLoginUser(student) {
  const branch = student?.branchId
    ? await prisma.branch.findUnique({
        where: { id: student.branchId },
        select: { branchId: true },
      })
    : null;
  const branchUserCode = branch?.branchId
    ? buildBranchStudentUserCode(branch.branchId, student.studentId)
    : null;

  return prisma.user.findFirst({
    where: {
      OR: [
        { userCode: student.studentId },
        ...(branchUserCode ? [{ userCode: branchUserCode }] : []),
        { email: student.emailAddress },
      ],
    },
  });
}

async function ensureBranchStudentAccess(actor, studentId) {
  const branchProfile = await getBranchContext(actor);

  if (!branchProfile?.id) {
    return { branchProfile: null, where: { OR: [{ id: studentId }, { studentId }] } };
  }

  return {
    branchProfile,
    where: {
      branchId: branchProfile.id,
      OR: [{ id: studentId }, { studentId }],
    },
  };
}

export async function listBranchStudents(query = {}, actor = null) {
  const { page, limit, skip, take } = buildPagination(query);
  const sortBy = normalizeString(query.sortBy).toLowerCase() || "createdat";
  const sortOrder = parseSortOrder(query.sortOrder);
  const branchProfile = await getBranchContext(actor);

  // Listing students must remain read-only; identifier migration belongs in an explicit admin flow.
  const where = buildBranchStudentWhere(query, branchProfile);

  const [total, rows] = await prisma.$transaction([
    prisma.branchStudent.count({ where }),
    prisma.branchStudent.findMany({
      where,
      orderBy: buildBranchStudentOrderBy(sortBy, sortOrder),
      skip,
      take,
      include: {
        course: {
          select: {
            id: true,
            name: true,
            courseCode: true,
            duration: true,
            hours: true,
            mode: true,
            status: true,
          },
        },
        installments: {
          orderBy: { installmentNumber: "asc" }
        }
      }
    }),
  ]);

  return {
    data: rows.map(toBranchStudentSummary),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function createBranchStudent(payload, actor) {
  const branchProfile = await getBranchContext(actor);
  const branchId = branchProfile?.id || normalizeString(payload.branchId);

  if (!branchId) {
    throw new AppError("Branch ID is required", 400);
  }

  console.log("[createBranchStudent] incoming payload keys:", Object.keys(payload));
  let studentData, installmentSchedule;
  try {
    ({ studentData, installmentSchedule } = buildBranchStudentPayload(payload));
  } catch (err) {
    console.error("[createBranchStudent] validation error:", err.message);
    throw err;
  }
  const selectedBatchId = normalizeString(payload.batchId || payload.batchEntryId);
  const assignedBatch = selectedBatchId
    ? await prisma.branchBatch.findFirst({
        where: {
          batchId: selectedBatchId,
          status: "ACTIVE",
          branchId,
          ...(studentData.courseId ? { courseId: studentData.courseId } : {}),
        },
        select: {
          branchId: true,
          batchId: true,
          batchName: true,
          batchTiming: true,
          totalSeats: true,
          offlineSeats: true,
          courseId: true,
          courseName: true,
          facultyId: true,
          facultyName: true,
          weekType: true,
          mode: true,
          courseStartDate: true,
          courseEndDate: true,
        },
      })
    : null;

  if (selectedBatchId && !assignedBatch) {
    throw new AppError("Selected batch was not found in this branch", 400);
  }

  if (assignedBatch) {
    const requestedWeekType = normalizeString(payload.weekType).toUpperCase();
    const requestedMode = normalizeString(payload.mode || payload.courseMode).toUpperCase();
    if ((requestedWeekType && requestedWeekType !== assignedBatch.weekType) || (requestedMode && requestedMode !== assignedBatch.mode)) throw new AppError("Selected batch does not match the selected course, week type, or mode.", 400);
    await ensureAvailableBatchCapacity(assignedBatch);
  }

  if (assignedBatch) {
    studentData.batchId = assignedBatch.batchId;
    studentData.batchName = assignedBatch.batchName;
    studentData.batchTiming = assignedBatch.batchTiming;
    studentData.courseId = studentData.courseId || assignedBatch.courseId;
    studentData.courseName = studentData.courseName || assignedBatch.courseName;
    studentData.facultyId = studentData.facultyId || assignedBatch.facultyId;
    studentData.facultyName = studentData.facultyName || assignedBatch.facultyName;
    studentData.courseStartDate = studentData.courseStartDate || assignedBatch.courseStartDate;
    studentData.courseEndDate = studentData.courseEndDate || assignedBatch.courseEndDate;
  }
  console.log("[createBranchStudent] studentData keys:", Object.keys(studentData));
  console.log("[createBranchStudent] studentData:", JSON.stringify(studentData, null, 2));
  console.log("[createBranchStudent] installmentSchedule count:", installmentSchedule.length);
  const actorId = actor?.id ?? null;
  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const { resetToken, tokenHash, expiresAt } = createResetTokenArtifacts();

  await ensureUniqueBranchStudentIdentity(studentData, branchId);

  const requestedStudentId = payload.studentId
    ? normalizeBranchEntityId(payload.studentId, branchProfile?.branchId || branchId, "STU")
    : "";
  let studentId = requestedStudentId;
  if (!studentId || await isStudentIdTaken(branchId, studentId)) {
    studentId = await generateUniqueStudentId(branchId);
  }

  let created = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      created = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Branch" WHERE id = ${branchId} FOR UPDATE`;
        const student = await tx.branchStudent.create({
          data: {
            branchId,
            studentId,
            ...studentData,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });

        await syncStudentCourseEnd(tx, student);

        if (installmentSchedule.length > 0) {
          await tx.branchStudentInstallment.createMany({
            data: installmentSchedule.map(inst => ({
              ...inst,
              branchStudentId: student.id,
            }))
          });
        }

        const user = await tx.user.create({
          data: {
            userCode: buildBranchStudentUserCode(branchProfile?.branchId || branchId, studentId),
            fullName: studentData.studentName,
            email: studentData.emailAddress,
            phone: studentData.mobileNumber,
            role: "STUDENT",
            active: true,
            passwordHash,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });

        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
            createdBy: actorId,
          },
        });

        const createdStudent = await tx.branchStudent.findUnique({
          where: { id: student.id },
          include: {
            installments: { orderBy: { installmentNumber: "asc" } },
          },
        });

        if (createdStudent) {
          await materializeBranchStudentLedgerEntries(tx, createdStudent, { includePayments: false });
        }

        return createdStudent;
      });
      break;
    } catch (error) {
      const isStudentCodeConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.some((field) => field === "studentId" || field === "userCode");

      if (!isStudentCodeConflict || attempt === 1) {
        throw error;
      }

      studentId = await generateUniqueStudentId(branchId);
    }
  }

  void sendStudentCredentialsEmail({
    to: studentData.emailAddress,
    fullName: studentData.studentName,
    studentCode: studentId,
    temporaryPassword,
    resetToken,
    courseName: studentData.courseName || assignedBatch?.courseName || "",
    facultyName: studentData.facultyName || "",
    batchName: assignedBatch?.batchName || "",
    batchTiming: assignedBatch?.batchTiming || "",
  }).catch((error) => {
    console.warn("Branch student credentials email failed to send", error);
  });

  return toBranchStudentSummary(created);
}

export async function getBranchStudent(studentId, actor = null) {
  const { where } = await ensureBranchStudentAccess(actor, studentId);
  const student = await prisma.branchStudent.findFirst({
    where,
    include: {
      course: {
        select: {
          id: true,
          name: true,
          courseCode: true,
          duration: true,
          hours: true,
          mode: true,
          status: true,
        },
      },
      installments: { orderBy: { installmentNumber: "asc" } }
    }
  });

  if (!student) {
    throw new AppError("Branch student not found", 404);
  }

  return toBranchStudentSummary(student);
}

export async function getCurrentBranchStudentProfile(user) {
  const email = normalizeString(user?.email).toLowerCase();
  const userCode = normalizeString(user?.userCode);

  if (!email && !userCode) {
    throw new AppError("Branch student profile not found", 404);
  }

  const student = await prisma.branchStudent.findFirst({
    where: {
      OR: [
        ...(email ? [{ emailAddress: email }] : []),
        ...(userCode ? [{ studentId: userCode }, { id: userCode }] : []),
      ],
    },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          courseCode: true,
          duration: true,
          hours: true,
          mode: true,
          status: true,
        },
      },
      installments: { orderBy: { installmentNumber: "asc" } },
    },
  });

  if (!student) {
    throw new AppError("Branch student profile not found", 404);
  }

  return toBranchStudentSummary(student);
}

export async function updateBranchStudent(studentId, payload, actor = null) {
  const { where } = await ensureBranchStudentAccess(actor, studentId);
  const existing = await prisma.branchStudent.findFirst({
    where,
  });

  if (!existing) {
    throw new AppError("Branch student not found", 404);
  }

  const { studentData, installmentSchedule } = buildBranchStudentPayload(payload, existing);
  const selectedBatchId = normalizeString(studentData.batchId);
  if (selectedBatchId) {
    const assignedBatch = await prisma.branchBatch.findFirst({
      where: {
        batchId: selectedBatchId,
        status: "ACTIVE",
        branchId: existing.branchId,
        ...(studentData.courseId ? { courseId: studentData.courseId } : {}),
      },
      select: {
        branchId: true,
        batchId: true,
        batchName: true,
        batchTiming: true,
        totalSeats: true,
        offlineSeats: true,
        courseId: true,
        courseName: true,
        facultyId: true,
        facultyName: true,
        weekType: true,
        mode: true,
        courseStartDate: true,
        courseEndDate: true,
      },
    });

    if (!assignedBatch) {
      throw new AppError("Selected batch was not found in this branch", 400);
    }

    const requestedWeekType = normalizeString(payload.weekType).toUpperCase();
    const requestedMode = normalizeString(payload.mode || payload.courseMode).toUpperCase();
    if ((requestedWeekType && requestedWeekType !== assignedBatch.weekType) || (requestedMode && requestedMode !== assignedBatch.mode)) throw new AppError("Selected batch does not match the selected course, week type, or mode.", 400);
    await ensureAvailableBatchCapacity(assignedBatch, existing.id);

    studentData.batchId = assignedBatch.batchId;
    studentData.batchName = assignedBatch.batchName;
    studentData.batchTiming = assignedBatch.batchTiming;
    studentData.courseId = studentData.courseId || assignedBatch.courseId;
    studentData.courseName = studentData.courseName || assignedBatch.courseName;
    studentData.facultyId = studentData.facultyId || assignedBatch.facultyId;
    studentData.facultyName = studentData.facultyName || assignedBatch.facultyName;
    studentData.courseStartDate = studentData.courseStartDate || assignedBatch.courseStartDate;
    studentData.courseEndDate = studentData.courseEndDate || assignedBatch.courseEndDate;
  }
  const existingLoginUser = await findBranchStudentLoginUser(existing);
  const previousCourseProgress = Number(existing.courseProgress);
  await ensureUniqueBranchStudentIdentity(studentData, existing.branchId, existing.id, existingLoginUser?.id);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Branch" WHERE id = ${existing.branchId} FOR UPDATE`;
    const student = await tx.branchStudent.update({
      where: { id: existing.id },
      data: {
        ...studentData,
        updatedBy: actor?.id ?? null,
      },
    });

    await syncStudentCourseEnd(tx, student);

    await tx.branchStudentInstallment.deleteMany({
      where: { branchStudentId: student.id }
    });

    if (installmentSchedule.length > 0) {
      await tx.branchStudentInstallment.createMany({
        data: installmentSchedule.map(inst => ({
          ...inst,
          branchStudentId: student.id,
        }))
      });
    }

    const updatedStudent = await tx.branchStudent.findUnique({
      where: { id: student.id },
      include: { installments: { orderBy: { installmentNumber: "asc" } } },
    });

    if (updatedStudent) {
      await materializeBranchStudentLedgerEntries(tx, updatedStudent, { includePayments: false });
    }

    if (existingLoginUser) {
      await tx.user.update({
        where: { id: existingLoginUser.id },
        data: {
          fullName: studentData.studentName,
          email: studentData.emailAddress,
          phone: studentData.mobileNumber,
          updatedBy: actor?.id ?? null,
        },
      });
    }

    return updatedStudent;
  });

  const updatedCourseProgress = Number(updated?.courseProgress);
  if (
    Number.isFinite(updatedCourseProgress) &&
    updatedCourseProgress !== previousCourseProgress &&
    updatedCourseProgress > 0
  ) {
    void notifyProgressAlignment(updated, {
      id: existing.branchId,
      branchId: existing.branchId,
      branchName: existing.branchName,
      branchEmail: existing.branchEmail,
    }, actor).catch((error) => {
      console.warn("Branch student progress notification failed", error);
    });
  }

  return toBranchStudentSummary(updated);
}

export async function deleteBranchStudent(studentId, actor = null) {
  const { where } = await ensureBranchStudentAccess(actor, studentId);
  const existing = await prisma.branchStudent.findFirst({
    where,
  });

  if (!existing) {
    throw new AppError("Branch student not found", 404);
  }

  const existingLoginUser = await findBranchStudentLoginUser(existing);

  await prisma.$transaction(async (tx) => {
    await tx.branchStudentPayment.deleteMany({
      where: { branchStudentId: existing.id },
    });

    await tx.branchStudent.delete({
      where: { id: existing.id },
    });

    if (existingLoginUser) {
      await tx.passwordResetToken.deleteMany({
        where: { userId: existingLoginUser.id },
      });

      await tx.user.delete({
        where: { id: existingLoginUser.id },
      });
    }
  });

  return toBranchStudentSummary(existing);
}

export async function createBranchStudentPayment(studentId, payload, actor = null) {
  const { where } = await ensureBranchStudentAccess(actor, studentId);
  const student = await prisma.branchStudent.findFirst({
    where,
    include: {
      installments: true,
    },
  });

  if (!student) {
    throw new AppError("Branch student not found", 404);
  }

  const amountReceived = Number(String(payload.amountReceived).replace(/,/g, ''));
  if (isNaN(amountReceived) || amountReceived <= 0) {
    throw new AppError("Invalid payment amount", 400);
  }

  const generatedReceiptNumber = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`;

  let targetInstallmentId = null;
  const payAgainst = String(payload.payAgainst || "").trim();

  const payment = await prisma.$transaction(async (tx) => {
    // Check if payAgainst matches any installment
    const installmentMatch = payAgainst.match(/Installment\s+(\d+)/i);
    if (installmentMatch) {
      const instNum = parseInt(installmentMatch[1], 10);
      const installment = student.installments.find(i => i.installmentNumber === instNum);
      
      if (installment) {
        targetInstallmentId = installment.id;
        
        const newAmountPaid = installment.amountPaid + amountReceived;
        const newStatus = newAmountPaid >= installment.amount ? "Paid" : "Pending";
        
        await tx.branchStudentInstallment.update({
          where: { id: installment.id },
          data: {
            amountPaid: newAmountPaid,
            status: newStatus,
            paidAt: newStatus === "Paid" ? new Date() : installment.paidAt,
          },
        });
      }
    }

    return await tx.branchStudentPayment.create({
      data: {
        receiptNumber: generatedReceiptNumber,
        branchStudentId: student.id,
        branchId: student.branchId,
        amount: amountReceived,
        paymentMode: String(payload.paymentMode || "Cash"),
        transactionReference: payload.transactionReference ? String(payload.transactionReference) : null,
        paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
        collectedBy: payload.collectedBy ? String(payload.collectedBy) : (actor?.name || actor?.email || "Admin"),
        notes: payload.notes ? String(payload.notes) : null,
        payAgainst: payAgainst,
        installmentId: targetInstallmentId,
      },
    });
  });

  const refreshedStudent = await prisma.$transaction(async (tx) => {
    const currentStudent = await tx.branchStudent.findUnique({
      where: { id: student.id },
      include: {
        installments: {
          orderBy: { installmentNumber: "asc" },
        },
        payments: {
          orderBy: [
            { paymentDate: "asc" },
            { createdAt: "asc" },
            { id: "asc" },
          ],
          include: {
            installment: {
              select: {
                installmentNumber: true,
                amount: true,
                dueDate: true,
              },
            },
          },
        },
      },
    });

    if (!currentStudent) {
      return null;
    }

    await materializeBranchStudentLedgerEntries(tx, currentStudent);
    return currentStudent;
  });

  if (refreshedStudent) {
    const branchProfile = await getCurrentBranchProfile(actor).catch(() => null);

    const savedPayment = Array.isArray(refreshedStudent.payments)
      ? refreshedStudent.payments.find((item) => item.id === payment.id)
      : payment;
    const totalCourseFee = Number(
      refreshedStudent.totalCourseFee ||
      refreshedStudent.courseFee ||
      refreshedStudent.totalFees ||
      refreshedStudent.totalAmount ||
      refreshedStudent.afterDiscount ||
      0
    );
    const totalPaid = Array.isArray(refreshedStudent.payments)
      ? refreshedStudent.payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      : Number(savedPayment?.amount || 0);

    if (refreshedStudent.emailAddress) {
      void sendStudentPaymentReceiptEmail({
        to: refreshedStudent.emailAddress,
        studentName: refreshedStudent.studentName,
        studentId: refreshedStudent.studentId,
        courseName: refreshedStudent.courseName || refreshedStudent.courseInterested || "",
        batchName: refreshedStudent.batchName || refreshedStudent.batch || "",
        branchName: branchProfile?.branchName || refreshedStudent.branchName || "CISPRO Training",
        branchAddress: branchProfile?.branchAddress || refreshedStudent.branchAddress || "",
        receiptNumber: savedPayment?.receiptNumber || payment.receiptNumber,
        paymentDate: savedPayment?.paymentDate || payment.paymentDate,
        paymentFor: savedPayment?.payAgainst || payment.payAgainst,
        paymentMode: savedPayment?.paymentMode || payment.paymentMode,
        transactionReference: savedPayment?.transactionReference || payment.transactionReference,
        collectedBy: savedPayment?.collectedBy || payment.collectedBy,
        amount: savedPayment?.amount || payment.amount,
        totalCourseFee,
        totalPaid,
        balance: Math.max(totalCourseFee - totalPaid, 0),
        installments: refreshedStudent.installments,
        receiptAttachment: payload.receiptAttachment,
      })
        .catch((error) => {
          console.warn("Branch student payment receipt email failed to send", error);
        });
    }

    void notifyProgressAlignment(refreshedStudent, branchProfile || { id: student.branchId, branchId: student.branchId }, actor).catch((error) => {
      console.warn("Branch student payment progress notification failed", error);
    });

    const feeSnapshot = calculateFeeProgressSnapshot(refreshedStudent);
    const nextInstallment = feeSnapshot.nextInstallment;
    if (shouldSendDueReminder(nextInstallment) && refreshedStudent.emailAddress) {
      void sendStudentPaymentDueEmail({
        to: refreshedStudent.emailAddress,
        fullName: refreshedStudent.studentName,
        studentId: refreshedStudent.studentId,
        courseName: refreshedStudent.courseName || refreshedStudent.courseInterested || "",
        feeProgress: feeSnapshot.feeProgress,
        courseProgress: refreshedStudent.courseProgress,
        dueAmount: feeSnapshot.dueAmount,
        dueDate: nextInstallment?.dueDate || "",
        installmentNumber: nextInstallment?.installmentNumber || null,
      })
        .then(() => markInstallmentDueReminderSent(nextInstallment?.id))
        .catch((error) => {
          console.warn("Branch student due reminder email failed to send", error);
        });
    }
  }

  return payment;
}
