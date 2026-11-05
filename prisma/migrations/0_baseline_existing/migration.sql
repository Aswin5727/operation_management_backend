-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "public"."BatchStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."CourseEditRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EDITING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."LoginEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'REFRESH', 'LOGOUT', 'FORGOT_PASSWORD', 'RESET_PASSWORD_REQUESTED', 'RESET_PASSWORD_COMPLETED');

-- CreateEnum
CREATE TYPE "public"."NotificationKind" AS ENUM ('BRANCH_CREATED', 'BRANCH_INVITATION_RESENT', 'BRANCH_LOGIN', 'BRANCH_FACULTY_LOGIN', 'FACULTY_COURSE_ASSIGNED', 'COURSE_EDIT_REQUEST', 'COURSE_EDIT_REQUEST_ACCEPTED', 'COURSE_EDIT_REQUEST_REJECTED', 'COURSE_EDIT_MODULE_UPDATED', 'INSTITUTE_LEAVE', 'FACULTY_LEAVE_REQUEST');

-- CreateEnum
CREATE TYPE "public"."RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('BUSINESS_OWNER', 'OPERATION_MANAGER', 'HR', 'FACULTY', 'STUDENT', 'SUPER_ADMIN', 'BRANCH_ADMIN');

-- CreateTable
CREATE TABLE "public"."Batch" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "batchNameKey" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "enrolledCount" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."BatchStatus" NOT NULL DEFAULT 'PLANNED',
    "statusChangedAt" TIMESTAMP(3),
    "statusChangedBy" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BatchFacultyAssignment" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "assignedDate" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "assignedBy" TEXT,
    "releasedBy" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchFacultyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BatchStatusHistory" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "fromStatus" "public"."BatchStatus",
    "toStatus" "public"."BatchStatus" NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Branch" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "branchAdminName" TEXT NOT NULL,
    "branchEmail" TEXT NOT NULL,
    "branchPhone" TEXT NOT NULL,
    "branchAddress" TEXT NOT NULL,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "adminUserId" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchCity" TEXT NOT NULL DEFAULT '',
    "branchCountry" TEXT NOT NULL DEFAULT '',
    "branchCountryCode" TEXT NOT NULL DEFAULT '',
    "branchState" TEXT NOT NULL DEFAULT '',
    "branchStateCode" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchBatch" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "branchCourseId" TEXT NOT NULL,
    "branchFacultyId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "facultyName" TEXT NOT NULL,
    "facultyEmail" TEXT NOT NULL,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "batchName" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "startPeriod" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "endPeriod" TEXT NOT NULL,
    "batchTiming" TEXT NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "sequenceNo" INTEGER NOT NULL DEFAULT 1,
    "offlineSeats" INTEGER NOT NULL DEFAULT 0,
    "weekType" TEXT,
    "mode" TEXT,
    "courseStartDate" TEXT,
    "courseEndDate" TEXT,
    "weeklyOffDay" TEXT,

    CONSTRAINT "BranchBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchCalendarHoliday" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "holidayDate" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchCalendarHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchCalendarLeave" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "batchId" TEXT,
    "leaveDate" TEXT NOT NULL,
    "reason" TEXT,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isInstitute" BOOLEAN NOT NULL DEFAULT false,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declaredBy" TEXT,
    "affectedClasses" JSONB NOT NULL DEFAULT '[]',
    "leaveStartTime" TEXT,
    "leaveEndTime" TEXT,

    CONSTRAINT "BranchCalendarLeave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchCourse" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "description" TEXT,
    "mode" TEXT NOT NULL,
    "duration" INTEGER,
    "hours" INTEGER,
    "actualFees" INTEGER,
    "registrationFees" INTEGER,
    "discount" INTEGER,
    "afterDiscount" INTEGER,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentPlanSelections" JSONB,
    "paymentPlans" JSONB,

    CONSTRAINT "BranchCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchCourseModule" (
    "id" TEXT NOT NULL,
    "branchCourseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "description" TEXT,
    "sequenceNo" INTEGER NOT NULL,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchCourseModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchCourseSubmodule" (
    "id" TEXT NOT NULL,
    "branchCourseModuleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "description" TEXT,
    "sequenceNo" INTEGER NOT NULL,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchCourseSubmodule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchFaculty" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT DEFAULT '',
    "countryCode" TEXT DEFAULT '',
    "state" TEXT DEFAULT '',
    "stateCode" TEXT DEFAULT '',
    "city" TEXT DEFAULT '',
    "address" TEXT,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courseId" TEXT,
    "branchCourseId" TEXT,
    "weeklyOffDay" TEXT,

    CONSTRAINT "BranchFaculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchInstallmentTemplate" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "branchCourseId" TEXT,
    "templateName" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "installments" JSONB NOT NULL,
    "dueRule" TEXT NOT NULL DEFAULT 'Admission',
    "allowCustomization" BOOLEAN NOT NULL DEFAULT true,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchInstallmentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchStudent" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "parentSpouseNumber" TEXT,
    "countryCode" TEXT,
    "country" TEXT,
    "stateCode" TEXT,
    "state" TEXT,
    "city" TEXT,
    "address" TEXT,
    "qualification" TEXT,
    "passedOutYear" TEXT,
    "currentStatus" TEXT,
    "designation" TEXT,
    "source" TEXT,
    "sourceOther" TEXT,
    "admissionDate" TEXT NOT NULL,
    "recordStatus" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "linkedInUrl" TEXT,
    "remarks" TEXT,
    "courseAmount" INTEGER,
    "courseId" TEXT,
    "facultyId" TEXT,
    "paymentMode" TEXT NOT NULL DEFAULT 'Installment',
    "courseName" TEXT,
    "facultyName" TEXT,
    "paymentPlan" TEXT,
    "paymentPlanId" TEXT,
    "courseProgress" INTEGER,
    "batchName" TEXT,
    "batchTiming" TEXT,
    "classSchedule" TEXT,
    "courseStartDate" TEXT,
    "batchId" TEXT,
    "courseMode" TEXT,
    "courseEndDate" TEXT,
    "totalWorkingDays" INTEGER,
    "weeklyOffDay" TEXT,

    CONSTRAINT "BranchStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchStudentAttendance" (
    "id" TEXT NOT NULL,
    "branchStudentId" TEXT NOT NULL,
    "facultyUserId" TEXT,
    "courseId" TEXT,
    "batchId" TEXT,
    "moduleId" TEXT,
    "moduleName" TEXT,
    "submoduleId" TEXT,
    "submoduleName" TEXT,
    "attendanceDate" TEXT NOT NULL,
    "status" "public"."AttendanceStatus" NOT NULL,
    "progress" DOUBLE PRECISION,
    "notes" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchStudentAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchStudentInstallment" (
    "id" TEXT NOT NULL,
    "branchStudentId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "dueReminderSentAt" TIMESTAMP(3),

    CONSTRAINT "BranchStudentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchStudentLedgerEntry" (
    "id" TEXT NOT NULL,
    "ledgerKey" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "branchStudentId" TEXT NOT NULL,
    "paymentId" TEXT,
    "installmentId" TEXT,
    "entryNo" INTEGER NOT NULL DEFAULT 0,
    "entryType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "debit" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "runningBalance" INTEGER NOT NULL DEFAULT 0,
    "studentBalanceAfter" INTEGER NOT NULL DEFAULT 0,
    "entryDate" TIMESTAMP(3),
    "paymentDate" TIMESTAMP(3),
    "referenceType" TEXT,
    "referenceId" TEXT,
    "paymentMode" TEXT,
    "receiptNumber" TEXT,
    "payAgainst" TEXT,
    "transactionReference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchStudentLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchStudentPayment" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "branchStudentId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "transactionReference" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "collectedBy" TEXT,
    "notes" TEXT,
    "paymentProof" TEXT,
    "payAgainst" TEXT,
    "installmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchStudentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "description" TEXT,
    "feeReference" TEXT,
    "mode" TEXT NOT NULL,
    "duration" INTEGER,
    "hours" INTEGER,
    "actualFees" INTEGER,
    "registrationFees" INTEGER,
    "discount" INTEGER,
    "afterDiscount" INTEGER,
    "installmentCount" INTEGER NOT NULL DEFAULT 2,
    "installment1" INTEGER,
    "installment2" INTEGER,
    "installment3" INTEGER,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusChangedAt" TIMESTAMP(3),
    "statusChangedBy" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installments" JSONB,
    "branchId" TEXT,
    "courseCode" TEXT,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CourseEditRequest" (
    "id" TEXT NOT NULL,
    "branchCourseId" TEXT NOT NULL,
    "branchId" TEXT,
    "facultyUserId" TEXT,
    "facultyId" TEXT,
    "facultyName" TEXT,
    "facultyEmail" TEXT,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."CourseEditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedModules" JSONB,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "editingStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "responseNote" TEXT,
    "updatedModules" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseEditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CourseModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "description" TEXT,
    "sequenceNo" INTEGER NOT NULL,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusChangedAt" TIMESTAMP(3),
    "statusChangedBy" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CourseStatusHistory" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "fromStatus" "public"."RecordStatus",
    "toStatus" "public"."RecordStatus" NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DashboardWidget" (
    "id" TEXT NOT NULL,
    "widgetKey" TEXT NOT NULL,
    "widgetName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "allowedRoles" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacultyAttendanceBatchWork" (
    "id" TEXT NOT NULL,
    "attendanceSessionId" TEXT NOT NULL,
    "facultyUserId" TEXT NOT NULL,
    "attendanceDate" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "workSummary" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyAttendanceBatchWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacultyAttendanceDay" (
    "id" TEXT NOT NULL,
    "facultyUserId" TEXT NOT NULL,
    "attendanceDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_LOGGED_IN',
    "firstLoginAt" TIMESTAMP(3),
    "finalLogoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyAttendanceDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacultyAttendanceSession" (
    "id" TEXT NOT NULL,
    "facultyUserId" TEXT NOT NULL,
    "attendanceDate" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL,
    "logoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sessionSource" TEXT NOT NULL DEFAULT 'ATTENDANCE',
    "logoutType" TEXT,
    "logoutReason" TEXT,
    "workReport" TEXT,
    "workCompleted" TEXT,

    CONSTRAINT "FacultyAttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacultyBatchEntry" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "batchTiming" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courseId" TEXT,

    CONSTRAINT "FacultyBatchEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacultyCourseAssignment" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyCourseAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacultyLeaveRequest" (
    "id" TEXT NOT NULL,
    "facultyUserId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "facultyName" TEXT NOT NULL,
    "facultyEmail" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "fromDate" TEXT NOT NULL,
    "toDate" TEXT NOT NULL,
    "durationType" TEXT NOT NULL,
    "halfDayPeriod" TEXT,
    "halfDayStart" TEXT,
    "halfDayEnd" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "affectedClasses" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "permissionEnd" TEXT,
    "permissionHours" DOUBLE PRECISION,
    "permissionStart" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "durationDays" INTEGER,

    CONSTRAINT "FacultyLeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacultyProfile" (
    "id" TEXT NOT NULL,
    "facultyName" TEXT NOT NULL,
    "facultyEmail" TEXT NOT NULL,
    "facultyPhone" TEXT NOT NULL,
    "courseId" TEXT,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacultyTodayWorkEntry" (
    "id" TEXT NOT NULL,
    "facultyUserId" TEXT NOT NULL,
    "facultyProfileId" TEXT,
    "branchId" TEXT,
    "courseId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "submoduleIds" JSONB NOT NULL,
    "submodules" JSONB,
    "studentIds" JSONB NOT NULL,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "applyToAllStudents" BOOLEAN NOT NULL DEFAULT true,
    "moduleProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "submoduleProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "courseProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "moduleWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workDate" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "batchId" TEXT,
    "batchName" TEXT,
    "batchTiming" TEXT,

    CONSTRAINT "FacultyTodayWorkEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacultyTodayWorkStudentEntry" (
    "id" TEXT NOT NULL,
    "facultyTodayWorkEntryId" TEXT NOT NULL,
    "branchStudentId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "submoduleId" TEXT NOT NULL,
    "workDate" TEXT NOT NULL,
    "attendanceStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "completionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyTodayWorkStudentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" "public"."LoginEventType" NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "kind" "public"."NotificationKind" NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'blue',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionLabel" TEXT,
    "targetBranchId" TEXT,
    "targetBranchEmail" TEXT,
    "targetBranchName" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "targetUserId" TEXT,
    "branchCourseId" TEXT,
    "branchCourseName" TEXT,
    "facultyId" TEXT,
    "facultyName" TEXT,
    "moduleId" TEXT,
    "moduleName" TEXT,
    "requestDescription" TEXT,
    "requestId" TEXT,
    "requestReason" TEXT,
    "requestStatus" TEXT,
    "requestTitle" TEXT,
    "subModuleId" TEXT,
    "subModuleName" TEXT,
    "leaveRequestId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentAttendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "facultyUserId" TEXT,
    "courseId" TEXT,
    "batchName" TEXT,
    "attendanceDate" TEXT NOT NULL,
    "status" "public"."AttendanceStatus" NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentProfile" (
    "id" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "parentSpouseNumber" TEXT,
    "location" TEXT,
    "courseId" TEXT,
    "courseInterested" TEXT NOT NULL,
    "facultyName" TEXT,
    "batchName" TEXT,
    "qualification" TEXT,
    "passedOutYear" INTEGER,
    "currentStatus" TEXT,
    "designation" TEXT,
    "source" TEXT,
    "actualFees" INTEGER,
    "registrationFees" INTEGER,
    "discount" INTEGER,
    "afterDiscount" INTEGER,
    "installment1" INTEGER,
    "installment2" INTEGER,
    "installment3" INTEGER,
    "totalAmount" INTEGER,
    "admissionDate" TEXT NOT NULL,
    "firstInstallmentAmount" INTEGER,
    "firstInstallmentDate" TEXT,
    "firstInstallmentStatus" TEXT NOT NULL DEFAULT 'Paid',
    "firstInstallmentPaidAt" TEXT,
    "secondInstallmentAmount" INTEGER,
    "secondDueDate" TEXT,
    "secondInstallmentStatus" TEXT NOT NULL DEFAULT 'Pending',
    "secondInstallmentPaidAt" TEXT,
    "remarks" TEXT,
    "recordStatus" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installment4" INTEGER,
    "batchId" TEXT,
    "facultyId" TEXT,
    "linkedInUrl" TEXT,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "userCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "public"."UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT NOT NULL,
    "passwordChangedAt" TIMESTAMP(3),
    "refreshTokenVersion" INTEGER NOT NULL DEFAULT 0,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "failedLoginWindowExpiresAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLogoutAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "lastLoginUserAgent" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserDashboardWidget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDashboardWidget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batchNameKey_key" ON "public"."Batch"("batchNameKey" ASC);

-- CreateIndex
CREATE INDEX "Batch_courseId_status_idx" ON "public"."Batch"("courseId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Batch_endDate_idx" ON "public"."Batch"("endDate" ASC);

-- CreateIndex
CREATE INDEX "Batch_startDate_idx" ON "public"."Batch"("startDate" ASC);

-- CreateIndex
CREATE INDEX "BatchFacultyAssignment_assignedDate_idx" ON "public"."BatchFacultyAssignment"("assignedDate" ASC);

-- CreateIndex
CREATE INDEX "BatchFacultyAssignment_batchId_status_idx" ON "public"."BatchFacultyAssignment"("batchId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "BatchFacultyAssignment_facultyId_status_idx" ON "public"."BatchFacultyAssignment"("facultyId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "BatchStatusHistory_batchId_changedAt_idx" ON "public"."BatchStatusHistory"("batchId" ASC, "changedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_adminUserId_key" ON "public"."Branch"("adminUserId" ASC);

-- CreateIndex
CREATE INDEX "Branch_branchAdminName_idx" ON "public"."Branch"("branchAdminName" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_branchEmail_key" ON "public"."Branch"("branchEmail" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_branchId_key" ON "public"."Branch"("branchId" ASC);

-- CreateIndex
CREATE INDEX "Branch_branchName_idx" ON "public"."Branch"("branchName" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_branchPhone_key" ON "public"."Branch"("branchPhone" ASC);

-- CreateIndex
CREATE INDEX "Branch_status_idx" ON "public"."Branch"("status" ASC);

-- CreateIndex
CREATE INDEX "BranchBatch_branchCourseId_idx" ON "public"."BranchBatch"("branchCourseId" ASC);

-- CreateIndex
CREATE INDEX "BranchBatch_branchFacultyId_idx" ON "public"."BranchBatch"("branchFacultyId" ASC);

-- CreateIndex
CREATE INDEX "BranchBatch_branchId_batchId_idx" ON "public"."BranchBatch"("branchId" ASC, "batchId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchBatch_branchId_courseId_facultyId_batchId_key" ON "public"."BranchBatch"("branchId" ASC, "courseId" ASC, "facultyId" ASC, "batchId" ASC);

-- CreateIndex
CREATE INDEX "BranchBatch_branchId_idx" ON "public"."BranchBatch"("branchId" ASC);

-- CreateIndex
CREATE INDEX "BranchBatch_courseId_idx" ON "public"."BranchBatch"("courseId" ASC);

-- CreateIndex
CREATE INDEX "BranchBatch_courseId_weekType_mode_idx" ON "public"."BranchBatch"("courseId" ASC, "weekType" ASC, "mode" ASC);

-- CreateIndex
CREATE INDEX "BranchBatch_facultyId_idx" ON "public"."BranchBatch"("facultyId" ASC);

-- CreateIndex
CREATE INDEX "BranchBatch_status_idx" ON "public"."BranchBatch"("status" ASC);

-- CreateIndex
CREATE INDEX "BranchCalendarHoliday_branchId_holidayDate_idx" ON "public"."BranchCalendarHoliday"("branchId" ASC, "holidayDate" ASC);

-- CreateIndex
CREATE INDEX "BranchCalendarHoliday_holidayDate_status_idx" ON "public"."BranchCalendarHoliday"("holidayDate" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchCalendarLeave_active_institute_date_key" ON "public"."BranchCalendarLeave"("branchId" ASC, "leaveDate" ASC);

-- CreateIndex
CREATE INDEX "BranchCalendarLeave_batchId_leaveDate_status_idx" ON "public"."BranchCalendarLeave"("batchId" ASC, "leaveDate" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "BranchCalendarLeave_branchId_leaveDate_status_idx" ON "public"."BranchCalendarLeave"("branchId" ASC, "leaveDate" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchCourse_branchId_courseCode_key" ON "public"."BranchCourse"("branchId" ASC, "courseCode" ASC);

-- CreateIndex
CREATE INDEX "BranchCourse_branchId_idx" ON "public"."BranchCourse"("branchId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchCourse_branchId_nameKey_key" ON "public"."BranchCourse"("branchId" ASC, "nameKey" ASC);

-- CreateIndex
CREATE INDEX "BranchCourse_createdAt_idx" ON "public"."BranchCourse"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "BranchCourse_status_idx" ON "public"."BranchCourse"("status" ASC);

-- CreateIndex
CREATE INDEX "BranchCourseModule_branchCourseId_createdAt_idx" ON "public"."BranchCourseModule"("branchCourseId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchCourseModule_branchCourseId_sequenceNo_key" ON "public"."BranchCourseModule"("branchCourseId" ASC, "sequenceNo" ASC);

-- CreateIndex
CREATE INDEX "BranchCourseModule_branchCourseId_status_idx" ON "public"."BranchCourseModule"("branchCourseId" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchCourseModule_branchCourseId_titleKey_key" ON "public"."BranchCourseModule"("branchCourseId" ASC, "titleKey" ASC);

-- CreateIndex
CREATE INDEX "BranchCourseSubmodule_branchCourseModuleId_createdAt_idx" ON "public"."BranchCourseSubmodule"("branchCourseModuleId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchCourseSubmodule_branchCourseModuleId_sequenceNo_key" ON "public"."BranchCourseSubmodule"("branchCourseModuleId" ASC, "sequenceNo" ASC);

-- CreateIndex
CREATE INDEX "BranchCourseSubmodule_branchCourseModuleId_status_idx" ON "public"."BranchCourseSubmodule"("branchCourseModuleId" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchCourseSubmodule_branchCourseModuleId_titleKey_key" ON "public"."BranchCourseSubmodule"("branchCourseModuleId" ASC, "titleKey" ASC);

-- CreateIndex
CREATE INDEX "BranchFaculty_branchCourseId_idx" ON "public"."BranchFaculty"("branchCourseId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchFaculty_branchId_email_key" ON "public"."BranchFaculty"("branchId" ASC, "email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchFaculty_branchId_facultyId_key" ON "public"."BranchFaculty"("branchId" ASC, "facultyId" ASC);

-- CreateIndex
CREATE INDEX "BranchFaculty_branchId_idx" ON "public"."BranchFaculty"("branchId" ASC);

-- CreateIndex
CREATE INDEX "BranchFaculty_courseId_idx" ON "public"."BranchFaculty"("courseId" ASC);

-- CreateIndex
CREATE INDEX "BranchFaculty_status_idx" ON "public"."BranchFaculty"("status" ASC);

-- CreateIndex
CREATE INDEX "BranchInstallmentTemplate_branchCourseId_idx" ON "public"."BranchInstallmentTemplate"("branchCourseId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchInstallmentTemplate_branchCourseId_key" ON "public"."BranchInstallmentTemplate"("branchCourseId" ASC);

-- CreateIndex
CREATE INDEX "BranchInstallmentTemplate_branchId_idx" ON "public"."BranchInstallmentTemplate"("branchId" ASC);

-- CreateIndex
CREATE INDEX "BranchInstallmentTemplate_planType_idx" ON "public"."BranchInstallmentTemplate"("planType" ASC);

-- CreateIndex
CREATE INDEX "BranchInstallmentTemplate_status_idx" ON "public"."BranchInstallmentTemplate"("status" ASC);

-- CreateIndex
CREATE INDEX "BranchStudent_admissionDate_idx" ON "public"."BranchStudent"("admissionDate" ASC);

-- CreateIndex
CREATE INDEX "BranchStudent_branchId_batchId_idx" ON "public"."BranchStudent"("branchId" ASC, "batchId" ASC);

-- CreateIndex
CREATE INDEX "BranchStudent_branchId_courseId_facultyId_batchId_idx" ON "public"."BranchStudent"("branchId" ASC, "courseId" ASC, "facultyId" ASC, "batchId" ASC);

-- CreateIndex
CREATE INDEX "BranchStudent_branchId_idx" ON "public"."BranchStudent"("branchId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchStudent_branchId_studentId_key" ON "public"."BranchStudent"("branchId" ASC, "studentId" ASC);

-- CreateIndex
CREATE INDEX "BranchStudent_courseId_idx" ON "public"."BranchStudent"("courseId" ASC);

-- CreateIndex
CREATE INDEX "BranchStudent_emailAddress_idx" ON "public"."BranchStudent"("emailAddress" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchStudent_emailAddress_key" ON "public"."BranchStudent"("emailAddress" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchStudent_mobileNumber_key" ON "public"."BranchStudent"("mobileNumber" ASC);

-- CreateIndex
CREATE INDEX "BranchStudent_recordStatus_idx" ON "public"."BranchStudent"("recordStatus" ASC);

-- CreateIndex
CREATE INDEX "BranchStudent_studentName_idx" ON "public"."BranchStudent"("studentName" ASC);

-- CreateIndex
CREATE INDEX "BranchStudentAttendance_batchId_attendanceDate_idx" ON "public"."BranchStudentAttendance"("batchId" ASC, "attendanceDate" ASC);

-- CreateIndex
CREATE INDEX "BranchStudentAttendance_branchStudentId_attendanceDate_idx" ON "public"."BranchStudentAttendance"("branchStudentId" ASC, "attendanceDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchStudentAttendance_branchStudentId_attendanceDate_key" ON "public"."BranchStudentAttendance"("branchStudentId" ASC, "attendanceDate" ASC);

-- CreateIndex
CREATE INDEX "BranchStudentInstallment_branchStudentId_status_idx" ON "public"."BranchStudentInstallment"("branchStudentId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "BranchStudentInstallment_dueDate_idx" ON "public"."BranchStudentInstallment"("dueDate" ASC);

-- CreateIndex
CREATE INDEX "BranchStudentLedgerEntry_branchId_idx" ON "public"."BranchStudentLedgerEntry"("branchId" ASC);

-- CreateIndex
CREATE INDEX "BranchStudentLedgerEntry_branchStudentId_createdAt_idx" ON "public"."BranchStudentLedgerEntry"("branchStudentId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "BranchStudentLedgerEntry_branchStudentId_entryDate_entryNo_idx" ON "public"."BranchStudentLedgerEntry"("branchStudentId" ASC, "entryDate" ASC, "entryNo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchStudentLedgerEntry_ledgerKey_key" ON "public"."BranchStudentLedgerEntry"("ledgerKey" ASC);

-- CreateIndex
CREATE INDEX "BranchStudentPayment_branchId_idx" ON "public"."BranchStudentPayment"("branchId" ASC);

-- CreateIndex
CREATE INDEX "BranchStudentPayment_branchStudentId_idx" ON "public"."BranchStudentPayment"("branchStudentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BranchStudentPayment_receiptNumber_key" ON "public"."BranchStudentPayment"("receiptNumber" ASC);

-- CreateIndex
CREATE INDEX "Course_branchId_idx" ON "public"."Course"("branchId" ASC);

-- CreateIndex
CREATE INDEX "Course_createdAt_idx" ON "public"."Course"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Course_mode_idx" ON "public"."Course"("mode" ASC);

-- CreateIndex
CREATE INDEX "Course_nameKey_idx" ON "public"."Course"("nameKey" ASC);

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "public"."Course"("status" ASC);

-- CreateIndex
CREATE INDEX "CourseEditRequest_branchCourseId_status_createdAt_idx" ON "public"."CourseEditRequest"("branchCourseId" ASC, "status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "CourseEditRequest_branchId_status_idx" ON "public"."CourseEditRequest"("branchId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "CourseEditRequest_facultyUserId_status_idx" ON "public"."CourseEditRequest"("facultyUserId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "CourseEditRequest_reviewedByUserId_idx" ON "public"."CourseEditRequest"("reviewedByUserId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CourseModule_courseId_sequenceNo_key" ON "public"."CourseModule"("courseId" ASC, "sequenceNo" ASC);

-- CreateIndex
CREATE INDEX "CourseModule_courseId_status_idx" ON "public"."CourseModule"("courseId" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CourseModule_courseId_titleKey_key" ON "public"."CourseModule"("courseId" ASC, "titleKey" ASC);

-- CreateIndex
CREATE INDEX "CourseStatusHistory_courseId_changedAt_idx" ON "public"."CourseStatusHistory"("courseId" ASC, "changedAt" ASC);

-- CreateIndex
CREATE INDEX "DashboardWidget_isActive_idx" ON "public"."DashboardWidget"("isActive" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardWidget_widgetKey_key" ON "public"."DashboardWidget"("widgetKey" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FacultyAttendanceBatchWork_attendanceSessionId_batchId_key" ON "public"."FacultyAttendanceBatchWork"("attendanceSessionId" ASC, "batchId" ASC);

-- CreateIndex
CREATE INDEX "FacultyAttendanceBatchWork_batchId_attendanceDate_idx" ON "public"."FacultyAttendanceBatchWork"("batchId" ASC, "attendanceDate" ASC);

-- CreateIndex
CREATE INDEX "FacultyAttendanceBatchWork_facultyUserId_attendanceDate_idx" ON "public"."FacultyAttendanceBatchWork"("facultyUserId" ASC, "attendanceDate" ASC);

-- CreateIndex
CREATE INDEX "FacultyAttendanceDay_attendanceDate_status_idx" ON "public"."FacultyAttendanceDay"("attendanceDate" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FacultyAttendanceDay_facultyUserId_attendanceDate_key" ON "public"."FacultyAttendanceDay"("facultyUserId" ASC, "attendanceDate" ASC);

-- CreateIndex
CREATE INDEX "FacultyAttendanceSession_attendanceDate_idx" ON "public"."FacultyAttendanceSession"("attendanceDate" ASC);

-- CreateIndex
CREATE INDEX "FacultyAttendanceSession_facultyUserId_attendanceDate_idx" ON "public"."FacultyAttendanceSession"("facultyUserId" ASC, "attendanceDate" ASC);

-- CreateIndex
CREATE INDEX "FacultyAttendanceSession_facultyUserId_attendanceDate_sessi_idx" ON "public"."FacultyAttendanceSession"("facultyUserId" ASC, "attendanceDate" ASC, "sessionSource" ASC);

-- CreateIndex
CREATE INDEX "FacultyBatchEntry_courseId_idx" ON "public"."FacultyBatchEntry"("courseId" ASC);

-- CreateIndex
CREATE INDEX "FacultyBatchEntry_facultyId_sequenceNo_idx" ON "public"."FacultyBatchEntry"("facultyId" ASC, "sequenceNo" ASC);

-- CreateIndex
CREATE INDEX "FacultyCourseAssignment_courseId_idx" ON "public"."FacultyCourseAssignment"("courseId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FacultyCourseAssignment_facultyId_courseId_key" ON "public"."FacultyCourseAssignment"("facultyId" ASC, "courseId" ASC);

-- CreateIndex
CREATE INDEX "FacultyLeaveRequest_branchId_status_createdAt_idx" ON "public"."FacultyLeaveRequest"("branchId" ASC, "status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "FacultyLeaveRequest_facultyId_status_idx" ON "public"."FacultyLeaveRequest"("facultyId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "FacultyLeaveRequest_facultyUserId_fromDate_toDate_idx" ON "public"."FacultyLeaveRequest"("facultyUserId" ASC, "fromDate" ASC, "toDate" ASC);

-- CreateIndex
CREATE INDEX "FacultyProfile_courseId_idx" ON "public"."FacultyProfile"("courseId" ASC);

-- CreateIndex
CREATE INDEX "FacultyProfile_facultyEmail_idx" ON "public"."FacultyProfile"("facultyEmail" ASC);

-- CreateIndex
CREATE INDEX "FacultyProfile_facultyName_idx" ON "public"."FacultyProfile"("facultyName" ASC);

-- CreateIndex
CREATE INDEX "FacultyProfile_status_idx" ON "public"."FacultyProfile"("status" ASC);

-- CreateIndex
CREATE INDEX "FacultyTodayWorkEntry_branchId_courseId_batchId_idx" ON "public"."FacultyTodayWorkEntry"("branchId" ASC, "courseId" ASC, "batchId" ASC);

-- CreateIndex
CREATE INDEX "FacultyTodayWorkEntry_branchId_workDate_idx" ON "public"."FacultyTodayWorkEntry"("branchId" ASC, "workDate" ASC);

-- CreateIndex
CREATE INDEX "FacultyTodayWorkEntry_courseId_moduleId_idx" ON "public"."FacultyTodayWorkEntry"("courseId" ASC, "moduleId" ASC);

-- CreateIndex
CREATE INDEX "FacultyTodayWorkEntry_facultyProfileId_workDate_idx" ON "public"."FacultyTodayWorkEntry"("facultyProfileId" ASC, "workDate" ASC);

-- CreateIndex
CREATE INDEX "FacultyTodayWorkEntry_facultyUserId_workDate_idx" ON "public"."FacultyTodayWorkEntry"("facultyUserId" ASC, "workDate" ASC);

-- CreateIndex
CREATE INDEX "FacultyTodayWorkStudentEntry_batchId_workDate_idx" ON "public"."FacultyTodayWorkStudentEntry"("batchId" ASC, "workDate" ASC);

-- CreateIndex
CREATE INDEX "FacultyTodayWorkStudentEntry_branchStudentId_courseId_batch_idx" ON "public"."FacultyTodayWorkStudentEntry"("branchStudentId" ASC, "courseId" ASC, "batchId" ASC, "submoduleId" ASC);

-- CreateIndex
CREATE INDEX "FacultyTodayWorkStudentEntry_branchStudentId_workDate_idx" ON "public"."FacultyTodayWorkStudentEntry"("branchStudentId" ASC, "workDate" ASC);

-- CreateIndex
CREATE INDEX "FacultyTodayWorkStudentEntry_courseId_moduleId_submoduleId_idx" ON "public"."FacultyTodayWorkStudentEntry"("courseId" ASC, "moduleId" ASC, "submoduleId" ASC);

-- CreateIndex
CREATE INDEX "LoginEvent_userId_eventType_idx" ON "public"."LoginEvent"("userId" ASC, "eventType" ASC);

-- CreateIndex
CREATE INDEX "Notification_kind_createdAt_idx" ON "public"."Notification"("kind" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Notification_read_createdAt_idx" ON "public"."Notification"("read" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Notification_requestId_idx" ON "public"."Notification"("requestId" ASC);

-- CreateIndex
CREATE INDEX "Notification_targetBranchEmail_idx" ON "public"."Notification"("targetBranchEmail" ASC);

-- CreateIndex
CREATE INDEX "Notification_targetBranchId_idx" ON "public"."Notification"("targetBranchId" ASC);

-- CreateIndex
CREATE INDEX "Notification_targetBranchName_idx" ON "public"."Notification"("targetBranchName" ASC);

-- CreateIndex
CREATE INDEX "Notification_targetUserId_read_idx" ON "public"."Notification"("targetUserId" ASC, "read" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "public"."PasswordResetToken"("tokenHash" ASC);

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "public"."PasswordResetToken"("userId" ASC, "expiresAt" ASC);

-- CreateIndex
CREATE INDEX "StudentAttendance_courseId_batchName_attendanceDate_idx" ON "public"."StudentAttendance"("courseId" ASC, "batchName" ASC, "attendanceDate" ASC);

-- CreateIndex
CREATE INDEX "StudentAttendance_facultyUserId_attendanceDate_idx" ON "public"."StudentAttendance"("facultyUserId" ASC, "attendanceDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentAttendance_studentId_attendanceDate_key" ON "public"."StudentAttendance"("studentId" ASC, "attendanceDate" ASC);

-- CreateIndex
CREATE INDEX "StudentProfile_admissionDate_idx" ON "public"."StudentProfile"("admissionDate" ASC);

-- CreateIndex
CREATE INDEX "StudentProfile_courseId_idx" ON "public"."StudentProfile"("courseId" ASC);

-- CreateIndex
CREATE INDEX "StudentProfile_currentStatus_idx" ON "public"."StudentProfile"("currentStatus" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_emailAddress_key" ON "public"."StudentProfile"("emailAddress" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_mobileNumber_key" ON "public"."StudentProfile"("mobileNumber" ASC);

-- CreateIndex
CREATE INDEX "StudentProfile_recordStatus_idx" ON "public"."StudentProfile"("recordStatus" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_studentCode_key" ON "public"."StudentProfile"("studentCode" ASC);

-- CreateIndex
CREATE INDEX "User_active_idx" ON "public"."User"("active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone" ASC);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_userCode_key" ON "public"."User"("userCode" ASC);

-- CreateIndex
CREATE INDEX "UserDashboardWidget_userId_displayOrder_idx" ON "public"."UserDashboardWidget"("userId" ASC, "displayOrder" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserDashboardWidget_userId_widgetId_key" ON "public"."UserDashboardWidget"("userId" ASC, "widgetId" ASC);

-- CreateIndex
CREATE INDEX "UserDashboardWidget_widgetId_idx" ON "public"."UserDashboardWidget"("widgetId" ASC);

-- AddForeignKey
ALTER TABLE "public"."Batch" ADD CONSTRAINT "Batch_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BatchFacultyAssignment" ADD CONSTRAINT "BatchFacultyAssignment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BatchFacultyAssignment" ADD CONSTRAINT "BatchFacultyAssignment_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BatchStatusHistory" ADD CONSTRAINT "BatchStatusHistory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Branch" ADD CONSTRAINT "Branch_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchBatch" ADD CONSTRAINT "BranchBatch_branchCourseId_fkey" FOREIGN KEY ("branchCourseId") REFERENCES "public"."BranchCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchBatch" ADD CONSTRAINT "BranchBatch_branchFacultyId_fkey" FOREIGN KEY ("branchFacultyId") REFERENCES "public"."BranchFaculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchBatch" ADD CONSTRAINT "BranchBatch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchCalendarHoliday" ADD CONSTRAINT "BranchCalendarHoliday_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchCalendarLeave" ADD CONSTRAINT "BranchCalendarLeave_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchCourse" ADD CONSTRAINT "BranchCourse_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchCourseModule" ADD CONSTRAINT "BranchCourseModule_branchCourseId_fkey" FOREIGN KEY ("branchCourseId") REFERENCES "public"."BranchCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchCourseSubmodule" ADD CONSTRAINT "BranchCourseSubmodule_branchCourseModuleId_fkey" FOREIGN KEY ("branchCourseModuleId") REFERENCES "public"."BranchCourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchFaculty" ADD CONSTRAINT "BranchFaculty_branchCourseId_fkey" FOREIGN KEY ("branchCourseId") REFERENCES "public"."BranchCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchFaculty" ADD CONSTRAINT "BranchFaculty_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchFaculty" ADD CONSTRAINT "BranchFaculty_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchInstallmentTemplate" ADD CONSTRAINT "BranchInstallmentTemplate_branchCourseId_fkey" FOREIGN KEY ("branchCourseId") REFERENCES "public"."BranchCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchInstallmentTemplate" ADD CONSTRAINT "BranchInstallmentTemplate_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchStudent" ADD CONSTRAINT "BranchStudent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchStudent" ADD CONSTRAINT "BranchStudent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."BranchCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchStudentAttendance" ADD CONSTRAINT "BranchStudentAttendance_branchStudentId_fkey" FOREIGN KEY ("branchStudentId") REFERENCES "public"."BranchStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchStudentAttendance" ADD CONSTRAINT "BranchStudentAttendance_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchStudentInstallment" ADD CONSTRAINT "BranchStudentInstallment_branchStudentId_fkey" FOREIGN KEY ("branchStudentId") REFERENCES "public"."BranchStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchStudentLedgerEntry" ADD CONSTRAINT "BranchStudentLedgerEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchStudentLedgerEntry" ADD CONSTRAINT "BranchStudentLedgerEntry_branchStudentId_fkey" FOREIGN KEY ("branchStudentId") REFERENCES "public"."BranchStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchStudentPayment" ADD CONSTRAINT "BranchStudentPayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchStudentPayment" ADD CONSTRAINT "BranchStudentPayment_branchStudentId_fkey" FOREIGN KEY ("branchStudentId") REFERENCES "public"."BranchStudent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchStudentPayment" ADD CONSTRAINT "BranchStudentPayment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "public"."BranchStudentInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseStatusHistory" ADD CONSTRAINT "CourseStatusHistory_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyAttendanceBatchWork" ADD CONSTRAINT "FacultyAttendanceBatchWork_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "public"."FacultyAttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyAttendanceBatchWork" ADD CONSTRAINT "FacultyAttendanceBatchWork_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyAttendanceDay" ADD CONSTRAINT "FacultyAttendanceDay_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyAttendanceSession" ADD CONSTRAINT "FacultyAttendanceSession_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyBatchEntry" ADD CONSTRAINT "FacultyBatchEntry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyBatchEntry" ADD CONSTRAINT "FacultyBatchEntry_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "public"."FacultyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyCourseAssignment" ADD CONSTRAINT "FacultyCourseAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyCourseAssignment" ADD CONSTRAINT "FacultyCourseAssignment_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "public"."FacultyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyLeaveRequest" ADD CONSTRAINT "FacultyLeaveRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyLeaveRequest" ADD CONSTRAINT "FacultyLeaveRequest_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyProfile" ADD CONSTRAINT "FacultyProfile_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyTodayWorkEntry" ADD CONSTRAINT "FacultyTodayWorkEntry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."BranchCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyTodayWorkEntry" ADD CONSTRAINT "FacultyTodayWorkEntry_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyTodayWorkStudentEntry" ADD CONSTRAINT "FacultyTodayWorkStudentEntry_branchStudentId_fkey" FOREIGN KEY ("branchStudentId") REFERENCES "public"."BranchStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyTodayWorkStudentEntry" ADD CONSTRAINT "FacultyTodayWorkStudentEntry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."BranchCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyTodayWorkStudentEntry" ADD CONSTRAINT "FacultyTodayWorkStudentEntry_facultyTodayWorkEntryId_fkey" FOREIGN KEY ("facultyTodayWorkEntryId") REFERENCES "public"."FacultyTodayWorkEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."CourseEditRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentAttendance" ADD CONSTRAINT "StudentAttendance_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentAttendance" ADD CONSTRAINT "StudentAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentProfile" ADD CONSTRAINT "StudentProfile_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserDashboardWidget" ADD CONSTRAINT "UserDashboardWidget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserDashboardWidget" ADD CONSTRAINT "UserDashboardWidget_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "public"."DashboardWidget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
