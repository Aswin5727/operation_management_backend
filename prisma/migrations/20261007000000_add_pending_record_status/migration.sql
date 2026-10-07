-- Sequential course enrollments use PENDING until the first course is completed.
-- This is an additive enum change; existing ACTIVE/INACTIVE rows are unchanged.
ALTER TYPE "public"."RecordStatus" ADD VALUE IF NOT EXISTS 'PENDING';
