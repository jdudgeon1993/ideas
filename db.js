/* ---------------------------------------------------
   DATABASE MODULE
   Handles all Supabase database operations
--------------------------------------------------- */

/* ---------------------------------------------------
   PANTRY OPERATIONS
--------------------------------------------------- */

/**
 * Load all pantry items for current household
 */
async function loadPantryItems() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Not authenticated - using localStorage');
    return null;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return null;
  }

  try {
    // Load pantry items with their locations
    const { data: items, error: itemsError } = await window.supabaseClient
      .from('pantry_items')
      .select('*')
      .eq('household_id', householdId);

    if (itemsError) throw itemsError;

    // Load all locations for these items
    const { data: locations, error: locationsError } = await window.supabaseClient
      .from('pantry_locations')
      .select('*')
      .in('pantry_item_id', items.map(item => item.id));

    if (locationsError) throw locationsError;

    // Combine items with their locations
    const pantryData = items.map(item => {
      const itemLocations = locations
        .filter(loc => loc.pantry_item_id === item.id)
        .map(loc => ({
          id: loc.id,
          location: loc.location_name,
          qty: Number(loc.quantity) || 0,
          expiry: loc.expiration_date || ''
        }));

      const totalQty = itemLocations.reduce((sum, loc) => sum + loc.qty, 0);

      return {
        id: item.id,
        name: item.name,
        unit: item.unit || 'pcs',
        category: item.category || 'Other',
        min: Number(item.min_threshold) || 0,
        locations: itemLocations,
        totalQty: totalQty,
        notes: item.notes || ''
      };
    });

    console.log(`📥 Loaded ${pantryData.length} pantry items from database`);
    return pantryData;

  } catch (err) {
    console.error('Error loading pantry items:', err);
    return null;
  }
}

/**
 * Save a pantry item (create or update)
 */
async function savePantryItem(item) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return false;
  }

  try {
    // Prepare pantry item data
    const itemData = {
      id: item.id,
      household_id: householdId,
      name: item.name,
      unit: item.unit || 'pcs',
      category: item.category || 'Other',
      min_threshold: item.min || 0,
      notes: item.notes || ''
    };

    // Upsert pantry item
    const { data: savedItem, error: itemError } = await window.supabaseClient
      .from('pantry_items')
      .upsert(itemData)
      .select()
      .single();

    if (itemError) throw itemError;

    // Delete existing locations for this item
    const { error: deleteError } = await window.supabaseClient
      .from('pantry_locations')
      .delete()
      .eq('pantry_item_id', savedItem.id);

    if (deleteError) throw deleteError;

    // Insert new locations
    if (item.locations && item.locations.length > 0) {
      const locationData = item.locations.map(loc => ({
        id: loc.id,
        pantry_item_id: savedItem.id,
        location_name: loc.location,
        quantity: loc.qty || 0,
        expiration_date: loc.expiry || null
      }));

      const { error: locationsError } = await window.supabaseClient
        .from('pantry_locations')
        .insert(locationData);

      if (locationsError) throw locationsError;
    }

    console.log('✅ Saved pantry item:', item.name);
    return true;

  } catch (err) {
    console.error('Error saving pantry item:', err);
    return false;
  }
}

/**
 * Delete a pantry item
 */
async function deletePantryItem(itemId) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  try {
    // Delete pantry item (cascade will delete locations)
    const { error } = await window.supabaseClient
      .from('pantry_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    console.log('✅ Deleted pantry item:', itemId);
    return true;

  } catch (err) {
    console.error('Error deleting pantry item:', err);
    return false;
  }
}

/* ---------------------------------------------------
   RECIPE OPERATIONS
--------------------------------------------------- */

/**
 * Load all recipes for current household
 */
async function loadRecipes() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Not authenticated - using localStorage');
    return null;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return null;
  }

  try {
    const { data: recipes, error } = await window.supabaseClient
      .from('recipes')
      .select('*')
      .eq('household_id', householdId);

    if (error) throw error;

    // Transform to app format
    const recipesData = recipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      servings: recipe.servings || 0,
      photo: recipe.photo || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || '',
      notes: recipe.notes || '',
      tags: recipe.tags || [],
      isFavorite: recipe.is_favorite || false
    }));

    console.log(`📥 Loaded ${recipesData.length} recipes from database`);
    return recipesData;

  } catch (err) {
    console.error('Error loading recipes:', err);
    return null;
  }
}

/**
 * Save a recipe (create or update)
 */
