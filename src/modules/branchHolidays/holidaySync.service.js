import { PDFParse } from 'pdf-parse';
import prisma from '../../config/prisma.js';
import AppError from '../../common/errors/AppError.js';

const INDEX_URL = process.env.TN_HOLIDAY_INDEX_URL || 'https://www.stationeryprinting.tn.gov.in/extra_ordinary_lists.php';
const SOURCE_HOST = 'https://www.stationeryprinting.tn.gov.in/';
const DATE_PATTERN = /^(0?[1-9]|[12]\d|3[01])\.(0?[1-9]|1[0-2])\.(\d{4})$/;
const MONTHS = new Set(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);

function officialIndexUrl(year) {
  const encoded = Buffer.from(String(year)).toString('base64');
  return `${INDEX_URL}?id=${encodeURIComponent(encoded)}`;
}

function absoluteUrl(value) {
  return new URL(value, SOURCE_HOST).toString();
}

export async function discoverNotificationUrl(year) {
  const pages = [...new Set([year - 1, year].filter(item => item >= 2000))];
  for (const publicationYear of pages) {
    const response = await fetch(officialIndexUrl(publicationYear), { headers: { 'user-agent': 'CISPRO-Holiday-Sync/1.0' } });
    if (!response.ok) continue;
    const html = await response.text();
    const titleMatch = html.match(new RegExp(`Public Holidays[\\s\\S]*?year\\s+${year}\\b`, 'i'));
    if (!titleMatch || titleMatch.index == null) continue;
    const beforeTitle = html.slice(Math.max(0, titleMatch.index - 2500), titleMatch.index);
    const links = [...beforeTitle.matchAll(/<a\s+href=["']([^"']+)["']/gi)];
    const link = links.at(-1)?.[1];
    if (link && link !== '#') return absoluteUrl(link);
  }
  return null;
}

function validIsoDate(value) {
  const match = String(value || '').match(DATE_PATTERN);
  if (!match || Number(match[3]) < 2000) return null;
  const iso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return parsed.toISOString().slice(0, 10) === iso ? iso : null;
}

function cleanName(value) {
  return String(value || '')
    .replace(/^\d+\.\s*/, '')
    .replace(/^\*+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s*]+$/, '')
    .trim();
}

export function parseOfficialHolidayPdf(text, year) {
  const englishSection = String(text || '').split(/N\.\s*MURUGANANDAM/i)[0].split(/Annexure/i).at(-1) || '';
  if (!/TAMIL\s+NADU/i.test(text) || !/PUBLIC\s+HOLIDAYS/i.test(text) || !new RegExp(`year\\s+${year}\\b`, 'i').test(text)) {
    throw new AppError(`Official Tamil Nadu holiday notification for ${year} failed validation`, 422);
  }
  const lines = englishSection.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const holidays = [];
  let numberedLine = '';
  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
    if (/^\d+\./.test(line)) numberedLine = line;
    if (!dateMatch) continue;
    const holidayDate = validIsoDate(dateMatch[1]);
    if (!holidayDate || !holidayDate.startsWith(`${year}-`)) continue;
    const prefix = line.slice(0, dateMatch.index).trim();
    const name = cleanName(/^\d+\./.test(line) ? prefix : `${numberedLine} ${prefix}`);
    if (!name || /annual closing of accounts/i.test(name)) continue;
    holidays.push({ holidayDate, name });
  }
  const unique = [...new Map(holidays.map(item => [item.holidayDate, item])).values()];
  if (!unique.length || unique.some(item => !MONTHS.has(new Date(`${item.holidayDate}T00:00:00Z`).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })))) {
    throw new AppError(`Official Tamil Nadu holiday notification for ${year} contains no valid annual holiday rows`, 422);
  }
  return unique;
}

export async function fetchOfficialTamilNaduHolidays(year) {
  const notificationUrl = await discoverNotificationUrl(year);
  if (!notificationUrl) return { year, sourceUrl: null, holidays: [] };
  const response = await fetch(notificationUrl, { headers: { 'user-agent': 'CISPRO-Holiday-Sync/1.0' } });
  if (!response.ok) throw new AppError(`Unable to download official Tamil Nadu holiday notification for ${year}`, 502);
  const parser = new PDFParse({ data: new Uint8Array(await response.arrayBuffer()) });
  try {
    const result = await parser.getText();
    return { year, sourceUrl: notificationUrl, holidays: parseOfficialHolidayPdf(result.text, year) };
  } finally {
    await parser.destroy();
  }
}

export async function syncTamilNaduHolidayYear(year, db = prisma) {
  const targetYear = Number(year);
  if (!Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 2100) throw new AppError('Holiday year is invalid', 400);
  const result = await fetchOfficialTamilNaduHolidays(targetYear);
  if (!result.holidays.length) return { ...result, synced: 0, published: false };
  const officialDates = result.holidays.map(holiday => holiday.holidayDate);
  await db.branchCalendarHoliday.updateMany({
    where: { AND: [{ branchId: null }, { holidayDate: { startsWith: `${targetYear}-` } }, { holidayDate: { notIn: officialDates } }] },
    data: { status: 'INACTIVE' },
  });
  for (const holiday of result.holidays) {
    const existing = await db.branchCalendarHoliday.findMany({ where: { branchId: null, holidayDate: holiday.holidayDate }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (existing.length) {
      await db.branchCalendarHoliday.update({ where: { id: existing[0].id }, data: { name: holiday.name, status: 'ACTIVE' } });
      if (existing.length > 1) await db.branchCalendarHoliday.updateMany({ where: { id: { in: existing.slice(1).map(item => item.id) } }, data: { status: 'INACTIVE' } });
    }
    else await db.branchCalendarHoliday.create({ data: { branchId: null, holidayDate: holiday.holidayDate, name: holiday.name, status: 'ACTIVE' } });
  }
  return { ...result, synced: result.holidays.length, published: true };
}

export async function syncRelevantTamilNaduHolidayYears(db = prisma) {
  const currentYear = new Date().getUTCFullYear();
  const batches = await db.branchBatch.findMany({ where: { status: 'ACTIVE' }, select: { courseStartDate: true, courseEndDate: true } });
  const years = new Set([currentYear, currentYear + 1]);
  for (const batch of batches) for (const value of [batch.courseStartDate, batch.courseEndDate]) {
    const year = Number(String(value || '').slice(0, 4));
    if (year >= currentYear && year <= 2100) years.add(year);
  }
  const results = [];
  for (const year of [...years].sort()) {
    try { results.push(await syncTamilNaduHolidayYear(year, db)); }
    catch (error) { console.warn(`Tamil Nadu holiday sync failed for ${year}: ${error?.message || error}`); }
  }
  return results;
}
