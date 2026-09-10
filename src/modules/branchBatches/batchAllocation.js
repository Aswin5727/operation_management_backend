const VALID_WEEK_DAYS = {
  WEEKDAY: new Set([1, 2, 3, 4, 5]),
  WEEKEND: new Set([0, 6]),
};

export function batchDailyHours(weekType, mode) {
  if (mode === "ONLINE") return 1;
  return weekType === "WEEKEND" ? 3 : 2;
}

export function calculateBatchCourseEndDate(startDate, weekType, mode, durationHours) {
  const date = new Date(`${startDate}T00:00:00`);
  const duration = Number(durationHours);
  if (!VALID_WEEK_DAYS[weekType] || !Number.isFinite(duration) || duration <= 0) return "";
  const requiredDays = Math.max(1, Math.ceil(duration / batchDailyHours(weekType, mode)));
  let counted = 0;
  while (counted < requiredDays) {
    if (VALID_WEEK_DAYS[weekType].has(date.getDay())) counted += 1;
    if (counted < requiredDays) date.setDate(date.getDate() + 1);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
