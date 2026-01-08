# Phase 2.0 Implementation Roadmap

## Overview

This document breaks down Phase 2.0 into actionable work packages with time estimates and dependencies.

---

## PHASE 2A: UI/UX Fixes (1-2 days)
**Goal:** Fix existing layout issues and improve organization

### Task 2A.1: Content Spacing Fix (30 min)
**Files:** `style.css`

```css
/* Fix .main-content spacing */
.main-content {
  margin-left: 360px;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

@media (max-width: 1024px) {
  .main-content {
    margin-left: 0;
    padding: 1rem;
  }
}
```

**Test:** Verify spacing matches on both sides

---

### Task 2A.2: Shopping Sidebar Height Fix (15 min)
**Files:** `style.css`

```css
/* Fix fixed height */
.shopping-sidebar {
  height: 100vh; /* was: 980px */
  overflow-y: auto;
}

.shopping-list {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 250px);
}
```

**Test:** Scroll shopping list on various screen sizes

---

### Task 2A.3: Search & Filter (2-3 hours)
**Files:** `index.html`, `app.js`, `style.css`

**Add to HTML:**
```html
<div class="pantry-toolbar">
  <input type="text" id="pantry-search" placeholder="🔍 Search pantry...">
  <select id="filter-category">...</select>
  <select id="sort-pantry">
    <option value="alpha">A-Z</option>
    <option value="lowStock">Low Stock First</option>
    <option value="expiring">Expiring Soon</option>
  </select>
</div>
```

**Add to app.js:**
```javascript
function filterPantry(searchTerm, category, sortBy) {
  let filtered = pantryData;

  // Search filter
  if (searchTerm) {
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Category filter (already exists)
  if (category) {
    filtered = filtered.filter(item => item.category === category);
  }

  // Sort
  if (sortBy === 'lowStock') {
    filtered.sort((a, b) => {
      const aRatio = a.totalQty / a.min;
      const bRatio = b.totalQty / b.min;
      return aRatio - bRatio;
    });
  } else if (sortBy === 'expiring') {
    filtered.sort((a, b) => {
      const aExpiry = getEarliestExpiry(a);
      const bExpiry = getEarliestExpiry(b);
      return aExpiry - bExpiry;
    });
  }

  renderPantryList(filtered);
}
```

**Test:** Search, filter, and sort combinations

---

### Task 2A.4: Collapsible Categories (3-4 hours)
**Files:** `app.js`, `style.css`

**Structure:**
```javascript
function renderPantryByCategory() {
  const categories = ['Meat', 'Dairy', 'Produce', 'Pantry', 'Frozen', 'Spices', 'Other'];
  const grouped = groupByCategory(filteredPantry);

  categories.forEach(cat => {
    const items = grouped[cat] || [];
    const lowStockCount = items.filter(i => i.totalQty < i.min).length;
    const expiringCount = items.filter(i => isExpiringSoon(i)).length;

    renderCategoryHeader(cat, items.length, lowStockCount, expiringCount);
    renderCategoryItems(cat, items, collapsed);
  });
}

function toggleCategory(categoryName) {
  const isCollapsed = categoryStates[categoryName];
  categoryStates[categoryName] = !isCollapsed;
  renderPantryByCategory();
}
```

**CSS:**
```css
.category-header {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  cursor: pointer;
  background: rgba(248,244,235,0.6);
  border-radius: 12px;
  margin-bottom: 0.5rem;
}

.category-header:hover {
  background: rgba(248,244,235,0.9);
}

.category-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.category-items.collapsed {
  display: none;
}
```

**Test:** Expand/collapse, search auto-expands matching categories

---

### Task 2A.5: Smart Shopping Input (2 hours)
**Files:** `app.js`

**Parser:**
```javascript
function parseQuickAdd(input) {
  // "2 lbs chicken" → {qty: 2, unit: "lbs", name: "chicken"}
  // "chicken" → {name: "chicken"} (open modal for details)

  const pattern = /^(\d+\.?\d*)\s+(\w+)\s+(.+)$/;
  const match = input.match(pattern);

  if (match) {
    return {
      qty: parseFloat(match[1]),
      unit: match[2],
      name: match[3].trim()
    };
  } else {
    return { name: input.trim() };
  }
}

document.getElementById('user-item-name').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const input = e.target.value;
    const parsed = parseQuickAdd(input);

    if (parsed.qty && parsed.unit) {
      // Quick add
      addShoppingItem(parsed.name, parsed.qty, parsed.unit, 'Custom');
      e.target.value = '';
    } else {
      // Open modal for full details
      openShoppingItemModal(parsed.name);
    }
  }
});
```