async function saveRecipe(recipe) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return false;
  }

  try {
    const recipeData = {
      id: recipe.id,
      household_id: householdId,
      name: recipe.name,
      servings: recipe.servings || 0,
      photo: recipe.photo || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || '',
      notes: recipe.notes || '',
      tags: recipe.tags || [],
      is_favorite: recipe.isFavorite || false
    };

    const { error } = await window.supabaseClient
      .from('recipes')
      .upsert(recipeData);

    if (error) throw error;

    console.log('✅ Saved recipe:', recipe.name);
    return true;

  } catch (err) {
    console.error('Error saving recipe:', err);
    return false;
  }
}

/**
 * Delete a recipe
 */
async function deleteRecipe(recipeId) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  try {
    const { error } = await window.supabaseClient
      .from('recipes')
      .delete()
      .eq('id', recipeId);

    if (error) throw error;

    console.log('✅ Deleted recipe:', recipeId);
    return true;

  } catch (err) {
    console.error('Error deleting recipe:', err);
    return false;
  }
}

/* ---------------------------------------------------
   MEAL PLAN OPERATIONS
--------------------------------------------------- */

/**
 * Load all meal plans for current household
 */
async function loadMealPlans() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Not authenticated - using localStorage');
    return null;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return null;
  }

  try {
    const { data: mealPlans, error } = await window.supabaseClient
      .from('meal_plans')
      .select('*')
      .eq('household_id', householdId);

    if (error) throw error;

    // Transform to app format (grouped by date)
    const plannerData = {};
    mealPlans.forEach(plan => {
      const dateStr = plan.planned_date;
      if (!plannerData[dateStr]) {
        plannerData[dateStr] = [];
      }
      plannerData[dateStr].push({
        id: plan.id,
        recipeId: plan.recipe_id,
        mealType: plan.meal_type || 'Dinner',
        cooked: plan.is_cooked || false
      });
    });

    console.log(`📥 Loaded ${mealPlans.length} meal plans from database`);
    return plannerData;

  } catch (err) {
    console.error('Error loading meal plans:', err);
    return null;
  }
}

/**
 * Save meal plans for a specific date
 */
async function saveMealPlansForDate(dateStr, meals) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return false;
  }

  try {
    // Delete existing meal plans for this date
    const { error: deleteError } = await window.supabaseClient
      .from('meal_plans')
      .delete()
      .eq('household_id', householdId)
      .eq('planned_date', dateStr);

    if (deleteError) throw deleteError;

    // Insert new meal plans
    if (meals && meals.length > 0) {
      const mealData = meals.map(meal => ({
        id: meal.id,
        household_id: householdId,
        planned_date: dateStr,
        recipe_id: meal.recipeId,
        meal_type: meal.mealType || 'Dinner',
        is_cooked: meal.cooked || false
      }));

      const { error: insertError } = await window.supabaseClient
        .from('meal_plans')
        .insert(mealData);

      if (insertError) throw insertError;
    }

    console.log('✅ Saved meal plans for:', dateStr);
    return true;

  } catch (err) {
    console.error('Error saving meal plans:', err);
    return false;
  }
}

/**
 * Delete a specific meal plan
 */
async function deleteMealPlan(mealId) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  try {
    const { error } = await window.supabaseClient
      .from('meal_plans')
      .delete()
      .eq('id', mealId);

    if (error) throw error;

    console.log('✅ Deleted meal plan:', mealId);
    return true;

  } catch (err) {
    console.error('Error deleting meal plan:', err);
    return false;
  }
}

/* ---------------------------------------------------
   SHOPPING LIST OPERATIONS
--------------------------------------------------- */

/**
 * Load custom shopping list items for current household
 */
async function loadShoppingList() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Not authenticated - using localStorage');
    return null;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return null;
  }

  try {
    const { data: items, error } = await window.supabaseClient
      .from('shopping_list_custom')
      .select('*')
      .eq('household_id', householdId);

    if (error) throw error;

    // Transform to app format
    const shoppingData = items.map(item => ({
      id: item.id,
      name: item.name,
      qty: Number(item.quantity) || 0,
      unit: item.unit || 'pcs',
      checked: item.checked || false,
      isCustom: true  // Mark as custom item
    }));

    console.log(`📥 Loaded ${shoppingData.length} custom shopping items from database`);
    return shoppingData;

  } catch (err) {
    console.error('Error loading shopping list:', err);
    return null;
  }
}

/**
 * Save a custom shopping list item
 */
