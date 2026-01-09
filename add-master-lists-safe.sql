-- Safe version that handles existing tables and policies
-- Storage Locations Master List

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their household's storage locations" ON storage_locations;
DROP POLICY IF EXISTS "Users can insert storage locations for their household" ON storage_locations;
DROP POLICY IF EXISTS "Users can update their household's storage locations" ON storage_locations;
DROP POLICY IF EXISTS "Users can delete their household's storage locations" ON storage_locations;

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, name)
);

-- Enable RLS
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their household's storage locations"
  ON storage_locations FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert storage locations for their household"
  ON storage_locations FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their household's storage locations"
  ON storage_locations FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their household's storage locations"
  ON storage_locations FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
    AND is_default = false -- Can only delete custom locations
  );

-- Categories Master List

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their household's categories" ON categories;
DROP POLICY IF EXISTS "Users can insert categories for their household" ON categories;
DROP POLICY IF EXISTS "Users can update their household's categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their household's categories" ON categories;

-- Create table if it doesn't exist
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
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their household's categories"
  ON categories FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert categories for their household"
  ON categories FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their household's categories"
  ON categories FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their household's categories"
  ON categories FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
    AND is_default = false -- Can only delete custom categories
  );

-- Update create_household_for_user function to add default locations and categories
CREATE OR REPLACE FUNCTION create_household_for_user(
  user_id UUID,
  household_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_household_id UUID;
  user_email TEXT;
BEGIN
  -- Get user's email
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;

  -- Create household
  INSERT INTO households (name, created_by)
  VALUES (
    COALESCE(household_name, user_email || '''s Kitchen'),
    user_id
  )
  RETURNING id INTO new_household_id;

  -- Add user as household member
  INSERT INTO household_members (household_id, user_id, role)
  VALUES (new_household_id, user_id, 'owner');

  -- Add default storage locations
  INSERT INTO storage_locations (household_id, name, is_default)
  VALUES
    (new_household_id, 'Pantry', true),
    (new_household_id, 'Fridge', true),
    (new_household_id, 'Freezer', true),
    (new_household_id, 'Cellar', true),
    (new_household_id, 'Other', true);

  -- Add default categories
  INSERT INTO categories (household_id, name, emoji, is_default)
  VALUES
    (new_household_id, 'Produce', '🥬', true),
    (new_household_id, 'Dairy', '🥛', true),
    (new_household_id, 'Meat', '🥩', true),
    (new_household_id, 'Pantry', '🥫', true),
    (new_household_id, 'Frozen', '🧊', true),
    (new_household_id, 'Spices', '🧂', true),
    (new_household_id, 'Bakery', '🍞', true),
    (new_household_id, 'Beverages', '🧃', true),
    (new_household_id, 'Other', '📦', true);

  RETURN new_household_id;
END;
$$;

-- Backfill defaults for existing households
DO $$
DECLARE
  household_record RECORD;
BEGIN
  FOR household_record IN SELECT id FROM households LOOP
    -- Add default storage locations if they don't exist
    INSERT INTO storage_locations (household_id, name, is_default)
    SELECT household_record.id, location_name, true
    FROM (VALUES
      ('Pantry'),
      ('Fridge'),
      ('Freezer'),
      ('Cellar'),
      ('Other')
    ) AS defaults(location_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM storage_locations
      WHERE household_id = household_record.id
      AND name = location_name
    );

    -- Add default categories if they don't exist
    INSERT INTO categories (household_id, name, emoji, is_default)
    SELECT household_record.id, category_name, category_emoji, true
    FROM (VALUES
      ('Produce', '🥬'),
      ('Dairy', '🥛'),
      ('Meat', '🥩'),
      ('Pantry', '🥫'),
      ('Frozen', '🧊'),
      ('Spices', '🧂'),
      ('Bakery', '🍞'),
      ('Beverages', '🧃'),
      ('Other', '📦')
    ) AS defaults(category_name, category_emoji)
    WHERE NOT EXISTS (
      SELECT 1 FROM categories
      WHERE household_id = household_record.id
      AND name = category_name
    );
  END LOOP;
END $$;
