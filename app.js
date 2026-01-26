// ===== HELPER =====
function safeSetInnerHTMLById(id, html) {
  let el = document.getElementById(id);
  if (!el) {
    console.warn(`Element with id="${id}" not found. Creating one automatically.`);
    el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
  el.innerHTML = html;
  return true;
}

// ===== DASHBOARD MODULE =====
const Dashboard = {
  container: null,

  init() {
    // Try to find the dashboard container
    this.container = document.getElementById('dashboard');

    // If not found, create it automatically
    if (!this.container) {
      console.warn('Dashboard container not found during init. Creating automatically.');
      this.container = document.createElement('div');
      this.container.id = 'dashboard';
      document.body.appendChild(this.container);
    }

    // Bind buttons (if any)
    this.bindButtons();
  },

  bindButtons() {
    if (!this.container) return;

    // Example: dashboard refresh button
    const refreshBtn = this.container.querySelector('#dashboard-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.load();
      });
    }

    // Add more button bindings here as needed
  },

  async load() {
    if (!this.container) return;

    // Show loading message immediately
    safeSetInnerHTMLById('dashboard', '<p>Loading dashboard...</p>');

    try {
      // Make sure endpoint matches your backend
      const data = await API.call('/alerts/dashboard');

      const pantryCount = data?.pantry_count ?? 0;
      const recipeCount = data?.recipe_count ?? 0;

      const html = `
        <p>Pantry: ${pantryCount}</p>
        <p>Recipes: ${recipeCount}</p>
      `;

      safeSetInnerHTMLById('dashboard', html);

      // Re-bind buttons in case the container content changed
      this.bindButtons();
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      safeSetInnerHTMLById('dashboard', '<p>Unable to load dashboard</p>');
    }
  }
};

/* ============================================================================
   UTILITY FUNCTIONS
============================================================================ */

function showLoading(message = 'Loading...') {
  // You can add a loading spinner UI here if desired
}

function hideLoading() {
  // You can hide loading spinner here if desired
}

function showError(message) {
  console.error('Error:', message);
  // You can add toast notification UI here if desired
}

function showSuccess(message) {
  console.log('Success:', message);
  // You can add toast notification UI here if desired
}

/* ============================================================================
   AUTHENTICATION
============================================================================ */

async function checkAuth() {
  const token = API.getToken();
  if (!token) {
    return false;
  }

  try {
    // Verify token with /auth/me endpoint
    await API.call('/auth/me');
    return true;
  } catch (error) {
    console.log('Authentication check failed, clearing token:', error.message);
    API.clearToken();
    return false;
  }
}

/* ============================================================================
   PANTRY FUNCTIONS
============================================================================ */

async function loadPantry() {
  try {
    showLoading();
    const response = await API.call('/pantry/');
    // Backend returns {pantry_items: [...], shopping_list: [...]}
    const items = response.pantry_items || response || [];
    renderPantryList(items);
  } catch (error) {
    showError('Failed to load pantry');
    console.error('Pantry load error:', error);
  } finally {
    hideLoading();
  }
}

function renderPantryList(items) {
  const container = document.getElementById('pantry-display');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="empty-state">No pantry items yet. Add your first item!</p>';
    window.pantry = [];
    return;
  }

  // Transform backend data format to frontend format
  // Backend uses: min_threshold, quantity, expiration_date
  // Frontend expects: min, totalQty, locations with qty/expiry
  const transformedItems = items.map(item => {
    // Transform locations
    const locations = (item.locations || []).map(loc => ({
      id: loc.id,
      location: loc.location || loc.location_name || 'Unknown',
      qty: loc.quantity || loc.qty || 0,
      expiry: loc.expiration_date || loc.expiry || null
    }));

    // Calculate total quantity from locations
    const totalQty = locations.reduce((sum, loc) => sum + (loc.qty || 0), 0);

    return {
      id: item.id,
      name: item.name,
      category: item.category || 'Other',
      unit: item.unit || 'unit',
      min: item.min_threshold || item.min || 0,
      totalQty: totalQty,
      locations: locations
    };
  });

  // Store transformed items globally for other scripts to access
  window.pantry = transformedItems;

  // The actual rendering is done by the pantry ledger script in index.html
  // Just trigger a re-render event
  container.setAttribute('data-updated', Date.now());
}

/* ============================================================================
   RECIPE FUNCTIONS
============================================================================ */

async function loadRecipes(searchQuery = '') {
  try {
    showLoading();
    const endpoint = searchQuery ? `/recipes/search?q=${encodeURIComponent(searchQuery)}` : '/recipes/';
    const response = await API.call(endpoint);
    // Backend returns {recipes: [...], ready_to_cook: [...]}
    const recipes = response.recipes || response || [];
    renderRecipeList(recipes);
  } catch (error) {
    showError('Failed to load recipes');
    console.error('Recipe load error:', error);
  } finally {
    hideLoading();
  }
}

async function addRecipe(recipeData) {
  try {
    showLoading();
    const newRecipe = await API.call('/recipes/', {
      method: 'POST',
      body: JSON.stringify(recipeData)
    });

    await loadRecipes();
    showSuccess('Recipe added!');
    return newRecipe;
  } catch (error) {
    showError('Failed to add recipe');
  } finally {
    hideLoading();
  }
}

async function updateRecipe(recipeId, recipeData) {
  try {
    showLoading();
    await API.call(`/recipes/${recipeId}`, {
      method: 'PUT',
      body: JSON.stringify(recipeData)
    });

    await loadRecipes();
    showSuccess('Recipe updated!');
  } catch (error) {
    showError('Failed to update recipe');
  } finally {
    hideLoading();
  }
}

