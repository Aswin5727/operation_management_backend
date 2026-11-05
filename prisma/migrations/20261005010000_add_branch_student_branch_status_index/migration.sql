-- Supports branch-scoped active-student scans used by attendance and global student views.
CREATE INDEX "BranchStudent_branchId_recordStatus_idx"
ON "BranchStudent"("branchId", "recordStatus");