**Test:** Various inputs (with/without qty, different units)

---

## PHASE 2B: Supabase Setup (3-4 hours)
**Goal:** Create Supabase project and schema

### Task 2B.1: Create Supabase Project (15 min)
1. Go to supabase.com
2. Create new project: "chefs-kiss"
3. Note connection strings
4. Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### Task 2B.2: Run SQL Schema (30 min)
**File:** `PHASE_2_PLANNING.md` (SQL section)

1. Open Supabase SQL Editor
2. Copy/paste full SQL schema
3. Execute
4. Verify tables created
5. Test RLS policies

---

### Task 2B.3: Create Storage Bucket (15 min)
1. Go to Storage in Supabase dashboard
2. Create bucket: `recipe-photos`
3. Set public access policies:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload recipe photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recipe-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read
CREATE POLICY "Anyone can view recipe photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-photos');
```

---

### Task 2B.4: Install Supabase Client (10 min)
**Terminal:**
```bash
npm install @supabase/supabase-js
```

**Create:** `supabase.js`
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## PHASE 2C: Authentication (4-5 hours)
**Goal:** Add login/signup functionality

### Task 2C.1: Auth UI Components (2 hours)
**Files:** `index.html`, `auth.js`, `style.css`

**HTML:**
```html
<!-- Auth Modal -->
<div id="auth-modal" class="modal-overlay" style="display: none;">
  <div class="modal-card">
    <h2>Sign In</h2>
    <form id="auth-form">
      <input type="email" id="auth-email" placeholder="Email" required>
      <input type="password" id="auth-password" placeholder="Password" required>
      <button type="submit" class="btn btn-primary">Sign In</button>
      <button type="button" id="toggle-signup" class="btn btn-secondary">
        Create Account
      </button>
    </form>
  </div>
</div>
```

**JavaScript:** `auth.js`
```javascript
import { supabase } from './supabase.js';

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
```

**Test:** Sign up, sign in, sign out flows

---

### Task 2C.2: Protected Routes (1 hour)
**File:** `app.js`

```javascript
let currentUser = null;

// On page load
onAuthStateChange((event, session) => {
  currentUser = session?.user || null;

  if (currentUser) {
    // Logged in - load user data from Supabase
    loadUserData();
    updateUI('authenticated');
  } else {
    // Not logged in - use localStorage (read-only)
    loadLocalData();
    updateUI('guest');
  }
});

function updateUI(mode) {
  const signInBtn = document.getElementById('btn-signin');

  if (mode === 'authenticated') {
    signInBtn.textContent = '👋';
    signInBtn.title = 'Account';
    // Enable all features
  } else {
    signInBtn.textContent = '👤';
    signInBtn.title = 'Sign In (sync your data)';
    // Show banner: "Sign in to sync across devices"
  }
}
```

**Test:** Login/logout flow, UI changes

---

### Task 2C.3: Migration Prompt (1 hour)
**Feature:** When user signs in for first time, prompt to migrate localStorage data

```javascript
async function migrateLocalDataToSupabase() {
  const localPantry = JSON.parse(localStorage.getItem('pantry') || '[]');
  const localRecipes = JSON.parse(localStorage.getItem('recipes') || '[]');
  const localPlanner = JSON.parse(localStorage.getItem('planner') || '{}');

  // Show modal
  const shouldMigrate = await showMigrationModal(
    `Found ${localPantry.length} pantry items and ${localRecipes.length} recipes. Import to your account?`
  );

  if (shouldMigrate) {
    await batchInsertPantry(localPantry);
    await batchInsertRecipes(localRecipes);
    await batchInsertPlanner(localPlanner);
    // Clear localStorage after successful migration
  }
}
```

---

## PHASE 2D: Data Sync Layer (6-8 hours)
**Goal:** Replace localStorage with Supabase

### Task 2D.1: Pantry CRUD (2 hours)
**File:** `db.js`

```javascript
// CREATE
export async function addPantryItem(item) {
  const { data, error } = await supabase
    .from('pantry_items')
    .insert({
      name: item.name,
      unit: item.unit,
      category_id: await getCategoryId(item.category),
      min_threshold: item.min,
      notes: item.notes
    })
    .select()
    .single();

  if (error) throw error;

  // Add locations
  for (const loc of item.locations) {
    await addPantryLocation(data.id, loc);
  }

  return data;
}

