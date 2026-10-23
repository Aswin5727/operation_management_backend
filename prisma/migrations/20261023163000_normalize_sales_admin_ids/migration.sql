WITH ranked_sales_admins AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS sequence_no
  FROM "User"
  WHERE "role" = 'SALES_ADMIN'
)
UPDATE "User" AS users
SET "userCode" = 'CISSALES' || LPAD(ranked_sales_admins.sequence_no::text, 3, '0')
FROM ranked_sales_admins
WHERE users."id" = ranked_sales_admins."id";
