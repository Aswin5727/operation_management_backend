ALTER TABLE "BatchCycle" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "BatchCycle" ADD COLUMN "freezeUntil" TIMESTAMP(3);
CREATE INDEX "BatchCycle_status_freezeUntil_idx" ON "BatchCycle"("status", "freezeUntil");
