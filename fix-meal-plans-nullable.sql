-- =====================================================
-- FIX: Make week and day_of_week nullable in meal_plans
-- =====================================================

-- The app uses planned_date for everything, but the database requires week and day_of_week
-- Make these columns nullable so they're optional

ALTER TABLE meal_plans
ALTER COLUMN week DROP NOT NULL;

ALTER TABLE meal_plans
ALTER COLUMN day_of_week DROP NOT NULL;

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'meal_plans'
AND column_name IN ('week', 'day_of_week');
