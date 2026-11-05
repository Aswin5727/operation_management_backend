import { reconcileOverdueAssignments } from "./facultySkills.service.js";
const INTERVAL_MS = Number(process.env.FACULTY_SKILL_OVERDUE_INTERVAL_MS || 60 * 60 * 1000);
export function startFacultySkillOverdueScheduler() { const run = () => void reconcileOverdueAssignments().catch((error) => console.warn(`Faculty skill overdue reconciliation failed: ${error?.message || error}`)); run(); const timer = setInterval(run, INTERVAL_MS); timer.unref?.(); return timer; }