async function saveShoppingItem(item) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return false;
  }

  try {
    const itemData = {
      id: item.id,
      household_id: householdId,
      name: item.name,
      quantity: item.qty || 0,
      unit: item.unit || 'pcs',
      checked: item.checked || false
    };

    const { error } = await window.supabaseClient
      .from('shopping_list_custom')
      .upsert(itemData);

    if (error) throw error;

    console.log('✅ Saved shopping item:', item.name);
    return true;

  } catch (err) {
    console.error('Error saving shopping item:', err);
    return false;
  }
}

/**
 * Delete checked shopping items (checkout operation)
 */
async function deleteCheckedShoppingItems() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return false;
  }

  try {
    const { error } = await window.supabaseClient
      .from('shopping_list_custom')
      .delete()
      .eq('household_id', householdId)
      .eq('checked', true);

    if (error) throw error;

    console.log('✅ Deleted checked shopping items');
    return true;

  } catch (err) {
    console.error('Error deleting checked shopping items:', err);
    return false;
  }
}

/* ---------------------------------------------------
   SYNC OPERATIONS
--------------------------------------------------- */

/**
 * Sync all data to database
 */
async function syncAllData(pantry, recipes, planner, customShoppingItems) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Not authenticated - skipping sync');
    return false;
  }

  console.log('🔄 Syncing all data to database...');

  try {
    // Sync pantry items
    for (const item of pantry) {
      await savePantryItem(item);
    }

    // Sync recipes
    for (const recipe of recipes) {
      await saveRecipe(recipe);
    }

    // Sync meal plans
    for (const [dateStr, meals] of Object.entries(planner)) {
      await saveMealPlansForDate(dateStr, meals);
    }

    // Sync custom shopping items
    if (customShoppingItems && customShoppingItems.length > 0) {
      for (const item of customShoppingItems) {
        await saveShoppingItem(item);
      }
    }

    console.log('✅ All data synced to database');
    return true;

  } catch (err) {
    console.error('Error syncing data:', err);
    return false;
  }
}

/* ---------------------------------------------------
   STORAGE LOCATIONS OPERATIONS
--------------------------------------------------- */

/**
 * Load all storage locations for current household
 */
async function loadStorageLocations() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Not authenticated - returning default locations');
    return ['Pantry', 'Fridge', 'Freezer', 'Cellar', 'Other'];
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return ['Pantry', 'Fridge', 'Freezer', 'Cellar', 'Other'];
  }

  try {
    const { data: locations, error } = await window.supabaseClient
      .from('storage_locations')
      .select('*')
      .eq('household_id', householdId)
      .order('name');

    if (error) throw error;

    console.log(`📥 Loaded ${locations.length} storage locations from database`);
    return locations.map(loc => loc.name);

  } catch (err) {
    console.error('Error loading storage locations:', err);
    return ['Pantry', 'Fridge', 'Freezer', 'Cellar', 'Other'];
  }
}

/**
 * Load all storage location objects (with IDs and is_default flag)
 */
async function loadStorageLocationObjects() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return [];
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    return [];
  }

  try {
    const { data: locations, error } = await window.supabaseClient
      .from('storage_locations')
      .select('*')
      .eq('household_id', householdId)
      .order('name');

    if (error) throw error;

    return locations;

  } catch (err) {
    console.error('Error loading storage location objects:', err);
    return [];
  }
}

/**
 * Add a new storage location
 */
async function addStorageLocation(name) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return false;
  }

  try {
    const { error } = await window.supabaseClient
      .from('storage_locations')
      .insert({
        household_id: householdId,
        name: name,
        is_default: false
      });

    if (error) throw error;

    console.log('✅ Added storage location:', name);
    return true;

  } catch (err) {
    console.error('Error adding storage location:', err);
    return false;
  }
}

/**
 * Remove a storage location (only if not default)
 */
async function removeStorageLocation(locationId, isDefault) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  if (isDefault) {
    console.warn('Cannot remove default storage location');
    return false;
  }

  try {
    const { error } = await window.supabaseClient
      .from('storage_locations')
      .delete()
      .eq('id', locationId);

    if (error) throw error;

    console.log('✅ Removed storage location:', locationId);
    return true;

  } catch (err) {
    console.error('Error removing storage location:', err);
    return false;
  }
}

/* ---------------------------------------------------
   CATEGORIES OPERATIONS
--------------------------------------------------- */

/**
 * Load all categories for current household
 */
