-- ===================================================================
-- BULK ENTRY DRAFTS TABLE
-- For real-time collaborative bulk pantry entry across devices
-- ===================================================================

-- Create the bulk_entry_drafts table
CREATE TABLE IF NOT EXISTS bulk_entry_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  item_name TEXT,
  quantity DECIMAL,
  unit TEXT,
  category TEXT,
  location TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_household_row UNIQUE(household_id, row_number)
);

-- Enable Row Level Security
ALTER TABLE bulk_entry_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access drafts for their household

CREATE POLICY "Users can view drafts for their household"
  ON bulk_entry_drafts FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert drafts for their household"
  ON bulk_entry_drafts FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update drafts for their household"
  ON bulk_entry_drafts FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete drafts for their household"
  ON bulk_entry_drafts FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bulk_entry_drafts_household
  ON bulk_entry_drafts(household_id);

CREATE INDEX IF NOT EXISTS idx_bulk_entry_drafts_row_number
  ON bulk_entry_drafts(household_id, row_number);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bulk_entry_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bulk_entry_drafts_updated_at
  BEFORE UPDATE ON bulk_entry_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_bulk_entry_drafts_updated_at();

-- Verification queries
-- Run these after creating the table to verify:

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bulk_entry_drafts'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'bulk_entry_drafts';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'bulk_entry_drafts';
