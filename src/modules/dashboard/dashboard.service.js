import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

const IST_OFFSET_MINUTES = 330;
const REVENUE_SUMMARY_CACHE_TTL_MS = 15000;

let cachedRevenueSummary = null;
let cachedRevenueSummaryExpiresAt = 0;
let cachedRevenueSummaryPromise = null;

function normalizeString(value) {
  return String(value ?? "").trim();
}

function toIstDateParts(date = new Date()) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(),
  };
}

function toDateStringFromParts(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getIstToday() {
  const parts = toIstDateParts();
  return toDateStringFromParts(parts.year, parts.month, parts.day);
}

function getIstMonthStart(offsetMonths = 0) {
  const { year, month } = toIstDateParts();
  const date = new Date(Date.UTC(year, month - 1 + offsetMonths, 1));
  return date.toISOString().slice(0, 10);
}

function getIstWeekStart() {
  const today = getIstToday();
  const date = new Date(`${today}T00:00:00Z`);
  const { dayOfWeek } = toIstDateParts();
  const offset = (dayOfWeek + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function getIstWeekEnd() {
  const start = getIstWeekStart();
  return addDays(start, 6);
}

function buildRevenueWhere({ from, to, monthPrefix } = {}) {
  const where = {
    recordStatus: "ACTIVE",
  };

  if (monthPrefix) {
    where.admissionDate = {
      startsWith: monthPrefix,
    };
  }

  if (from || to) {
    where.admissionDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  return where;
}

function sumRevenue(record) {
  return Number(record?._sum?.totalAmount || 0);
}

function countStudents(record) {
  return Number(record?._count?.id || 0);
}

async function getRevenueSummary() {
  const now = Date.now();

  if (cachedRevenueSummary && now < cachedRevenueSummaryExpiresAt) {
    return cachedRevenueSummary;
  }

  if (cachedRevenueSummaryPromise) {
    return cachedRevenueSummaryPromise;
  }

  cachedRevenueSummaryPromise = (async () => {
  const today = getIstToday();
  const monthStart = getIstMonthStart();
  const nextMonthStart = getIstMonthStart(1);
  const weekStart = getIstWeekStart();
  const weekEnd = getIstWeekEnd();

  const previousMonthStart = getIstMonthStart(-1);
  const previousMonthEnd = addDays(monthStart, -1);

  const [totalRevenue, totalStudents, thisMonthRevenue, thisMonthStudents, thisWeekRevenue, thisWeekStudents, previousMonthRevenue] =
    await prisma.$transaction([
      prisma.studentProfile.aggregate({
        where: buildRevenueWhere(),
        _sum: { totalAmount: true },
      }),
      prisma.studentProfile.aggregate({
        where: buildRevenueWhere(),
        _count: { id: true },
      }),
      prisma.studentProfile.aggregate({
        where: buildRevenueWhere({ from: monthStart, to: nextMonthStart }),
        _sum: { totalAmount: true },
      }),
      prisma.studentProfile.aggregate({
        where: buildRevenueWhere({ from: monthStart, to: nextMonthStart }),
        _count: { id: true },
      }),
      prisma.studentProfile.aggregate({
        where: buildRevenueWhere({ from: weekStart, to: weekEnd }),
        _sum: { totalAmount: true },
      }),
      prisma.studentProfile.aggregate({
        where: buildRevenueWhere({ from: weekStart, to: weekEnd }),
        _count: { id: true },
      }),
      prisma.studentProfile.aggregate({
        where: buildRevenueWhere({ from: previousMonthStart, to: previousMonthEnd }),
        _sum: { totalAmount: true },
      }),
    ]);

  const expectedNextWeekRevenue = Math.round(
    Math.max(
      sumRevenue(thisWeekRevenue),
      sumRevenue(thisMonthRevenue) / 4,
      sumRevenue(previousMonthRevenue) / 4,
    ),
  );

  return {
    generatedAt: today,
    totalRevenue: sumRevenue(totalRevenue),
    totalStudents: countStudents(totalStudents),
    thisMonthRevenue: sumRevenue(thisMonthRevenue),
    thisMonthStudents: countStudents(thisMonthStudents),
    thisWeekRevenue: sumRevenue(thisWeekRevenue),
    thisWeekStudents: countStudents(thisWeekStudents),
    expectedNextWeekRevenue,
  };
  })()
    .then((summary) => {
      cachedRevenueSummary = summary;
      cachedRevenueSummaryExpiresAt = Date.now() + REVENUE_SUMMARY_CACHE_TTL_MS;
      return summary;
    })
    .finally(() => {
      cachedRevenueSummaryPromise = null;
    });

  return cachedRevenueSummaryPromise;
}

function invalidateRevenueSummaryCache() {
  cachedRevenueSummary = null;
  cachedRevenueSummaryExpiresAt = 0;
}

export { getRevenueSummary, invalidateRevenueSummaryCache };
