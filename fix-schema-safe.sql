-- =====================================================
-- SAFE SCHEMA FIX - Checks before modifying
-- =====================================================

-- Step 1: Check what columns exist in meal_plans
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'meal_plans'
ORDER BY ordinal_position;

-- If the above shows you already have 'planned_date', SKIP THE RENAME
-- If it shows 'date' instead, run this:
-- ALTER TABLE meal_plans RENAME COLUMN date TO planned_date;

-- Step 2: Add missing columns to recipes (safe - won't error if exists)
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS servings INTEGER DEFAULT 1;

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS photo TEXT DEFAULT '';

-- Step 3: Verify recipes table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'recipes'
ORDER BY ordinal_position;
