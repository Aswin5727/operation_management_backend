-- Branch dashboard pagination filters by branchId and sorts by createdAt.
-- Keep that read path indexed as branches grow beyond a few pages.
CREATE INDEX IF NOT EXISTS "BranchStudent_branchId_createdAt_idx"
  ON "BranchStudent"("branchId", "createdAt");
