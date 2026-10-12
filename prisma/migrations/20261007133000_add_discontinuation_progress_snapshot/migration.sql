ALTER TABLE "StudentDiscontinuationRequest" ADD COLUMN "courseProgress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StudentDiscontinuationRequest" ADD COLUMN "progressEarnedAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StudentDiscontinuationRequest" ADD COLUMN "balanceDue" INTEGER NOT NULL DEFAULT 0;