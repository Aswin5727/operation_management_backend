ALTER TABLE "public"."StudentDiscontinuationRequest" ADD COLUMN "courseId" TEXT;
CREATE INDEX "StudentDiscontinuationRequest_branchStudentId_courseId_status_idx" ON "public"."StudentDiscontinuationRequest"("branchStudentId", "courseId", "status");
