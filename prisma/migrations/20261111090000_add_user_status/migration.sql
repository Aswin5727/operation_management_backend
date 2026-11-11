-- Sales Admin status is persisted separately from the legacy active flag.
ALTER TABLE "User"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

UPDATE "User"
SET "status" = CASE WHEN "active" THEN 'ACTIVE' ELSE 'INACTIVE' END;

CREATE INDEX "User_role_status_idx" ON "User"("role", "status");
