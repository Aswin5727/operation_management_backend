CREATE INDEX IF NOT EXISTS "BranchStudent_branchId_recordStatus_studentName_idx"
ON "BranchStudent"("branchId", "recordStatus", "studentName");
