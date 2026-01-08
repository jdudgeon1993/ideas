# Phase 2B: Supabase Migration Strategy

## Existing Schema Analysis

### ✅ What's Already There (Old Kitchen Site)

**Tables:**
- `households` - Multi-user household support ✅
- `household_members` - User roles (admin, member)
- `household_invites` - Invite codes for joining households
- `categories` - Custom categories per household
- `locations` - Storage locations per household
- `pantry_items` - Pantry with single location per item
- `recipes` - Recipes with JSONB ingredients
- `meal_plans` - Weekly meal planning
- `recent_purchases` - Purchase history

**Good news:** Household sharing already exists! 🎉

---

## Key Differences: Old Schema vs New App

### Pantry Items

**Old Schema:**
```sql
pantry_items {
  household_id,
  name,
  category,
  quantity,          -- single quantity
  unit,
  expiration_date,   -- single expiration
  notes,
  reserved_quantity
}
```

**New App (localStorage):**
```javascript
{
  name,
  category,
  unit,
  min,               -- threshold for shopping list
  locations: [       -- MULTI-LOCATION support
    {
      location: "Fridge",
      qty: 2,
      expiry: "2026-01-15"
    },
    {
      location: "Freezer",
      qty: 5,
      expiry: "2026-03-01"
    }
  ],
  totalQty: 7        -- calculated
}
```

**Problem:** Old schema doesn't support multi-location storage.

---

### Recipes

**Old Schema:**
```sql
recipes {
  name,
  servings,
  category,
  image_url,
  instructions,
  ingredients,       -- JSONB: [{ name, qty, unit }]
  favorite,
  color
}
```

**New App:**
```javascript
{
  name,
  servings,
  photo,             -- URL (will become upload)
  instructions,
  ingredients: [     -- Array: { name, qty, unit }
    { name: "Chicken", qty: 2, unit: "lbs" }
  ]
}
```

**Compatibility:** ✅ Very similar! JSONB maps perfectly.

---

### Meal Plans

**Old Schema:**
```sql
meal_plans {
  household_id,
  week,              -- "2026-W02"
  day_of_week,       -- "Monday"
  recipe_ids,        -- JSONB array
  date               -- actual date
}
```

**New App:**
```javascript
{
  "2026-01-08": [    -- date as key
    {
      recipeId: "abc123",
      mealType: "Breakfast",  -- NEW: meal type
      cooked: false           -- NEW: cooked flag
    }
  ]
}
```

**Difference:** New app tracks meal type and cooked status.

---

## Migration Options

### Option A: Keep Old Schema, Add Features
**Pros:**
- Minimal migration effort
- Existing household data preserved
- Multi-user already works

**Cons:**
- No multi-location pantry support
- Have to flatten locations to single entry
- Lose current app's best feature

### Option B: Enhance Old Schema (RECOMMENDED)
**Pros:**
- Keep household sharing
- Add multi-location support
- Best of both worlds

**Cons:**
- Requires schema changes
- Need data migration script

### Option C: Fresh Start with New Schema
**Pros:**
- Clean slate
- Optimized for new features

**Cons:**
- Lose all existing data
- Have to rebuild household features

---

## Recommended Approach: Option B

### Schema Enhancements

#### 1. Add `pantry_locations` table for multi-location
```sql
CREATE TABLE pantry_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pantry_item_id UUID REFERENCES pantry_items(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  expiration_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pantry_locations_item ON pantry_locations(pantry_item_id);
```

#### 2. Add `min_threshold` to pantry_items
```sql
ALTER TABLE pantry_items
  ADD COLUMN min_threshold NUMERIC DEFAULT 0;
```

#### 3. Enhance meal_plans
```sql
ALTER TABLE meal_plans
  ADD COLUMN meal_type TEXT,           -- Breakfast, Lunch, Dinner, Snack
  ADD COLUMN is_cooked BOOLEAN DEFAULT false,
  ADD COLUMN recipe_id UUID REFERENCES recipes(id);

-- Keep recipe_ids for backward compatibility
```

#### 4. Update recipes
```sql
-- Already has image_url - perfect!
-- Already has ingredients as JSONB - perfect!
-- No changes needed
```

---

## Migration Steps

### Step 1: Schema Enhancements (SQL)
Run the schema enhancement queries above in Supabase SQL editor.

### Step 2: Migrate Existing Data
```sql
-- Migrate old pantry_items to new multi-location format
INSERT INTO pantry_locations (pantry_item_id, location_name, quantity, expiration_date)
SELECT
  id,
  'Pantry' as location_name,  -- default location
  quantity,
  expiration_date
FROM pantry_items
WHERE quantity IS NOT NULL;

-- Set min_threshold to 0 for existing items
UPDATE pantry_items SET min_threshold = 0;
```

### Step 3: Add New User's Data
When user signs in:
1. Check if they have a household
2. If not, create one automatically
3. Import localStorage data into their household

### Step 4: Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access data from their household
CREATE POLICY "Users can access household pantry"
  ON pantry_items FOR ALL
  USING (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  );

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
  );

