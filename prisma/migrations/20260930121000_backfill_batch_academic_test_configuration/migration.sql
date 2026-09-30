UPDATE "AcademicTestBatch" AS batch
SET "configuration" = COALESCE((
  SELECT jsonb_agg(
    jsonb_build_object('sequence', item."sequence", 'testType', item."testType")
    ORDER BY item."sequence"
  )
  FROM "AcademicTestItem" AS item
  WHERE item."academicTestId" = batch."academicTestId"
), '[]'::jsonb)
WHERE batch."configuration" = '[]'::jsonb;
