import { autoCloseStaleFacultyAttendanceSessions } from "./facultyAttendance.service.js";

const INTERVAL_MS = 15 * 60 * 1000;

export function startFacultyAttendanceReconciliationScheduler() {
  const run = () => void autoCloseStaleFacultyAttendanceSessions().catch((error) => {
    console.warn(`Faculty attendance reconciliation failed: ${error?.message || error}`);
  });
  run();
  return setInterval(run, INTERVAL_MS);
}