-- Repeat for other tables...
```

---

## Data Mapping: localStorage → Supabase

### Pantry Item
```javascript
// localStorage format
{
  id: "abc123",
  name: "Chicken",
  category: "Meat",
  unit: "lbs",
  min: 2,
  locations: [
    { location: "Fridge", qty: 1, expiry: "2026-01-15" },
    { location: "Freezer", qty: 3, expiry: "2026-03-01" }
  ]
}

// Becomes in Supabase:

// 1. pantry_items row
{
  id: "abc123",
  household_id: "user-household-id",
  name: "Chicken",
  category: "Meat",
  unit: "lbs",
  min_threshold: 2
}

// 2. pantry_locations rows
[
  {
    pantry_item_id: "abc123",
    location_name: "Fridge",
    quantity: 1,
    expiration_date: "2026-01-15"
  },
  {
    pantry_item_id: "abc123",
    location_name: "Freezer",
    quantity: 3,
    expiration_date: "2026-03-01"
  }
]
```

### Recipe
```javascript
// localStorage
{
  id: "recipe1",
  name: "Pasta",
  servings: 4,
  photo: "https://...",
  instructions: "Cook pasta...",
  ingredients: [
    { name: "Pasta", qty: 1, unit: "lb" }
  ]
}

// Supabase (perfect match!)
{
  id: "recipe1",
  household_id: "user-household-id",
  name: "Pasta",
  servings: 4,
  image_url: "https://...",
  instructions: "Cook pasta...",
  ingredients: [              -- JSONB
    { name: "Pasta", qty: 1, unit: "lb" }
  ]
}
```

### Meal Plan
```javascript
// localStorage
{
  "2026-01-08": [
    {
      id: "meal1",
      recipeId: "recipe1",
      mealType: "Dinner",
      cooked: false
    }
  ]
}

// Supabase
{
  id: "meal1",
  household_id: "user-household-id",
  date: "2026-01-08",
  recipe_id: "recipe1",
  meal_type: "Dinner",
  is_cooked: false
}
```

---

## Next Steps

### Phase 2B.1: Schema Enhancement (30 min)
1. ✅ Run schema enhancement SQL in Supabase
2. ✅ Verify tables created
3. ✅ Apply RLS policies

### Phase 2B.2: Authentication (2-3 hours)
1. Install Supabase JS client
2. Build sign-in/sign-up UI (already designed!)
3. Session management
4. Auto-create household on first sign-up

### Phase 2B.3: Data Sync Layer (4-6 hours)
1. Replace `localStorage.getItem()` with Supabase queries
2. Replace `localStorage.setItem()` with Supabase inserts/updates
3. Handle multi-location pantry reads/writes
4. JSONB handling for recipes

### Phase 2B.4: Migration Tool (2 hours)
1. Detect localStorage data on first login
2. Prompt: "Import your existing data?"
3. Bulk insert into user's household
4. Clear localStorage after success

### Phase 2B.5: Realtime Subscriptions (2 hours)
1. Subscribe to table changes
2. Update UI when other household members make changes
3. Conflict resolution (last-write-wins)

---

## Decision Points - YOUR INPUT NEEDED

### 1. Multi-Location Support
**Question:** Keep multi-location pantry (Fridge/Freezer/etc)?

**Option A:** Yes - requires adding `pantry_locations` table ✅ (Recommended)
**Option B:** No - flatten to single location (lose feature)

**My recommendation:** Keep it. It's your app's best feature.

---

### 2. Old Data Migration
**Question:** Migrate data from old kitchen site?

**Option A:** Yes - import old recipes/pantry into new household
**Option B:** No - fresh start, archive old data
**Option C:** Provide export/import tool for manual migration

**My recommendation:** Option C - Give users a CSV export from old site, import to new.

---

### 3. Household Sharing Timeline
**Question:** Enable multi-user households now or later?

**Option A:** Now - full household support from day 1
**Option B:** Later - single-user first, add sharing in Phase 3

**My recommendation:** Option A - Schema already supports it, minimal extra work.

---

### 4. Shopping List Storage
**Question:** Save shopping list to database?

**Current:** Shopping list is auto-generated, not stored
**Option A:** Store in database - persist across sessions
**Option B:** Keep auto-generated - always fresh, no stale data

**My recommendation:** Option B - Auto-generated is cleaner, always accurate.

---

## Ready to Proceed?

**Quick wins we can do RIGHT NOW:**
1. Run schema enhancement SQL (5 min)
2. Install Supabase client (2 min)
3. Build authentication UI (30 min)

**Then:**
4. Replace localStorage with Supabase (4-6 hours)
5. Test multi-user sync (1 hour)
6. Deploy! 🚀

---

Let me know:
- ✅ Approve multi-location pantry support?
- ✅ Approve household sharing from day 1?
- ✅ Start with schema enhancements?
- Any concerns about the migration strategy?

I'm ready to start coding as soon as you give the green light! 🎯
