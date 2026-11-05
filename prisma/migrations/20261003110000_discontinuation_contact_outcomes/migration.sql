ALTER TYPE "DiscontinuationRequestStatus" ADD VALUE 'CONTACTED_CONTINUE';
ALTER TYPE "DiscontinuationRequestStatus" ADD VALUE 'LEAVE_REQUESTED';
ALTER TYPE "DiscontinuationRequestStatus" ADD VALUE 'UNABLE_TO_CONTACT';

ALTER TABLE "StudentDiscontinuationRequest"
  ADD COLUMN "contactOutcome" TEXT,
  ADD COLUMN "contactNotes" TEXT,
  ADD COLUMN "contactedBy" TEXT,
  ADD COLUMN "contactedAt" TIMESTAMP(3),
  ADD COLUMN "nextFollowUpDate" TEXT;
