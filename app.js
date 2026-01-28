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
  // Future: loading spinner
}

function hideLoading() {
  // Future: hide loading spinner
}

// ── Toast Notification System ──
function _getToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = 'info', duration = 4000) {
  const container = _getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✗', info: 'ℹ', sync: '🔄' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    toast.addEventListener('transitionend', () => toast.remove());
    setTimeout(() => toast.remove(), 500);
  }, duration);
}

function showError(message) {
  console.error('Error:', message);
  showToast(message, 'error', 5000);
}

function showSuccess(message) {
  console.log('Success:', message);
  showToast(message, 'success');
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
  const container = document.getElementById('recipes-grid');
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
      category: recipe.category || 'Uncategorized',
      photo: recipe.photo_url || recipe.photo || '',
      tags: recipe.tags || [],
      isFavorite: recipe.is_favorite || recipe.isFavorite || false,
      instructions: recipe.instructions || recipe.method || '',
      ingredients: ingredients
    };
  });

  // Store transformed recipes globally for recipe grid script in index.html
  window.recipes = transformedRecipes;

  // Signal the recipe grid observer to re-render by touching a data attribute.
  // The actual rendering is handled by renderRecipesGrid() in index.html.
  if (container) {
    container.setAttribute('data-updated', Date.now());
  }
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
  // Use the checkout modal instead of confirm prompt
  openCheckoutModal();
}

// Track checked state for auto-generated items (no IDs) in localStorage
function getLocalCheckedItems() {
  try {
    return JSON.parse(localStorage.getItem('checkedShoppingItems') || '{}');
  } catch {
    return {};
  }
}

function setLocalCheckedItem(itemKey, checked) {
  const checkedItems = getLocalCheckedItems();
  if (checked) {
    checkedItems[itemKey] = true;
  } else {
    delete checkedItems[itemKey];
  }
  localStorage.setItem('checkedShoppingItems', JSON.stringify(checkedItems));
}

function clearLocalCheckedItems() {
  localStorage.removeItem('checkedShoppingItems');
}

function renderShoppingList(items) {
  const container = document.getElementById('shopping-list');
  if (!container) return;

  // Store items globally for checkout
  window.shoppingList = items || [];

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="empty-state">Shopping list is empty!</p>';
    return;
  }

  // Get locally tracked checked items
  const localChecked = getLocalCheckedItems();

  // Group by category
  const byCategory = {};
  items.forEach(item => {
    const cat = item.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = [];

    // Create unique key for items without IDs
    const itemKey = item.id || `${item.name}|${item.unit}`;
    // Check if item is checked (from backend or local)
    const isChecked = item.checked || localChecked[itemKey];

    byCategory[cat].push({ ...item, itemKey, isChecked });
  });

  // Add item form at top
  let html = '<div class="shopping-add-item">';
  html += '<input type="text" id="new-shopping-item" placeholder="Add item to list..." class="shopping-input">';
  html += '<button onclick="addShoppingItem()" class="btn btn-primary btn-sm">Add</button>';
  html += '</div>';

  html += '<div class="shopping-actions">';
  html += '<button onclick="openCheckoutModal()" class="btn-primary">Checkout & Add to Pantry</button>';
  html += '<button onclick="clearAllChecked()" class="btn-secondary">Clear Checked</button>';
  html += '</div>';

  for (const [category, categoryItems] of Object.entries(byCategory)) {
    html += `
      <div class="shopping-category">
        <h3 class="category-title">${category}</h3>
        <div class="shopping-items">
          ${categoryItems.map((item, idx) => {
            // Escape special characters for use in attributes and onclick
            const safeItemKey = item.itemKey.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const itemIndex = idx;
            return `
            <div class="shopping-item ${item.isChecked ? 'checked' : ''}" data-key="${safeItemKey}" data-idx="${itemIndex}">
              <label class="shopping-checkbox">
                <input
                  type="checkbox"
                  ${item.isChecked ? 'checked' : ''}
                  onchange="toggleShoppingItem('${safeItemKey}', ${item.id ? `'${item.id}'` : 'null'}, this.checked)"
                >
                <span class="item-name">${item.name}</span>
                <span class="item-qty">${item.quantity} ${item.unit}</span>
              </label>
              ${item.source ? `<span class="item-source">${item.source}</span>` : ''}
              <div class="item-actions">
                <button onclick="editShoppingItem('${safeItemKey}', '${item.name}', ${item.quantity}, '${item.unit}', '${item.category || 'Other'}')" class="btn-icon" title="Edit">✏️</button>
                ${item.id ? `<button onclick="deleteShoppingItem('${item.id}')" class="btn-icon" title="Delete">🗑️</button>` : ''}
              </div>
            </div>
          `}).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  // Focus on add input
  const addInput = document.getElementById('new-shopping-item');
  if (addInput) {
    addInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addShoppingItem();
      }
    });
  }
}

/**
 * Add a new item to shopping list
 */
async function addShoppingItem() {
  const input = document.getElementById('new-shopping-item');
  if (!input) return;

  const name = input.value.trim();
  if (!name) {
    alert('Please enter an item name');
    return;
  }

  try {
    await API.call('/shopping-list/items', {
      method: 'POST',
      body: JSON.stringify({
        name: name,
        quantity: 1,
        unit: 'unit',
        category: 'Other'
      })
    });
    input.value = '';
    await loadShoppingList();
    showSuccess('Item added!');
  } catch (error) {
    console.error('Error adding item:', error);
    showError('Failed to add item');
  }
}

/**
 * Edit a shopping item
 */
function editShoppingItem(itemKey, name, quantity, unit, category) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const savedCategories = getSavedCategories();
  const categoryOptions = savedCategories.map(cat =>
    `<option value="${cat}" ${category === cat ? 'selected' : ''}>${cat}</option>`
  ).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content edit-shopping-modal" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2>Edit Shopping Item</h2>
        <form id="edit-shopping-form">
          <div class="form-group">
            <label>Name</label>
            <input type="text" id="edit-item-name" value="${name}" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Quantity</label>
              <input type="number" id="edit-item-qty" value="${quantity}" step="0.1" min="0.1" required>
            </div>
            <div class="form-group">
              <label>Unit</label>
              <input type="text" id="edit-item-unit" value="${unit}" placeholder="lb, oz, etc">
            </div>
            <div class="form-group">
              <label>Category</label>
              <select id="edit-item-category">
                ${categoryOptions}
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('edit-shopping-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    // For now, just update local state and re-render
    // TODO: If item has ID, update via API
    closeModal();
    showSuccess('Item updated (local only - will sync on next load)');
  };
}

// Expose new functions globally
window.addShoppingItem = addShoppingItem;
window.editShoppingItem = editShoppingItem;

/**
 * Toggle shopping item checked state
 * For items with IDs: update backend
 * For auto-generated items: track locally
 */
async function toggleShoppingItem(itemKey, itemId, checked) {
  if (itemId) {
    // Manual item with ID - update backend
    try {
      await API.call(`/shopping-list/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ checked })
      });
    } catch (error) {
      console.error('Error updating item:', error);
      // Still track locally as fallback
      setLocalCheckedItem(itemKey, checked);
    }
  } else {
    // Auto-generated item - track locally
    setLocalCheckedItem(itemKey, checked);
  }

  // Update UI immediately
  const itemElement = document.querySelector(`[data-key="${itemKey}"]`);
  if (itemElement) {
    itemElement.classList.toggle('checked', checked);
  }
}

