import prisma from "../../config/prisma.js";

const IST_OFFSET_MINUTES = 330;
const REVENUE_INSIGHTS_CACHE_TTL_MS = 30000;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

let cachedRevenueInsights = null;
let cachedRevenueInsightsExpiresAt = 0;
let cachedRevenueInsightsPromise = null;

const revenueStudentSelect = {
  admissionDate: true,
  afterDiscount: true,
  totalAmount: true,
  installment1: true,
  installment2: true,
  installment3: true,
  firstInstallmentAmount: true,
  firstInstallmentDate: true,
  firstInstallmentStatus: true,
  firstInstallmentPaidAt: true,
  secondInstallmentAmount: true,
  secondDueDate: true,
  secondInstallmentStatus: true,
  secondInstallmentPaidAt: true,
};

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

function addOneMonth(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setUTCMonth(date.getUTCMonth() + 1);
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

function getIstWeekStart(referenceDate = null) {
  const today = referenceDate || getIstToday();
  const date = new Date(`${today}T00:00:00Z`);
  const { dayOfWeek } = toIstDateParts(referenceDate ? new Date(`${referenceDate}T00:00:00Z`) : new Date());
  const offset = (dayOfWeek + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function getWeekBuckets(referenceDate = new Date()) {
  const parts = toIstDateParts(referenceDate);
  const daysInMonth = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();

  return [
    { label: "Week 1", start: 1, end: Math.min(7, daysInMonth) },
    { label: "Week 2", start: 8, end: Math.min(14, daysInMonth) },
    { label: "Week 3", start: 15, end: Math.min(21, daysInMonth) },
    { label: "Week 4", start: 22, end: daysInMonth },
  ];
}

function getCurrentWeekIndex(referenceDate = new Date()) {
  const { day } = toIstDateParts(referenceDate);
  return getWeekBuckets(referenceDate).findIndex((bucket) => day >= bucket.start && day <= bucket.end);
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDateValue(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isWithinRange(value, start, end) {
  const date = normalizeDateValue(value);
  if (!date) return false;
  return date >= start && date <= end;
}

function getDateObject(value) {
  const normalized = normalizeDateValue(value);
  if (!normalized) return null;
  const date = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasThirdInstallment(student) {
  return toNumber(student?.installment3) > 0;
}

function getSecondDueDate(student) {
  return normalizeDateValue(student?.secondDueDate) || addOneMonth(normalizeDateValue(student?.admissionDate));
}

function getThirdDueDate(student) {
  if (!hasThirdInstallment(student)) return "";
  return addOneMonth(getSecondDueDate(student));
}

function getInstallmentEntries(student) {
  const admissionDate = normalizeDateValue(student?.admissionDate);
  const firstDueDate = normalizeDateValue(student?.firstInstallmentDate) || admissionDate;
  const secondDueDate = getSecondDueDate(student);
  const thirdDueDate = getThirdDueDate(student);

  const entries = [
    {
      amount: toNumber(student?.firstInstallmentAmount || student?.installment1 || 0),
      status: String(student?.firstInstallmentStatus || "Pending").trim(),
      paidAt: normalizeDateValue(student?.firstInstallmentPaidAt),
      dueDate: firstDueDate,
    },
    {
      amount: toNumber(student?.secondInstallmentAmount || student?.installment2 || 0),
      status: String(student?.secondInstallmentStatus || "Pending").trim(),
      paidAt: normalizeDateValue(student?.secondInstallmentPaidAt),
      dueDate: secondDueDate,
    },
  ];

  if (hasThirdInstallment(student)) {
    entries.push({
      amount: toNumber(student?.installment3 || 0),
      status: "Pending",
      paidAt: "",
      dueDate: thirdDueDate,
    });
  }

  return entries.filter((entry) => entry.amount > 0);
}

function calculateRevenueSummary(students) {
  const today = getIstToday();
  const monthStart = getIstMonthStart();
  const weekStart = getIstWeekStart(today);

  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = addDays(weekStart, -1);
  const lastMonthStart = getIstMonthStart(-1);
  const lastMonthEnd = addDays(monthStart, -1);

  return students.reduce(
    (summary, student) => {
      const admissionDate = normalizeDateValue(student?.admissionDate || student?.firstInstallmentDate);
      const entries = getInstallmentEntries(student);
      const plannedTotal =
        toNumber(student?.totalAmount || student?.afterDiscount) ||
        entries.reduce((total, entry) => total + entry.amount, 0);

      summary.totalStudents += 1;

      if (isWithinRange(admissionDate, monthStart, today)) {
        summary.thisMonthStudents += 1;
      }

      if (isWithinRange(admissionDate, weekStart, today)) {
        summary.thisWeekStudents += 1;
      }

      let paidTotalForStudent = 0;
      let paidTotalBeforeWeekStart = 0;

      for (const entry of entries) {
        if (String(entry.status).toLowerCase() !== "paid") {
          continue;
        }

        paidTotalForStudent += entry.amount;
        summary.totalRevenue += entry.amount;

        const paymentDate = entry.paidAt || admissionDate || entry.dueDate;

        if (paymentDate && paymentDate < weekStart) {
          paidTotalBeforeWeekStart += entry.amount;
          summary.lastWeekCumulativeRevenue += entry.amount;
        }

        if (isWithinRange(paymentDate, lastMonthStart, lastMonthEnd)) {
          summary.lastMonthRevenue += entry.amount;
        }

        if (isWithinRange(paymentDate, lastWeekStart, lastWeekEnd)) {
          summary.lastWeekRevenue += entry.amount;
        }

        if (isWithinRange(paymentDate, monthStart, today)) {
          summary.thisMonthRevenue += entry.amount;
        }

        if (isWithinRange(paymentDate, weekStart, today)) {
          summary.thisWeekRevenue += entry.amount;
        }
      }

      summary.pendingPayments += Math.max(plannedTotal - paidTotalForStudent, 0);
      summary.lastWeekPendingPayments += Math.max(plannedTotal - paidTotalBeforeWeekStart, 0);

      return summary;
    },
    {
      totalRevenue: 0,
      thisMonthRevenue: 0,
      thisWeekRevenue: 0,
      pendingPayments: 0,
      totalStudents: 0,
      thisMonthStudents: 0,
      thisWeekStudents: 0,
      lastWeekCumulativeRevenue: 0,
      lastMonthRevenue: 0,
      lastWeekRevenue: 0,
      lastWeekPendingPayments: 0,
    },
  );
}

function buildMonthlyRevenueComparison(students, referenceDate = new Date()) {
  const year = toIstDateParts(referenceDate).year;
  const buckets = MONTH_LABELS.map((month, monthIndex) => ({
    month,
    monthIndex,
    actual: 0,
    expected: 0,
  }));

  for (const student of students) {
    for (const entry of getInstallmentEntries(student)) {
      const amount = toNumber(entry.amount);
      if (!amount) continue;

      const paidAt = getDateObject(entry.paidAt);
      if (String(entry.status).toLowerCase() === "paid" && paidAt && paidAt.getUTCFullYear() === year) {
        buckets[paidAt.getUTCMonth()].actual += amount;
        continue;
      }

      const dueDate = getDateObject(entry.dueDate);
      if (!dueDate || dueDate.getUTCFullYear() !== year) {
        continue;
      }

      buckets[dueDate.getUTCMonth()].expected += amount;
    }
  }

  return buckets.map(({ month, actual, expected }) => ({ month, actual, expected }));
}

function buildWeeklyRevenueComparison(students, referenceDate = new Date()) {
  const parts = toIstDateParts(referenceDate);
  const year = parts.year;
  const monthIndex = parts.month - 1;
  const currentWeekIndex = getCurrentWeekIndex(referenceDate);
  const buckets = getWeekBuckets(referenceDate).map((bucket, index) => ({
    week: index === currentWeekIndex ? `${bucket.label} (Current)` : bucket.label,
    actual: 0,
    expected: 0,
    start: bucket.start,
    end: bucket.end,
    isCurrent: index === currentWeekIndex,
  }));

  for (const student of students) {
    for (const entry of getInstallmentEntries(student)) {
      const amount = toNumber(entry.amount);
      if (!amount) continue;

      const paidAt = getDateObject(entry.paidAt);
      if (
        String(entry.status).toLowerCase() === "paid" &&
        paidAt &&
        paidAt.getUTCFullYear() === year &&
        paidAt.getUTCMonth() === monthIndex
      ) {
        const paidDay = paidAt.getUTCDate();
        const paidIndex = buckets.findIndex((bucket) => paidDay >= bucket.start && paidDay <= bucket.end);
        if (paidIndex >= 0) {
          buckets[paidIndex].actual += amount;
        }
        continue;
      }

      const dueDate = getDateObject(entry.dueDate);
      if (!dueDate || dueDate.getUTCFullYear() !== year || dueDate.getUTCMonth() !== monthIndex) {
        continue;
      }

      const dueDay = dueDate.getUTCDate();
      const dueIndex = buckets.findIndex((bucket) => dueDay >= bucket.start && dueDay <= bucket.end);
      if (dueIndex >= 0 && dueIndex >= currentWeekIndex) {
        buckets[dueIndex].expected += amount;
      }
    }
  }

  return buckets.map(({ week, actual, expected, isCurrent }) => ({ week, actual, expected, isCurrent }));
}

async function loadRevenueInsights() {
  const students = await prisma.studentProfile.findMany({
    where: {
      recordStatus: "ACTIVE",
    },
    select: revenueStudentSelect,
  });

  return {
    generatedAt: getIstToday(),
    summary: calculateRevenueSummary(students),
    monthlyRevenue: buildMonthlyRevenueComparison(students),
    weeklyRevenue: buildWeeklyRevenueComparison(students),
  };
}

async function getRevenueInsights() {
  const now = Date.now();

  if (cachedRevenueInsights && now < cachedRevenueInsightsExpiresAt) {
    return cachedRevenueInsights;
  }

  if (cachedRevenueInsightsPromise) {
    return cachedRevenueInsightsPromise;
  }

  cachedRevenueInsightsPromise = loadRevenueInsights()
    .then((insights) => {
      cachedRevenueInsights = insights;
      cachedRevenueInsightsExpiresAt = Date.now() + REVENUE_INSIGHTS_CACHE_TTL_MS;
      return insights;
    })
    .finally(() => {
      cachedRevenueInsightsPromise = null;
    });

  return cachedRevenueInsightsPromise;
}

async function getRevenueSummary() {
  const insights = await getRevenueInsights();
  return insights.summary;
}

function invalidateRevenueSummaryCache() {
  cachedRevenueInsights = null;
  cachedRevenueInsightsExpiresAt = 0;
}

export { getRevenueInsights, getRevenueSummary, invalidateRevenueSummaryCache };
