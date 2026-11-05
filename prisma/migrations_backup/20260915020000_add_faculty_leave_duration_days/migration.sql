ALTER TABLE "FacultyLeaveRequest"
ADD COLUMN "durationDays" INTEGER;

UPDATE "FacultyLeaveRequest"
SET "durationDays" = ("toDate"::date - "fromDate"::date) + 1
WHERE "durationType" = 'FULL_DAY';
