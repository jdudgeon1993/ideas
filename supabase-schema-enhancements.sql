-- ============================================
-- PHASE 2B: SCHEMA ENHANCEMENTS
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ADD MULTI-LOCATION SUPPORT FOR PANTRY
-- ============================================

-- Add pantry_locations table for multi-location tracking
CREATE TABLE IF NOT EXISTS pantry_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pantry_item_id UUID REFERENCES pantry_items(id) ON DELETE CASCADE NOT NULL,
  location_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  expiration_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pantry_locations_item ON pantry_locations(pantry_item_id);
CREATE INDEX IF NOT EXISTS idx_pantry_locations_expiry ON pantry_locations(expiration_date);

-- Add min_threshold column to pantry_items for shopping list auto-generation
ALTER TABLE pantry_items
  ADD COLUMN IF NOT EXISTS min_threshold NUMERIC DEFAULT 0;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_pantry_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pantry_locations_updated_at
  BEFORE UPDATE ON pantry_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_pantry_locations_updated_at();

-- ============================================
-- 2. ENHANCE MEAL PLANS FOR MEAL TYPES & COOKED STATUS
-- ============================================

-- Add meal_type and is_cooked columns
ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS meal_type TEXT,           -- Breakfast, Lunch, Dinner, Snack
  ADD COLUMN IF NOT EXISTS is_cooked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES recipes(id);

-- Add index for date-based queries
CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_household_date ON meal_plans(household_id, date);

-- ============================================
-- 3. CUSTOM SHOPPING LIST ITEMS
-- ============================================

-- Create shopping_list_custom table for manual additions
CREATE TABLE IF NOT EXISTS shopping_list_custom (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  category TEXT,
  checked BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_custom_household ON shopping_list_custom(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_custom_checked ON shopping_list_custom(household_id, checked);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_shopping_custom_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shopping_custom_updated_at
  BEFORE UPDATE ON shopping_list_custom
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_custom_updated_at();

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_custom ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can access household pantry" ON pantry_items;
DROP POLICY IF EXISTS "Users can access household locations" ON pantry_locations;
DROP POLICY IF EXISTS "Users can access household recipes" ON recipes;
DROP POLICY IF EXISTS "Users can access household meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can access household shopping" ON shopping_list_custom;
DROP POLICY IF EXISTS "Users can view household members" ON household_members;
DROP POLICY IF EXISTS "Users can view own households" ON households;

-- Pantry Items Policies
CREATE POLICY "Users can access household pantry"
  ON pantry_items FOR ALL
  USING (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- Pantry Locations Policies
CREATE POLICY "Users can access household locations"
  ON pantry_locations FOR ALL
  USING (
    pantry_item_id IN (
      SELECT id FROM pantry_items
      WHERE household_id IN (
        SELECT household_id
        FROM household_members
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    pantry_item_id IN (
      SELECT id FROM pantry_items
      WHERE household_id IN (
        SELECT household_id
        FROM household_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Recipes Policies
CREATE POLICY "Users can access household recipes"
  ON recipes FOR ALL
  USING (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- Meal Plans Policies
CREATE POLICY "Users can access household meal plans"
  ON meal_plans FOR ALL
  USING (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- Shopping List Custom Policies
CREATE POLICY "Users can access household shopping"
  ON shopping_list_custom FOR ALL
  USING (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- Household Members Policies
CREATE POLICY "Users can view household members"
  ON household_members FOR SELECT
  USING (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- Households Policies
CREATE POLICY "Users can view own households"
  ON households FOR SELECT
  USING (
    id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 5. REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime on key tables for live multi-user sync
ALTER PUBLICATION supabase_realtime ADD TABLE pantry_items;
ALTER PUBLICATION supabase_realtime ADD TABLE pantry_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE recipes;
ALTER PUBLICATION supabase_realtime ADD TABLE meal_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list_custom;

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to get user's household ID
CREATE OR REPLACE FUNCTION get_user_household_id()
RETURNS UUID AS $$
  SELECT household_id
  FROM household_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to create household and add user as admin
CREATE OR REPLACE FUNCTION create_household_for_user(
  p_household_name TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_household_id UUID;
BEGIN
  -- Create household
  INSERT INTO households (name)
  VALUES (p_household_name)
  RETURNING id INTO v_household_id;

  -- Add user as admin member
  INSERT INTO household_members (household_id, user_id, role)
  VALUES (v_household_id, p_user_id, 'admin');

  -- Create default categories for household
  INSERT INTO categories (household_id, name, is_default)
  VALUES
    (v_household_id, 'Meat', true),
    (v_household_id, 'Dairy', true),
    (v_household_id, 'Produce', true),
    (v_household_id, 'Pantry', true),
    (v_household_id, 'Frozen', true),
    (v_household_id, 'Spices', true),
    (v_household_id, 'Other', true);

  -- Create default locations for household
  INSERT INTO locations (household_id, name, is_default)
  VALUES
    (v_household_id, 'Pantry', true),
    (v_household_id, 'Fridge', true),
    (v_household_id, 'Freezer', true),
    (v_household_id, 'Cellar', true),
    (v_household_id, 'Other', true);

  RETURN v_household_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. MIGRATE EXISTING PANTRY DATA TO MULTI-LOCATION
-- ============================================

-- Migrate existing pantry items to use pantry_locations
-- Only migrate items that have quantity and don't already have locations
INSERT INTO pantry_locations (pantry_item_id, location_name, quantity, expiration_date)
SELECT
  id,
  'Pantry' as location_name,
  quantity,
  expiration_date
FROM pantry_items
WHERE quantity IS NOT NULL
  AND quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM pantry_locations
    WHERE pantry_item_id = pantry_items.id
  );

-- Set min_threshold to 0 for existing items
UPDATE pantry_items
SET min_threshold = 0
WHERE min_threshold IS NULL;

-- ============================================
-- SCHEMA ENHANCEMENTS COMPLETE!
-- ============================================

-- Verify changes
SELECT 'Schema enhancements completed successfully!' as status;

-- Show table summary
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('pantry_items', 'pantry_locations', 'recipes', 'meal_plans', 'shopping_list_custom', 'households', 'household_members')
ORDER BY table_name;
