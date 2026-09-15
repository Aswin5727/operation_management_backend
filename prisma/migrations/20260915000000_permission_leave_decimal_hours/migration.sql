ALTER TABLE "FacultyLeaveRequest"
ALTER COLUMN "permissionHours" TYPE DOUBLE PRECISION
USING "permissionHours"::DOUBLE PRECISION;