async function loadCategories() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Not authenticated - returning default categories');
    return ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Spices', 'Bakery', 'Beverages', 'Other'];
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Spices', 'Bakery', 'Beverages', 'Other'];
  }

  try {
    const { data: categories, error } = await window.supabaseClient
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .order('name');

    if (error) throw error;

    console.log(`📥 Loaded ${categories.length} categories from database`);
    return categories.map(cat => cat.name);

  } catch (err) {
    console.error('Error loading categories:', err);
    return ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Spices', 'Bakery', 'Beverages', 'Other'];
  }
}

/**
 * Load all category objects (with IDs, emojis, and is_default flag)
 */
async function loadCategoryObjects() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return [];
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    return [];
  }

  try {
    const { data: categories, error } = await window.supabaseClient
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .order('name');

    if (error) throw error;

    return categories;

  } catch (err) {
    console.error('Error loading category objects:', err);
    return [];
  }
}

/**
 * Add a new category
 */
async function addCategory(name, emoji = '📦') {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return false;
  }

  try {
    const { error } = await window.supabaseClient
      .from('categories')
      .insert({
        household_id: householdId,
        name: name,
        emoji: emoji,
        is_default: false
      });

    if (error) throw error;

    console.log('✅ Added category:', name);
    return true;

  } catch (err) {
    console.error('Error adding category:', err);
    return false;
  }
}

/**
 * Remove a category (only if not default)
 */
async function removeCategory(categoryId, isDefault) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  if (isDefault) {
    console.warn('Cannot remove default category');
    return false;
  }

  try {
    const { error } = await window.supabaseClient
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;

    console.log('✅ Removed category:', categoryId);
    return true;

  } catch (err) {
    console.error('Error removing category:', err);
    return false;
  }
}

/* ---------------------------------------------------
   HOUSEHOLD MANAGEMENT OPERATIONS
--------------------------------------------------- */

/**
 * Load all members of current household with their email addresses
 */
async function loadHouseholdMembers() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return [];
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return [];
  }

  try {
    const { data: members, error } = await window.supabaseClient
      .from('household_members')
      .select('id, user_id, role, created_at')
      .eq('household_id', householdId)
      .order('created_at');

    if (error) throw error;

    // Show current user's email, others show as role
    const currentUserId = window.auth.getCurrentUser()?.id;
    const currentUserEmail = window.auth.getCurrentUser()?.email;

    const enrichedMembers = members.map(member => ({
      ...member,
      email: member.user_id === currentUserId ? currentUserEmail : `Household ${member.role}`
    }));

    console.log(`📥 Loaded ${enrichedMembers.length} household members`);
    return enrichedMembers;

  } catch (err) {
    console.error('Error loading household members:', err);
    return [];
  }
}

/**
 * Create a new household invite code
 */
async function createHouseholdInvite(role = 'member') {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return null;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return null;
  }

  try {
    const { data, error } = await window.supabaseClient
      .rpc('create_household_invite', {
        p_household_id: householdId,
        p_role: role
      });

    if (error) throw error;

    console.log('✅ Created invite:', data[0].code);
    return data[0]; // Returns { code, expires_at }

  } catch (err) {
    console.error('Error creating invite:', err);
    return null;
  }
}

/**
 * Get invite details by code
 */
async function getInviteByCode(code) {
  try {
    const { data: invite, error } = await window.supabaseClient
      .from('household_invites')
      .select(`
        id,
        household_id,
        code,
        role,
        expires_at,
        used_at,
        households (
          name
        )
      `)
      .eq('code', code)
      .is('used_at', null)
      .single();

    if (error) throw error;

    return invite;

  } catch (err) {
    console.error('Error fetching invite:', err);
    return null;
  }
}

/**
 * Accept a household invite
 */
async function acceptHouseholdInvite(code) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { data: householdId, error } = await window.supabaseClient
      .rpc('accept_household_invite', {
        p_code: code
      });

    if (error) throw error;

    console.log('✅ Accepted invite, joined household:', householdId);
    return { success: true, householdId };

  } catch (err) {
    console.error('Error accepting invite:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove a member from the household (admin/owner only)
 */
async function removeHouseholdMember(userId) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return false;
  }

  try {
    const { error } = await window.supabaseClient
      .rpc('remove_household_member', {
        p_household_id: householdId,
        p_user_id: userId
      });

    if (error) throw error;

    console.log('✅ Removed member:', userId);
    return true;

  } catch (err) {
    console.error('Error removing member:', err);
    return false;
  }
}

