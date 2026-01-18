-- Verify and add tags and is_favorite columns to recipes table
-- Run this in your Supabase SQL Editor

-- Check if columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'recipes'
  AND column_name IN ('tags', 'is_favorite')
ORDER BY column_name;

-- Add tags column if it doesn't exist (TEXT[] array for multiple tags)
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add is_favorite column if it doesn't exist
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_recipes_is_favorite ON recipes (is_favorite);

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'recipes'
  AND column_name IN ('tags', 'is_favorite')
ORDER BY column_name;
