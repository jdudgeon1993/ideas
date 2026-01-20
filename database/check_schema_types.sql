-- Quick check: What type is households.id?
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('households', 'household_members', 'pantry_items')
  AND column_name IN ('id', 'household_id')
ORDER BY table_name, column_name;
