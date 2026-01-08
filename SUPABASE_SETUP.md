# Supabase Setup Guide

## 🚀 Phase 2B: Ready to Connect!

All the foundation is in place. Follow these steps to activate Supabase integration:

---

## Step 1: Run Schema Enhancements (5 minutes)

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New query**
4. Open the file: `supabase-schema-enhancements.sql`
5. Copy the entire contents
6. Paste into the SQL editor
7. Click **Run** (or press Ctrl/Cmd + Enter)

**Expected result:**
```
✅ Schema enhancements completed successfully!

Table summary:
pantry_items - 12 columns
pantry_locations - 6 columns
recipes - 12 columns
meal_plans - 9 columns
shopping_list_custom - 9 columns
households - 4 columns
household_members - 5 columns
```

---

## Step 2: Get Your Supabase Credentials (2 minutes)

1. In your Supabase dashboard, go to **Project Settings** (⚙️ icon, bottom left)
2. Click **API** in the sidebar
3. You'll see two values:

### Project URL
```
https://xxxxxxxxxxxxxxxx.supabase.co
```
Copy this!

### API Keys
Find the **anon/public** key:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
```
Copy this! (It's safe to use in the browser - RLS protects your data)

⚠️ **DO NOT copy the `service_role` key!** That's your admin key and should never be in browser code.

---

## Step 3: Configure Your App (1 minute)

1. Open `supabase-config.js` in your code editor
2. Replace the placeholder values:

**Before:**
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

**After:**
```javascript
const SUPABASE_URL = 'https://yourproject.supabase.co';  // Your actual URL
const SUPABASE_ANON_KEY = 'eyJhbGci...';  // Your actual anon key
```

3. Save the file

---

## Step 4: Test the Connection (1 minute)

1. Open your app in a browser (or refresh if already open)
2. Open the browser console (F12 or Cmd+Option+I)
3. Look for:
```
✅ Supabase client initialized
```

If you see:
```
⚠️ Supabase not configured
```
Go back to Step 3 and check your credentials.

---

## What's Been Set Up?

### ✅ Database Schema
- **Multi-location pantry** - Track items in Fridge, Freezer, etc.
- **Shopping list** - Auto-generated + custom persistent items
- **Recipes** - With JSONB ingredients
- **Meal plans** - With meal types and cooked status
- **Households** - Multi-user sharing ready
- **Row Level Security** - Data protected by user/household

### ✅ Helper Functions
- `create_household_for_user()` - Auto-creates household on signup
- `get_user_household_id()` - Gets user's household
- Automatic `updated_at` triggers on all tables

### ✅ Realtime Sync
Enabled on:
- pantry_items
- pantry_locations
- recipes
- meal_plans
- shopping_list_custom

When one user makes a change, all household members see it instantly! 🎉

---

## Shopping List Behavior

Your custom additions are now persistent!

**Auto-Generated Items** (always fresh):
- Items below threshold
- Items needed for planned meals
- Expired items

**Custom Items** (stored in database):
- Manual additions via "Add item..." button
- Persist across sessions
- Stay until you checkout

**On Checkout:**
- Checked items are deleted
- Unchecked items remain for next trip

---

## Next Steps

Once you've completed Steps 1-4 above, let me know and I'll:

1. ✅ Implement authentication (sign-up/sign-in)
2. ✅ Replace localStorage with Supabase
3. ✅ Add realtime multi-user sync
4. ✅ Test household sharing

---

## Troubleshooting

### SQL Error: "relation already exists"
**Solution:** Some tables already exist from your old kitchen site. This is fine! The SQL uses `CREATE TABLE IF NOT EXISTS` so it won't overwrite existing tables, just add what's missing.

### Console: "Supabase not configured"
**Solution:** Double-check your `supabase-config.js` file:
- Make sure quotes are correct
- No extra spaces
- Full URL including `https://`
- Complete anon key (it's very long!)

### Can't find SQL Editor
**Solution:** It's in the left sidebar of your Supabase dashboard. Look for the icon that looks like `<>` or says "SQL Editor"

---

## Questions?

Let me know when you've completed the setup and I'll continue with authentication! 🚀
