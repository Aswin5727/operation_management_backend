UPDATE "BatchCycle" AS current_cycle
SET
  "status" = CASE
    WHEN current_cycle."cycleNumber" = latest."maxCycleNumber" THEN 'ACTIVE'
    ELSE 'COMPLETED'
  END,
  "endDate" = CASE
    WHEN current_cycle."cycleNumber" = latest."maxCycleNumber" THEN current_cycle."endDate"
    ELSE COALESCE(current_cycle."endDate", CURRENT_DATE::text)
  END,
  "updatedAt" = CURRENT_TIMESTAMP
FROM (
  SELECT "batchId", MAX("cycleNumber") AS "maxCycleNumber"
  FROM "BatchCycle"
  GROUP BY "batchId"
) AS latest
WHERE latest."batchId" = current_cycle."batchId";