// READ
export async function getPantryItems() {
  const { data, error } = await supabase
    .from('pantry_items')
    .select(`
      *,
      category:categories(name),
      locations:pantry_locations(*)
    `);

  if (error) throw error;
  return transformPantryData(data);
}

// UPDATE
export async function updatePantryItem(id, updates) {
  const { data, error } = await supabase
    .from('pantry_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// DELETE
export async function deletePantryItem(id) {
  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

**Test:** Add/edit/delete pantry items, verify in Supabase dashboard

---

### Task 2D.2: Recipes CRUD (2 hours)
**File:** `db.js`

```javascript
export async function addRecipe(recipe) {
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      name: recipe.name,
      servings: recipe.servings,
      photo_url: recipe.photo, // Will change to upload
      instructions: recipe.instructions
    })
    .select()
    .single();

  if (error) throw error;

  // Add ingredients
  for (const ing of recipe.ingredients) {
    await addRecipeIngredient(data.id, ing);
  }

  return data;
}

export async function getRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      ingredients:recipe_ingredients(*)
    `);

  if (error) throw error;
  return transformRecipeData(data);
}
```

---

### Task 2D.3: Meal Planner & Shopping (2 hours)
Similar CRUD operations for meal plans and shopping items

---

### Task 2D.4: Realtime Subscriptions (2 hours)
**File:** `realtime.js`

```javascript
export function subscribeToPantryChanges(callback) {
  return supabase
    .channel('pantry-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'pantry_items'
    }, payload => {
      callback(payload);
    })
    .subscribe();
}

// In app.js
subscribeToPantryChanges((payload) => {
  console.log('Pantry changed:', payload);
  refreshPantryDisplay();
});
```

**Test:** Open 2 browser windows, edit in one, see update in other

---

## PHASE 2E: Photo Upload (2-3 hours)
**Goal:** Replace URL input with file upload

### Task 2E.1: File Upload UI (1 hour)
**HTML:**
```html
<!-- BEFORE -->
<input type="url" id="recipe-photo" placeholder="Photo URL">

<!-- AFTER -->
<div class="photo-upload">
  <input type="file" id="recipe-photo" accept="image/*" style="display:none;">
  <button type="button" onclick="document.getElementById('recipe-photo').click()">
    📷 Upload Photo
  </button>
  <div id="photo-preview"></div>
</div>
```

---

### Task 2E.2: Upload to Supabase Storage (1-2 hours)
**File:** `storage.js`

```javascript
export async function uploadRecipePhoto(file, recipeId) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${recipeId}/${Date.now()}.${fileExt}`;
  const filePath = `${currentUser.id}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('recipe-photos')
    .upload(filePath, file);

  if (error) throw error;

  // Get public URL
  const { data: publicUrl } = supabase.storage
    .from('recipe-photos')
    .getPublicUrl(filePath);

  return publicUrl.publicUrl;
}
```

**Usage:**
```javascript
const photoFile = document.getElementById('recipe-photo').files[0];
if (photoFile) {
  const photoUrl = await uploadRecipePhoto(photoFile, recipe.id);
  recipe.photo_url = photoUrl;
}
```

**Test:** Upload image, verify appears in recipe card

---

## PHASE 2F: Bulk Add Features (3-5 hours)
**Goal:** Make onboarding easier

### Task 2F.1: Pantry Templates (2 hours)
**File:** `templates.js`

```javascript
const templates = {
  basic: [
    { name: 'Salt', unit: 'oz', category: 'Spices', min: 8 },
    { name: 'Pepper', unit: 'oz', category: 'Spices', min: 4 },
    { name: 'Olive Oil', unit: 'oz', category: 'Pantry', min: 16 },
    // ... 20 items
  ],
  vegetarian: [ /* 30 items */ ],
  fullKitchen: [ /* 100 items */ ]
};

