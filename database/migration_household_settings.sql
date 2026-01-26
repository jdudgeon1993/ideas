-- Chef's Kiss - Household Settings Migration
-- Stores per-household settings (categories, locations) previously in localStorage

-- ============================================
-- Household Settings Table
-- ============================================
-- Stores customizable settings per household
-- Replaces localStorage for categories and locations

CREATE TABLE IF NOT EXISTS household_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

  -- Storage locations (e.g., ['Pantry', 'Refrigerator', 'Freezer', 'Cabinet', 'Counter'])
  locations JSONB DEFAULT '["Pantry", "Refrigerator", "Freezer", "Cabinet", "Counter"]'::jsonb,

  -- Item categories (e.g., ['Meat', 'Dairy', 'Produce', 'Pantry', 'Frozen', 'Spices', 'Beverages', 'Snacks', 'Other'])
  categories JSONB DEFAULT '["Meat", "Dairy", "Produce", "Pantry", "Frozen", "Spices", "Beverages", "Snacks", "Other"]'::jsonb,

  -- Category emoji mappings (e.g., {'Meat': '🥩', 'Dairy': '🧀', ...})
  category_emojis JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One settings record per household
  CONSTRAINT unique_household_settings UNIQUE (household_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_household_settings_household
  ON household_settings(household_id);

-- Row Level Security
ALTER TABLE household_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their household settings"
  ON household_settings FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert settings for their household"
  ON household_settings FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their household settings"
  ON household_settings FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their household settings"
  ON household_settings FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Update Trigger for updated_at
-- ============================================

-- Reuse existing function if it exists, otherwise create it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_household_settings_updated_at
  BEFORE UPDATE ON household_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Helper function to get or create settings
-- ============================================
-- This ensures a settings record exists when queried

CREATE OR REPLACE FUNCTION get_or_create_household_settings(p_household_id UUID)
RETURNS household_settings AS $$
DECLARE
  v_settings household_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO v_settings
  FROM household_settings
  WHERE household_id = p_household_id;

  -- If not found, create with defaults
  IF NOT FOUND THEN
    INSERT INTO household_settings (household_id)
    VALUES (p_household_id)
    RETURNING * INTO v_settings;
  END IF;

  RETURN v_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Verify migration
-- ============================================

SELECT 'Migration successful! household_settings table created.' as status
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'household_settings'
);

-- Show table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'household_settings'
ORDER BY ordinal_position;
