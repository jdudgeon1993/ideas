-- =====================================================
-- ADD MASTER LISTS FOR STORAGE LOCATIONS AND CATEGORIES
-- =====================================================

-- Storage Locations Master List
CREATE TABLE IF NOT EXISTS storage_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, name)
);

-- Categories Master List
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, name)
);

-- Enable RLS
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for storage_locations
CREATE POLICY "Users can view their household's storage locations" ON storage_locations
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their household's storage locations" ON storage_locations
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for categories
CREATE POLICY "Users can view their household's categories" ON categories
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their household's categories" ON categories
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE storage_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- =====================================================
-- UPDATE create_household_for_user FUNCTION
-- Add default locations and categories when creating household
-- =====================================================

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

  -- Add default storage locations
  INSERT INTO storage_locations (household_id, name, is_default) VALUES
    (v_household_id, 'Pantry', true),
    (v_household_id, 'Fridge', true),
    (v_household_id, 'Freezer', true),
    (v_household_id, 'Cellar', true),
    (v_household_id, 'Other', true);

  -- Add default categories
  INSERT INTO categories (household_id, name, emoji, is_default) VALUES
    (v_household_id, 'Produce', '🥬', true),
    (v_household_id, 'Dairy', '🥛', true),
    (v_household_id, 'Meat', '🥩', true),
    (v_household_id, 'Pantry', '🥫', true),
    (v_household_id, 'Frozen', '🧊', true),
    (v_household_id, 'Spices', '🧂', true),
    (v_household_id, 'Bakery', '🍞', true),
    (v_household_id, 'Beverages', '🧃', true),
    (v_household_id, 'Other', '📦', true);

  RETURN v_household_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ADD DEFAULTS FOR EXISTING HOUSEHOLDS
-- =====================================================

-- Add default locations for existing households (only if they don't have any)
INSERT INTO storage_locations (household_id, name, is_default)
SELECT h.id, loc.name, true
FROM households h
CROSS JOIN (
  VALUES ('Pantry'), ('Fridge'), ('Freezer'), ('Cellar'), ('Other')
) AS loc(name)
WHERE NOT EXISTS (
  SELECT 1 FROM storage_locations WHERE household_id = h.id
)
ON CONFLICT (household_id, name) DO NOTHING;

-- Add default categories for existing households (only if they don't have any)
INSERT INTO categories (household_id, name, emoji, is_default)
SELECT h.id, cat.name, cat.emoji, true
FROM households h
CROSS JOIN (
  VALUES
    ('Produce', '🥬'),
    ('Dairy', '🥛'),
    ('Meat', '🥩'),
    ('Pantry', '🥫'),
    ('Frozen', '🧊'),
    ('Spices', '🧂'),
    ('Bakery', '🍞'),
    ('Beverages', '🧃'),
    ('Other', '📦')
) AS cat(name, emoji)
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE household_id = h.id
)
ON CONFLICT (household_id, name) DO NOTHING;

-- =====================================================
-- VERIFY
-- =====================================================

-- Check storage_locations
SELECT h.name as household, sl.name as location, sl.is_default
FROM storage_locations sl
JOIN households h ON h.id = sl.household_id
ORDER BY h.name, sl.name;

-- Check categories
SELECT h.name as household, c.name as category, c.emoji, c.is_default
FROM categories c
JOIN households h ON h.id = c.household_id
ORDER BY h.name, c.name;
