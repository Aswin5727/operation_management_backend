import prisma from '../../config/prisma.js';
import AppError from '../../common/errors/AppError.js';

function text(value) { return String(value ?? '').trim(); }
function date(value) {
  const valueText = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valueText)) throw new AppError('Holiday date must be YYYY-MM-DD', 400);
  const parsed = new Date(`${valueText}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== valueText) throw new AppError('Holiday date is invalid', 400);
  return valueText;
}
async function branchFor(user) {
  const branch = await prisma.branch.findFirst({ where: { adminUserId: user.id, status: 'ACTIVE' }, select: { id: true, branchId: true, branchName: true } });
  if (!branch) throw new AppError('Authorized branch not found', 403);
  return branch;
}
function present(row) { return { ...row, type: 'GENERAL', holidayType: 'GENERAL' }; }

export async function listBranchHolidays(user, query = {}) {
  const branch = await branchFor(user);
  const from = text(query.from || query.startDate);
  const to = text(query.to || query.endDate);
  const rows = await prisma.branchCalendarHoliday.findMany({ where: { OR: [{ branchId: branch.id }, { branchId: null }], ...(from || to ? { holidayDate: { ...(from ? { gte: date(from) } : {}), ...(to ? { lte: date(to) } : {}) } } : {}) }, orderBy: { holidayDate: 'asc' } });
  return { branch, holidays: rows.map(present) };
}

export async function createBranchHoliday(user, payload = {}) {
  const branch = await branchFor(user);
  const holidayDate = date(payload.date || payload.holidayDate);
  const name = text(payload.name || payload.holidayName);
  if (!name) throw new AppError('Holiday name is required', 400);
  const duplicate = await prisma.branchCalendarHoliday.findFirst({ where: { branchId: branch.id, holidayDate, status: 'ACTIVE' }, select: { id: true } });
  if (duplicate) throw new AppError('An active holiday already exists for this date', 409);
  return present(await prisma.branchCalendarHoliday.create({ data: { branchId: branch.id, holidayDate, name, status: 'ACTIVE' } }));
}

export async function updateBranchHoliday(user, id, payload = {}) {
  const branch = await branchFor(user);
  const existing = await prisma.branchCalendarHoliday.findFirst({ where: { id, branchId: branch.id } });
  if (!existing) throw new AppError('Holiday not found', 404);
  const holidayDate = date(payload.date || payload.holidayDate || existing.holidayDate);
  const name = text(payload.name || payload.holidayName || existing.name);
  if (!name) throw new AppError('Holiday name is required', 400);
  const duplicate = await prisma.branchCalendarHoliday.findFirst({ where: { branchId: branch.id, holidayDate, status: 'ACTIVE', id: { not: id } }, select: { id: true } });
  if (duplicate) throw new AppError('An active holiday already exists for this date', 409);
  return present(await prisma.branchCalendarHoliday.update({ where: { id }, data: { holidayDate, name, status: text(payload.status).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' } }));
}

export async function deleteBranchHoliday(user, id) {
  const branch = await branchFor(user);
  const existing = await prisma.branchCalendarHoliday.findFirst({ where: { id, branchId: branch.id } });
  if (!existing) throw new AppError('Holiday not found', 404);
  return present(await prisma.branchCalendarHoliday.update({ where: { id }, data: { status: 'INACTIVE' } }));
}