/**
 * Clear all checked items
 */
async function clearAllChecked() {
  if (!confirm('Clear all checked items from the list?')) return;

  try {
    // Clear backend manual items
    await API.call('/shopping-list/clear-checked', { method: 'POST' });
    // Clear local tracked items
    clearLocalCheckedItems();
    await loadShoppingList();
    showSuccess('Checked items cleared!');
  } catch (error) {
    showError('Failed to clear items');
  }
}

/**
 * Open checkout modal to confirm details before adding to pantry
 */
function openCheckoutModal() {
  const items = window.shoppingList || [];
  const localChecked = getLocalCheckedItems();

  // Get checked items
  const checkedItems = items.filter(item => {
    const itemKey = item.id || `${item.name}|${item.unit}`;
    return item.checked || localChecked[itemKey];
  });

  if (checkedItems.length === 0) {
    alert('Please check off items you want to add to pantry first.');
    return;
  }

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  // Get saved locations and categories
  const savedLocations = getSavedLocations();
  const savedCategories = getSavedCategories();

  const locationOptions = savedLocations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
  const categoryOptions = savedCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

  // Build item rows
  const itemsHTML = checkedItems.map((item, idx) => `
    <div class="checkout-item" data-idx="${idx}">
      <div class="checkout-item-header">
        <strong>${item.name}</strong>
        <span>${item.quantity} ${item.unit}</span>
      </div>
      <div class="checkout-item-fields">
        <div class="checkout-field">
          <label>Location</label>
          <select class="checkout-location">
            ${locationOptions}
          </select>
        </div>
        <div class="checkout-field">
          <label>Category</label>
          <select class="checkout-category">
            ${categoryOptions.replace(`value="${item.category}"`, `value="${item.category}" selected`)}
          </select>
        </div>
        <div class="checkout-field">
          <label>Quantity</label>
          <input type="number" class="checkout-qty" value="${item.quantity}" min="0.1" step="0.1">
        </div>
        <div class="checkout-field">
          <label>Expiration</label>
          <input type="date" class="checkout-expiry" value="">
        </div>
      </div>
    </div>
  `).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content checkout-modal" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2>🛒 Checkout - Add to Pantry</h2>
        <p class="help-text">Confirm details for each item before adding to your pantry.</p>

        <div class="checkout-items">
          ${itemsHTML}
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="confirmCheckout()">Add All to Pantry</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Confirm checkout and add items to pantry
 */
async function confirmCheckout() {
  const items = window.shoppingList || [];
  const localChecked = getLocalCheckedItems();

  // Get checked items
  const checkedItems = items.filter(item => {
    const itemKey = item.id || `${item.name}|${item.unit}`;
    return item.checked || localChecked[itemKey];
  });

  // Collect form data
  const checkoutRows = document.querySelectorAll('.checkout-item');
  const itemsToAdd = [];

  checkoutRows.forEach((row, idx) => {
    if (idx >= checkedItems.length) return;

    const item = checkedItems[idx];
    const location = row.querySelector('.checkout-location').value;
    const category = row.querySelector('.checkout-category').value;
    const quantity = parseFloat(row.querySelector('.checkout-qty').value) || item.quantity;
    const expiry = row.querySelector('.checkout-expiry').value || null;

    itemsToAdd.push({
      name: item.name,
      unit: item.unit,
      category: category,
      quantity: quantity,
      location: location,
      expiration_date: expiry
    });
  });

  if (itemsToAdd.length === 0) {
    alert('No items to add.');
    return;
  }

  try {
    showLoading();

    // Add each item to pantry
    for (const item of itemsToAdd) {
      // Check if item exists in pantry
      const pantryItem = (window.pantry || []).find(p =>
        p.name.toLowerCase() === item.name.toLowerCase() && p.unit === item.unit
      );

      if (pantryItem) {
        // Update existing item - add to locations
        const existingLocation = pantryItem.locations.find(l => l.location === item.location);
        let newLocations;

        if (existingLocation) {
          // Add to existing location quantity
          newLocations = pantryItem.locations.map(l => {
            if (l.location === item.location) {
              return {
                location: l.location,
                quantity: l.qty + item.quantity,
                expiration_date: item.expiration_date || l.expiry
              };
            }
            return { location: l.location, quantity: l.qty, expiration_date: l.expiry };
          });
        } else {
          // Add new location
          newLocations = [
            ...pantryItem.locations.map(l => ({
              location: l.location,
              quantity: l.qty,
              expiration_date: l.expiry
            })),
            {
              location: item.location,
              quantity: item.quantity,
              expiration_date: item.expiration_date
            }
          ];
        }

        await API.call(`/pantry/${pantryItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({ locations: newLocations })
        });
      } else {
        // Create new pantry item
        await API.call('/pantry/', {
          method: 'POST',
          body: JSON.stringify({
            name: item.name,
            category: item.category,
            unit: item.unit,
            min_threshold: 0,
            locations: [{
              location: item.location,
              quantity: item.quantity,
              expiration_date: item.expiration_date
            }]
          })
        });
      }
    }

    // Clear checked items
    await API.call('/shopping-list/clear-checked', { method: 'POST' });
    clearLocalCheckedItems();

    closeModal();
    await loadPantry();
    await loadShoppingList();
    showSuccess(`Added ${itemsToAdd.length} items to pantry!`);
  } catch (error) {
    console.error('Checkout error:', error);
    showError('Failed to add items to pantry: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Expose functions globally
window.toggleShoppingItem = toggleShoppingItem;
window.clearAllChecked = clearAllChecked;
window.openCheckoutModal = openCheckoutModal;
window.confirmCheckout = confirmCheckout;

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

  // Map view names to radio button IDs
  const radioMap = {
    'pantry': 'nav-pantry',
    'recipes': 'nav-recipes',
    'shopping': 'nav-shopping',
    'planner': 'nav-meal-planning',
    'meal-planning': 'nav-meal-planning',
    'onboarding': 'nav-onboarding'
  };

  const radioId = radioMap[viewName];
  if (radioId) {
    const radio = document.getElementById(radioId);
    if (radio) radio.checked = true;
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
    case 'meal-planning':
      loadMealPlans();
      break;
    case 'shopping':
      loadShoppingList();
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

  // Get saved categories and locations for dropdowns
  const savedCategories = getSavedCategories();
  const savedLocations = getSavedLocations();

  const categoryOptions = savedCategories.map(cat =>
    `<option value="${cat}" ${item.category === cat ? 'selected' : ''}>${cat}</option>`
  ).join('');

  const locationOptions = savedLocations.map(loc =>
    `<option value="${loc}">${loc}</option>`
  ).join('');

  const locations = item.locations || [];
  // Only show location rows if item already has locations (editing) - otherwise start empty (adding)
  const locationsHTML = locations.length > 0 ? locations.map((loc, idx) => `
    <div class="location-row" data-idx="${idx}">
      <select class="loc-name">
        ${savedLocations.map(l => `<option value="${l}" ${loc.location === l ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <input type="number" class="loc-qty" value="${loc.qty || loc.quantity || 0}" step="0.1" min="0" placeholder="Qty">
      <input type="date" class="loc-expiry" value="${loc.expiry || loc.expiration_date || ''}">
      <button type="button" class="btn-icon btn-remove" onclick="this.parentElement.remove()">×</button>
    </div>
  `).join('') : '<p class="help-text" style="margin:0.5rem 0;">Optional - add locations if you want to track where and how much.</p>';

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
                ${categoryOptions}
              </select>
            </div>
            <div class="form-group">
              <label>Unit</label>
              <input type="text" id="ing-unit" value="${item.unit || ''}" placeholder="lb, oz, etc" list="unit-suggestions">
            </div>
            <div class="form-group">
              <label>Min Stock</label>
              <input type="number" id="ing-min" value="${item.min || 0}" step="0.1" min="0">
            </div>
          </div>
          <div class="form-group">
            <label>Locations & Quantities</label>
            <div id="locations-list">${locationsHTML}</div>
            <button type="button" class="btn-secondary btn-sm" onclick="addLocationRowWithDropdown()">+ Add Location</button>
          </div>
          <div class="form-actions">
            ${item.id ? '<button type="button" class="btn btn-danger" onclick="deleteIngredientFromModal(\'' + item.id + '\')">Delete</button>' : ''}
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

async function deleteIngredientFromModal(itemId) {
  if (!confirm('Delete this pantry item? This cannot be undone.')) return;

  try {
    await API.call(`/pantry/${itemId}`, { method: 'DELETE' });
    closeModal();
    showSuccess('Item deleted');
    await loadPantry();
  } catch (error) {
    console.error('Error deleting item:', error);
    showError('Failed to delete item');
  }
}

function addLocationRowWithDropdown() {
  const list = document.getElementById('locations-list');
  if (!list) return;

  const savedLocations = getSavedLocations();
  const locationOptions = savedLocations.map(loc =>
    `<option value="${loc}">${loc}</option>`
  ).join('');

  const row = document.createElement('div');
  row.className = 'location-row';
  row.innerHTML = `
    <select class="loc-name">${locationOptions}</select>
    <input type="number" class="loc-qty" value="1" step="0.1" min="0" placeholder="Qty">
    <input type="date" class="loc-expiry">
    <button type="button" class="btn-icon btn-remove" onclick="this.parentElement.remove()">×</button>
  `;
  list.appendChild(row);
}

// Keep old function for backwards compatibility
function addLocationRow() {
  addLocationRowWithDropdown();
}

async function saveIngredient(itemId) {
  const name = document.getElementById('ing-name').value.trim();
  const category = document.getElementById('ing-category').value;
  const unit = document.getElementById('ing-unit').value.trim() || 'unit';
  const min = parseFloat(document.getElementById('ing-min').value) || 0;

  const locationRows = document.querySelectorAll('.location-row');
  const locations = [];
  locationRows.forEach(row => {
    const locNameEl = row.querySelector('.loc-name');
    // Handle both select and input elements
    const locName = locNameEl ? (locNameEl.value || '').trim() : '';
    const locQty = parseFloat(row.querySelector('.loc-qty')?.value) || 0;
    const locExpiry = row.querySelector('.loc-expiry')?.value || null;
    // Include location even if qty is 0 (means "unknown quantity")
    if (locName) {
      locations.push({ location: locName, quantity: locQty, expiration_date: locExpiry });
    }
  });

  if (!name) {
    alert('Please enter a name');
    return;
  }

  // Locations are now optional - item can exist without specifying where it is

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
  const recipe = recipeId ? window.recipes.find(r => r.id === recipeId) : { name: '', servings: 4, ingredients: [], instructions: '', tags: [], category: '' };
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
      <input type="text" class="ing-unit" value="${ing.unit || ''}" placeholder="unit" list="unit-suggestions">
    </div>
  `).join('') || '<div class="ingredient-row"><input type="text" class="ing-name" placeholder="Ingredient"><input type="number" class="ing-qty" value="1" step="0.1" min="0"><input type="text" class="ing-unit" placeholder="unit" list="unit-suggestions"></div>';

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
              <label>Category</label>
              <select id="recipe-category">
                ${[
                  'Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Lunch & Dinner',
                  'Breakfast & Lunch', 'Appetizer', 'Side', 'Dessert',
                  'Snack', 'Beverage', 'Sauce & Dressing', 'Soup & Stew',
                  'Salad', 'Baked Goods', 'Meal Prep', 'Other'
                ].map(c =>
                  `<option value="${c}" ${(recipe.category || '') === c ? 'selected' : ''}>${c}</option>`
                ).join('')}
              </select>
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
  row.innerHTML = '<input type="text" class="ing-name" placeholder="Ingredient"><input type="number" class="ing-qty" value="1" step="0.1" min="0"><input type="text" class="ing-unit" placeholder="unit" list="unit-suggestions">';
  list.appendChild(row);
}

async function saveRecipe(recipeId) {
  const name = document.getElementById('recipe-name').value.trim();
  const servings = parseInt(document.getElementById('recipe-servings').value) || 4;
  const category = document.getElementById('recipe-category').value;
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
        body: JSON.stringify({ name, category, tags, instructions, ingredients })
      });
    } else {
      await API.call('/recipes/', {
        method: 'POST',
        body: JSON.stringify({ name, category, tags, instructions, ingredients })
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
window.deleteIngredientFromModal = deleteIngredientFromModal;
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
      loadSettings(),  // Load settings first for categories/locations
      loadUnits(),     // Load unit suggestions for autocomplete
      loadPantry(),
      loadRecipes(),
      loadMealPlans(),
      loadShoppingList()
    ]);
  } catch (error) {
    console.error('Error loading initial data:', error);
  }

  // Create global unit datalist for autocomplete
  createUnitDatalist();

  // Wire up UI buttons
  wireUpButtons();

  // Start Realtime sync + visibility fallback
  initRealtime();
  setupVisibilityReload();

  // Show default view
  showView('pantry');
}

/**
 * Load available units for autocomplete
 */
window.cachedUnits = [];

async function loadUnits() {
  try {
    const response = await API.getUnits();
    window.cachedUnits = response.units || [];
    console.log('Units loaded:', window.cachedUnits.length);
  } catch (error) {
    console.warn('Failed to load units, using defaults:', error);
    window.cachedUnits = ['each', 'lb', 'oz', 'cup', 'tbsp', 'tsp', 'gallon', 'g', 'kg', 'ml', 'bunch', 'can', 'bottle', 'bag', 'box'];
  }
}

function createUnitDatalist() {
  // Remove existing if any
  const existing = document.getElementById('unit-suggestions');
  if (existing) existing.remove();

  // Create new datalist
  const datalist = document.createElement('datalist');
  datalist.id = 'unit-suggestions';
  datalist.innerHTML = window.cachedUnits.map(u => `<option value="${u}">`).join('');
  document.body.appendChild(datalist);
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

  // Checkout button - use the checkout modal
  const btnCheckout = document.getElementById('btn-checkout');
  if (btnCheckout) {
    btnCheckout.addEventListener('click', openCheckoutModal);
  }

  // Onboarding/bulk entry buttons
  const btnOnboarding = document.getElementById('btn-onboarding');
  if (btnOnboarding) {
    btnOnboarding.addEventListener('click', () => {
      document.getElementById('nav-onboarding').checked = true;
      initBulkEntry();
    });
  }

  const btnExitOnboarding = document.getElementById('btn-exit-onboarding');
  if (btnExitOnboarding) {
    btnExitOnboarding.addEventListener('click', () => {
      document.getElementById('nav-pantry').checked = true;
    });
  }

  // Bulk entry action buttons
  const btnAddRows = document.getElementById('btn-add-rows-live');
  if (btnAddRows) btnAddRows.addEventListener('click', () => addBulkRows(5));

  const btnClearAll = document.getElementById('btn-clear-all-live');
  if (btnClearAll) btnClearAll.addEventListener('click', clearBulkEntry);

  const btnSaveAll = document.getElementById('btn-save-all-items');
  if (btnSaveAll) btnSaveAll.addEventListener('click', saveBulkEntry);

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

/* ============================================================================
   SAVED LOCATIONS & CATEGORIES (for settings and checkout)
============================================================================ */

// Default locations and categories
const DEFAULT_LOCATIONS = ['Pantry', 'Refrigerator', 'Freezer', 'Cabinet', 'Counter'];
const DEFAULT_CATEGORIES = ['Meat', 'Dairy', 'Produce', 'Pantry', 'Frozen', 'Spices', 'Beverages', 'Snacks', 'Other'];

// Global settings cache (loaded from API)
window.householdSettings = {
  locations: DEFAULT_LOCATIONS,
  categories: DEFAULT_CATEGORIES,
  category_emojis: {}
};

/**
 * Load settings from API
 */
async function loadSettings() {
  try {
    const response = await API.call('/settings/');
    window.householdSettings = {
      locations: response.locations || DEFAULT_LOCATIONS,
      categories: response.categories || DEFAULT_CATEGORIES,
      category_emojis: response.category_emojis || {}
    };
    console.log('Settings loaded from API:', window.householdSettings);
  } catch (error) {
    console.warn('Failed to load settings from API, using defaults:', error);
    // Keep using defaults
  }
}

/**
 * Display mode (compact/comfortable)
 */
function applyDisplayMode() {
  const isCompact = localStorage.getItem('display_mode') === 'compact';
  document.body.classList.toggle('compact', isCompact);
}

function toggleDisplayMode() {
  const isCurrentlyCompact = document.body.classList.contains('compact');
  const newMode = isCurrentlyCompact ? 'comfortable' : 'compact';
  localStorage.setItem('display_mode', newMode);
  document.body.classList.toggle('compact', newMode === 'compact');
  return newMode;
}

function getDisplayMode() {
  return localStorage.getItem('display_mode') || 'comfortable';
}

function getSavedLocations() {
  return window.householdSettings.locations || DEFAULT_LOCATIONS;
}

function setSavedLocations(locations) {
  window.householdSettings.locations = locations;
  // API save happens in saveSettings()
}

function getSavedCategories() {
  return window.householdSettings.categories || DEFAULT_CATEGORIES;
}

function setSavedCategories(categories) {
  window.householdSettings.categories = categories;
  // API save happens in saveSettings()
}

/* ============================================================================
   BULK PANTRY ENTRY
   ============================================================================ */

function initBulkEntry() {
  const tbody = document.getElementById('bulk-entry-tbody-live');
  if (!tbody) return;
  if (tbody.children.length === 0) {
    addBulkRows(5);
  }
  updateBulkEntryCount();
}

function addBulkRows(count) {
  const tbody = document.getElementById('bulk-entry-tbody-live');
  if (!tbody) return;

  const locations = (window.householdSettings?.locations || ['Pantry', 'Refrigerator', 'Freezer', 'Cabinet', 'Counter']);
  const categories = (window.householdSettings?.categories || ['Meat', 'Dairy', 'Produce', 'Pantry', 'Frozen', 'Spices', 'Beverages', 'Snacks', 'Other']);

  const locOptions = locations.map(l => `<option value="${l}">${l}</option>`).join('');
  const catOptions = categories.map(c => `<option value="${c}">${c}</option>`).join('');

  for (let i = 0; i < count; i++) {
    const row = document.createElement('tr');
    row.className = 'bulk-entry-row';
    row.innerHTML = `
      <td><input type="text" class="bulk-name form-control" placeholder="Item name" /></td>
      <td><input type="number" class="bulk-qty form-control" placeholder="Qty" min="0" step="0.5" /></td>
      <td><input type="text" class="bulk-unit form-control" placeholder="unit" list="unit-suggestions" /></td>
      <td><select class="bulk-category form-control">${catOptions}</select></td>
      <td><select class="bulk-location form-control">${locOptions}</select></td>
      <td><button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove();updateBulkEntryCount();">&times;</button></td>
    `;
    tbody.appendChild(row);
  }
  updateBulkEntryCount();
}

function clearBulkEntry() {
  const tbody = document.getElementById('bulk-entry-tbody-live');
  if (!tbody) return;
  tbody.innerHTML = '';
  addBulkRows(5);
}

function updateBulkEntryCount() {
  const countEl = document.getElementById('onboarding-item-count');
  if (!countEl) return;
  const rows = document.querySelectorAll('#bulk-entry-tbody-live .bulk-entry-row');
  let filled = 0;
  rows.forEach(row => {
    const name = row.querySelector('.bulk-name');
    if (name && name.value.trim()) filled++;
  });
  countEl.textContent = `${filled} items entered`;
}

async function saveBulkEntry() {
  const tbody = document.getElementById('bulk-entry-tbody-live');
  const btnText = document.getElementById('btn-save-text');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('.bulk-entry-row');
  const items = [];

  rows.forEach(row => {
    const name = row.querySelector('.bulk-name')?.value.trim();
    if (!name) return;
    const qty = parseFloat(row.querySelector('.bulk-qty')?.value) || 0;
    const unit = row.querySelector('.bulk-unit')?.value.trim() || 'unit';
    const category = row.querySelector('.bulk-category')?.value || 'Other';
    const location = row.querySelector('.bulk-location')?.value || 'Pantry';

    items.push({ name, quantity: qty, unit, category, location });
  });

  if (items.length === 0) {
    showError('No items to save. Enter at least one item name.');
    return;
  }

  if (btnText) btnText.textContent = 'Saving...';

  let savedCount = 0;
  let errorCount = 0;

  for (const item of items) {
    try {
      await API.call('/pantry/', {
        method: 'POST',
        body: JSON.stringify({
          name: item.name,
          category: item.category,
          unit: item.unit,
          min_threshold: 0,
          locations: [{
            location: item.location,
            quantity: item.quantity
          }]
        })
      });
      savedCount++;
    } catch (e) {
      console.error(`Failed to save ${item.name}:`, e);
      errorCount++;
    }
  }

  if (btnText) btnText.textContent = 'Save & Add All Items';

  if (errorCount > 0) {
    showError(`Saved ${savedCount} items. ${errorCount} failed.`);
  } else {
    showSuccess(`${savedCount} items added to pantry!`);
    clearBulkEntry();
    // Reload pantry data
    loadPantry();
  }
}

/**
 * Open account/household management modal
 */
async function openAccountModal() {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  modalRoot.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content account-modal">
        <h2>Loading...</h2>
      </div>
    </div>
  `;

  let userInfo = null;
  let households = [];
  try {
    [userInfo, households] = await Promise.all([
      API.getCurrentUser().catch(() => null),
      API.getMyHouseholds().then(r => r.households).catch(() => [])
    ]);
  } catch (e) {
    console.error('Failed to load account info:', e);
  }

  const email = userInfo?.user?.email || 'Not available';
  const activeHid = API.getActiveHouseholdId() || userInfo?.household_id;
  const activeHousehold = households.find(h => h.id === activeHid);

  const householdOptions = households.map(h => {
    const isActive = h.id === activeHid;
    const label = `${h.name} (${h.role})`;
    return `<option value="${h.id}" ${isActive ? 'selected' : ''}>${label}</option>`;
  }).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content account-modal" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h2>Account & Household</h2>

        <div class="account-section">
          <h3>Your Account</h3>
          <div class="account-info">
            <p><strong>Email:</strong> ${email}</p>
          </div>
        </div>

        ${households.length > 1 ? `
        <div class="account-section">
          <h3>Switch Household</h3>
          <select id="household-switcher" class="form-control" onchange="switchHousehold(this.value)">
            ${householdOptions}
          </select>
        </div>
        ` : `
        <div class="account-section">
          <h3>Household</h3>
          <p>${activeHousehold?.name || 'Your Household'} <span class="status-badge status-connected">${activeHousehold?.role || 'owner'}</span></p>
        </div>
        `}

        <div class="account-section">
          <h3>Members</h3>
          <div id="members-list"><p>Loading members...</p></div>
        </div>

        <div class="account-section">
          <h3>Invite a Member</h3>
          <p class="help-text">Generate a code to share with someone. They enter it here to join your household.</p>
          <div id="invite-section">
            <button class="btn btn-secondary" onclick="generateInviteCode()">Generate Invite Code</button>
          </div>
        </div>

        <div class="account-section">
          <h3>Join a Household</h3>
          <p class="help-text">Enter an invite code from someone to join their household.</p>
          <div style="display:flex;gap:8px;">
            <input type="text" id="accept-invite-input" class="form-control" placeholder="Enter invite code" style="flex:1;text-transform:uppercase;" maxlength="8" />
            <button class="btn btn-primary" onclick="acceptInviteCode()">Join</button>
          </div>
          <div id="accept-invite-status"></div>
        </div>

        <div class="account-section">
          <div class="data-actions" style="display:flex;gap:8px;">
            <button class="btn btn-secondary" onclick="exportData()">Export Data</button>
            <button class="btn btn-danger" onclick="handleLogout()">Sign Out</button>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" onclick="closeModal()">Done</button>
        </div>
      </div>
    </div>
  `;

  // Load members immediately
  loadMembersList();
  loadActiveInvite();
}

async function loadMembersList() {
  const container = document.getElementById('members-list');
  if (!container) return;

  try {
    const data = await API.getHouseholdMembers();
    if (!data.members || data.members.length === 0) {
      container.innerHTML = '<p>No members found.</p>';
      return;
    }

    container.innerHTML = data.members.map(m => {
      const roleClass = m.role === 'owner' ? 'status-connected' : 'status-badge';
      const youLabel = m.is_you ? ' (You)' : '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-color, #333);">
        <span>Member${youLabel}</span>
        <span class="status-badge ${roleClass}">${m.role}</span>
      </div>`;
    }).join('');
  } catch (e) {
    container.innerHTML = '<p>Failed to load members.</p>';
  }
}

async function loadActiveInvite() {
  const container = document.getElementById('invite-section');
  if (!container) return;

  try {
    const data = await API.getActiveInvite();
    if (data.invite) {
      const expiresAt = new Date(data.invite.expires_at);
      const hoursLeft = Math.max(0, Math.round((expiresAt - Date.now()) / 3600000));
      container.innerHTML = `
        <div style="padding:12px;background:var(--card-bg, #1a1a2e);border-radius:8px;text-align:center;">
          <p style="margin:0 0 8px;opacity:0.7;">Active invite code:</p>
          <p style="font-size:1.5rem;font-weight:bold;letter-spacing:4px;margin:0 0 8px;">${data.invite.code}</p>
          <p style="margin:0;opacity:0.5;font-size:0.85rem;">Expires in ${hoursLeft}h</p>
          <button class="btn btn-secondary" style="margin-top:8px;" onclick="copyInviteCode('${data.invite.code}')">Copy Code</button>
        </div>
        <button class="btn btn-secondary" style="margin-top:8px;" onclick="generateInviteCode()">Generate New Code</button>
      `;
    }
  } catch (e) {
    // No active invite, keep the generate button
  }
}

async function generateInviteCode() {
  const container = document.getElementById('invite-section');
  if (!container) return;

  container.innerHTML = '<p>Generating...</p>';

  try {
    const data = await API.createInvite(48);
    container.innerHTML = `
      <div style="padding:12px;background:var(--card-bg, #1a1a2e);border-radius:8px;text-align:center;">
        <p style="margin:0 0 8px;opacity:0.7;">Share this code:</p>
        <p style="font-size:1.5rem;font-weight:bold;letter-spacing:4px;margin:0 0 8px;">${data.code}</p>
        <p style="margin:0;opacity:0.5;font-size:0.85rem;">Expires in ${data.expires_hours}h</p>
        <button class="btn btn-secondary" style="margin-top:8px;" onclick="copyInviteCode('${data.code}')">Copy Code</button>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<p style="color:var(--danger-color,red);">Failed to generate code: ${e.message}</p>
      <button class="btn btn-secondary" onclick="generateInviteCode()">Try Again</button>`;
  }
}

function copyInviteCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    showSuccess('Invite code copied!');
  }).catch(() => {
    // Fallback
    prompt('Copy this invite code:', code);
  });
}

async function acceptInviteCode() {
  const input = document.getElementById('accept-invite-input');
  const statusEl = document.getElementById('accept-invite-status');
  if (!input || !statusEl) return;

  const code = input.value.trim();
  if (!code) {
    statusEl.innerHTML = '<p style="color:var(--danger-color,red);">Please enter a code.</p>';
    return;
  }

  statusEl.innerHTML = '<p>Joining...</p>';

  try {
    const data = await API.acceptInvite(code);
    statusEl.innerHTML = `<p style="color:var(--success-color,#4ade80);">${data.message}</p>`;
    input.value = '';

    // Switch to the new household
    API.setActiveHouseholdId(data.household_id);

    // Refresh the modal after a moment
    setTimeout(() => openAccountModal(), 1500);
    // Reload app data for new household
    setTimeout(() => window.location.reload(), 2000);
  } catch (e) {
    statusEl.innerHTML = `<p style="color:var(--danger-color,red);">${e.message}</p>`;
  }
}

async function switchHousehold(householdId) {
  API.setActiveHouseholdId(householdId);
  showSuccess('Switching household...');
  // Reload to fetch data for new household
  setTimeout(() => window.location.reload(), 500);
}

function exportData() {
  // Export pantry, recipes, and planner data as JSON
  const data = {
    pantry: window.pantry || [],
    recipes: window.recipes || [],
    planner: window.planner || {},
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chefs-kiss-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showSuccess('Data exported!');
}

async function handleLogout() {
  if (!confirm('Are you sure you want to sign out?')) return;

  try {
    cleanupRealtime();
    await API.signOut();
    showSuccess('Signed out successfully');
    closeModal();
    showLandingPage();
  } catch (error) {
    console.error('Logout error:', error);
    showError('Failed to sign out');
  }
}

/**
 * Open settings modal - for managing categories and locations
 */
function openSettingsModal() {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const locations = getSavedLocations();
  const categories = getSavedCategories();

  const locationsHTML = locations.map((loc, idx) => `
    <div class="setting-item" data-idx="${idx}">
      <input type="text" value="${loc}" class="location-input">
      <button type="button" class="btn-icon btn-remove" onclick="removeLocation(${idx})">×</button>
    </div>
  `).join('');

  const emojis = (window.householdSettings && window.householdSettings.category_emojis) || {};
  const categoriesHTML = categories.map((cat, idx) => `
    <div class="setting-item" data-idx="${idx}">
      <button type="button" class="btn-emoji-pick" data-idx="${idx}" onclick="openEmojiPicker(this)" title="Pick icon">${emojis[cat] || getCategoryDefaultEmoji(cat)}</button>
      <input type="text" value="${cat}" class="category-input">
      <button type="button" class="btn-icon btn-remove" onclick="removeCategory(${idx})">×</button>
    </div>
  `).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content settings-modal" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2>⚙️ Settings</h2>

        <div class="settings-section">
          <h3>Storage Locations</h3>
          <p class="help-text">Customize where you store items in your kitchen.</p>
          <div id="locations-list" class="settings-list">
            ${locationsHTML}
          </div>
          <button type="button" class="btn btn-sm btn-secondary" onclick="addLocation()">+ Add Location</button>
        </div>

        <div class="settings-section">
          <h3>Item Categories</h3>
          <p class="help-text">Organize your pantry and shopping list by category.</p>
          <div id="categories-list" class="settings-list">
            ${categoriesHTML}
          </div>
          <button type="button" class="btn btn-sm btn-secondary" onclick="addCategory()">+ Add Category</button>
        </div>

        <div class="settings-section">
          <h3>Expiration Alerts</h3>
          <div class="form-group">
            <label>Alert me about items expiring within:</label>
            <select id="setting-expiration-days">
              <option value="1" ${localStorage.getItem('expirationDays') === '1' ? 'selected' : ''}>1 day</option>
              <option value="3" ${localStorage.getItem('expirationDays') === '3' || !localStorage.getItem('expirationDays') ? 'selected' : ''}>3 days</option>
              <option value="5" ${localStorage.getItem('expirationDays') === '5' ? 'selected' : ''}>5 days</option>
              <option value="7" ${localStorage.getItem('expirationDays') === '7' ? 'selected' : ''}>7 days</option>
            </select>
          </div>
        </div>

        <div class="settings-section">
          <h3>Display</h3>
          <div class="form-group" style="display:flex;align-items:center;gap:1rem;">
            <label style="margin:0;">Layout density:</label>
            <button type="button" class="btn btn-sm ${getDisplayMode() === 'compact' ? 'btn-primary' : 'btn-secondary'}"
                    onclick="this.textContent = toggleDisplayMode() === 'compact' ? 'Compact' : 'Comfortable'; this.classList.toggle('btn-primary'); this.classList.toggle('btn-secondary');">
              ${getDisplayMode() === 'compact' ? 'Compact' : 'Comfortable'}
            </button>
          </div>
          <p class="help-text">Compact mode shows more content with less spacing.</p>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="resetSettingsToDefaults()">Reset to Defaults</button>
          <button type="button" class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
        </div>
      </div>
    </div>
  `;
}

function addLocation() {
  const list = document.getElementById('locations-list');
  if (!list) return;
  const idx = list.children.length;
  const div = document.createElement('div');
  div.className = 'setting-item';
  div.dataset.idx = idx;
  div.innerHTML = `
    <input type="text" value="" class="location-input" placeholder="New location">
    <button type="button" class="btn-icon btn-remove" onclick="removeLocation(${idx})">×</button>
  `;
  list.appendChild(div);
  div.querySelector('input').focus();
}

function removeLocation(idx) {
  const list = document.getElementById('locations-list');
  if (!list) return;
  const item = list.querySelector(`[data-idx="${idx}"]`);
  if (item) item.remove();
}

const FOOD_EMOJI_OPTIONS = [
  '🥩','🧈','🥬','🫙','🧊','🌶️','🥤','🍿','🌾','🧁','🥫','🫗','🐟','🥪',
  '🍎','🥕','🥚','🍞','🧀','🍗','🥦','🌽','🍋','🫒','🍯','🥜','🍝','🍚',
  '🫘','🥥','🍫','🧃','🍵','☕','🧂','🫧','🛒','📦'
];

function getCategoryDefaultEmoji(category) {
  const defaults = {
    'Meat': '🥩', 'Dairy': '🧈', 'Produce': '🥬', 'Pantry': '🫙',
    'Frozen': '🧊', 'Spices': '🌶️', 'Beverages': '🥤', 'Snacks': '🍿',
    'Grains': '🌾', 'Baking': '🧁', 'Canned Goods': '🥫', 'Condiments': '🫗',
    'Seafood': '🐟', 'Deli': '🥪', 'Other': '📦'
  };
  return defaults[category] || '📦';
}

function openEmojiPicker(btn) {
  // Close any existing picker
  document.querySelectorAll('.emoji-picker-dropdown').forEach(el => el.remove());

  const picker = document.createElement('div');
  picker.className = 'emoji-picker-dropdown';
  picker.innerHTML = FOOD_EMOJI_OPTIONS.map(e =>
    `<button type="button" class="emoji-option" onclick="selectEmoji(this, '${e}')">${e}</button>`
  ).join('');
  btn.style.position = 'relative';
  btn.parentElement.style.position = 'relative';
  btn.parentElement.appendChild(picker);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function closePicker(e) {
      if (!picker.contains(e.target) && e.target !== btn) {
        picker.remove();
        document.removeEventListener('click', closePicker);
      }
    });
  }, 0);
}

function selectEmoji(optionBtn, emoji) {
  const settingItem = optionBtn.closest('.setting-item');
  const emojiBtn = settingItem.querySelector('.btn-emoji-pick');
  emojiBtn.textContent = emoji;
  settingItem.querySelector('.emoji-picker-dropdown').remove();
}

function addCategory() {
  const list = document.getElementById('categories-list');
  if (!list) return;
  const idx = list.children.length;
  const div = document.createElement('div');
  div.className = 'setting-item';
  div.dataset.idx = idx;
  div.innerHTML = `
    <button type="button" class="btn-emoji-pick" data-idx="${idx}" onclick="openEmojiPicker(this)" title="Pick icon">📦</button>
    <input type="text" value="" class="category-input" placeholder="New category">
    <button type="button" class="btn-icon btn-remove" onclick="removeCategory(${idx})">×</button>
  `;
  list.appendChild(div);
  div.querySelector('input').focus();
}

function removeCategory(idx) {
  const list = document.getElementById('categories-list');
  if (!list) return;
  const item = list.querySelector(`[data-idx="${idx}"]`);
  if (item) item.remove();
}

async function resetSettingsToDefaults() {
  if (!confirm('Reset all settings to defaults?')) return;

  try {
    showLoading();

    // Save defaults to API
    await API.call('/settings/', {
      method: 'PUT',
      body: JSON.stringify({
        locations: DEFAULT_LOCATIONS,
        categories: DEFAULT_CATEGORIES
      })
    });

    // Update local cache
    window.householdSettings.locations = DEFAULT_LOCATIONS;
    window.householdSettings.categories = DEFAULT_CATEGORIES;

    localStorage.setItem('expirationDays', '3');
    openSettingsModal(); // Refresh modal
    showSuccess('Settings reset to defaults');
  } catch (error) {
    console.error('Failed to reset settings:', error);
    showError('Failed to reset settings');
  } finally {
    hideLoading();
  }
}

async function saveSettings() {
  // Collect locations
  const locationInputs = document.querySelectorAll('.location-input');
  const locations = [];
  locationInputs.forEach(input => {
    const val = input.value.trim();
    if (val) locations.push(val);
  });

  // Collect categories and their emoji mappings
  const categoryItems = document.querySelectorAll('#categories-list .setting-item');
  const categories = [];
  const category_emojis = {};
  categoryItems.forEach(item => {
    const input = item.querySelector('.category-input');
    const emojiBtn = item.querySelector('.btn-emoji-pick');
    const val = input ? input.value.trim() : '';
    if (val) {
      categories.push(val);
      if (emojiBtn) {
        category_emojis[val] = emojiBtn.textContent.trim();
      }
    }
  });

  // Save expiration days (still local - per-user preference)
  const expirationDays = document.getElementById('setting-expiration-days').value;

  // Validate
  if (locations.length === 0) {
    alert('You need at least one location.');
    return;
  }
  if (categories.length === 0) {
    alert('You need at least one category.');
    return;
  }

  try {
    showLoading();

    // Save to API
    const response = await API.call('/settings/', {
      method: 'PUT',
      body: JSON.stringify({ locations, categories, category_emojis })
    });

    // Update local cache
    window.householdSettings.locations = response.locations || locations;
    window.householdSettings.categories = response.categories || categories;
    window.householdSettings.category_emojis = response.category_emojis || category_emojis;

    // Save expiration days locally (user preference)
    localStorage.setItem('expirationDays', expirationDays);

    closeModal();
    showSuccess('Settings saved!');

    // Reload pantry to update category emojis
    if (window.reloadCategoryEmojis) {
      window.reloadCategoryEmojis();
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    showError('Failed to save settings');
  } finally {
    hideLoading();
  }
}

// Expose functions globally
window.addLocation = addLocation;
window.removeLocation = removeLocation;
window.addCategory = addCategory;
window.removeCategory = removeCategory;
window.openEmojiPicker = openEmojiPicker;
window.selectEmoji = selectEmoji;
window.getCategoryDefaultEmoji = getCategoryDefaultEmoji;
window.resetSettingsToDefaults = resetSettingsToDefaults;
window.saveSettings = saveSettings;
window.loadSettings = loadSettings;
window.toggleDisplayMode = toggleDisplayMode;
window.getDisplayMode = getDisplayMode;
window.handleLogout = handleLogout;

// Expose functions globally
window.openAccountModal = openAccountModal;
window.openSettingsModal = openSettingsModal;
window.generateInviteCode = generateInviteCode;
window.copyInviteCode = copyInviteCode;
window.acceptInviteCode = acceptInviteCode;
window.switchHousehold = switchHousehold;
window.exportData = exportData;
window.updateBulkEntryCount = updateBulkEntryCount;
window.loadPantry = loadPantry;
window.loadRecipes = loadRecipes;
window.loadShoppingList = loadShoppingList;
window.loadMealPlans = loadMealPlans;
window.loadUnits = loadUnits;
window.markLocalWrite = markLocalWrite;
window.showToast = showToast;

/* ============================================================================
   SUPABASE REALTIME SYNC
============================================================================ */

let _supabaseClient = null;
let _realtimeChannel = null;

// Track our own recent writes so we don't double-reload on our own changes
let _lastLocalWrite = 0;
const LOCAL_WRITE_DEBOUNCE = 2000; // ignore events within 2s of our own write

function markLocalWrite() {
  _lastLocalWrite = Date.now();
}

async function initRealtime() {
  try {
    const config = await API.call('/realtime/config');
    if (!config || !config.supabase_url || !config.anon_key) {
      console.warn('Realtime not configured on backend.');
      return;
    }

    const { createClient } = window.supabase;
    if (!createClient) {
      console.warn('Supabase JS client not loaded.');
      return;
    }

    _supabaseClient = createClient(config.supabase_url, config.anon_key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const householdId = API.getActiveHouseholdId();
    if (!householdId) {
      console.warn('No active household for Realtime subscriptions.');
      return;
    }

    // Subscribe to all core tables for this household
    _realtimeChannel = _supabaseClient
      .channel(`household-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pantry_items', filter: `household_id=eq.${householdId}` }, (payload) => {
        handleRealtimeEvent('pantry', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pantry_locations', filter: `household_id=eq.${householdId}` }, (payload) => {
        handleRealtimeEvent('pantry', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes', filter: `household_id=eq.${householdId}` }, (payload) => {
        handleRealtimeEvent('recipes', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_plans', filter: `household_id=eq.${householdId}` }, (payload) => {
        handleRealtimeEvent('meals', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list_items', filter: `household_id=eq.${householdId}` }, (payload) => {
        handleRealtimeEvent('shopping', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list_checked', filter: `household_id=eq.${householdId}` }, (payload) => {
        handleRealtimeEvent('shopping', payload);
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connected — live sync active');
        }
      });

  } catch (error) {
    console.warn('Failed to initialize Realtime:', error);
  }
}

// Debounce reload calls per section to avoid rapid-fire reloads
const _realtimeReloadTimers = {};

function handleRealtimeEvent(section, payload) {
  // Skip if this was our own write (within debounce window)
  if (Date.now() - _lastLocalWrite < LOCAL_WRITE_DEBOUNCE) return;

  // Debounce: if multiple events fire for the same section within 500ms, batch them
  if (_realtimeReloadTimers[section]) {
    clearTimeout(_realtimeReloadTimers[section]);
  }

  _realtimeReloadTimers[section] = setTimeout(() => {
    delete _realtimeReloadTimers[section];
    reloadSection(section, payload.eventType);
  }, 500);
}

async function reloadSection(section, eventType) {
  const actionLabel = eventType === 'DELETE' ? 'removed' : 'updated';
  try {
    switch (section) {
      case 'pantry':
        await loadPantry();
        showToast(`Pantry ${actionLabel} by another user`, 'sync', 3000);
        break;
      case 'recipes':
        await loadRecipes();
        showToast(`Recipes ${actionLabel} by another user`, 'sync', 3000);
        break;
      case 'meals':
        await loadMealPlans();
        showToast(`Meal plan ${actionLabel} by another user`, 'sync', 3000);
        break;
      case 'shopping':
        await loadShoppingList();
        showToast(`Shopping list ${actionLabel} by another user`, 'sync', 3000);
        break;
    }
  } catch (err) {
    console.error(`Failed to reload ${section}:`, err);
  }
}

function cleanupRealtime() {
  if (_realtimeChannel && _supabaseClient) {
    _supabaseClient.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }
}

// ── Visibility Change Fallback ──
// Reload stale data when user switches back to the tab
let _lastVisibilityReload = 0;
const VISIBILITY_RELOAD_COOLDOWN = 30000; // 30s minimum between visibility reloads

function setupVisibilityReload() {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - _lastVisibilityReload < VISIBILITY_RELOAD_COOLDOWN) return;
    if (!API.getToken()) return;

    _lastVisibilityReload = Date.now();
    console.log('Tab visible — refreshing data');
    try {
      await Promise.all([loadPantry(), loadRecipes(), loadMealPlans(), loadShoppingList()]);
    } catch (err) {
      console.warn('Visibility reload failed:', err);
    }
  });
}

async function initApp() {
  console.log('🍳 Chef\'s Kiss - Python Age 5.0');
  console.log('Backend:', window.CONFIG?.API_BASE || 'http://localhost:8000/api');

  // Apply compact mode if enabled
  applyDisplayMode();

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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });
} else {
  initApp();
}
