-- Import history is retained for audit, but it must not block a clean re-upload
-- after all students from the old workbook have been removed.
DROP INDEX IF EXISTS "CompletedStudentImportJob_branch_fileHash_key";

CREATE INDEX IF NOT EXISTS "CompletedStudentImportJob_branch_fileHash_idx"
  ON "CompletedStudentImportJob"("branchId", "fileHash");