/**
 * Leave the current household
 */
async function leaveHousehold() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return false;
  }

  try {
    const { error } = await window.supabaseClient
      .rpc('leave_household', {
        p_household_id: householdId
      });

    if (error) throw error;

    console.log('✅ Left household:', householdId);
    return true;

  } catch (err) {
    console.error('Error leaving household:', err);
    return false;
  }
}

/**
 * Get household name
 */
async function getHouseholdName() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return null;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    return null;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from('households')
      .select('name')
      .eq('id', householdId)
      .single();

    if (error) throw error;
    return data.name;

  } catch (err) {
    console.error('Error fetching household name:', err);
    return null;
  }
}

/* ---------------------------------------------------
   BULK ENTRY DRAFTS OPERATIONS
--------------------------------------------------- */

/**
 * Load all bulk entry draft rows for current household
 */
async function loadBulkEntryDrafts() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Not authenticated - cannot load bulk entry drafts');
    return [];
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return [];
  }

  try {
    const { data, error } = await window.supabaseClient
      .from('bulk_entry_drafts')
      .select('*')
      .eq('household_id', householdId)
      .order('row_number', { ascending: true });

    if (error) throw error;

    console.log(`📥 Loaded ${data.length} bulk entry draft rows`);
    return data || [];

  } catch (err) {
    console.error('Error loading bulk entry drafts:', err);
    return [];
  }
}

/**
 * Save or update a bulk entry draft row
 */
async function saveBulkEntryDraftRow(rowNumber, rowData) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Not authenticated - cannot save bulk entry draft');
    return false;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID found');
    return false;
  }

  const userId = window.auth.getCurrentUser()?.id;

  try {
    const draftRow = {
      household_id: householdId,
      row_number: rowNumber,
      item_name: rowData.name || null,
      quantity: rowData.quantity || null,
      unit: rowData.unit || null,
      category: rowData.category || null,
      location: rowData.location || null,
      created_by: userId
    };

    // Upsert based on household_id + row_number unique constraint
    const { error } = await window.supabaseClient
      .from('bulk_entry_drafts')
      .upsert(draftRow, {
        onConflict: 'household_id,row_number'
      });

    if (error) throw error;

    return true;

  } catch (err) {
    console.error('Error saving bulk entry draft row:', err);
    return false;
  }
}

/**
 * Delete a specific bulk entry draft row
 */
async function deleteBulkEntryDraftRow(rowNumber) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    return false;
  }

  try {
    const { error } = await window.supabaseClient
      .from('bulk_entry_drafts')
      .delete()
      .eq('household_id', householdId)
      .eq('row_number', rowNumber);

    if (error) throw error;

    return true;

  } catch (err) {
    console.error('Error deleting bulk entry draft row:', err);
    return false;
  }
}

/**
 * Clear all bulk entry drafts for current household
 */
async function clearAllBulkEntryDrafts() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    return false;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    return false;
  }

  try {
    const { error } = await window.supabaseClient
      .from('bulk_entry_drafts')
      .delete()
      .eq('household_id', householdId);

    if (error) throw error;

    console.log('🗑️ Cleared all bulk entry drafts');
    return true;

  } catch (err) {
    console.error('Error clearing bulk entry drafts:', err);
    return false;
  }
}

/* ---------------------------------------------------
   EXPORTS (attached to window for global access)
--------------------------------------------------- */

window.db = {
  // Pantry
  loadPantryItems,
  savePantryItem,
  deletePantryItem,

  // Recipes
  loadRecipes,
  saveRecipe,
  deleteRecipe,

  // Meal Plans
  loadMealPlans,
  saveMealPlansForDate,
  deleteMealPlan,

  // Shopping List
  loadShoppingList,
  saveShoppingItem,
  deleteCheckedShoppingItems,

  // Storage Locations
  loadStorageLocations,
  loadStorageLocationObjects,
  addStorageLocation,
  removeStorageLocation,

  // Categories
  loadCategories,
  loadCategoryObjects,
  addCategory,
  removeCategory,

  // Household Management
  loadHouseholdMembers,
  createHouseholdInvite,
  getInviteByCode,
  acceptHouseholdInvite,
  removeHouseholdMember,
  leaveHousehold,
  getHouseholdName,

  // Bulk Entry Drafts
  loadBulkEntryDrafts,
  saveBulkEntryDraftRow,
  deleteBulkEntryDraftRow,
  clearAllBulkEntryDrafts,

  // Sync
  syncAllData
};
