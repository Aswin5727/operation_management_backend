import "dotenv/config";
import pg from "pg";
const c = new pg.Client({connectionString:process.env.DATABASE_URL}); await c.connect();
const q = await c.query(`
 SELECT e."id", e."title", e."facultyId", e."branchCourseId", e."status", e."isRetest",
        s."id" AS "scheduleId", s."branchBatchId", s."batchCycleId",
        b."batchId", b."batchName", b."facultyId" AS "batchFacultyId"
 FROM "Exam" e JOIN "ExamSchedule" s ON s."examId"=e."id" JOIN "BranchBatch" b ON b."id"=s."branchBatchId"
 WHERE b."batchId"='CISTESTBAT001' ORDER BY e."createdAt" DESC
`);
console.log(JSON.stringify(q.rows,null,2)); await c.end();
