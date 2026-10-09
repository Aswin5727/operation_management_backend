-- Course-wise discount data is nullable for backwards compatibility with existing enrollments.
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

ALTER TABLE "BranchStudentCourse"
  ADD COLUMN "discountType" "DiscountType",
  ADD COLUMN "discountValue" DOUBLE PRECISION,
  ADD COLUMN "discountAmount" DOUBLE PRECISION,
  ADD COLUMN "finalCourseAmount" DOUBLE PRECISION;

ALTER TYPE "NotificationKind" ADD VALUE 'STUDENT_DISCOUNT_APPLIED';
