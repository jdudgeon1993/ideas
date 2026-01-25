-- Query actual Supabase schema to see what exists
-- Run this in Supabase SQL Editor to get the truth

-- ============================================
-- 1. List all tables in public schema
-- ============================================
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 2. Check pantry_items columns
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pantry_items'
ORDER BY ordinal_position;

-- ============================================
-- 3. Check pantry_locations columns
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pantry_locations'
ORDER BY ordinal_position;

-- ============================================
-- 4. Check recipes columns
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'recipes'
ORDER BY ordinal_position;

-- ============================================
-- 5. Check recipe ingredients table (try both names)
-- ============================================
-- Try recipes_ingredients
SELECT
  'recipes_ingredients' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'recipes_ingredients'
ORDER BY ordinal_position;

-- Try recipe_ingredients
SELECT
  'recipe_ingredients' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'recipe_ingredients'
ORDER BY ordinal_position;

-- ============================================
-- 6. Check meal_plans columns
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'meal_plans'
ORDER BY ordinal_position;

-- ============================================
-- 7. Check foreign key relationships
-- ============================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('pantry_items', 'pantry_locations', 'recipes', 'recipes_ingredients', 'recipe_ingredients', 'meal_plans')
ORDER BY tc.table_name;
