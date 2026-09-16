import { syncRelevantTamilNaduHolidayYears } from './holidaySync.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const SYNC_INTERVAL_MS = Number(process.env.TN_HOLIDAY_SYNC_INTERVAL_MS || DAY_MS);

export function startTamilNaduHolidaySyncScheduler() {
  const run = () => {
    void syncRelevantTamilNaduHolidayYears().then(results => {
      const published = results.filter(result => result.published).map(result => `${result.year}:${result.synced}`).join(', ');
      if (published) console.log(`Tamil Nadu holiday sync completed (${published}).`);
    }).catch(error => console.warn(`Tamil Nadu holiday sync failed: ${error?.message || error}`));
  };
  run();
  const timer = setInterval(run, SYNC_INTERVAL_MS);
  timer.unref?.();
  return timer;
}
