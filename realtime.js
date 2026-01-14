/* ---------------------------------------------------
   REALTIME MODULE
   Handles real-time subscriptions for multi-user sync
--------------------------------------------------- */

let realtimeSubscriptions = [];

// Debounce timestamps to prevent processing own changes immediately
const lastLocalUpdate = {
  pantry: 0,
  recipes: 0,
  mealPlans: 0,
  shopping: 0
};

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 1000;

/* ---------------------------------------------------
   SUBSCRIPTION MANAGEMENT
--------------------------------------------------- */

/**
 * Initialize realtime subscriptions for current household
 */
async function initRealtimeSync() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Not authenticated - skipping realtime sync');
    return;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.warn('No household ID - skipping realtime sync');
    return;
  }

  console.log('🔄 Setting up realtime subscriptions...');

  // Unsubscribe from any existing subscriptions
  unsubscribeAll();

  // Subscribe to pantry_items changes
  const pantryChannel = window.supabaseClient
    .channel('pantry_items_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pantry_items',
        filter: `household_id=eq.${householdId}`
      },
      (payload) => handlePantryChange(payload)
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to pantry_items changes');
      } else if (status === 'CLOSED') {
        console.warn('⚠️ Pantry subscription closed - reconnecting in 3s...');
        setTimeout(() => initRealtimeSync(), 3000);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Pantry subscription error:', err);
        setTimeout(() => initRealtimeSync(), 5000);
      }
    });

  realtimeSubscriptions.push(pantryChannel);

  // Subscribe to pantry_locations changes
  const locationsChannel = window.supabaseClient
    .channel('pantry_locations_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pantry_locations'
      },
      (payload) => handleLocationChange(payload)
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to pantry_locations changes');
      } else if (status === 'CLOSED') {
        console.warn('⚠️ Locations subscription closed - reconnecting in 3s...');
        setTimeout(() => initRealtimeSync(), 3000);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Locations subscription error:', err);
        setTimeout(() => initRealtimeSync(), 5000);
      }
    });

  realtimeSubscriptions.push(locationsChannel);

  // Subscribe to recipes changes
  const recipesChannel = window.supabaseClient
    .channel('recipes_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'recipes',
        filter: `household_id=eq.${householdId}`
      },
      (payload) => handleRecipeChange(payload)
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to recipes changes');
      } else if (status === 'CLOSED') {
        console.warn('⚠️ Recipes subscription closed - reconnecting in 3s...');
        setTimeout(() => initRealtimeSync(), 3000);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Recipes subscription error:', err);
        setTimeout(() => initRealtimeSync(), 5000);
      }
    });

  realtimeSubscriptions.push(recipesChannel);

  // Subscribe to meal_plans changes
  const mealPlansChannel = window.supabaseClient
    .channel('meal_plans_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'meal_plans',
        filter: `household_id=eq.${householdId}`
      },
      (payload) => handleMealPlanChange(payload)
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to meal_plans changes');
      } else if (status === 'CLOSED') {
        console.warn('⚠️ Meal plans subscription closed - reconnecting in 3s...');
        setTimeout(() => initRealtimeSync(), 3000);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Meal plans subscription error:', err);
        setTimeout(() => initRealtimeSync(), 5000);
      }
    });

  realtimeSubscriptions.push(mealPlansChannel);

  // Subscribe to shopping_list_custom changes
  const shoppingChannel = window.supabaseClient
    .channel('shopping_list_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shopping_list_custom',
        filter: `household_id=eq.${householdId}`
      },
      (payload) => handleShoppingChange(payload)
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to shopping_list changes');
      } else if (status === 'CLOSED') {
        console.warn('⚠️ Shopping subscription closed - reconnecting in 3s...');
        setTimeout(() => initRealtimeSync(), 3000);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Shopping subscription error:', err);
        setTimeout(() => initRealtimeSync(), 5000);
      }
    });

  realtimeSubscriptions.push(shoppingChannel);
}

/**
 * Unsubscribe from all realtime channels
 */
function unsubscribeAll() {
  realtimeSubscriptions.forEach(channel => {
    window.supabaseClient.removeChannel(channel);
  });
  realtimeSubscriptions = [];
  console.log('Unsubscribed from all realtime channels');
}

/* ---------------------------------------------------
   CHANGE HANDLERS
--------------------------------------------------- */

/**
 * Handle pantry item changes from other users
 */
