import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";

export async function getBranchAttendanceOverview(user, query = {}) {
  const requestedBranchId = String(query.branchId || '').trim();
  let branch;

  if (requestedBranchId && ['SUPER_ADMIN', 'BUSINESS_OWNER', 'OPERATION_MANAGER'].includes(String(user?.role || '').toUpperCase())) {
    branch = await prisma.branch.findFirst({
      where: { OR: [{ id: requestedBranchId }, { branchId: requestedBranchId }] },
      select: { id: true },
    });

    if (!branch) {
      throw new AppError("Branch profile not found", 404);
    }
  } else {
    branch = await getCurrentBranchProfile(user);
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Calcutta" }).format(new Date());
  const date = String(query.date || today);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date > today) {
    throw new AppError("Select a valid date on or before today", 400);
  }
  const monday = new Date(parsed);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const weekStart = monday.toISOString().slice(0, 10);
  const monthStart = `${date.slice(0, 7)}-01`;
  const historyStart = new Date(parsed);
  historyStart.setUTCDate(1);
  historyStart.setUTCMonth(historyStart.getUTCMonth() - 5);
  const augustYear = parsed.getUTCFullYear() - (parsed.getUTCMonth() < 7 ? 1 : 0);
  const augustStart = new Date(Date.UTC(augustYear, 7, 1));
  const from = (augustStart < historyStart ? augustStart : historyStart).toISOString().slice(0, 10);
  const [students, holidays, leaves] = await Promise.all([
    prisma.branchStudent.findMany({
      where: { branchId: branch.id },
      orderBy: [{ studentName: "asc" }, { id: "asc" }],
      select: {
        id: true, studentId: true, studentName: true, courseId: true, courseName: true,
        batchId: true, batchName: true, recordStatus: true,
        calendarAttendanceRecords: {
          where: { attendanceDate: { gte: from, lte: date } },
          select: { attendanceDate: true, status: true, batchId: true, courseId: true },
        },
      },
    }),
    prisma.branchCalendarHoliday.findMany({ where: { status: "ACTIVE", OR: [{ branchId: branch.id }, { branchId: null }], holidayDate: { gte: from, lte: date } }, select: { holidayDate: true } }),
    prisma.branchCalendarLeave.findMany({ where: { status: "ACTIVE", isInstitute: false, branchId: branch.id, leaveDate: { gte: from, lte: date } }, select: { leaveDate: true, batchId: true } }),
  ]);
  const holidayDates = new Set(holidays.map((item) => item.holidayDate));
  return {
    branchId: branch.id, date, weekStart, monthStart,
    students: students.map(({ calendarAttendanceRecords, ...student }) => ({
      ...student,
      records: calendarAttendanceRecords.filter((record) => !holidayDates.has(record.attendanceDate) && !leaves.some((leave) => leave.leaveDate === record.attendanceDate && (!leave.batchId || leave.batchId === record.batchId))),
    })),
  };
}
