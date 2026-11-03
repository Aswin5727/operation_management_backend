-- Only one completed-student import may be pending or running per branch.
-- Completed, failed, and cancelled jobs remain available for history/retry.
CREATE UNIQUE INDEX "CompletedStudentImportJob_one_active_per_branch_key"
  ON "CompletedStudentImportJob"("branchId")
  WHERE "status" IN ('PENDING', 'RUNNING');