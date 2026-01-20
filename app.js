/**
 * Chef's Kiss - Frontend Application (Python Age 5.0)
 *
 * JavaScript's job: Make the site breathe (UI interactions)
 * Python's job: Make it think (business logic, calculations, data)
 *
 * This file ONLY handles UI - all data and logic in Python backend
 */

/* ============================================================================
   APP STATE (Minimal - only UI state)
============================================================================ */

const AppState = {
  currentUser: null,
  currentHousehold: null,
  currentView: 'pantry', // pantry, recipes, planner, shopping
  loading: false
};

/* ============================================================================
   UTILITY FUNCTIONS
============================================================================ */

function showLoading(message = 'Loading...') {
  AppState.loading = true;
  // You can add a loading spinner UI here if desired
}

function hideLoading() {
  AppState.loading = false;
}

function showError(message) {
  alert(`Error: ${message}`);
  console.error(message);
}

function showSuccess(message) {
  console.log(`Success: ${message}`);
  // You can add toast notification UI here if desired
}

/* ============================================================================
   AUTHENTICATION
============================================================================ */

async function handleSignUp(email, password) {
  try {
    showLoading('Creating account...');

    const response = await API.call('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.access_token) {
      API.setToken(response.access_token);
      AppState.currentUser = response.user;
      AppState.currentHousehold = response.household_id;

      await loadApp();
      showSuccess('Account created!');
    }
  } catch (error) {
    showError(error.message || 'Sign up failed');
  } finally {
    hideLoading();
  }
}

async function handleSignIn(email, password) {
  try {
    showLoading('Signing in...');

    const response = await API.call('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.access_token) {
      API.setToken(response.access_token);
      AppState.currentUser = response.user;
      AppState.currentHousehold = response.household_id;

      await loadApp();
      showSuccess('Signed in!');
    }
  } catch (error) {
    showError(error.message || 'Sign in failed');
  } finally {
    hideLoading();
  }
}

async function handleSignOut() {
  try {
    await API.call('/auth/signout', { method: 'POST' });
  } catch (error) {
    console.error('Sign out error:', error);
  } finally {
    API.clearToken();
    AppState.currentUser = null;
    AppState.currentHousehold = null;
    showLandingPage();
  }
}

async function checkAuth() {
  const token = API.getToken();
  if (!token) {
    showLandingPage();
    return false;
  }

  try {
    const response = await API.call('/auth/me');
    AppState.currentUser = response.user;
    AppState.currentHousehold = response.household_id;
    return true;
  } catch (error) {
    API.clearToken();
    showLandingPage();
    return false;
  }
}

/* ============================================================================
   PANTRY FUNCTIONS
============================================================================ */

async function loadPantry() {
  try {
    showLoading();
    const items = await API.call('/pantry');
    renderPantryList(items);
  } catch (error) {
    showError('Failed to load pantry');
  } finally {
    hideLoading();
  }
}

async function addPantryItem(itemData) {
  try {
    showLoading();
    const newItem = await API.call('/pantry', {
      method: 'POST',
      body: JSON.stringify(itemData)
    });

    await loadPantry(); // Reload to get updated list
    showSuccess('Item added!');
    return newItem;
  } catch (error) {
    showError('Failed to add item');
  } finally {
    hideLoading();
  }
}

async function updatePantryItem(itemId, itemData) {
  try {
    showLoading();
    await API.call(`/pantry/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData)
    });

    await loadPantry();
    showSuccess('Item updated!');
  } catch (error) {
    showError('Failed to update item');
  } finally {
    hideLoading();
  }
}

async function deletePantryItem(itemId) {
  if (!confirm('Delete this item?')) return;

  try {
    showLoading();
    await API.call(`/pantry/${itemId}`, {
      method: 'DELETE'
    });

    await loadPantry();
    showSuccess('Item deleted!');
  } catch (error) {
    showError('Failed to delete item');
  } finally {
    hideLoading();
  }
}

function renderPantryList(items) {
  const container = document.getElementById('pantry-list');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="empty-state">No pantry items yet. Add your first item!</p>';
    return;
  }

  // Group by category
  const byCategory = {};
  items.forEach(item => {
    const cat = item.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  let html = '';
  for (const [category, categoryItems] of Object.entries(byCategory)) {
    html += `
      <div class="pantry-category">
        <h3 class="category-title">${category}</h3>
        <div class="pantry-items">
          ${categoryItems.map(item => `
            <div class="pantry-item" data-id="${item.id}">
              <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-qty">${item.total_quantity} ${item.unit}</span>
              </div>
              <div class="item-actions">
                <button onclick="editPantryItem(${item.id})" class="btn-icon">✏️</button>
                <button onclick="deletePantryItem(${item.id})" class="btn-icon">🗑️</button>
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
   RECIPE FUNCTIONS
============================================================================ */

async function loadRecipes(searchQuery = '') {
  try {
    showLoading();
    const endpoint = searchQuery ? `/recipes/search?q=${encodeURIComponent(searchQuery)}` : '/recipes';
    const recipes = await API.call(endpoint);
    renderRecipeList(recipes);
  } catch (error) {
    showError('Failed to load recipes');
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
    return;
  }

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
============================================================================ */

async function loadMealPlans() {
  try {
    showLoading();
    const meals = await API.call('/meal-plans');
    renderMealCalendar(meals);
  } catch (error) {
    showError('Failed to load meal plans');
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
============================================================================ */

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
  const app = document.getElementById('app');

  if (landing) landing.style.display = 'block';
  if (app) app.style.display = 'none';
}

function showApp() {
  const landing = document.getElementById('landing-page');
  const app = document.getElementById('app');

  if (landing) landing.style.display = 'none';
  if (app) app.style.display = 'block';

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

  // Check if user is authenticated
  const isAuthenticated = await checkAuth();

  if (isAuthenticated) {
    await loadApp();
  } else {
    showLandingPage();
  }

  // Set up navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      if (view) showView(view);
    });
  });

  // Set up sign out button
  const signOutBtn = document.getElementById('signout-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export functions to global scope for onclick handlers
window.editPantryItem = (id) => console.log('Edit pantry item:', id);
window.deletePantryItem = deletePantryItem;
window.viewRecipe = (id) => console.log('View recipe:', id);
window.editRecipe = (id) => console.log('Edit recipe:', id);
window.deleteRecipe = deleteRecipe;
window.deleteMealPlan = deleteMealPlan;
window.cookMeal = cookMeal;
window.checkShoppingItem = checkShoppingItem;
window.deleteShoppingItem = deleteShoppingItem;
window.clearCheckedItems = clearCheckedItems;
window.addCheckedToPantry = addCheckedToPantry;
window.handleSignUp = handleSignUp;
window.handleSignIn = handleSignIn;
