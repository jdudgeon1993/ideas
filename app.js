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
    // First verify with /auth/me
    await API.call('/auth/me');

    // Then test a protected endpoint to ensure token works with JWT middleware
    // Using a simple endpoint that should always work if authenticated
    await API.call('/pantry');

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
    const response = await API.call('/pantry');
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
    return;
  }

  // Store items globally for other scripts to access
  window.pantry = items;

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
    const endpoint = searchQuery ? `/recipes/search?q=${encodeURIComponent(searchQuery)}` : '/recipes';
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
    const newRecipe = await API.call('/recipes', {
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

  // Store recipes globally for recipe grid script in index.html
  window.recipes = recipes;

  container.innerHTML = recipes.map(recipe => `
    <div class="recipe-card" data-id="${recipe.id}">
      <h3 class="recipe-name">${recipe.name}</h3>
      ${recipe.tags ? `<div class="recipe-tags">${recipe.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
      <p class="recipe-servings">Serves: ${recipe.servings || 1}</p>
      <div class="recipe-actions">
        <button onclick="viewRecipe(${recipe.id})" class="btn-primary">View</button>
        <button onclick="editRecipe(${recipe.id})" class="btn-secondary">Edit</button>
        <button onclick="deleteRecipe(${recipe.id})" class="btn-danger">Delete</button>
      </div>
    </div>
  `).join('');
}

/* ============================================================================
   MEAL PLAN FUNCTIONS

async function loadMealPlans() {
  try {
    showLoading();
    const response = await API.call('/meal-plans');
    // Backend returns {meal_plans: [...], reserved_ingredients: {...}}
    const meals = response.meal_plans || response || [];
    // Store globally for meal planning script
    window.planner = meals;
    renderMealCalendar(meals);
  } catch (error) {
    showError('Failed to load meal plans');
    console.error('Meal plans load error:', error);
  } finally {
    hideLoading();
  }
}

async function addMealPlan(mealData) {
  try {
    showLoading();
    const newMeal = await API.call('/meal-plans', {
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

async function loadShoppingList() {
  try {
    showLoading();
    const shoppingData = await API.call('/shopping-list');
    renderShoppingList(shoppingData.items || shoppingData);
  } catch (error) {
    showError('Failed to load shopping list');
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
  if (sidebarNav) sidebarNav.style.display = 'flex';
  if (bottomNav) bottomNav.style.display = 'flex';

  document.body.classList.remove('landing-active');

  showView('pantry'); // Default view
}

/* ============================================================================
   APP INITIALIZATION
============================================================================ */

async function loadApp() {
  showApp();
  await loadDashboard();
  showView('pantry');
}

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