async function deleteRecipe(recipeId) {
  if (!confirm('Delete this recipe?')) return;

  try {
    showLoading();
    await API.call(`/recipes/${recipeId}`, {
      method: 'DELETE'
    });

    await loadRecipes();
    showSuccess('Recipe deleted!');
  } catch (error) {
    showError('Failed to delete recipe');
  } finally {
    hideLoading();
  }
}

function renderRecipeList(recipes) {
  const container = document.getElementById('recipes-list');
  if (!container) return;

  if (!recipes || recipes.length === 0) {
    container.innerHTML = '<p class="empty-state">No recipes yet. Add your first recipe!</p>';
    // Store empty array globally for recipe grid script
    window.recipes = [];
    return;
  }

  // Transform backend data format to frontend format
  // Backend uses: photo_url, quantity (in ingredients)
  // Frontend expects: photo, qty (in ingredients), servings, cookTime, category, isFavorite
  const transformedRecipes = recipes.map(recipe => {
    // Transform ingredients
    const ingredients = (recipe.ingredients || []).map(ing => ({
      name: ing.name || '',
      qty: ing.quantity || ing.qty || 0,
      unit: ing.unit || ''
    }));

    return {
      id: recipe.id,
      name: recipe.name || 'Untitled Recipe',
      servings: recipe.servings || recipe.yield || 4,
      cookTime: recipe.cook_time || recipe.cookTime || recipe.time || '30min',
      category: recipe.category || 'Main',
      photo: recipe.photo_url || recipe.photo || '',
      tags: recipe.tags || [],
      isFavorite: recipe.is_favorite || recipe.isFavorite || false,
      instructions: recipe.instructions || recipe.method || '',
      ingredients: ingredients
    };
  });

  // Store transformed recipes globally for recipe grid script in index.html
  window.recipes = transformedRecipes;

  container.innerHTML = transformedRecipes.map(recipe => `
    <div class="recipe-card" data-id="${recipe.id}">
      <h3 class="recipe-name">${recipe.name}</h3>
      ${recipe.tags && recipe.tags.length ? `<div class="recipe-tags">${recipe.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
      <p class="recipe-servings">Serves: ${recipe.servings}</p>
      <div class="recipe-actions">
        <button onclick="viewRecipe('${recipe.id}')" class="btn-primary">View</button>
        <button onclick="editRecipe('${recipe.id}')" class="btn-secondary">Edit</button>
        <button onclick="deleteRecipe('${recipe.id}')" class="btn-danger">Delete</button>
      </div>
    </div>
  `).join('');
}

/* ============================================================================
   RESERVED INGREDIENTS CALCULATION
============================================================================ */

/**
 * Calculate ingredients reserved by upcoming meal plans.
 * Returns object mapping "name|unit" keys to reserved quantities.
 */
function calculateReservedIngredients() {
  const reserved = {};

  if (!window.planner || !window.recipes) {
    return reserved;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Iterate through planner (object with date keys)
  Object.keys(window.planner).forEach(dateKey => {
    const mealDate = new Date(dateKey);
    mealDate.setHours(0, 0, 0, 0);

    // Skip past dates
    if (mealDate < today) return;

    const meals = window.planner[dateKey];
    if (!Array.isArray(meals)) return;

    meals.forEach(meal => {
      // Skip cooked meals
      if (meal.cooked) return;

      // Find the recipe
      const recipe = window.recipes.find(r =>
        r.id === meal.recipeId || r.id === meal.recipe_id
      );
      if (!recipe || !recipe.ingredients) return;

      // Add each ingredient to reserved
      const multiplier = meal.servingMultiplier || meal.serving_multiplier || 1;
      recipe.ingredients.forEach(ing => {
        const key = `${(ing.name || '').toLowerCase()}|${(ing.unit || '').toLowerCase()}`;
        const qty = (ing.qty || ing.quantity || 0) * multiplier;
        reserved[key] = (reserved[key] || 0) + qty;
      });
    });
  });

  return reserved;
}

// Expose globally for pantry ledger script
window.calculateReservedIngredients = calculateReservedIngredients;

/* ============================================================================
   MEAL PLAN FUNCTIONS
============================================================================ */

async function loadMealPlans() {
  try {
    showLoading();
    const response = await API.call('/meal-plans/');
    // Backend returns {meal_plans: [...], reserved_ingredients: {...}}
    const meals = response.meal_plans || response || [];

    // Transform meal plans array to object grouped by date
    // Backend: [{ id, date, recipe_id, cooked, ... }]
    // Frontend expects: { '2026-01-19': [{ id, recipeId, mealType, cooked }] }
    const plannerByDate = {};
    meals.forEach(meal => {
      // Get date string (backend uses 'date' or 'planned_date')
      const dateStr = meal.date || meal.planned_date;
      if (!dateStr) return;

      // Normalize date format to YYYY-MM-DD
      const dateKey = typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;

      if (!plannerByDate[dateKey]) {
        plannerByDate[dateKey] = [];
      }

      plannerByDate[dateKey].push({
        id: meal.id,
        recipeId: meal.recipe_id || meal.recipeId,
        mealType: meal.meal_type || meal.mealType || 'Dinner',
        cooked: meal.cooked || meal.is_cooked || false,
        servingMultiplier: meal.serving_multiplier || meal.servingMultiplier || 1
      });
    });

    // Store globally for meal planning script
    window.planner = plannerByDate;
    renderMealCalendar(meals);

    // Reload calendar if available
    if (window.reloadCalendar) {
      window.reloadCalendar();
    }
  } catch (error) {
    showError('Failed to load meal plans');
    console.error('Meal plans load error:', error);
    window.planner = {};
  } finally {
    hideLoading();
  }
}

async function addMealPlan(mealData) {
  try {
    showLoading();
    const newMeal = await API.call('/meal-plans/', {
      method: 'POST',
      body: JSON.stringify(mealData)
    });

    await loadMealPlans();
    showSuccess('Meal added to calendar!');
    return newMeal;
  } catch (error) {
    showError('Failed to add meal');
  } finally {
    hideLoading();
  }
}

async function updateMealPlan(mealId, mealData) {
  try {
    showLoading();
    await API.call(`/meal-plans/${mealId}`, {
      method: 'PUT',
      body: JSON.stringify(mealData)
    });

    await loadMealPlans();
    showSuccess('Meal updated!');
  } catch (error) {
    showError('Failed to update meal');
  } finally {
    hideLoading();
  }
}

async function deleteMealPlan(mealId) {
  if (!confirm('Remove this meal from calendar?')) return;

  try {
    showLoading();
    await API.call(`/meal-plans/${mealId}`, {
      method: 'DELETE'
    });

    await loadMealPlans();
    showSuccess('Meal removed!');
  } catch (error) {
    showError('Failed to remove meal');
  } finally {
    hideLoading();
  }
}

async function cookMeal(mealId) {
  if (!confirm('Mark this meal as cooked?')) return;

  try {
    showLoading();
    await API.call(`/meal-plans/${mealId}/cook`, {
      method: 'POST'
    });

    await loadMealPlans();
    await loadPantry(); // Refresh pantry (ingredients were used)
    showSuccess('Meal marked as cooked!');
  } catch (error) {
    showError('Failed to cook meal');
  } finally {
    hideLoading();
  }
}

function renderMealCalendar(meals) {
  const container = document.getElementById('meal-calendar');
  if (!container) return;

  if (!meals || meals.length === 0) {
    container.innerHTML = '<p class="empty-state">No meals planned yet. Start planning!</p>';
    return;
  }

  // Group by date
  const byDate = {};
  meals.forEach(meal => {
    if (!byDate[meal.date]) byDate[meal.date] = [];
    byDate[meal.date].push(meal);
  });

  let html = '';
  for (const [date, dateMeals] of Object.entries(byDate).sort()) {
    html += `
      <div class="calendar-day">
        <h3 class="day-date">${new Date(date).toLocaleDateString()}</h3>
        <div class="day-meals">
          ${dateMeals.map(meal => `
            <div class="meal-item ${meal.cooked ? 'cooked' : ''}" data-id="${meal.id}">
              <div class="meal-info">
                <span class="meal-type">${meal.meal_type || 'Dinner'}</span>
                <span class="meal-recipe">${meal.recipe_name || 'Recipe'}</span>
              </div>
              <div class="meal-actions">
                ${!meal.cooked ? `<button onclick="cookMeal(${meal.id})" class="btn-cook">Cook</button>` : '<span class="cooked-badge">✓ Cooked</span>'}
                <button onclick="deleteMealPlan(${meal.id})" class="btn-icon">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

/* ============================================================================
   SHOPPING LIST FUNCTIONS
============================================================================ */

async function loadShoppingList() {
  try {
    showLoading();
    const shoppingData = await API.call('/shopping-list/');
    // Backend returns {shopping_list: [...], total_items: ..., checked_items: ...}
    renderShoppingList(shoppingData.shopping_list || shoppingData);
  } catch (error) {
    showError('Failed to load shopping list');
    console.error('Shopping list load error:', error);
  } finally {
    hideLoading();
  }
}

async function addManualItem(itemData) {
  try {
    showLoading();
    await API.call('/shopping-list/items', {
      method: 'POST',
      body: JSON.stringify(itemData)
    });

    await loadShoppingList();
    showSuccess('Item added to shopping list!');
  } catch (error) {
    showError('Failed to add item');
  } finally {
    hideLoading();
  }
}

async function checkShoppingItem(itemId, checked) {
  try {
    await API.call(`/shopping-list/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ checked })
    });

    await loadShoppingList();
  } catch (error) {
    showError('Failed to update item');
  }
}