export async function applyTemplate(templateName) {
  const items = templates[templateName];
  for (const item of items) {
    await addPantryItem(item);
  }
}
```

**UI:**
```html
<div id="onboarding-modal">
  <h2>Quick Start</h2>
  <p>Start with a template or build from scratch?</p>
  <button onclick="applyTemplate('basic')">Basic Kitchen (20 items)</button>
  <button onclick="applyTemplate('vegetarian')">Vegetarian (30 items)</button>
  <button onclick="applyTemplate('fullKitchen')">Full Kitchen (100 items)</button>
  <button onclick="closeOnboarding()">Start Empty</button>
</div>
```

---

### Task 2F.2: CSV Import (2-3 hours)
**File:** `import.js`

```javascript
export function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const item = {};
    headers.forEach((header, index) => {
      item[header.trim()] = values[index]?.trim();
    });
    items.push(item);
  }

  return items;
}

export async function importCSV(file) {
  const text = await file.text();
  const items = parseCSV(text);

  // Show preview modal
  const confirmed = await showImportPreview(items);

  if (confirmed) {
    for (const item of items) {
      await addPantryItem(item);
    }
  }
}
```

**CSV Format:**
```csv
name,quantity,unit,location,category
Chicken,2,lbs,Freezer,Meat
Milk,1,gallon,Fridge,Dairy
```

---

## PHASE 2G: Multi-User Sync (Optional - 4-6 hours)
**Goal:** Household sharing

### Task 2G.1: Household Management
- Create household
- Invite members (email)
- Accept invite
- Share pantry/recipes

### Task 2G.2: RLS Updates
- Modify policies to check household membership
- Allow read/write access to household data

---

## Testing Checklist

### Functionality
- [ ] User can sign up
- [ ] User can sign in
- [ ] User can sign out
- [ ] Pantry items sync to Supabase
- [ ] Recipes sync to Supabase
- [ ] Meal plans sync to Supabase
- [ ] Shopping list syncs to Supabase
- [ ] Photos upload to Storage
- [ ] Realtime updates work across tabs
- [ ] Search filters pantry
- [ ] Categories collapse/expand
- [ ] Smart shopping input parses correctly
- [ ] CSV import works
- [ ] Templates apply correctly

### Cross-Browser
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari
- [ ] Mobile Chrome

### Responsive
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

---

## Rollout Plan

### Week 1: UI/UX Fixes (Phase 2A)
- Fix spacing issues
- Add search & filters
- Test on all devices

### Week 2: Supabase Setup + Auth (Phase 2B + 2C)
- Create project
- Run schema
- Build auth flows
- Test login/logout

### Week 3: Data Migration (Phase 2D)
- Replace localStorage with Supabase
- Add realtime sync
- Test across browsers

### Week 4: Photos + Bulk Add (Phase 2E + 2F)
- File upload UI
- Storage integration
- Templates
- CSV import

### Week 5: Polish & Testing
- Bug fixes
- Performance optimization
- User acceptance testing

### Week 6: Launch
- Deploy to production
- Monitor errors
- Collect feedback

---

## Success Metrics

### Technical
- [ ] 100% localStorage replaced with Supabase
- [ ] <100ms query response time
- [ ] Realtime updates within 1 second
- [ ] Zero data loss during sync

### User Experience
- [ ] <30 seconds to sign up
- [ ] <1 minute to import 20+ items
- [ ] Search returns results instantly
- [ ] Mobile modals scroll smoothly

---

## Questions to Answer

1. **Do you want to start with Phase 2A (UI fixes) now?**
   - Quick wins, visible improvements
   - No database changes needed
   - 1-2 days of work

2. **Should we implement multi-user sync (Phase 2G) in this phase?**
   - Adds complexity
   - But enables household sharing (your goal)
   - Recommend: Add later after testing single-user

3. **Bulk add priority: Templates or CSV first?**
   - Templates = easier for users
   - CSV = better for migration
   - Recommend: Both, templates first

4. **Timeline constraints?**
   - Full Phase 2 = 3-4 weeks
   - Can prioritize specific features
   - What's your deadline?

---

## Next Steps

Once you approve the plan, I'll:

1. ✅ Fix UI/UX issues (Phase 2A)
2. ✅ Set up Supabase project (Phase 2B)
3. ✅ Build authentication (Phase 2C)
4. ✅ Migrate data layer (Phase 2D)
5. ✅ Add photo upload (Phase 2E)
6. ✅ Implement bulk add (Phase 2F)

**Ready to start?** Let me know which phase to begin with! 🚀
