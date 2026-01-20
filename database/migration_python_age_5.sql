-- Chef's Kiss - Python Age 5.0 Migration
-- New tables and columns for Python backend features

-- ============================================
-- Manual Shopping List Items
-- ============================================
-- Stores user-added items (toilet paper, soap, etc.)
-- Persists separately from auto-generated items

CREATE TABLE IF NOT EXISTS shopping_list_manual (
  id BIGSERIAL PRIMARY KEY,
  household_id BIGINT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit VARCHAR(20) NOT NULL,
  category VARCHAR(50) DEFAULT 'Other',
  checked BOOLEAN DEFAULT FALSE,
  checked_at TIMESTAMP WITH TIME ZONE,
  checked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_shopping_list_manual_household
  ON shopping_list_manual(household_id);

CREATE INDEX IF NOT EXISTS idx_shopping_list_manual_checked
  ON shopping_list_manual(household_id, checked);

-- Row Level Security
ALTER TABLE shopping_list_manual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their household's manual shopping items"
  ON shopping_list_manual FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert manual shopping items for their household"
  ON shopping_list_manual FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their household's manual shopping items"
  ON shopping_list_manual FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their household's manual shopping items"
  ON shopping_list_manual FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Update Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shopping_list_manual_updated_at
  BEFORE UPDATE ON shopping_list_manual
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Optional: Add checked columns to existing shopping_list
-- (If you want to track checked status for auto-generated items)
-- ============================================
-- Note: The old shopping_list table might not be needed anymore
-- since we regenerate it dynamically. But if you want to keep it:

-- ALTER TABLE shopping_list
--   ADD COLUMN IF NOT EXISTS checked BOOLEAN DEFAULT FALSE,
--   ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP WITH TIME ZONE,
--   ADD COLUMN IF NOT EXISTS checked_by UUID REFERENCES auth.users(id);

-- ============================================
-- Verify migration
-- ============================================

-- Check if table was created
SELECT 'Migration successful! shopping_list_manual table created.' as status
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'shopping_list_manual'
);

-- Show table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'shopping_list_manual'
ORDER BY ordinal_position;