async function deleteShoppingItem(itemId) {
  try {
    await API.call(`/shopping-list/items/${itemId}`, {
      method: 'DELETE'
    });

    await loadShoppingList();
    showSuccess('Item removed!');
  } catch (error) {
    showError('Failed to remove item');
  }
}

async function clearCheckedItems() {
  if (!confirm('Clear all checked items?')) return;

  try {
    showLoading();
    await API.call('/shopping-list/clear-checked', {
      method: 'POST'
    });

    await loadShoppingList();
    showSuccess('Checked items cleared!');
  } catch (error) {
    showError('Failed to clear items');
  } finally {
    hideLoading();
  }
}

async function addCheckedToPantry() {
  if (!confirm('Add all checked items to pantry?')) return;

  try {
    showLoading();
    await API.call('/shopping-list/add-checked-to-pantry', {
      method: 'POST'
    });

    await loadShoppingList();
    await loadPantry();
    showSuccess('Items added to pantry!');
  } catch (error) {
    showError('Failed to add items to pantry');
  } finally {
    hideLoading();
  }
}

function renderShoppingList(items) {
  const container = document.getElementById('shopping-list');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="empty-state">Shopping list is empty!</p>';
    return;
  }

  // Group by category
  const byCategory = {};
  items.forEach(item => {
    const cat = item.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  let html = '<div class="shopping-actions">';
  html += '<button onclick="clearCheckedItems()" class="btn-secondary">Clear Checked</button>';
  html += '<button onclick="addCheckedToPantry()" class="btn-primary">Add Checked to Pantry</button>';
  html += '</div>';

  for (const [category, categoryItems] of Object.entries(byCategory)) {
    html += `
      <div class="shopping-category">
        <h3 class="category-title">${category}</h3>
        <div class="shopping-items">
          ${categoryItems.map(item => `
            <div class="shopping-item ${item.checked ? 'checked' : ''}" data-id="${item.id || item.name}">
              <label class="shopping-checkbox">
                <input
                  type="checkbox"
                  ${item.checked ? 'checked' : ''}
                  onchange="checkShoppingItem('${item.id || item.name}', this.checked)"
                >
                <span class="item-name">${item.name}</span>
                <span class="item-qty">${item.quantity} ${item.unit}</span>
              </label>
              ${item.source ? `<span class="item-source">${item.source}</span>` : ''}
              ${item.id ? `<button onclick="deleteShoppingItem('${item.id}')" class="btn-icon">🗑️</button>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

/* ============================================================================
   ALERTS & DASHBOARD
============================================================================ */

async function loadDashboard() {
  try {
    const dashboard = await API.call('/alerts/dashboard');
    renderDashboard(dashboard);
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

async function loadExpiringItems() {
  try {
    const expiring = await API.call('/alerts/expiring');
    renderExpiringItems(expiring);
  } catch (error) {
    console.error('Failed to load expiring items:', error);
  }
}

function renderDashboard(data) {
  const container = document.getElementById('dashboard');
  if (!container) return;

  container.innerHTML = `
    <div class="dashboard-stats">
      <div class="stat-card">
        <h3>Pantry Items</h3>
        <p class="stat-number">${data.pantry_count || 0}</p>
      </div>
      <div class="stat-card">
        <h3>Recipes</h3>
        <p class="stat-number">${data.recipe_count || 0}</p>
      </div>
      <div class="stat-card">
        <h3>Upcoming Meals</h3>
        <p class="stat-number">${data.upcoming_meals || 0}</p>
      </div>
      <div class="stat-card">
        <h3>Shopping Items</h3>
        <p class="stat-number">${data.shopping_count || 0}</p>
      </div>
    </div>
    ${data.expiring_soon && data.expiring_soon.length > 0 ? `
      <div class="dashboard-alerts">
        <h3>⚠️ Items Expiring Soon</h3>
        <ul>
          ${data.expiring_soon.map(item => `
            <li>${item.item_name} - expires in ${item.expires_in_days} days</li>
          `).join('')}
        </ul>
      </div>
    ` : ''}
  `;
}

function renderExpiringItems(items) {
  const container = document.getElementById('expiring-items');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '<p>No items expiring soon!</p>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="expiring-item ${item.is_expired ? 'expired' : ''}">
      <span class="item-name">${item.item_name}</span>
      <span class="item-expires">Expires: ${item.expires_on}</span>
      <span class="item-days">${item.expires_in_days} days</span>
    </div>
  `).join('');
}

/* ============================================================================
   VIEW MANAGEMENT
============================================================================ */

// App State
const AppState = {
  currentView: 'pantry',
  loading: false
};

function showView(viewName) {
  AppState.currentView = viewName;

  // Hide all views
  document.querySelectorAll('.view').forEach(view => {
    view.style.display = 'none';
  });

  // Show selected view
  const view = document.getElementById(`${viewName}-view`);
  if (view) {
    view.style.display = 'block';
  }

  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  const navItem = document.querySelector(`[data-view="${viewName}"]`);
  if (navItem) {
    navItem.classList.add('active');
  }

  // Load data for view
  switch(viewName) {
    case 'pantry':
      loadPantry();
      break;
    case 'recipes':
      loadRecipes();
      break;
    case 'planner':
      loadMealPlans();
      break;
    case 'shopping':
      loadShoppingList();
      break;
    case 'dashboard':
      loadDashboard();
      break;
  }
}

function showLandingPage() {
  const landing = document.getElementById('landing-page');
  const mainContent = document.querySelector('.main-content');
  const siteHeader = document.querySelector('.site-header');
  const sidebarNav = document.querySelector('.sidebar-nav');
  const bottomNav = document.querySelector('.bottom-nav');

  if (landing) landing.classList.add('show');
  if (mainContent) mainContent.style.display = 'none';
  if (siteHeader) siteHeader.style.display = 'none';
  if (sidebarNav) sidebarNav.style.display = 'none';
  if (bottomNav) bottomNav.style.display = 'none';

  document.body.classList.add('landing-active');
}

function showApp() {
  const landing = document.getElementById('landing-page');
  const mainContent = document.querySelector('.main-content');
  const siteHeader = document.querySelector('.site-header');
  const sidebarNav = document.querySelector('.sidebar-nav');
  const bottomNav = document.querySelector('.bottom-nav');

  if (landing) landing.classList.remove('show');
  if (mainContent) mainContent.style.display = 'block';
  if (siteHeader) siteHeader.style.display = 'flex';

  // Remove inline styles to let CSS media queries handle sidebar vs bottom nav
  // CSS shows sidebar on desktop (min-width: 768px) and bottom nav on mobile
  if (sidebarNav) sidebarNav.style.display = '';
  if (bottomNav) bottomNav.style.display = '';

  document.body.classList.remove('landing-active');

  showView('pantry'); // Default view
}

/* ============================================================================
   MODAL FUNCTIONS FOR INLINE SCRIPTS
============================================================================ */

/**
 * Open modal to edit a pantry item
 */
function openIngredientModal(item) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const locations = item.locations || [];
  const locationsHTML = locations.map((loc, idx) => `
    <div class="location-row" data-idx="${idx}">
      <input type="text" class="loc-name" value="${loc.location || ''}" placeholder="Location">
      <input type="number" class="loc-qty" value="${loc.qty || 0}" step="0.1" min="0">
      <input type="date" class="loc-expiry" value="${loc.expiry || ''}">
    </div>
  `).join('') || '<div class="location-row"><input type="text" class="loc-name" placeholder="Location"><input type="number" class="loc-qty" value="0" step="0.1" min="0"><input type="date" class="loc-expiry"></div>';

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content ingredient-modal" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2>${item.id ? 'Edit' : 'Add'} Pantry Item</h2>
        <form id="ingredient-form">
          <div class="form-group">
            <label>Name</label>
            <input type="text" id="ing-name" value="${item.name || ''}" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select id="ing-category">
                <option value="Meat" ${item.category === 'Meat' ? 'selected' : ''}>Meat</option>
                <option value="Dairy" ${item.category === 'Dairy' ? 'selected' : ''}>Dairy</option>
                <option value="Produce" ${item.category === 'Produce' ? 'selected' : ''}>Produce</option>
                <option value="Pantry" ${item.category === 'Pantry' ? 'selected' : ''}>Pantry</option>
                <option value="Frozen" ${item.category === 'Frozen' ? 'selected' : ''}>Frozen</option>
                <option value="Spices" ${item.category === 'Spices' ? 'selected' : ''}>Spices</option>
                <option value="Other" ${item.category === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Unit</label>
              <input type="text" id="ing-unit" value="${item.unit || ''}" placeholder="lb, oz, etc">
            </div>
            <div class="form-group">
              <label>Min Stock</label>
              <input type="number" id="ing-min" value="${item.min || 0}" step="0.1" min="0">
            </div>
          </div>
          <div class="form-group">
            <label>Locations</label>
            <div id="locations-list">${locationsHTML}</div>
            <button type="button" class="btn-secondary btn-sm" onclick="addLocationRow()">+ Add Location</button>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('ingredient-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    await saveIngredient(item.id);
  };
}

function addLocationRow() {
  const list = document.getElementById('locations-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'location-row';
  row.innerHTML = '<input type="text" class="loc-name" placeholder="Location"><input type="number" class="loc-qty" value="0" step="0.1" min="0"><input type="date" class="loc-expiry">';
  list.appendChild(row);
}

async function saveIngredient(itemId) {
  const name = document.getElementById('ing-name').value.trim();
  const category = document.getElementById('ing-category').value;
  const unit = document.getElementById('ing-unit').value.trim() || 'unit';
  const min = parseFloat(document.getElementById('ing-min').value) || 0;

  const locationRows = document.querySelectorAll('.location-row');
  const locations = [];
  locationRows.forEach(row => {
    const locName = row.querySelector('.loc-name').value.trim();
    const locQty = parseFloat(row.querySelector('.loc-qty').value) || 0;
    const locExpiry = row.querySelector('.loc-expiry').value || null;
    if (locName && locQty > 0) {
      locations.push({ location: locName, quantity: locQty, expiration_date: locExpiry });
    }
  });

  if (!name) {
    alert('Please enter a name');
    return;
  }

  try {
    if (itemId) {
      await API.call(`/pantry/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, category, unit, min_threshold: min, locations })
      });
    } else {
      await API.call('/pantry/', {
        method: 'POST',
        body: JSON.stringify({ name, category, unit, min_threshold: min, locations })
      });
    }
    closeModal();
    await loadPantry();
  } catch (error) {
    console.error('Error saving ingredient:', error);
    alert('Failed to save: ' + error.message);
  }
}

/**
 * Open modal to quickly use/deplete an item
 */
function openQuickDepleteModal(item) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content quick-use-modal" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2>Use ${item.name}</h2>
        <p>Available: ${item.totalQty} ${item.unit}</p>
        <form id="quick-use-form">
          <div class="form-group">
            <label>Amount to use</label>
            <input type="number" id="use-amount" value="1" step="0.1" min="0.1" max="${item.totalQty}" required>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Use</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('quick-use-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('use-amount').value);
    await quickDepleteItem(item, amount);
  };
}

async function quickDepleteItem(item, amount) {
  if (amount > item.totalQty) {
    alert('Cannot use more than available');
    return;
  }

  // Deplete from first location with enough quantity
  const updatedLocations = [];
  let remaining = amount;

  for (const loc of item.locations) {
    if (remaining <= 0) {
      updatedLocations.push({ location: loc.location, quantity: loc.qty, expiration_date: loc.expiry });
    } else if (loc.qty >= remaining) {
      updatedLocations.push({ location: loc.location, quantity: loc.qty - remaining, expiration_date: loc.expiry });
      remaining = 0;
    } else {
      remaining -= loc.qty;
      // Don't add location if fully depleted
    }
  }

  try {
    await API.call(`/pantry/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify({ locations: updatedLocations })
    });
    closeModal();
    await loadPantry();
  } catch (error) {
    console.error('Error depleting item:', error);
    alert('Failed to update: ' + error.message);
  }
}

/**
 * Open modal to add/edit a recipe
 */
function openRecipeModal(recipeId) {
  const recipe = recipeId ? window.recipes.find(r => r.id === recipeId) : { name: '', servings: 4, ingredients: [], instructions: '', tags: [] };
  if (!recipe && recipeId) {
    alert('Recipe not found');
    return;
  }

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const ingredientsHTML = (recipe.ingredients || []).map((ing, idx) => `
    <div class="ingredient-row" data-idx="${idx}">
      <input type="text" class="ing-name" value="${ing.name || ''}" placeholder="Ingredient">
      <input type="number" class="ing-qty" value="${ing.qty || 0}" step="0.1" min="0">
      <input type="text" class="ing-unit" value="${ing.unit || ''}" placeholder="unit">
    </div>
  `).join('') || '<div class="ingredient-row"><input type="text" class="ing-name" placeholder="Ingredient"><input type="number" class="ing-qty" value="1" step="0.1" min="0"><input type="text" class="ing-unit" placeholder="unit"></div>';

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content recipe-modal" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2>${recipeId ? 'Edit' : 'Add'} Recipe</h2>
        <form id="recipe-form">
          <div class="form-group">
            <label>Recipe Name</label>
            <input type="text" id="recipe-name" value="${recipe.name || ''}" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Servings</label>
              <input type="number" id="recipe-servings" value="${recipe.servings || 4}" min="1">
            </div>
            <div class="form-group">
              <label>Tags (comma separated)</label>
              <input type="text" id="recipe-tags" value="${(recipe.tags || []).join(', ')}" placeholder="Italian, Quick, etc">
            </div>
          </div>
          <div class="form-group">
            <label>Ingredients</label>
            <div id="ingredients-list">${ingredientsHTML}</div>
            <button type="button" class="btn-secondary btn-sm" onclick="addIngredientRow()">+ Add Ingredient</button>
          </div>
          <div class="form-group">
            <label>Instructions</label>
            <textarea id="recipe-instructions" rows="5">${recipe.instructions || ''}</textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('recipe-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    await saveRecipe(recipeId);
  };
}

function addIngredientRow() {
  const list = document.getElementById('ingredients-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = '<input type="text" class="ing-name" placeholder="Ingredient"><input type="number" class="ing-qty" value="1" step="0.1" min="0"><input type="text" class="ing-unit" placeholder="unit">';
  list.appendChild(row);
}

async function saveRecipe(recipeId) {
  const name = document.getElementById('recipe-name').value.trim();
  const servings = parseInt(document.getElementById('recipe-servings').value) || 4;
  const tagsStr = document.getElementById('recipe-tags').value;
  const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
  const instructions = document.getElementById('recipe-instructions').value.trim();

  const ingredientRows = document.querySelectorAll('.ingredient-row');
  const ingredients = [];
  ingredientRows.forEach(row => {
    const ingName = row.querySelector('.ing-name').value.trim();
    const ingQty = parseFloat(row.querySelector('.ing-qty').value) || 0;
    const ingUnit = row.querySelector('.ing-unit').value.trim() || 'unit';
    if (ingName) {
      ingredients.push({ name: ingName, quantity: ingQty, unit: ingUnit });
    }
  });

  if (!name) {
    alert('Please enter a recipe name');
    return;
  }

  try {
    if (recipeId) {
      await API.call(`/recipes/${recipeId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, tags, instructions, ingredients })
      });
    } else {
      await API.call('/recipes/', {
        method: 'POST',
        body: JSON.stringify({ name, tags, instructions, ingredients })
      });
    }
    closeModal();
    await loadRecipes();
  } catch (error) {
    console.error('Error saving recipe:', error);
    alert('Failed to save: ' + error.message);
  }
}

/**
 * Open modal for a specific day to schedule meals
 */
function openDayModal(dateKey) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const meals = (window.planner && window.planner[dateKey]) || [];
  const recipes = window.recipes || [];

  const mealsHTML = meals.map(meal => {
    const recipe = recipes.find(r => r.id === meal.recipeId);
    return `
      <div class="scheduled-meal-row">
        <span>${meal.mealType}: ${recipe ? recipe.name : 'Unknown Recipe'}</span>
        <button type="button" class="btn-sm btn-danger" onclick="removeMealFromDay('${dateKey}', '${meal.id}')">Remove</button>
      </div>
    `;
  }).join('') || '<p>No meals scheduled</p>';

  const recipeOptions = recipes.map(r => `<option value="${r.id}">${r.name}</option>`).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content day-modal" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2>${new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
        <div class="scheduled-meals">${mealsHTML}</div>
        <hr>
        <h3>Add Meal</h3>
        <form id="add-meal-form">
          <div class="form-row">
            <div class="form-group">
              <label>Recipe</label>
              <select id="meal-recipe" required>
                <option value="">Select recipe...</option>
                ${recipeOptions}
              </select>
            </div>
            <div class="form-group">
              <label>Meal Type</label>
              <select id="meal-type">
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner" selected>Dinner</option>
                <option value="Snack">Snack</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn btn-primary">Add to Plan</button>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('add-meal-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    await addMealToDay(dateKey);
  };
}

async function addMealToDay(dateKey) {
  const recipeId = document.getElementById('meal-recipe').value;
  const mealType = document.getElementById('meal-type').value;

  if (!recipeId) {
    alert('Please select a recipe');
    return;
  }

  try {
    await API.call('/meal-plans/', {
      method: 'POST',
      body: JSON.stringify({ date: dateKey, recipe_id: recipeId, serving_multiplier: 1 })
    });
    closeModal();
    await loadMealPlans();
  } catch (error) {
    console.error('Error adding meal:', error);
    alert('Failed to add meal: ' + error.message);
  }
}

async function removeMealFromDay(dateKey, mealId) {
  if (!confirm('Remove this meal?')) return;

  try {
    await API.call(`/meal-plans/${mealId}`, { method: 'DELETE' });
    closeModal();
    await loadMealPlans();
  } catch (error) {
    console.error('Error removing meal:', error);
    alert('Failed to remove: ' + error.message);
  }
}

/**
 * Open modal to cook a meal
 */
function openCookNowModal(recipe, dateKey, mealId) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const ingredientsHTML = (recipe.ingredients || []).map(ing => `
    <li>${ing.qty || ing.quantity} ${ing.unit} ${ing.name}</li>
  `).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content cook-modal" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2>Cook: ${recipe.name}</h2>
        <h3>Ingredients needed:</h3>
        <ul>${ingredientsHTML}</ul>
        <p>This will deduct ingredients from your pantry.</p>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="markMealCooked('${dateKey}', '${mealId}')">Mark as Cooked</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Mark a meal as cooked and deduct from pantry
 */
async function markMealCooked(dateKey, mealId) {
  try {
    await API.call(`/meal-plans/${mealId}/cook`, { method: 'POST' });
    closeModal();
    await loadMealPlans();
    await loadPantry();
  } catch (error) {
    console.error('Error marking meal as cooked:', error);
    alert('Failed to cook meal: ' + error.message);
  }
}

/**
 * Close any open modal
 */
function closeModal() {
  const modalRoot = document.getElementById('modal-root');
  if (modalRoot) {
    modalRoot.innerHTML = '';
  }
}

/**
 * Save recipes to localStorage (for persistence)
 */
function saveRecipes() {
  if (window.recipes) {
    localStorage.setItem('recipes', JSON.stringify(window.recipes));
  }
}

// Expose functions globally for inline scripts
window.openIngredientModal = openIngredientModal;
window.openQuickDepleteModal = openQuickDepleteModal;
window.openRecipeModal = openRecipeModal;
window.openDayModal = openDayModal;
window.openCookNowModal = openCookNowModal;
window.markMealCooked = markMealCooked;
window.closeModal = closeModal;
window.saveRecipes = saveRecipes;
window.addLocationRow = addLocationRow;
window.addIngredientRow = addIngredientRow;
window.removeMealFromDay = removeMealFromDay;

/* ============================================================================
   APP INITIALIZATION
============================================================================ */

async function loadApp() {
  showApp();

  // Load all data in parallel for faster startup
  try {
    await Promise.all([
      loadPantry(),
      loadRecipes(),
      loadMealPlans(),
      loadShoppingList()
    ]);
  } catch (error) {
    console.error('Error loading initial data:', error);
  }

  // Wire up UI buttons
  wireUpButtons();

  // Show default view
  showView('pantry');
}

/**
 * Wire up all button click handlers
 */
function wireUpButtons() {
  // New pantry entry button
  const btnNewPantry = document.getElementById('btn-new-pantry-entry');
  if (btnNewPantry) {
    btnNewPantry.addEventListener('click', () => openIngredientModal({}));
  }

  // FAB buttons (using onclick in HTML, but also wire here as backup)
  const fabAddRecipe = document.getElementById('fab-add-recipe');
  if (fabAddRecipe) {
    fabAddRecipe.addEventListener('click', () => openRecipeModal(null));
  }

  // Add custom shopping item
  const btnAddCustomItem = document.getElementById('btn-add-custom-item');
  const userItemName = document.getElementById('user-item-name');
  if (btnAddCustomItem && userItemName) {
    btnAddCustomItem.addEventListener('click', async () => {
      const name = userItemName.value.trim();
      if (name) {
        try {
          await API.call('/shopping-list/items', {
            method: 'POST',
            body: JSON.stringify({ name, quantity: 1, unit: 'unit', category: 'Other' })
          });
          userItemName.value = '';
          await loadShoppingList();
        } catch (error) {
          console.error('Error adding shopping item:', error);
        }
      }
    });
  }

  // Checkout button
  const btnCheckout = document.getElementById('btn-checkout');
  if (btnCheckout) {
    btnCheckout.addEventListener('click', async () => {
      if (confirm('Add all checked items to pantry and clear them from the list?')) {
        try {
          await API.call('/shopping-list/add-checked-to-pantry', { method: 'POST' });
          await loadShoppingList();
          await loadPantry();
        } catch (error) {
          console.error('Error during checkout:', error);
          alert('Checkout failed: ' + error.message);
        }
      }
    });
  }

  // Onboarding/bulk entry buttons
  const btnOnboarding = document.getElementById('btn-onboarding');
  if (btnOnboarding) {
    btnOnboarding.addEventListener('click', () => {
      document.getElementById('nav-onboarding').checked = true;
    });
  }

  const btnExitOnboarding = document.getElementById('btn-exit-onboarding');
  if (btnExitOnboarding) {
    btnExitOnboarding.addEventListener('click', () => {
      document.getElementById('nav-pantry').checked = true;
    });
  }

  // Account button
  const btnAccount = document.getElementById('btn-account');
  if (btnAccount) {
    btnAccount.addEventListener('click', openAccountModal);
  }

  // Settings button
  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', openSettingsModal);
  }
}

/**
 * Open account/household management modal
 */
async function openAccountModal() {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  // Try to get current user info
  let userInfo = { email: 'Unknown' };
  try {
    userInfo = await API.getCurrentUser();
  } catch (e) {
    console.error('Failed to get user info:', e);
  }

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content account-modal" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2>👤 Account & Household</h2>

        <div class="account-section">
          <h3>Your Account</h3>
          <div class="account-info">
            <p><strong>Email:</strong> ${userInfo.email || 'Not available'}</p>
            <p><strong>Household:</strong> ${userInfo.household_id ? 'Connected' : 'Not connected'}</p>
          </div>
        </div>

        <div class="account-section">
          <h3>Household Management</h3>
          <p class="help-text">Share your household with family members to collaborate on meal planning and shopping.</p>
          <div class="household-actions">
            <button class="btn btn-secondary" onclick="showInviteHousehold()">Invite Member</button>
            <button class="btn btn-secondary" onclick="showHouseholdMembers()">View Members</button>
          </div>
        </div>

        <div class="account-section">
          <h3>Data Management</h3>
          <div class="data-actions">
            <button class="btn btn-secondary" onclick="exportData()">Export All Data</button>
            <button class="btn btn-danger" onclick="confirmDeleteAccount()">Delete Account</button>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" onclick="closeModal()">Done</button>
        </div>
      </div>
    </div>
  `;
}

function showInviteHousehold() {
  alert('Invite functionality coming soon! You will be able to share a link with family members.');
}

function showHouseholdMembers() {
  alert('Member list coming soon! You will see all household members here.');
}

function exportData() {
  alert('Export functionality coming soon! You will be able to download all your data.');
}

function confirmDeleteAccount() {
  if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
    alert('Account deletion coming soon. Contact support for now.');
  }
}

/**
 * Open settings modal
 */
function openSettingsModal() {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  // Get current settings from localStorage
  const settings = {
    theme: localStorage.getItem('theme') || 'light',
    defaultView: localStorage.getItem('defaultView') || 'pantry',
    showExpiring: localStorage.getItem('showExpiring') !== 'false',
    expirationDays: localStorage.getItem('expirationDays') || '3'
  };

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content settings-modal" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2>⚙️ Settings</h2>

        <form id="settings-form">
          <div class="settings-section">
            <h3>Display</h3>
            <div class="form-group">
              <label>Theme</label>
              <select id="setting-theme">
                <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light (Cottage Kitchen)</option>
                <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark Mode</option>
              </select>
            </div>
            <div class="form-group">
              <label>Default View</label>
              <select id="setting-default-view">
                <option value="pantry" ${settings.defaultView === 'pantry' ? 'selected' : ''}>Pantry</option>
                <option value="recipes" ${settings.defaultView === 'recipes' ? 'selected' : ''}>Recipes</option>
                <option value="shopping" ${settings.defaultView === 'shopping' ? 'selected' : ''}>Shopping List</option>
                <option value="meal-planning" ${settings.defaultView === 'meal-planning' ? 'selected' : ''}>Meal Planning</option>
              </select>
            </div>
          </div>

          <div class="settings-section">
            <h3>Notifications</h3>
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" id="setting-show-expiring" ${settings.showExpiring ? 'checked' : ''}>
                Show expiring items alerts
              </label>
            </div>
            <div class="form-group">
              <label>Alert for items expiring within (days)</label>
              <input type="number" id="setting-expiration-days" value="${settings.expirationDays}" min="1" max="14">
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('settings-form');
  form.onsubmit = (e) => {
    e.preventDefault();
    saveSettings();
  };
}

function saveSettings() {
  const theme = document.getElementById('setting-theme').value;
  const defaultView = document.getElementById('setting-default-view').value;
  const showExpiring = document.getElementById('setting-show-expiring').checked;
  const expirationDays = document.getElementById('setting-expiration-days').value;

  localStorage.setItem('theme', theme);
  localStorage.setItem('defaultView', defaultView);
  localStorage.setItem('showExpiring', showExpiring);
  localStorage.setItem('expirationDays', expirationDays);

  // Apply theme immediately
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }

  closeModal();
  showSuccess('Settings saved!');
}

// Expose functions globally
window.openAccountModal = openAccountModal;
window.openSettingsModal = openSettingsModal;
window.showInviteHousehold = showInviteHousehold;
window.showHouseholdMembers = showHouseholdMembers;
window.exportData = exportData;
window.confirmDeleteAccount = confirmDeleteAccount;

async function initApp() {
  console.log('🍳 Chef\'s Kiss - Python Age 5.0');
  console.log('Backend:', window.CONFIG?.API_BASE || 'http://localhost:8000/api');

  // Check if there was a token before auth check (since checkAuth clears invalid tokens)
  const hadTokenBeforeCheck = API.getToken() !== null;

  // Check if user is authenticated
  const isAuthenticated = await checkAuth();

  console.log('Authentication status:', isAuthenticated);

  if (isAuthenticated) {
    await loadApp();
  } else {
    showLandingPage();

    // If there was a token but auth failed, show helpful message
    if (hadTokenBeforeCheck) {
      console.log('⚠️ Your authentication token was invalid or expired and has been cleared.');
      console.log('ℹ️ Please sign in again to continue.');
      console.log('');
      console.log('If you continue to see authentication errors:');
      console.log('1. Make sure the backend is deployed and running');
      console.log('2. Check that SUPABASE_JWT_SECRET is configured correctly in Railway');
      console.log('3. Try signing up for a new account');
      console.log('4. Or use the "Try Demo" option to test without authentication');
    } else {
      console.log('ℹ️ Welcome! Please sign in or create an account to get started.');
    }
  }
}

// Sign out handler
function handleSignOut() {
  API.clearToken();
  window.location.reload();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initApp();

    // Wire up sign out button
    const signOutBtn = document.getElementById('btn-signout');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', handleSignOut);
    }
  });
} else {
  initApp();

  // Wire up sign out button
  const signOutBtn = document.getElementById('btn-signout');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
  }
}
