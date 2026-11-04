-- Academic test notifications use this nullable identifier, which was missing
-- from the live Notification table while present in the Prisma model.
ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "academicTestId" TEXT;