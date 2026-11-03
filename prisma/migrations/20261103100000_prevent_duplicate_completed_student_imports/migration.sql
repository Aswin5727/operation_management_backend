CREATE UNIQUE INDEX "CompletedStudentImportJob_branch_fileHash_key"
  ON "CompletedStudentImportJob"("branchId", "fileHash");