async function handlePantryChange(payload) {
  console.log('📡 Pantry change detected:', payload.eventType);

  // Debounce: Skip if this is our own change (within debounce window)
  const now = Date.now();
  if (now - lastLocalUpdate.pantry < DEBOUNCE_DELAY) {
    console.log('⏭️  Skipping own pantry change (debounced)');
    return;
  }

  // Reload full pantry data to get accurate state
  // (since pantry items and locations are linked)
  const dbPantry = await window.db.loadPantryItems();
  if (dbPantry) {
    pantry = dbPantry;
    localStorage.setItem("pantry", JSON.stringify(pantry));
    renderPantry();
    generateShoppingList();
    updateDashboard();
    showRealtimeToast('Pantry updated by another user');
  }
}

/**
 * Handle pantry location changes from other users
 */
async function handleLocationChange(payload) {
  console.log('📡 Location change detected:', payload.eventType);

  // Debounce: Skip if this is our own change (within debounce window)
  const now = Date.now();
  if (now - lastLocalUpdate.pantry < DEBOUNCE_DELAY) {
    console.log('⏭️  Skipping own location change (debounced)');
    return;
  }

  // Reload full pantry data
  const dbPantry = await window.db.loadPantryItems();
  if (dbPantry) {
    pantry = dbPantry;
    localStorage.setItem("pantry", JSON.stringify(pantry));
    renderPantry();
    generateShoppingList();
    updateDashboard();
  }
}

/**
 * Handle recipe changes from other users
 */
async function handleRecipeChange(payload) {
  console.log('📡 Recipe change detected:', payload.eventType);

  // Debounce: Skip if this is our own change (within debounce window)
  const now = Date.now();
  if (now - lastLocalUpdate.recipes < DEBOUNCE_DELAY) {
    console.log('⏭️  Skipping own recipe change (debounced)');
    return;
  }

  const dbRecipes = await window.db.loadRecipes();
  if (dbRecipes) {
    recipes = dbRecipes;
    localStorage.setItem("recipes", JSON.stringify(recipes));
    renderRecipes();
    generateShoppingList(); // Regenerate shopping list since recipes changed
    updateDashboard();
    showRealtimeToast('Recipes updated by another user');
  }
}

/**
 * Handle meal plan changes from other users
 */
async function handleMealPlanChange(payload) {
  console.log('📡 Meal plan change detected:', payload.eventType);

  // Debounce: Skip if this is our own change (within debounce window)
  const now = Date.now();
  if (now - lastLocalUpdate.mealPlans < DEBOUNCE_DELAY) {
    console.log('⏭️  Skipping own meal plan change (debounced)');
    return;
  }

  const dbPlanner = await window.db.loadMealPlans();
  if (dbPlanner) {
    planner = dbPlanner;
    localStorage.setItem("planner", JSON.stringify(planner));
    generateShoppingList(); // Regenerate shopping list since meal plans changed
    updateDashboard();
    showRealtimeToast('Meal plan updated by another user');
  }
}

/**
 * Handle shopping list changes from other users
 */
async function handleShoppingChange(payload) {
  console.log('📡 Shopping list change detected:', payload.eventType);

  // Debounce: Skip if this is our own change (within debounce window)
  const now = Date.now();
  if (now - lastLocalUpdate.shopping < DEBOUNCE_DELAY) {
    console.log('⏭️  Skipping own shopping change (debounced)');
    return;
  }

  const dbShopping = await window.db.loadShoppingList();
  if (dbShopping) {
    window.customShoppingItems = dbShopping;
    generateShoppingList();
    showRealtimeToast('Shopping list updated by another user');
  }
}

/* ---------------------------------------------------
   UI FEEDBACK
--------------------------------------------------- */

let realtimeToastTimeout = null;

/**
 * Show a subtle toast for realtime updates
 */
function showRealtimeToast(message) {
  // Clear existing timeout
  if (realtimeToastTimeout) {
    clearTimeout(realtimeToastTimeout);
  }

  // Find or create toast
  let toast = document.getElementById('realtime-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'realtime-toast';
    toast.style.cssText = `
      position: fixed;
      top: 5rem;
      right: 2rem;
      background: rgba(46, 58, 31, 0.95);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999;
      font-size: 0.9rem;
      opacity: 0;
      transition: opacity 0.3s ease;
      backdrop-filter: blur(10px);
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = `🔄 ${message}`;

  // Fade in
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // Fade out after 3 seconds
  realtimeToastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
  }, 3000);
}

/* ---------------------------------------------------
   EXPORTS (attached to window for global access)
--------------------------------------------------- */

window.realtime = {
  initRealtimeSync,
  unsubscribeAll,
  lastLocalUpdate
};
