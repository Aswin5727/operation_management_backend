-- Course-wise discount data is nullable for backwards compatibility with existing enrollments.
DO $$
BEGIN
  CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "BranchStudentCourse"
  ADD COLUMN IF NOT EXISTS "discountType" "DiscountType",
  ADD COLUMN IF NOT EXISTS "discountValue" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "finalCourseAmount" DOUBLE PRECISION;

ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'STUDENT_DISCOUNT_APPLIED';
