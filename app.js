/* ---------------------------------------------------
   CORE DATA MODELS
--------------------------------------------------- */

// Shared ID generator
function uid() {
  return Math.random().toString(36).substr(2, 9);
}

// Pantry - Multi-location data model
let pantry = JSON.parse(localStorage.getItem("pantry") || "[]");

// Track which categories are collapsed
const pantryCollapsedCategories = new Set();

// Migrate old pantry data to new multi-location structure
function migratePantryData() {
  let needsMigration = false;

  pantry = pantry.map(item => {
    // Check if this is old structure (has direct qty/location fields)
    if (item.qty !== undefined && !item.locations) {
      needsMigration = true;
      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        category: item.category || "Other",
        min: item.min || 0,
        locations: [{
          id: uid(),
          location: item.location || "Pantry",
          qty: item.qty || 0,
          expiry: item.expiry || ""
        }],
        totalQty: item.qty || 0,
        notes: item.notes || ""
      };
    }

    // Already migrated, ensure totalQty is correct
    if (item.locations) {
      item.totalQty = item.locations.reduce((sum, loc) => sum + (loc.qty || 0), 0);
    }

    return item;
  });

  if (needsMigration) {
    savePantry();
  }
}

async function savePantry() {
  // Save to localStorage (for offline mode)
  localStorage.setItem("pantry", JSON.stringify(pantry));

  // Save to database if authenticated
  if (window.db && window.auth && window.auth.isAuthenticated()) {
    // Note: We don't await here to avoid blocking the UI
    // Database sync happens in background
    window.db.syncAllData(pantry, recipes, planner, []).catch(err => {
      console.error('Background sync failed:', err);
    });
  }
}

function getIngredient(id) {
  return pantry.find(item => item.id === id);
}

function getTotalQty(ingredient) {
  if (!ingredient.locations) return 0;
  return ingredient.locations.reduce((sum, loc) => sum + (loc.qty || 0), 0);
}

// Recipes
let recipes = JSON.parse(localStorage.getItem("recipes") || "[]");

async function saveRecipes() {
  // Save to localStorage (for offline mode)
  localStorage.setItem("recipes", JSON.stringify(recipes));

  // Save to database if authenticated
  if (window.db && window.auth && window.auth.isAuthenticated()) {
    window.db.syncAllData(pantry, recipes, planner, []).catch(err => {
      console.error('Background sync failed:', err);
    });
  }
}

function getRecipe(id) {
  return recipes.find(r => r.id === id);
}

// Planner (YYYY-MM-DD → [{id, recipeId, mealType, cooked}])
let planner = JSON.parse(localStorage.getItem("planner") || "{}");

// Migrate old planner format (single recipeId) to new format (array of meals)
function migratePlannerData() {
  let needsMigration = false;

  Object.keys(planner).forEach(dateStr => {
    // Check if old format (string recipeId instead of array)
    if (typeof planner[dateStr] === 'string') {
      needsMigration = true;
      planner[dateStr] = [{
        id: uid(),
        recipeId: planner[dateStr],
        mealType: "Dinner",
        cooked: false
      }];
    }
  });

  if (needsMigration) {
    savePlanner();
  }
}

async function savePlanner() {
  // Save to localStorage (for offline mode)
  localStorage.setItem("planner", JSON.stringify(planner));

  // Save to database if authenticated
  if (window.db && window.auth && window.auth.isAuthenticated()) {
    window.db.syncAllData(pantry, recipes, planner, []).catch(err => {
      console.error('Background sync failed:', err);
    });
  }
}

function getPlannedMeals(date) {
  return planner[date] || [];
}

function addPlannedMeal(date, recipeId, mealType = "Dinner") {
  if (!planner[date]) {
    planner[date] = [];
  }

  planner[date].push({
    id: uid(),
    recipeId,
    mealType,
    cooked: false
  });

  savePlanner();
}

function removePlannedMeal(date, mealId) {
  if (!planner[date]) return;

  planner[date] = planner[date].filter(meal => meal.id !== mealId);

  // Clean up empty dates
  if (planner[date].length === 0) {
    delete planner[date];
  }

  savePlanner();
}

function clearPlannedDay(date) {
  delete planner[date];
  savePlanner();
}

function markMealCooked(date, mealId) {
  if (!planner[date]) return;

  const meal = planner[date].find(m => m.id === mealId);
  if (meal) {
    meal.cooked = true;
    savePlanner();
  }
}

// Shopping
let shopping = JSON.parse(localStorage.getItem("shopping") || "[]");

function saveShopping() {
  localStorage.setItem("shopping", JSON.stringify(shopping));
}

function clearShopping() {
  shopping = [];
  saveShopping();
}

function addShoppingItem({ name, qty, unit, category, source }) {
  shopping.push({
    id: uid(),
    name,
    recommendedQty: Number(qty),
    actualQty: Number(qty), // User can edit this
    unit,
    category,
    source, // "Threshold", "Planner", "Custom"
    checked: false
  });
  saveShopping();
}

function findShoppingItem(name, unit) {
  return shopping.find(i => i.name === name && i.unit === unit);
}

/* ---------------------------------------------------
   UNIFIED MODAL FRAMEWORK
--------------------------------------------------- */

function closeModal() {
  const overlay = document.querySelector(".modal-overlay");
  if (overlay) overlay.remove();
}

function openCardModal({ title, subtitle = "", contentHTML = "", actions = [], slideout = false }) {
  closeModal();

  const overlay = document.createElement("div");
  overlay.className = slideout ? "modal-overlay modal-overlay-slideout" : "modal-overlay";

  const card = document.createElement("div");
  card.className = slideout ? "modal-card modal-card-slideout" : "modal-card";

  const closeBtn = document.createElement("div");
  closeBtn.className = "modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", closeModal);

  const titleEl = document.createElement("div");
  titleEl.className = "modal-card-title";
  titleEl.textContent = title;

  const subtitleEl = document.createElement("div");
  subtitleEl.className = "modal-card-subtitle";
  subtitleEl.textContent = subtitle;

  const dividerTop = document.createElement("div");
  dividerTop.className = "modal-divider";

  const contentEl = document.createElement("div");
  contentEl.className = "modal-content";
  contentEl.innerHTML = contentHTML;

  const dividerBottom = document.createElement("div");
  dividerBottom.className = "modal-divider";

  const actionsRow = document.createElement("div");
  actionsRow.className = "modal-actions";

  actions.forEach(action => {
    const btn = document.createElement("button");
    btn.textContent = action.label;
    btn.className = `btn ${action.class || ""}`;
    btn.addEventListener("click", action.onClick);
    actionsRow.appendChild(btn);
  });

  card.appendChild(closeBtn);
  card.appendChild(titleEl);
  if (subtitle) card.appendChild(subtitleEl);
  card.appendChild(dividerTop);
  card.appendChild(contentEl);
  card.appendChild(dividerBottom);
  card.appendChild(actionsRow);

  overlay.appendChild(card);
  document.getElementById("modal-root").appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escHandler);
    }
  });
}

/* ---------------------------------------------------
   MODAL CONTENT HELPERS
--------------------------------------------------- */

function modalField({ label, type = "text", value = "", options = [], placeholder = "", rows = 3 }) {
  let inputHTML = "";

  if (type === "select") {
    inputHTML = `
      <select>
        ${options.map(opt => {
          const selected = opt === value ? "selected" : "";
          return `<option ${selected}>${opt}</option>`;
        }).join("")}
      </select>
    `;
  } else if (type === "textarea") {
    inputHTML = `
      <textarea rows="${rows}" placeholder="${placeholder}">${value}</textarea>
    `;
  } else {
    inputHTML = `
      <input type="${type}" value="${value}" placeholder="${placeholder}">
    `;
  }

  return `
    <div class="modal-field">
      <label>${label}</label>
      ${inputHTML}
    </div>
  `;
}

function modalRow(fieldsArray) {
  return `
    <div class="modal-fields">
      ${fieldsArray.join("")}
    </div>
  `;
}

function modalFull(content) {
  return `
    <div class="modal-fields-full">
      ${content}
    </div>
  `;
}

function modalIngredientRow({ ingredient = "", qty = "", unit = "" }) {
  return `
    <div class="modal-ingredient-row">
      <input type="text" class="ing-name" value="${ingredient}" placeholder="Ingredient (e.g., Chicken Breast)">
      <input type="number" class="ing-qty" value="${qty}" placeholder="Qty" step="0.01" min="0">
      <input type="text" class="ing-unit" value="${unit}" placeholder="Unit (e.g., lbs, cups)">
      <button class="modal-remove-row" type="button">&times;</button>
    </div>
  `;
}

/* ---------------------------------------------------
   PANTRY: MODAL + SAVE + RENDER
--------------------------------------------------- */

function modalLocationRow({ location = "", qty = "", expiry = "" }) {
  return `
    <div class="modal-location-row">
      <select class="location-select">
        <option ${location === "Pantry" ? "selected" : ""}>Pantry</option>
        <option ${location === "Fridge" ? "selected" : ""}>Fridge</option>
        <option ${location === "Freezer" ? "selected" : ""}>Freezer</option>
        <option ${location === "Cellar" ? "selected" : ""}>Cellar</option>
        <option ${location === "Other" ? "selected" : ""}>Other</option>
      </select>
      <input type="number" value="${qty}" placeholder="Qty" step="0.01">
      <input type="date" value="${expiry}" placeholder="Expiry">
      <button class="modal-remove-row" type="button">&times;</button>
    </div>
  `;
}

function openIngredientModal(existing = null) {
  const isEdit = !!existing;

  const title = isEdit ? "Edit Ingredient" : "Add Ingredient";
  const subtitle = isEdit
    ? "Update your pantry item."
    : "Keep your pantry honest and human.";

  const locationRows = (existing && existing.locations ? existing.locations : [{location: "Pantry", qty: "", expiry: ""}])
    .map(loc => modalLocationRow({
      location: loc.location,
      qty: loc.qty,
      expiry: loc.expiry || ""
    }))
    .join("");

  const contentHTML = `
    ${modalRow([
      modalField({
        label: "Ingredient Name",
        value: existing ? existing.name : "",
        placeholder: "e.g., Chicken Breast, Garlic, etc."
      }),
      modalField({
        label: "Unit of Measure",
        value: existing ? existing.unit : "",
        placeholder: "e.g., lbs, cups, pieces"
      })
    ])}

    ${modalRow([
      modalField({
        label: "Minimum Threshold",
        type: "number",
        value: existing ? existing.min : "",
        placeholder: "Restock when below this amount"
      }),
      modalField({
        label: "Category",
        type: "select",
        options: ["Meat", "Dairy", "Produce", "Pantry", "Frozen", "Spices", "Other"],
        value: existing ? existing.category : ""
      })
    ])}

    ${modalFull(`
      <label style="font-weight:600; margin-bottom:0.35rem;">Storage Locations</label>
      <div id="modal-location-list">
        ${locationRows}
      </div>
      <button class="modal-add-row" id="add-location-row" type="button">+ Add Location</button>
    `)}
  `;

  openCardModal({
    title,
    subtitle,
    contentHTML,
    slideout: true,
    actions: [
      {
        label: isEdit ? "Save Changes" : "Add Ingredient",
        class: "btn-primary",
        onClick: () => saveIngredient(existing)
      },
      {
        label: "Cancel",
        class: "btn-secondary",
        onClick: closeModal
      },
      ...(isEdit ? [{
        label: "Delete",
        class: "btn-secondary btn-danger",
        onClick: () => deleteIngredient(existing)
      }] : [])
    ]
  });

  // Add location row functionality
  const addBtn = document.getElementById("add-location-row");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const list = document.getElementById("modal-location-list");
      if (list) {
        list.insertAdjacentHTML("beforeend", modalLocationRow({}));
        attachLocationRowListeners();
      }
    });
  }

  attachLocationRowListeners();
}

function attachLocationRowListeners() {
  const removeButtons = document.querySelectorAll(".modal-remove-row");
  removeButtons.forEach(btn => {
    btn.onclick = (e) => {
      e.target.closest(".modal-location-row").remove();
    };
  });
}

function saveIngredient(existing) {
  const modal = document.querySelector(".modal-card");
  const fields = modal.querySelectorAll(".modal-field input, .modal-field select");
  const values = Array.from(fields).map(f => f.value.trim());

  const [
    name,
    unit,
    min,
    category
  ] = values;

  if (!name) {
    alert("Ingredient name is required.");
    return;
  }

  // Collect location data
  const locationRows = modal.querySelectorAll(".modal-location-row");
  const locations = Array.from(locationRows).map(row => {
    const inputs = row.querySelectorAll("input, select");
    return {
      id: uid(),
      location: inputs[0].value,
      qty: Number(inputs[1].value || 0),
      expiry: inputs[2].value || ""
    };
  }).filter(loc => loc.qty > 0); // Only keep locations with qty

  const totalQty = locations.reduce((sum, loc) => sum + loc.qty, 0);

  // Check for duplicates (same name + unit)
  const duplicate = pantry.find(p =>
    p.name.toLowerCase() === name.toLowerCase() &&
    p.unit.toLowerCase() === unit.toLowerCase() &&
    (!existing || p.id !== existing.id)
  );

  if (duplicate) {
    if (confirm(`An item "${duplicate.name}" (${duplicate.unit}) already exists in your pantry. Do you want to merge these items together?`)) {
      // Merge locations
      locations.forEach(newLoc => {
        const existingLoc = duplicate.locations.find(l => l.location === newLoc.location);
        if (existingLoc) {
          existingLoc.qty += newLoc.qty;
          // Keep the earliest expiry date if both exist
          if (newLoc.expiry && (!existingLoc.expiry || new Date(newLoc.expiry) < new Date(existingLoc.expiry))) {
            existingLoc.expiry = newLoc.expiry;
          }
        } else {
          duplicate.locations.push(newLoc);
        }
      });

      // Update duplicate's totalQty and min (take max of the two)
      duplicate.totalQty = duplicate.locations.reduce((sum, loc) => sum + loc.qty, 0);
      duplicate.min = Math.max(duplicate.min, Number(min || 0));

      // If we were editing an item, remove the old one
      if (existing) {
        pantry = pantry.filter(p => p.id !== existing.id);
      }

      savePantry();
      renderPantry();
      generateShoppingList();
      updateDashboard();
      closeModal();
      return;
    } else {
      // User declined merge, don't save
      return;
    }
  }

  if (existing) {
    existing.name = name;
    existing.unit = unit;
    existing.min = Number(min || 0);
    existing.category = category;
    existing.locations = locations;
    existing.totalQty = totalQty;
  } else {
    pantry.push({
      id: uid(),
      name,
      unit,
      category,
      min: Number(min || 0),
      locations,
      totalQty,
      notes: ""
    });
  }

  savePantry();
  renderPantry();
  generateShoppingList();
  updateDashboard();
  closeModal();
}

function deleteIngredient(item) {
  if (!confirm(`Delete "${item.name}"? This will remove it from your pantry.`)) {
    return;
  }

  // Remove from pantry
  pantry = pantry.filter(p => p.id !== item.id);
  savePantry();

  // Update everything
  renderPantry();
  generateShoppingList();
  updateDashboard();
  closeModal();
}

function renderPantry() {
  // Use the filter function to respect any active filters
  applyPantryFilter();
}

/* ---------------------------------------------------
   RECIPES: MODAL + SAVE + RENDER + VIEW
--------------------------------------------------- */

function openRecipeModal(existing = null) {
  const isEdit = !!existing;

  const title = isEdit ? "Edit Recipe" : "New Recipe";
  const subtitle = isEdit
    ? "Update your cozy kitchen creation."
    : "Add a new recipe to your box.";

  const ingredientRows = (existing && existing.ingredients ? existing.ingredients : [])
    .map(ing => modalIngredientRow({
      ingredient: ing.name,
      qty: ing.qty,
      unit: ing.unit
    }))
    .join("");

  const contentHTML = `
    ${modalRow([
      modalField({
        label: "Recipe Name",
        value: existing ? existing.name : "",
        placeholder: "e.g., Grandma's Chicken Soup"
      }),
      modalField({
        label: "Servings",
        type: "number",
        value: existing ? existing.servings : "",
        placeholder: "e.g., 4"
      })
    ])}

    ${modalFull(`
      ${modalField({
        label: "Photo URL (optional)",
        value: existing ? (existing.photo || "") : "",
        placeholder: "https://example.com/recipe-photo.jpg"
      })}
    `)}

    ${modalFull(`
      <label style="font-weight:600; margin-bottom:0.35rem;">Ingredients</label>
      <div id="modal-ingredient-list">
        ${ingredientRows}
      </div>
      <button class="modal-add-row" id="add-ingredient-row">+ Add Ingredient</button>
    `)}

    ${modalFull(`
      ${modalField({
        label: "Instructions",
        type: "textarea",
        value: existing ? (existing.instructions || "") : "",
        rows: 6,
        placeholder: "Step-by-step cooking instructions..."
      })}
    `)}
  `;

  openCardModal({
    title,
    subtitle,
    contentHTML,
    slideout: true,
    actions: [
      {
        label: isEdit ? "Save Changes" : "Add Recipe",
        class: "btn-primary",
        onClick: () => saveRecipe(existing)
      },
      {
        label: "Cancel",
        class: "btn-secondary",
        onClick: closeModal
      }
    ]
  });

  const addBtn = document.getElementById("add-ingredient-row");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const list = document.getElementById("modal-ingredient-list");
      if (list) {
        list.insertAdjacentHTML("beforeend", modalIngredientRow({}));
        attachIngredientRowListeners();
      }
    });
  }

  attachIngredientRowListeners();
}

function attachIngredientRowListeners() {
  const removeButtons = document.querySelectorAll(".modal-ingredient-row .modal-remove-row");
  removeButtons.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const row = e.target.closest(".modal-ingredient-row");
      if (row) row.remove();
    };
  });
}

function saveRecipe(existing) {
  const modal = document.querySelector(".modal-card");
  const fields = modal.querySelectorAll(".modal-field input, .modal-field textarea");
  const values = Array.from(fields).map(f => f.value.trim());

  const [
    name,
    servings,
    photo,
    instructions
  ] = values;

  if (!name) {
    alert("Recipe name is required.");
    return;
  }

  const ingRows = modal.querySelectorAll(".modal-ingredient-row");
  const ingredients = Array.from(ingRows).map(row => {
    const nameInput = row.querySelector(".ing-name");
    const qtyInput = row.querySelector(".ing-qty");
    const unitInput = row.querySelector(".ing-unit");

    const name = nameInput ? nameInput.value.trim() : "";
    const qty = qtyInput ? Number(qtyInput.value.trim() || 0) : 0;
    const unit = unitInput ? unitInput.value.trim() : "";

    return { name, qty, unit };
  }).filter(ing => ing.name && ing.unit); // Must have both name AND unit

  if (existing) {
    existing.name = name;
    existing.servings = Number(servings || 0);
    existing.photo = photo || "";
    existing.instructions = instructions;
    existing.ingredients = ingredients;
  } else {
    recipes.push({
      id: uid(),
      name,
      servings: Number(servings || 0),
      photo: photo || "",
      instructions,
      ingredients
    });
  }

  saveRecipes();
  createGhostPantryItems(ingredients);
  renderRecipes();
  renderPantry();
  generateShoppingList();
  updateDashboard();
  closeModal();
}

function createGhostPantryItems(ingredients) {
  // For each ingredient in the recipe, ensure it exists in pantry
  // If not, create a "ghost" item at qty 0 with location "Unassigned"
  let ghostsCreated = 0;

  ingredients.forEach(ing => {
    // Validate ingredient has required fields
    if (!ing.name || !ing.unit) {
      console.warn("Skipping invalid ingredient:", ing);
      return;
    }

    // Trim values
    const name = ing.name.trim();
    const unit = ing.unit.trim();

    // Skip if empty after trimming
    if (!name || !unit) {
      return;
    }

    // Case-insensitive matching to find existing pantry item
    const existing = pantry.find(p =>
      p.name.toLowerCase() === name.toLowerCase() &&
      p.unit.toLowerCase() === unit.toLowerCase()
    );

    if (!existing) {
      // Create ghost item with exact name/unit from recipe
      pantry.push({
        id: uid(),
        name: name,
        unit: unit,
        category: "Other",
        min: 0,
        locations: [{
          id: uid(),
          location: "Unassigned",
          qty: 0,
          expiry: ""
        }],
        totalQty: 0,
        notes: "Auto-created from recipe"
      });
      ghostsCreated++;
    }
  });

  if (ghostsCreated > 0) {
    savePantry();
    console.log(`Created ${ghostsCreated} ghost pantry item(s)`);
  }
}

function renderRecipes() {
  const container = document.getElementById("recipe-list");
  if (!container) return;

  const searchInput = document.getElementById("recipe-search");
  const filterReady = document.getElementById("filter-recipe-ready");

  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const readyFilter = filterReady ? filterReady.value : "";

  container.innerHTML = "";

  // Apply filters
  let filtered = recipes;

  // Search filter
  if (searchTerm) {
    filtered = filtered.filter(recipe =>
      recipe.name.toLowerCase().includes(searchTerm) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchTerm))
    );
  }

  // Ready to cook filter
  if (readyFilter === "ready") {
    const readyRecipes = calculateReadyRecipes();
    filtered = filtered.filter(recipe => readyRecipes.some(r => r.id === recipe.id));
  } else if (readyFilter === "missing") {
    const readyRecipes = calculateReadyRecipes();
    filtered = filtered.filter(recipe => !readyRecipes.some(r => r.id === recipe.id));
  }

  if (filtered.length === 0) {
    container.innerHTML = `<p style="opacity:0.7;">${searchTerm ? "No recipes match your search." : "No recipes yet. Add your first cozy dish."}</p>`;
    return;
  }

  filtered.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    const photoHTML = recipe.photo
      ? `<div class="recipe-card-photo" style="background-image: url('${recipe.photo}');"></div>`
      : `<div class="recipe-card-photo-placeholder">🍳</div>`;

    card.innerHTML = `
      ${photoHTML}
      <div class="recipe-card-content">
        <div class="recipe-card-title">${recipe.name}</div>
        <div class="recipe-card-meta">
          <span>👥 ${recipe.servings} servings</span>
          <span>🥘 ${recipe.ingredients.length} ingredients</span>
        </div>
      </div>
    `;

    card.addEventListener("click", () => openRecipeViewModal(recipe));

    container.appendChild(card);
  });
}

function openRecipeViewModal(recipe) {
  const ingList = recipe.ingredients
    .map(ing => `<li>${ing.qty} ${ing.unit} ${ing.name}</li>`)
    .join("");

  const contentHTML = `
    ${modalFull(`
      <h3 style="margin-bottom:0.5rem;">Ingredients</h3>
      <ul style="margin-left:1.2rem; margin-bottom:1rem;">
        ${ingList}
      </ul>
    `)}

    ${modalFull(`
      <h3 style="margin-bottom:0.5rem;">Instructions</h3>
      <p>${(recipe.instructions || "").replace(/\n/g, "<br>")}</p>
    `)}
  `;

  openCardModal({
    title: recipe.name,
    subtitle: `${recipe.servings} servings`,
    contentHTML,
    slideout: true,
    actions: [
      {
        label: "Cook Now",
        class: "btn-primary",
        onClick: () => openCookModal(recipe)
      },
      {
        label: "Edit",
        class: "btn-secondary",
        onClick: () => openRecipeModal(recipe)
      },
      {
        label: "Delete",
        class: "btn-secondary btn-danger",
        onClick: () => deleteRecipe(recipe)
      }
    ]
  });
}

function deleteRecipe(recipe) {
  if (!confirm(`Delete "${recipe.name}"? This will also remove it from your meal plan.`)) {
    return;
  }

  // Remove recipe from recipes array
  recipes = recipes.filter(r => r.id !== recipe.id);
  saveRecipes();

  // Remove from all planned meals
  Object.keys(planner).forEach(dateStr => {
    planner[dateStr] = planner[dateStr].filter(meal => meal.recipeId !== recipe.id);

    // Clean up empty dates
    if (planner[dateStr].length === 0) {
      delete planner[dateStr];
    }
  });
  savePlanner();

  // Update everything
  renderRecipes();
  generateShoppingList();
  updateDashboard();
  closeModal();
}

// Redirect to full Cook Now modal
function openCookModal(recipe) {
  openCookNowModal(recipe);
}

/* ---------------------------------------------------
   PLANNER: MODAL + RENDER + DAY MODAL
--------------------------------------------------- */

function openPlannerModal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const monthName = firstDay.toLocaleString("default", { month: "long" });

  let dayGridHTML = "";

  // Empty cells before month starts
  for (let i = 0; i < firstDay.getDay(); i++) {
    dayGridHTML += `<div class="planner-day empty"></div>`;
  }

  // Days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split("T")[0];

    const plannedMeals = getPlannedMeals(dateStr);

    let displayText = "";
    if (plannedMeals.length === 0) {
      displayText = `<span class="planner-empty">No meals</span>`;
    } else if (plannedMeals.length === 1) {
      const recipe = getRecipe(plannedMeals[0].recipeId);
      displayText = `<span class="planner-recipe">${recipe ? recipe.name : "Unknown"}</span>`;
    } else {
      displayText = `<span class="planner-recipe">${plannedMeals.length} meals</span>`;
    }

    dayGridHTML += `
      <div class="planner-day" data-date="${dateStr}">
        <div class="planner-day-number">${day}</div>
        <div class="planner-day-content">
          ${displayText}
        </div>
      </div>
    `;
  }

  const contentHTML = `
    <div class="planner-modal-content">
      <div class="planner-header-row">
        <div class="planner-month-label">${monthName} ${year}</div>
      </div>
      <div class="planner-grid">
        ${dayGridHTML}
      </div>
    </div>
  `;

  openCardModal({
    title: "Meal Plan",
    subtitle: "Plan your month like a handwritten kitchen calendar",
    contentHTML,
    actions: [
      {
        label: "Close",
        class: "btn-secondary",
        onClick: closeModal
      }
    ]
  });

  // Add click listeners to day cells
  const dayCells = document.querySelectorAll(".planner-day[data-date]");
  dayCells.forEach(cell => {
    cell.addEventListener("click", () => {
      const dateStr = cell.getAttribute("data-date");
      closeModal();
      setTimeout(() => openDayModal(dateStr), 100);
    });
  });
}

function renderPlanner() {
  // Planner is now in a modal, so this function just updates the modal if it's open
  // For now, we'll keep this empty and planner will be opened via the button
}

function openDayModal(dateStr) {
  const plannedMeals = getPlannedMeals(dateStr);

  const mealsListHTML = plannedMeals.length > 0
    ? plannedMeals.map(meal => {
        const recipe = getRecipe(meal.recipeId);
        const recipeName = recipe ? recipe.name : "Unknown";
        const cookedBadge = meal.cooked ? `<span class="meal-cooked-badge">✓ Cooked</span>` : "";

        return `
          <div class="day-meal-row" data-meal-id="${meal.id}">
            <div class="day-meal-info">
              <strong>${meal.mealType}:</strong> ${recipeName} ${cookedBadge}
            </div>
            <div class="day-meal-actions">
              ${!meal.cooked ? `<button class="btn-cook-meal" data-meal-id="${meal.id}">Cook Now</button>` : ""}
              <button class="btn-remove-meal" data-meal-id="${meal.id}">&times;</button>
            </div>
          </div>
        `;
      }).join("")
    : `<p style="opacity:0.7;">No meals planned for this day.</p>`;

  const recipeOptions = recipes.map(r => r.name);

  const contentHTML = `
    ${modalFull(`
      <h3 style="margin-bottom:0.75rem;">Planned Meals</h3>
      <div id="day-meals-list">
        ${mealsListHTML}
      </div>
    `)}

    ${modalFull(`
      <h3 style="margin:1.5rem 0 0.75rem 0;">Add New Meal</h3>
      <div class="add-meal-row">
        ${modalRow([
          modalField({
            label: "Meal Type",
            type: "select",
            options: ["Breakfast", "Lunch", "Dinner", "Snack"]
          }),
          modalField({
            label: "Recipe",
            type: "select",
            options: recipes.length > 0 ? recipeOptions : ["No recipes available"]
          })
        ])}
      </div>
    `)}
  `;

  openCardModal({
    title: `Plan for ${dateStr}`,
    subtitle: plannedMeals.length > 0 ? `${plannedMeals.length} meal(s) planned` : "No meals planned",
    contentHTML,
    actions: [
      {
        label: "Add Meal",
        class: "btn-primary",
        onClick: () => saveAddMeal(dateStr)
      },
      {
        label: "Clear All",
        class: "btn-secondary",
        onClick: () => {
          if (confirm("Remove all meals for this day?")) {
            clearPlannedDay(dateStr);
            generateShoppingList();
            renderPantry();
            updateDashboard();
            closeModal();
            setTimeout(() => openPlannerModal(), 100);
          }
        }
      },
      {
        label: "Done",
        class: "btn-secondary",
        onClick: () => {
          closeModal();
          setTimeout(() => openPlannerModal(), 100);
        }
      }
    ]
  });

  // Wire up remove and cook buttons
  const removeBtns = document.querySelectorAll(".btn-remove-meal");
  removeBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const mealId = btn.getAttribute("data-meal-id");
      removePlannedMeal(dateStr, mealId);
      generateShoppingList();
      renderPantry();
      updateDashboard();
      closeModal();
      setTimeout(() => openDayModal(dateStr), 100);
    });
  });

  const cookBtns = document.querySelectorAll(".btn-cook-meal");
  cookBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const mealId = btn.getAttribute("data-meal-id");
      const meal = plannedMeals.find(m => m.id === mealId);
      if (meal) {
        const recipe = getRecipe(meal.recipeId);
        if (recipe) {
          closeModal();
          setTimeout(() => openCookNowModal(recipe, dateStr, mealId), 100);
        }
      }
    });
  });
}

function saveAddMeal(dateStr) {
  const modal = document.querySelector(".modal-card");
  const selects = modal.querySelectorAll(".add-meal-row select");

  const mealType = selects[0].value;
  const recipeName = selects[1].value;

  if (recipeName === "No recipes available") {
    alert("Please create a recipe first before adding it to your meal plan.");
    return;
  }

  const recipe = recipes.find(r => r.name === recipeName);
  if (!recipe) {
    alert("Recipe not found.");
    return;
  }

  addPlannedMeal(dateStr, recipe.id, mealType);
  generateShoppingList();
  renderPantry();
  updateDashboard();
  closeModal();
  setTimeout(() => openDayModal(dateStr), 100);
}

function openCookNowModal(recipe, dateStr = null, mealId = null) {
  // Check if we have all ingredients
  const missingIngredients = [];
  const insufficientIngredients = [];

  recipe.ingredients.forEach(ing => {
    // Case-insensitive matching
    const pantryItem = pantry.find(p =>
      p.name.toLowerCase() === ing.name.toLowerCase() &&
      p.unit.toLowerCase() === ing.unit.toLowerCase()
    );

    if (!pantryItem) {
      missingIngredients.push(`${ing.name} (${ing.qty} ${ing.unit})`);
    } else if (pantryItem.totalQty < ing.qty) {
      insufficientIngredients.push(`${ing.name} (need ${ing.qty}, have ${pantryItem.totalQty} ${ing.unit})`);
    }
  });

  let warningHTML = "";
  if (missingIngredients.length > 0) {
    warningHTML += `
      <div class="cook-warning">
        <strong>⚠️ Missing Ingredients:</strong>
        <ul>${missingIngredients.map(i => `<li>${i}</li>`).join("")}</ul>
      </div>
    `;
  }

  if (insufficientIngredients.length > 0) {
    warningHTML += `
      <div class="cook-warning">
        <strong>⚠️ Insufficient Quantities:</strong>
        <ul>${insufficientIngredients.map(i => `<li>${i}</li>`).join("")}</ul>
      </div>
    `;
  }

  const contentHTML = `
    ${modalFull(`
      <p style="margin-bottom:1rem;">
        Ready to cook <strong>${recipe.name}</strong>?
      </p>
      ${warningHTML}
      <p style="margin-top:1rem; opacity:0.8;">
        ${warningHTML ? "You can still mark this as cooked, but you may not have all ingredients." : "All ingredients are available. Cooking will deplete your pantry."}
      </p>
    `)}
  `;

  openCardModal({
    title: "Cook Now",
    subtitle: recipe.name,
    contentHTML,
    slideout: true,
    actions: [
      {
        label: "Cook & Deplete Pantry",
        class: "btn-primary",
        onClick: () => executeCook(recipe, dateStr, mealId)
      },
      {
        label: "Cancel",
        class: "btn-secondary",
        onClick: closeModal
      }
    ]
  });
}

function executeCook(recipe, dateStr, mealId) {
  // Deplete pantry ingredients
  recipe.ingredients.forEach(ing => {
    // Case-insensitive matching
    const pantryItem = pantry.find(p =>
      p.name.toLowerCase() === ing.name.toLowerCase() &&
      p.unit.toLowerCase() === ing.unit.toLowerCase()
    );

    if (pantryItem) {
      let remaining = ing.qty;

      // Deplete from locations (FIFO - soonest expiry first)
      const sortedLocations = [...pantryItem.locations].sort((a, b) => {
        if (!a.expiry) return 1;
        if (!b.expiry) return -1;
        return new Date(a.expiry) - new Date(b.expiry);
      });

      sortedLocations.forEach(loc => {
        if (remaining <= 0) return;

        const actualLoc = pantryItem.locations.find(l => l.id === loc.id);
        if (!actualLoc) return;

        const toDeplete = Math.min(actualLoc.qty, remaining);
        actualLoc.qty -= toDeplete;
        remaining -= toDeplete;
      });

      // Remove empty locations
      pantryItem.locations = pantryItem.locations.filter(loc => loc.qty > 0);

      // Update total quantity
      pantryItem.totalQty = getTotalQty(pantryItem);
    }
  });

  // Mark meal as cooked if from planner
  if (dateStr && mealId) {
    markMealCooked(dateStr, mealId);
  }

  savePantry();
  renderPantry();
  generateShoppingList();
  updateDashboard();
  closeModal();

  // Return to appropriate view
  if (dateStr) {
    setTimeout(() => openDayModal(dateStr), 100);
  }
}

/* ---------------------------------------------------
   SHOPPING: GENERATE + RENDER + MODALS
--------------------------------------------------- */

function generateShoppingList() {
  clearShopping();

  const reserved = calculateReservedIngredients();

  // For each pantry item, calculate if we need to buy more
  pantry.forEach(item => {
    // Normalize to lowercase for case-insensitive matching
    const key = `${item.name.toLowerCase()}|${item.unit.toLowerCase()}`;
    const reservedQty = reserved[key] || 0;

    // Total amount we need to have = meals we're cooking + minimum threshold
    const totalRequired = reservedQty + (item.min || 0);

    // How much we actually have
    const totalAvailable = item.totalQty;

    // Calculate deficit - only add to shopping if we don't have enough
    const deficit = Math.max(0, totalRequired - totalAvailable);

    if (deficit > 0) {
      // Determine source of shortage - check meals first, then threshold
      const needsForMeals = Math.max(0, reservedQty - totalAvailable);
      const needsForThreshold = deficit - needsForMeals;

      let source = "Threshold";
      if (needsForMeals > 0 && needsForThreshold > 0) {
        source = "Meals + Threshold";
      } else if (needsForMeals > 0) {
        source = "Meals";
      }

      addShoppingItem({
        name: item.name,
        qty: deficit,
        unit: item.unit,
        category: item.category,
        source
      });
    }

    // Remove from reserved map so we can track ingredients not in pantry
    delete reserved[key];
  });

  // Add ingredients from planned meals that don't exist in pantry at all
  Object.keys(reserved).forEach(key => {
    const [name, unit] = key.split("|");
    addShoppingItem({
      name,
      qty: reserved[key],
      unit,
      category: "Other",
      source: "Meals"
    });
  });

  // Add expired items to shopping list
  const now = new Date();
  pantry.forEach(item => {
    // Check if any location has expired items
    let totalExpiredQty = 0;
    item.locations.forEach(loc => {
      if (loc.expiry) {
        const expiryDate = new Date(loc.expiry);
        if (expiryDate < now) {
          totalExpiredQty += loc.qty;
        }
      }
    });

    if (totalExpiredQty > 0) {
      // Check if already on shopping list
      const existing = findShoppingItem(item.name, item.unit);
      if (existing) {
        // Add expired quantity to existing item
        existing.recommendedQty += totalExpiredQty;
        existing.actualQty += totalExpiredQty;
        if (existing.source.indexOf("Expired") === -1) {
          existing.source = existing.source + " + Expired";
        }
      } else {
        // Add new shopping item for expired goods
        addShoppingItem({
          name: item.name,
          qty: totalExpiredQty,
          unit: item.unit,
          category: item.category,
          source: "Expired"
        });
      }
    }
  });

  saveShopping();
  renderShoppingList();
}

function renderShoppingList() {
  const container = document.getElementById("shopping-list");
  if (!container) return;

  container.innerHTML = "";

  if (shopping.length === 0) {
    container.innerHTML = `<p style="opacity:0.7;">Your shopping list is empty.</p>`;
    return;
  }

  const sorted = [...shopping].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  let currentCategory = "";

  sorted.forEach(item => {
    // Migrate old format to new format
    if (item.qty !== undefined && item.recommendedQty === undefined) {
      item.recommendedQty = item.qty;
      item.actualQty = item.qty;
      delete item.qty;
    }

    if (item.category !== currentCategory) {
      currentCategory = item.category;
      const header = document.createElement("div");
      header.className = "shopping-category-header";
      header.textContent = currentCategory;
      container.appendChild(header);
    }

    const card = document.createElement("div");
    card.className = "shopping-item";

    const isDifferent = item.actualQty !== item.recommendedQty;
    const qtyDisplay = isDifferent
      ? `<span class="qty-recommended">Rec: ${item.recommendedQty}</span> → <span class="qty-actual">${item.actualQty} ${item.unit}</span>`
      : `${item.actualQty} ${item.unit}`;

    card.innerHTML = `
      <input type="checkbox" class="shopping-check" ${item.checked ? "checked" : ""}>
      <div class="shopping-info">
        <strong>${item.name}</strong>
        <div class="shopping-sub">
          ${qtyDisplay} • ${item.source}
        </div>
      </div>
      <button class="shopping-edit" title="Edit quantity">✎</button>
      <button class="shopping-remove">&times;</button>
    `;

    card.querySelector(".shopping-check").addEventListener("change", (e) => {
      item.checked = e.target.checked;
      saveShopping();
    });

    card.querySelector(".shopping-edit").addEventListener("click", () => {
      openEditShoppingModal(item);
    });

    card.querySelector(".shopping-remove").addEventListener("click", () => {
      shopping = shopping.filter(i => i.id !== item.id);
      saveShopping();
      renderShoppingList();
    });

    container.appendChild(card);
  });
}

function openEditShoppingModal(item) {
  const contentHTML = `
    ${modalRow([
      modalField({
        label: "Item Name",
        value: item.name
      }),
      modalField({
        label: "Unit",
        value: item.unit
      })
    ])}

    ${modalRow([
      modalField({
        label: "Recommended Qty",
        type: "number",
        value: item.recommendedQty,
        placeholder: "System recommendation"
      }),
      modalField({
        label: "Buying Qty",
        type: "number",
        value: item.actualQty,
        placeholder: "How much you'll buy"
      })
    ])}

    <p style="margin-top:1rem; font-size:0.9rem; opacity:0.8;">
      Source: ${item.source}
    </p>
  `;

  openCardModal({
    title: "Edit Shopping Item",
    subtitle: item.name,
    contentHTML,
    slideout: true,
    actions: [
      {
        label: "Save",
        class: "btn-primary",
        onClick: () => saveEditShoppingItem(item)
      },
      {
        label: "Cancel",
        class: "btn-secondary",
        onClick: closeModal
      }
    ]
  });
}

function saveEditShoppingItem(item) {
  const modal = document.querySelector(".modal-card");
  const fields = modal.querySelectorAll(".modal-field input");
  const values = Array.from(fields).map(f => f.value.trim());

  const [name, unit, recommendedQty, actualQty] = values;

  if (!name) {
    alert("Item name is required.");
    return;
  }

  item.name = name;
  item.unit = unit;
  item.recommendedQty = Number(recommendedQty || 0);
  item.actualQty = Number(actualQty || 0);

  saveShopping();
  renderShoppingList();
  closeModal();
}

function parseQuickAddInput(input) {
  // Try to parse various formats:
  // "2 lbs chicken", "1 gallon milk", "3 tomatoes", "1/2 cup flour"
  // "2 pounds chicken", "3 chicken" (no unit)
  const trimmed = input.trim();

  // Pattern 1: number + unit (1-2 words) + name
  // Examples: "2 lbs chicken", "1 gallon milk", "2 pounds beef"
  const pattern1 = /^(\d+\.?\d*|[½¼¾⅓⅔]|\d+\/\d+)\s+([\w\s]{1,15}?)\s+(.+)$/;
  const match1 = trimmed.match(pattern1);

  if (match1) {
    // Try to parse fraction if present
    let qty = match1[1];
    if (qty.includes('/')) {
      const parts = qty.split('/');
      qty = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else if (qty === '½') {
      qty = 0.5;
    } else if (qty === '¼') {
      qty = 0.25;
    } else if (qty === '¾') {
      qty = 0.75;
    } else if (qty === '⅓') {
      qty = 0.33;
    } else if (qty === '⅔') {
      qty = 0.67;
    } else {
      qty = parseFloat(qty);
    }

    return {
      qty: qty,
      unit: match1[2].trim(),
      name: match1[3].trim()
    };
  }

  // Pattern 2: number + name (no unit)
  // Examples: "3 tomatoes", "2 chicken"
  const pattern2 = /^(\d+\.?\d*)\s+(.+)$/;
  const match2 = trimmed.match(pattern2);

  if (match2) {
    return {
      qty: parseFloat(match2[1]),
      unit: 'pcs',
      name: match2[2].trim()
    };
  }

  // If no qty/unit pattern, check if it's just a name
  if (trimmed.length > 0) {
    return { name: trimmed };
  }

  return null;
}

function handleQuickAddShopping() {
  const input = document.getElementById("user-item-name");
  if (!input) return;

  const text = input.value.trim();
  if (!text) {
    openCustomShoppingModal();
    return;
  }

  const parsed = parseQuickAddInput(text);

  if (parsed && parsed.qty && parsed.unit) {
    // Quick add - we have all the info
    addShoppingItem({
      name: parsed.name,
      actualQty: parsed.qty,
      recommendedQty: parsed.qty,
      unit: parsed.unit,
      category: "Other", // Default category
      source: "Custom",
      checked: false
    });

    // Clear input
    input.value = '';

    // Refresh shopping list
    renderShoppingList();
  } else {
    // Open modal for full details
    // Pre-fill the name if we have it
    openCustomShoppingModal(parsed?.name || '');
  }
}

function openCustomShoppingModal(prefillName = '') {
  const contentHTML = `
    ${modalRow([
      modalField({
        label: "Item Name",
        placeholder: "e.g., Lemons"
      }),
      modalField({
        label: "Category",
        type: "select",
        options: ["Produce", "Dairy", "Meat", "Pantry", "Frozen", "Spices", "Other"]
      })
    ])}

    ${modalRow([
      modalField({
        label: "Quantity",
        type: "number",
        placeholder: "e.g., 3"
      }),
      modalField({
        label: "Unit",
        placeholder: "e.g., pcs, lbs, bags"
      })
    ])}

    ${modalRow([
      modalField({
        label: "Storage (optional)",
        type: "select",
        options: ["Pantry", "Fridge", "Freezer", "Cellar", "Other"]
      }),
      modalField({
        label: "Notes (optional)",
        placeholder: "Optional notes..."
      })
    ])}
  `;

  openCardModal({
    title: "Add Shopping Item",
    subtitle: "What do you need to pick up?",
    contentHTML,
    slideout: true,
    actions: [
      {
        label: "Add Item",
        class: "btn-primary",
        onClick: saveCustomShoppingItem
      },
      {
        label: "Cancel",
        class: "btn-secondary",
        onClick: closeModal
      }
    ]
  });

  // Pre-fill name if provided
  if (prefillName) {
    setTimeout(() => {
      const modal = document.querySelector(".modal-card");
      const firstInput = modal?.querySelector(".modal-field input");
      if (firstInput) {
        firstInput.value = prefillName;
        firstInput.focus();
        firstInput.select();
      }
    }, 100);
  }
}

function saveCustomShoppingItem() {
  const modal = document.querySelector(".modal-card");
  const fields = modal.querySelectorAll(".modal-field input, .modal-field select");
  const values = Array.from(fields).map(f => f.value.trim());

  const [
    name,
    category,
    qty,
    unit
    // storage, notes (ignored for now)
  ] = values;

  if (!name) {
    alert("Item name is required.");
    return;
  }

  addShoppingItem({
    name,
    qty: qty || 1,
    unit: unit || "",
    category: category || "Other",
    source: "Custom"
  });

  saveShopping();
  renderShoppingList();
  closeModal();
}

function openCheckoutModal() {
  const purchased = shopping.filter(i => i.checked);

  if (purchased.length === 0) {
    alert("Please check off at least one item before checking out.");
    return;
  }

  const rows = purchased.map(item => {
    // Migrate old format
    if (item.qty !== undefined && item.actualQty === undefined) {
      item.actualQty = item.qty;
    }

    return `
    <div class="modal-ingredient-row">
      <input type="text" value="${item.name}" disabled>
      <input type="number" value="${item.actualQty}" placeholder="Qty">
      <input type="text" value="${item.unit}" placeholder="Unit">
      <select>
        <option ${item.category === "Produce" ? "selected" : ""}>Produce</option>
        <option ${item.category === "Dairy" ? "selected" : ""}>Dairy</option>
        <option ${item.category === "Meat" ? "selected" : ""}>Meat</option>
        <option ${item.category === "Pantry" ? "selected" : ""}>Pantry</option>
        <option ${item.category === "Frozen" ? "selected" : ""}>Frozen</option>
        <option ${item.category === "Spices" ? "selected" : ""}>Spices</option>
        <option ${item.category === "Other" ? "selected" : ""}>Other</option>
      </select>
      <select>
        <option>Pantry</option>
        <option>Fridge</option>
        <option>Freezer</option>
        <option>Cellar</option>
        <option>Other</option>
      </select>
      <input type="date">
    </div>
    `;
  }).join("");

  const contentHTML = `
    ${modalFull(`
      <p style="margin-bottom:1rem; opacity:0.8;">
        Confirm details for the items you purchased. These will be added to your pantry.
      </p>
      <div id="checkout-item-list">
        ${rows}
      </div>
    `)}
  `;

  openCardModal({
    title: "Checkout",
    subtitle: "Add purchased items to your pantry",
    contentHTML,
    actions: [
      {
        label: "Add to Pantry",
        class: "btn-primary",
        onClick: saveCheckoutItems
      },
      {
        label: "Cancel",
        class: "btn-secondary",
        onClick: closeModal
      }
    ]
  });
}

function saveCheckoutItems() {
  const modal = document.querySelector(".modal-card");
  const rows = modal.querySelectorAll(".modal-ingredient-row");

  rows.forEach((row) => {
    const inputs = row.querySelectorAll("input, select");

    const name = inputs[0].value.trim();
    const qty = Number(inputs[1].value.trim() || 0);
    const unit = inputs[2].value.trim();
    const category = inputs[3].value.trim();
    const storage = inputs[4].value.trim();
    const expiry = inputs[5].value.trim();

    if (!name || qty <= 0) return;

    let pantryItem = pantry.find(p => p.name === name && p.unit === unit);

    if (pantryItem) {
      // Add to existing ingredient's location
      const existingLoc = pantryItem.locations.find(l => l.location === storage);
      if (existingLoc) {
        existingLoc.qty += qty;
        if (expiry) existingLoc.expiry = expiry;
      } else {
        pantryItem.locations.push({
          id: uid(),
          location: storage,
          qty,
          expiry
        });
      }
      pantryItem.totalQty = getTotalQty(pantryItem);
      pantryItem.category = category;
    } else {
      // Create new ingredient
      pantry.push({
        id: uid(),
        name,
        unit,
        category,
        min: 0,
        locations: [{
          id: uid(),
          location: storage,
          qty,
          expiry
        }],
        totalQty: qty,
        notes: ""
      });
    }
  });

  savePantry();

  shopping = shopping.filter(i => !i.checked);
  saveShopping();

  renderPantry();
  renderShoppingList();
  updateDashboard();
  closeModal();
}

/* ---------------------------------------------------
   DASHBOARD CALCULATIONS
--------------------------------------------------- */

function calculateReservedIngredients() {
  // Calculate how much of each ingredient is reserved for planned meals (not yet cooked)
  const reserved = {};

  Object.keys(planner).forEach(dateStr => {
    const meals = planner[dateStr];
    if (!Array.isArray(meals)) return;

    meals.forEach(meal => {
      // Only count uncooked meals
      if (meal.cooked) return;

      const recipe = getRecipe(meal.recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach(ing => {
        // Normalize to lowercase for case-insensitive matching
        const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`;
        if (!reserved[key]) {
          reserved[key] = 0;
        }
        reserved[key] += ing.qty;
      });
    });
  });

  return reserved;
}

function calculateReadyRecipes() {
  const reserved = calculateReservedIngredients();
  return recipes.filter(recipe => {
    return recipe.ingredients.every(ing => {
      // If recipe requires 0 quantity, it's considered missing
      if (ing.qty <= 0) return false;

      // Case-insensitive matching
      const pantryItem = pantry.find(p =>
        p.name.toLowerCase() === ing.name.toLowerCase() &&
        p.unit.toLowerCase() === ing.unit.toLowerCase()
      );
      if (!pantryItem) return false;

      // If pantry has 0 total, it's missing
      if (pantryItem.totalQty <= 0) return false;

      // Normalize to lowercase for case-insensitive matching
      const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`;
      const reservedQty = reserved[key] || 0;
      const available = pantryItem.totalQty - reservedQty;

      return available >= ing.qty;
    });
  });
}

function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function updateDashboard() {
  // Today's meals
  const today = new Date().toISOString().split("T")[0];
  const todayMeals = getPlannedMeals(today);
  const todayMealEl = document.getElementById("dash-today-meal");
  if (todayMealEl) {
    if (todayMeals.length === 0) {
      todayMealEl.textContent = "Not planned";
    } else if (todayMeals.length === 1) {
      const recipe = getRecipe(todayMeals[0].recipeId);
      todayMealEl.textContent = recipe ? recipe.name : "Unknown";
    } else {
      todayMealEl.textContent = `${todayMeals.length} meals`;
    }
  }

  // Ready-to-cook recipes (recipes where all ingredients are available)
  const reserved = calculateReservedIngredients();
  const readyRecipes = recipes.filter(recipe => {
    return recipe.ingredients.every(ing => {
      // If recipe requires 0 quantity, it's considered missing
      if (ing.qty <= 0) return false;

      // Case-insensitive matching
      const pantryItem = pantry.find(p =>
        p.name.toLowerCase() === ing.name.toLowerCase() &&
        p.unit.toLowerCase() === ing.unit.toLowerCase()
      );
      if (!pantryItem) return false;

      // If pantry has 0 total, it's missing
      if (pantryItem.totalQty <= 0) return false;

      // Normalize to lowercase for case-insensitive matching
      const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`;
      const reservedQty = reserved[key] || 0;
      const available = pantryItem.totalQty - reservedQty;

      return available >= ing.qty;
    });
  });

  const readyEl = document.getElementById("dash-ready-recipes");
  if (readyEl) {
    readyEl.textContent = readyRecipes.length;
  }

  // Pantry count
  const pantryCountEl = document.getElementById("dash-pantry-count");
  if (pantryCountEl) {
    pantryCountEl.textContent = pantry.length;
  }

  // Expired ingredients (check across all locations)
  const now = new Date();
  const expired = pantry.filter(item => {
    return item.locations.some(loc => {
      if (!loc.expiry) return false;
      const expiryDate = new Date(loc.expiry);
      return expiryDate < now;
    });
  });

  const expiredEl = document.getElementById("dash-expired-count");
  if (expiredEl) {
    expiredEl.textContent = expired.length;
  }

  // Meals planned this week (count total meals, not just days)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

  let weekPlanned = 0;
  Object.keys(planner).forEach(dateStr => {
    const date = new Date(dateStr);
    if (date >= startOfWeek && date <= endOfWeek) {
      weekPlanned += planner[dateStr].length;
    }
  });

  const weekPlannedEl = document.getElementById("dash-week-planned");
  if (weekPlannedEl) {
    weekPlannedEl.textContent = weekPlanned;
  }

  // Render today's meals section
  renderTodaysMeals();
}

function renderTodaysMeals() {
  const container = document.getElementById("today-meals-section");
  if (!container) return;

  const today = new Date().toISOString().split("T")[0];
  const todayMeals = getPlannedMeals(today).filter(m => !m.cooked);

  if (todayMeals.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  container.style.display = "block";

  const mealsHTML = todayMeals.map(meal => {
    const recipe = getRecipe(meal.recipeId);
    if (!recipe) return "";

    return `
      <div class="today-meal-card">
        <div class="today-meal-header">
          <span class="today-meal-type">${meal.mealType}</span>
          <h3>${recipe.name}</h3>
        </div>
        <div class="today-meal-meta">
          <span>👥 ${recipe.servings} servings</span>
          <span>🥘 ${recipe.ingredients.length} ingredients</span>
        </div>
        <button class="btn btn-cook-today" data-meal-id="${meal.id}" data-recipe-id="${recipe.id}">
          Cook Now
        </button>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <h3 style="margin-bottom:1rem; color:#6a4f35;">Today's Meals</h3>
    <div class="today-meals-grid">
      ${mealsHTML}
    </div>
  `;

  // Wire up Cook Now buttons
  const cookBtns = container.querySelectorAll(".btn-cook-today");
  cookBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const mealId = btn.getAttribute("data-meal-id");
      const recipeId = btn.getAttribute("data-recipe-id");
      const recipe = getRecipe(recipeId);
      if (recipe) {
        openCookNowModal(recipe, today, mealId);
      }
    });
  });
}

/* ---------------------------------------------------
   HEADER DATE/TIME UPDATE
--------------------------------------------------- */

function updateDateTime() {
  const now = new Date();

  const dateEl = document.getElementById("header-date");
  const timeEl = document.getElementById("header-time");

  if (dateEl) {
    const dateStr = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    dateEl.textContent = dateStr;
  }

  if (timeEl) {
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    timeEl.textContent = timeStr;
  }
}

/* ---------------------------------------------------
   PANTRY FILTER
--------------------------------------------------- */

function getEarliestExpiryDays(item) {
  let earliest = null;
  item.locations.forEach(loc => {
    if (loc.expiry) {
      const days = getDaysUntilExpiry(loc.expiry);
      if (days !== null && (earliest === null || days < earliest)) {
        earliest = days;
      }
    }
  });
  return earliest;
}

function applyPantryFilter() {
  const filterSelect = document.getElementById("filter-category");
  const searchInput = document.getElementById("pantry-search");
  const sortSelect = document.getElementById("sort-pantry");

  const selectedCategory = filterSelect ? filterSelect.value : "";
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const sortBy = sortSelect ? sortSelect.value : "alpha";

  const container = document.getElementById("pantry-display");
  if (!container) return;

  container.innerHTML = "";

  // Apply filters
  let filtered = pantry;

  // Category filter
  if (selectedCategory) {
    filtered = filtered.filter(item => item.category === selectedCategory);
  }

  // Search filter
  if (searchTerm) {
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(searchTerm) ||
      item.category.toLowerCase().includes(searchTerm) ||
      item.unit.toLowerCase().includes(searchTerm)
    );
  }

  // Sort
  if (sortBy === "alpha") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "lowStock") {
    filtered.sort((a, b) => {
      const aRatio = a.min > 0 ? a.totalQty / a.min : 999;
      const bRatio = b.min > 0 ? b.totalQty / b.min : 999;
      return aRatio - bRatio;
    });
  } else if (sortBy === "expiring") {
    filtered.sort((a, b) => {
      const aExpiry = getEarliestExpiryDays(a);
      const bExpiry = getEarliestExpiryDays(b);
      if (aExpiry === null && bExpiry === null) return 0;
      if (aExpiry === null) return 1;
      if (bExpiry === null) return -1;
      return aExpiry - bExpiry;
    });
  } else if (sortBy === "recent") {
    // Keep original order (most recently added at end, so reverse)
    filtered = [...filtered].reverse();
  }

  if (filtered.length === 0) {
    container.innerHTML = `<p style="opacity:0.7;">${selectedCategory || searchTerm ? "No items match your filters." : "Your pantry is empty. Add your first ingredient."}</p>`;
    return;
  }

  // Calculate reserved quantities
  const reserved = calculateReservedIngredients();

  // Group items by category
  const categories = ['Meat', 'Dairy', 'Produce', 'Pantry', 'Frozen', 'Spices', 'Other'];
  const grouped = {};
  categories.forEach(cat => grouped[cat] = []);
  filtered.forEach(item => {
    if (grouped[item.category]) {
      grouped[item.category].push(item);
    }
  });

  // Render by category
  categories.forEach(category => {
    const items = grouped[category];
    if (items.length === 0) return;

    // Calculate category stats
    const lowStockCount = items.filter(item => {
      const key = `${item.name.toLowerCase()}|${item.unit.toLowerCase()}`;
      const reservedQty = reserved[key] || 0;
      const available = item.totalQty - reservedQty;
      return available < item.min;
    }).length;

    const expiringCount = items.filter(item => {
      const days = getEarliestExpiryDays(item);
      return days !== null && days <= 7;
    }).length;

    // Category header
    const categoryHeader = document.createElement("div");
    categoryHeader.className = "category-header";
    const isCollapsed = pantryCollapsedCategories.has(category);
    const icon = isCollapsed ? "▶" : "▼";

    let statusText = [];
    if (lowStockCount > 0) statusText.push(`${lowStockCount} low stock`);
    if (expiringCount > 0) statusText.push(`${expiringCount} expiring soon`);
    const statusHTML = statusText.length > 0 ? `<span class="category-status">${statusText.join(', ')}</span>` : '';

    categoryHeader.innerHTML = `
      <div class="category-header-left">
        <span class="category-icon">${icon}</span>
        <span class="category-name">${getCategoryEmoji(category)} ${category}</span>
        <span class="category-count">(${items.length} items)</span>
      </div>
      <div class="category-header-right">
        ${statusHTML}
      </div>
    `;

    categoryHeader.addEventListener("click", () => {
      if (pantryCollapsedCategories.has(category)) {
        pantryCollapsedCategories.delete(category);
      } else {
        pantryCollapsedCategories.add(category);
      }
      applyPantryFilter();
    });

    container.appendChild(categoryHeader);

    // Category items container
    if (!isCollapsed) {
      const categoryItems = document.createElement("div");
      categoryItems.className = "category-items";

      items.forEach(item => {
    const card = document.createElement("div");
    card.className = "pantry-item";

    // Normalize to lowercase for case-insensitive matching
    const key = `${item.name.toLowerCase()}|${item.unit.toLowerCase()}`;
    const reservedQty = reserved[key] || 0;
    const available = item.totalQty - reservedQty;

    // Find soonest expiry across all locations
    let soonestExpiry = null;
    let expiryStatus = "";
    item.locations.forEach(loc => {
      if (loc.expiry) {
        const days = getDaysUntilExpiry(loc.expiry);
        if (days !== null && (soonestExpiry === null || days < soonestExpiry)) {
          soonestExpiry = days;
        }
      }
    });

    if (soonestExpiry !== null) {
      if (soonestExpiry < 0) {
        expiryStatus = `<span class="expiry-expired">Expired ${Math.abs(soonestExpiry)}d ago</span>`;
      } else if (soonestExpiry === 0) {
        expiryStatus = `<span class="expiry-today">Expires today!</span>`;
      } else if (soonestExpiry <= 3) {
        expiryStatus = `<span class="expiry-urgent">Expires in ${soonestExpiry}d</span>`;
      } else if (soonestExpiry <= 7) {
        expiryStatus = `<span class="expiry-soon">Expires in ${soonestExpiry}d</span>`;
      } else {
        expiryStatus = `<span class="expiry-ok">Expires in ${soonestExpiry}d</span>`;
      }
    }

    // Location breakdown
    const locationHTML = item.locations.map(loc => {
      const locDays = getDaysUntilExpiry(loc.expiry);
      const expiryText = locDays !== null
        ? (locDays < 0 ? `(expired)` : locDays <= 7 ? `(${locDays}d)` : "")
        : "";
      return `<div class="pantry-location">📍 ${loc.location}: ${loc.qty} ${item.unit} ${expiryText}</div>`;
    }).join("");

    // Stock level indicator
    const stockPercent = item.min > 0 ? Math.min(100, (available / item.min) * 100) : 100;
    const stockClass = stockPercent < 50 ? 'stock-low' : stockPercent < 100 ? 'stock-medium' : 'stock-good';

    card.innerHTML = `
      <div class="pantry-item-header">
        <strong>${item.name}</strong>
        <span class="pantry-item-badge ${item.category.toLowerCase()}">${item.category}</span>
      </div>
      <div class="pantry-item-quantities">
        <div class="pantry-qty">
          <span class="pantry-qty-label">On Hand</span>
          <span class="pantry-qty-value">${item.totalQty} ${item.unit}</span>
        </div>
        <div class="pantry-qty">
          <span class="pantry-qty-label">Reserved</span>
          <span class="pantry-qty-value">${reservedQty} ${item.unit}</span>
        </div>
        <div class="pantry-qty">
          <span class="pantry-qty-label">Available</span>
          <span class="pantry-qty-value ${available < item.min ? 'pantry-qty-low' : ''}">${available} ${item.unit}</span>
        </div>
      </div>
      <div class="pantry-stock-indicator">
        <div class="stock-bar">
          <div class="stock-fill ${stockClass}" style="width: ${stockPercent}%"></div>
        </div>
        <span class="stock-text">Min: ${item.min} ${item.unit}</span>
      </div>
      <div class="pantry-locations">
        ${locationHTML}
      </div>
      ${expiryStatus ? `<div class="pantry-expiry">${expiryStatus}</div>` : ''}
      <div class="pantry-actions">
        <button class="btn-quick-use" data-action="quick-use">Quick Use</button>
      </div>
    `;

    card.addEventListener("click", (e) => {
      // Check if clicked on quick-use button
      if (e.target.classList.contains("btn-quick-use") || e.target.getAttribute("data-action") === "quick-use") {
        e.stopPropagation();
        openQuickDepleteModal(item);
      } else {
        openIngredientModal(item);
      }
    });

        categoryItems.appendChild(card);
      });

      container.appendChild(categoryItems);
    }
  });
}

function getCategoryEmoji(category) {
  const emojis = {
    'Meat': '🥩',
    'Dairy': '🥛',
    'Produce': '🥬',
    'Pantry': '🏺',
    'Frozen': '🧊',
    'Spices': '🌶️',
    'Other': '📦'
  };
  return emojis[category] || '📦';
}

/* ---------------------------------------------------
   QUICK DEPLETE (for snacking/micro transactions)
--------------------------------------------------- */

function openQuickDepleteModal(item) {
  const locationRows = item.locations.map(loc => `
    <div class="modal-location-row">
      <label>${loc.location}</label>
      <span class="loc-qty-display">${loc.qty} ${item.unit} available</span>
      <input type="number"
             class="deplete-qty-input"
             placeholder="0"
             step="0.01"
             min="0"
             max="${loc.qty}"
             data-loc-id="${loc.id}">
    </div>
  `).join("");

  const contentHTML = `
    ${modalFull(`
      <p style="margin-bottom:1rem; opacity:0.8;">
        How much <strong>${item.name}</strong> did you use?
      </p>
      <div id="deplete-locations">
        ${locationRows}
      </div>
    `)}
  `;

  openCardModal({
    title: "Quick Use",
    subtitle: `${item.name} - Snacking or quick consumption`,
    contentHTML,
    slideout: true,
    actions: [
      {
        label: "Use",
        class: "btn-primary",
        onClick: () => saveQuickDeplete(item)
      },
      {
        label: "Cancel",
        class: "btn-secondary",
        onClick: closeModal
      }
    ]
  });
}

function saveQuickDeplete(item) {
  const modal = document.querySelector(".modal-card");
  const inputs = modal.querySelectorAll(".deplete-qty-input");

  let totalDepleted = 0;

  inputs.forEach(input => {
    const qty = Number(input.value) || 0;
    const locId = input.getAttribute("data-loc-id");

    if (qty > 0) {
      const location = item.locations.find(l => l.id === locId);
      if (location) {
        location.qty = Math.max(0, location.qty - qty);
        totalDepleted += qty;
      }
    }
  });

  if (totalDepleted > 0) {
    // Remove locations with 0 quantity
    item.locations = item.locations.filter(loc => loc.qty > 0);

    // Update total quantity
    item.totalQty = getTotalQty(item);

    savePantry();
    renderPantry();
    generateShoppingList();
    updateDashboard();
  }

  closeModal();
}

/* ---------------------------------------------------
   AUTHENTICATION MODALS
--------------------------------------------------- */

function openSigninModal() {
  // If already signed in, show account info instead
  if (window.auth && window.auth.isAuthenticated()) {
    openAccountModal();
    return;
  }

  const contentHTML = `
    ${modalRow([
      modalField({
        label: "Email",
        type: "email",
        placeholder: "your@email.com",
        id: "signin-email"
      })
    ])}

    ${modalRow([
      modalField({
        label: "Password",
        type: "password",
        placeholder: "Enter your password",
        id: "signin-password"
      })
    ])}

    <div id="signin-error" style="color:#d32f2f; margin-top:0.5rem; font-size:0.9rem; display:none;"></div>

    <p style="margin-top:1.5rem; text-align:center; opacity:0.8;">
      Don't have an account? <a href="#" id="create-account-link" style="color:#8a9a5b; font-weight:600; text-decoration:none;">Create one</a>
    </p>
  `;

  openCardModal({
    title: "Sign In",
    subtitle: "Connect to your kitchen account",
    contentHTML,
    slideout: true,
    actions: [
      {
        label: "Sign In",
        class: "btn-primary",
        onClick: handleSignIn
      },
      {
        label: "Cancel",
        class: "btn-secondary",
        onClick: closeModal
      }
    ]
  });

  // Wire up create account link
  const createLink = document.getElementById("create-account-link");
  if (createLink) {
    createLink.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
      setTimeout(() => openCreateAccountModal(), 100);
    });
  }

  // Enable Enter key to submit
  const emailInput = document.getElementById("signin-email");
  const passwordInput = document.getElementById("signin-password");

  [emailInput, passwordInput].forEach(input => {
    if (input) {
      input.addEventListener("keypress", (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSignIn();
        }
      });
    }
  });
}

async function handleSignIn() {
  const emailInput = document.getElementById("signin-email");
  const passwordInput = document.getElementById("signin-password");
  const errorDiv = document.getElementById("signin-error");

  const email = emailInput?.value.trim();
  const password = passwordInput?.value;

  // Validation
  if (!email || !password) {
    showError(errorDiv, "Please enter both email and password");
    return;
  }

  if (!isValidEmail(email)) {
    showError(errorDiv, "Please enter a valid email address");
    return;
  }

  // Disable button during sign in
  const signInBtn = document.querySelector(".modal-card .btn-primary");
  const originalText = signInBtn?.textContent;
  if (signInBtn) {
    signInBtn.disabled = true;
    signInBtn.textContent = "Signing in...";
  }

  // Attempt sign in
  const result = await window.auth.signIn(email, password);

  if (result.success) {
    closeModal();
    // Reload data from database
    await loadUserData();
    showToast("✅ Signed in successfully!");
  } else {
    showError(errorDiv, result.error);
    if (signInBtn) {
      signInBtn.disabled = false;
      signInBtn.textContent = originalText;
    }
  }
}

function openCreateAccountModal() {
  const contentHTML = `
    ${modalRow([
      modalField({
        label: "Email",
        type: "email",
        placeholder: "your@email.com",
        id: "signup-email"
      })
    ])}

    ${modalRow([
      modalField({
        label: "Password",
        type: "password",
        placeholder: "At least 6 characters",
        id: "signup-password"
      })
    ])}

    ${modalRow([
      modalField({
        label: "Confirm Password",
        type: "password",
        placeholder: "Confirm your password",
        id: "signup-confirm"
      })
    ])}

    <div id="signup-error" style="color:#d32f2f; margin-top:0.5rem; font-size:0.9rem; display:none;"></div>

    <p style="margin-top:1.5rem; text-align:center; opacity:0.8;">
      Already have an account? <a href="#" id="signin-link" style="color:#8a9a5b; font-weight:600; text-decoration:none;">Sign in</a>
    </p>
  `;

  openCardModal({
    title: "Create Account",
    subtitle: "Join Chef's Kiss and sync your kitchen",
    contentHTML,
    slideout: true,
    actions: [
      {
        label: "Create Account",
        class: "btn-primary",
        onClick: handleSignUp
      },
      {
        label: "Cancel",
        class: "btn-secondary",
        onClick: closeModal
      }
    ]
  });

  // Wire up sign-in link
  const signinLink = document.getElementById("signin-link");
  if (signinLink) {
    signinLink.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
      setTimeout(() => openSigninModal(), 100);
    });
  }

  // Enable Enter key to submit
  const emailInput = document.getElementById("signup-email");
  const passwordInput = document.getElementById("signup-password");
  const confirmInput = document.getElementById("signup-confirm");

  [emailInput, passwordInput, confirmInput].forEach(input => {
    if (input) {
      input.addEventListener("keypress", (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSignUp();
        }
      });
    }
  });
}

async function handleSignUp() {
  const emailInput = document.getElementById("signup-email");
  const passwordInput = document.getElementById("signup-password");
  const confirmInput = document.getElementById("signup-confirm");
  const errorDiv = document.getElementById("signup-error");

  const email = emailInput?.value.trim();
  const password = passwordInput?.value;
  const confirm = confirmInput?.value;

  // Validation
  if (!email || !password || !confirm) {
    showError(errorDiv, "Please fill in all fields");
    return;
  }

  if (!isValidEmail(email)) {
    showError(errorDiv, "Please enter a valid email address");
    return;
  }

  if (password.length < 6) {
    showError(errorDiv, "Password must be at least 6 characters");
    return;
  }

  if (password !== confirm) {
    showError(errorDiv, "Passwords do not match");
    return;
  }

  // Disable button during sign up
  const signUpBtn = document.querySelector(".modal-card .btn-primary");
  const originalText = signUpBtn?.textContent;
  if (signUpBtn) {
    signUpBtn.disabled = true;
    signUpBtn.textContent = "Creating account...";
  }

  // Attempt sign up
  const result = await window.auth.signUp(email, password);

  if (result.success) {
    closeModal();
    showToast(result.message || "✅ Account created!");
    // Load data after signup
    await loadUserData();
  } else {
    showError(errorDiv, result.error);
    if (signUpBtn) {
      signUpBtn.disabled = false;
      signUpBtn.textContent = originalText;
    }
  }
}

function openAccountModal() {
  const user = window.auth.getCurrentUser();

  if (!user) {
    openSigninModal();
    return;
  }

  const contentHTML = `
    <div style="padding:1rem 0;">
      <div style="margin-bottom:1rem;">
        <strong style="opacity:0.7;">Email:</strong><br>
        ${user.email}
      </div>
      <div style="margin-bottom:1rem;">
        <strong style="opacity:0.7;">Account created:</strong><br>
        ${new Date(user.created_at).toLocaleDateString()}
      </div>
    </div>
  `;

  openCardModal({
    title: "Account",
    subtitle: "Your Chef's Kiss account",
    contentHTML,
    slideout: true,
    actions: [
      {
        label: "Sign Out",
        class: "btn-secondary",
        onClick: async () => {
          const result = await window.auth.signOut();
          if (result.success) {
            closeModal();
            showToast("✅ Signed out");
            // Clear local data
            clearLocalData();
          }
        }
      },
      {
        label: "Close",
        class: "btn-primary",
        onClick: closeModal
      }
    ]
  });
}

// Helper functions
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(errorDiv, message) {
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  }
}

function showToast(message) {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background: #2e3a1f;
    color: white;
    padding: 1rem 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideUp 0.3s ease;
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function clearLocalData() {
  // Unsubscribe from realtime channels
  if (window.realtime) {
    window.realtime.unsubscribeAll();
  }

  // Clear all data
  pantry = [];
  recipes = [];
  planner = {};
  shopping = [];
  window.customShoppingItems = [];

  savePantry();
  saveRecipes();
  savePlanner();
  renderAll();
}

async function loadUserData() {
  if (!window.db || !window.auth || !window.auth.isAuthenticated()) {
    console.log('📥 Loading user data (localStorage mode)');
    renderPantry();
    renderRecipes();
    generateShoppingList();
    updateDashboard();
    return;
  }

  console.log('📥 Loading user data from database...');

  try {
    // Load pantry from database
    const dbPantry = await window.db.loadPantryItems();
    if (dbPantry) {
      pantry = dbPantry;
      localStorage.setItem("pantry", JSON.stringify(pantry));
    }

    // Load recipes from database
    const dbRecipes = await window.db.loadRecipes();
    if (dbRecipes) {
      recipes = dbRecipes;
      localStorage.setItem("recipes", JSON.stringify(recipes));
    }

    // Load meal plans from database
    const dbPlanner = await window.db.loadMealPlans();
    if (dbPlanner) {
      planner = dbPlanner;
      localStorage.setItem("planner", JSON.stringify(planner));
    }

    // Load custom shopping list items from database
    const dbShopping = await window.db.loadShoppingList();
    if (dbShopping) {
      // Store custom items separately - they'll be merged with auto-generated items
      window.customShoppingItems = dbShopping;
    }

    console.log('✅ User data loaded from database');

    // Re-render everything
    renderPantry();
    renderRecipes();
    generateShoppingList();
    updateDashboard();

    // Initialize realtime subscriptions
    if (window.realtime) {
      await window.realtime.initRealtimeSync();
    }

  } catch (err) {
    console.error('Error loading user data:', err);
    showToast('⚠️ Error loading data from database');
  }
}

/* ---------------------------------------------------
   SETTINGS MODAL (UI skeleton with locations/categories management)
--------------------------------------------------- */

function openSettingsModal() {
  // Get current locations and categories from usage
  const usedLocations = new Set();
  pantry.forEach(item => {
    item.locations.forEach(loc => {
      usedLocations.add(loc.location);
    });
  });

  const usedCategories = new Set();
  pantry.forEach(item => {
    usedCategories.add(item.category);
  });

  const locationsList = Array.from(usedLocations).map(loc =>
    `<div class="settings-item">
      <span>${loc}</span>
      <button class="btn-settings-remove" data-type="location" data-value="${loc}">&times;</button>
    </div>`
  ).join("") || '<p style="opacity:0.7;">No locations in use.</p>';

  const categoriesList = Array.from(usedCategories).map(cat =>
    `<div class="settings-item">
      <span>${cat}</span>
      <button class="btn-settings-remove" data-type="category" data-value="${cat}">&times;</button>
    </div>`
  ).join("") || '<p style="opacity:0.7;">No categories in use.</p>';

  const contentHTML = `
    ${modalFull(`
      <h3 style="margin-bottom:0.75rem;">Storage Locations</h3>
      <p style="opacity:0.8; font-size:0.9rem; margin-bottom:0.75rem;">
        Manage where you store ingredients. Removing a location will reassign items to "Pantry".
      </p>
      <div class="settings-list" id="locations-list">
        ${locationsList}
      </div>
      <div class="settings-add-row">
        <input type="text" id="new-location-input" placeholder="Add new location...">
        <button class="btn btn-secondary" id="add-location-btn">Add</button>
      </div>
    `)}

    ${modalFull(`
      <h3 style="margin:1.5rem 0 0.75rem 0;">Categories</h3>
      <p style="opacity:0.8; font-size:0.9rem; margin-bottom:0.75rem;">
        Manage ingredient categories. Removing a category will reassign items to "Other".
      </p>
      <div class="settings-list" id="categories-list">
        ${categoriesList}
      </div>
      <div class="settings-add-row">
        <input type="text" id="new-category-input" placeholder="Add new category...">
        <button class="btn btn-secondary" id="add-category-btn">Add</button>
      </div>
    `)}

    ${modalFull(`
      <h3 style="margin:1.5rem 0 0.75rem 0;">Share Pantry</h3>
      <p style="opacity:0.8; font-size:0.9rem; margin-bottom:0.75rem;">
        Generate a code to share your pantry with family or roommates. (Coming soon!)
      </p>
      <button class="btn btn-secondary" id="generate-code-btn" disabled>
        Generate Share Code
      </button>
    `)}

    ${modalFull(`
      <h3 style="margin:1.5rem 0 0.75rem 0;">App Info</h3>
      <div class="settings-info">
        <p><strong>Name:</strong> Chef's Kiss</p>
        <p><strong>Version:</strong> 1.4.0</p>
        <p><strong>Description:</strong> Cozy kitchen management for modern cooks</p>
        <p style="opacity:0.7; font-size:0.85rem; margin-top:0.5rem;">
          Track your pantry, plan meals, and build shopping lists—without the overwhelm.
        </p>
      </div>
    `)}
  `;

  openCardModal({
    title: "Settings",
    subtitle: "Manage your kitchen preferences",
    contentHTML,
    slideout: true,
    actions: [
      {
        label: "Done",
        class: "btn-primary",
        onClick: closeModal
      }
    ]
  });

  // Wire up remove buttons
  const removeBtns = document.querySelectorAll(".btn-settings-remove");
  removeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-type");
      const value = btn.getAttribute("data-value");

      if (type === "location") {
        removeLocation(value);
      } else if (type === "category") {
        removeCategory(value);
      }

      closeModal();
      setTimeout(() => openSettingsModal(), 100);
    });
  });

  // Wire up add location button
  const addLocBtn = document.getElementById("add-location-btn");
  const newLocInput = document.getElementById("new-location-input");
  if (addLocBtn && newLocInput) {
    addLocBtn.addEventListener("click", () => {
      const newLocation = newLocInput.value.trim();
      if (newLocation) {
        alert(`Location "${newLocation}" will be available in location dropdowns from now on. Add it to an ingredient to start using it!`);
        newLocInput.value = "";
      }
    });
  }

  // Wire up add category button
  const addCatBtn = document.getElementById("add-category-btn");
  const newCatInput = document.getElementById("new-category-input");
  if (addCatBtn && newCatInput) {
    addCatBtn.addEventListener("click", () => {
      const newCategory = newCatInput.value.trim();
      if (newCategory) {
        alert(`Category "${newCategory}" will be available in category dropdowns from now on. Add it to an ingredient to start using it!`);
        newCatInput.value = "";
      }
    });
  }
}

function removeLocation(location) {
  if (!confirm(`Remove location "${location}"? All items in this location will be moved to "Pantry".`)) {
    return;
  }

  pantry.forEach(item => {
    item.locations.forEach(loc => {
      if (loc.location === location) {
        loc.location = "Pantry";
      }
    });
  });

  savePantry();
  renderPantry();
  updateDashboard();
}

function removeCategory(category) {
  if (!confirm(`Remove category "${category}"? All items in this category will be moved to "Other".`)) {
    return;
  }

  pantry.forEach(item => {
    if (item.category === category) {
      item.category = "Other";
    }
  });

  savePantry();
  renderPantry();
  updateDashboard();
}

/* ---------------------------------------------------
   SMOOTH SCROLL
--------------------------------------------------- */

function setupSmoothScroll() {
  const scrollButtons = document.querySelectorAll("[data-scroll-target]");

  scrollButtons.forEach(button => {
    button.addEventListener("click", (e) => {
      const target = e.currentTarget.getAttribute("data-scroll-target");
      const targetEl = document.querySelector(target);

      if (targetEl) {
        targetEl.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
}

/* ---------------------------------------------------
   INITIALIZATION
--------------------------------------------------- */

async function init() {
  // Initialize authentication first
  if (window.auth) {
    await window.auth.initAuth();
  }

  // Migrate data structures (for localStorage data)
  migratePantryData();
  migratePlannerData();

  // Load user data from database if authenticated
  if (window.auth && window.auth.isAuthenticated()) {
    await loadUserData();

    // Initialize realtime subscriptions for multi-user sync
    if (window.realtime) {
      await window.realtime.initRealtimeSync();
    }
  } else {
    // Not authenticated - render from localStorage
    renderPantry();
    renderRecipes();
    generateShoppingList();
    updateDashboard();
  }

  // Update date/time immediately and every minute
  updateDateTime();
  setInterval(updateDateTime, 60000);

  // Wire pantry filter
  const filterCategory = document.getElementById("filter-category");
  if (filterCategory) {
    filterCategory.addEventListener("change", applyPantryFilter);
  }

  // Pantry search input
  const pantrySearch = document.getElementById("pantry-search");
  if (pantrySearch) {
    pantrySearch.addEventListener("input", applyPantryFilter);
  }

  // Pantry sort select
  const sortPantry = document.getElementById("sort-pantry");
  if (sortPantry) {
    sortPantry.addEventListener("change", applyPantryFilter);
  }

  // Recipe search input
  const recipeSearch = document.getElementById("recipe-search");
  if (recipeSearch) {
    recipeSearch.addEventListener("input", renderRecipes);
  }

  // Recipe ready filter
  const filterRecipeReady = document.getElementById("filter-recipe-ready");
  if (filterRecipeReady) {
    filterRecipeReady.addEventListener("change", renderRecipes);
  }

  // Wire planner buttons
  // Floating Action Button
  const floatingActionBtn = document.getElementById("floating-action-btn");
  const floatingActionOptions = document.getElementById("floating-action-options");

  if (floatingActionBtn && floatingActionOptions) {
    floatingActionBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      floatingActionBtn.classList.toggle("active");
      floatingActionOptions.classList.toggle("active");
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".floating-action-menu")) {
        floatingActionBtn.classList.remove("active");
        floatingActionOptions.classList.remove("active");
      }
    });
  }

  // FAB option clicks
  const fabAddIngredient = document.getElementById("fab-add-ingredient");
  if (fabAddIngredient) {
    fabAddIngredient.addEventListener("click", () => {
      openIngredientModal(null);
      floatingActionBtn.classList.remove("active");
      floatingActionOptions.classList.remove("active");
    });
  }

  const fabAddRecipe = document.getElementById("fab-add-recipe");
  if (fabAddRecipe) {
    fabAddRecipe.addEventListener("click", () => {
      openRecipeModal(null);
      floatingActionBtn.classList.remove("active");
      floatingActionOptions.classList.remove("active");
    });
  }

  const fabAddMeal = document.getElementById("fab-add-meal");
  if (fabAddMeal) {
    fabAddMeal.addEventListener("click", () => {
      openPlannerModal();
      floatingActionBtn.classList.remove("active");
      floatingActionOptions.classList.remove("active");
    });
  }

  const btnOpenPlanner = document.getElementById("btn-open-planner");
  if (btnOpenPlanner) {
    btnOpenPlanner.addEventListener("click", openPlannerModal);
  }

  const navPlanner = document.getElementById("nav-planner");
  if (navPlanner) {
    navPlanner.addEventListener("click", openPlannerModal);
  }

  // Shopping buttons
  const btnAddCustom = document.getElementById("btn-add-custom-item");
  if (btnAddCustom) {
    btnAddCustom.addEventListener("click", handleQuickAddShopping);
  }

  // Shopping quick-add with Enter key
  const userItemInput = document.getElementById("user-item-name");
  if (userItemInput) {
    userItemInput.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleQuickAddShopping();
      }
    });
  }

  const btnCheckout = document.getElementById("btn-checkout");
  if (btnCheckout) {
    btnCheckout.addEventListener("click", openCheckoutModal);
  }

  // Reset button
  const btnReset = document.getElementById("btn-reset");
  if (btnReset) {
    btnReset.addEventListener("click", resetAllData);
  }

  // Sign-in button
  const btnSignin = document.getElementById("btn-signin");
  if (btnSignin) {
    btnSignin.addEventListener("click", openSigninModal);
  }

  // Settings button
  const btnSettings = document.getElementById("btn-settings");
  if (btnSettings) {
    btnSettings.addEventListener("click", openSettingsModal);
  }

  // Setup smooth scroll
  setupSmoothScroll();
}

function resetAllData() {
  if (!confirm("Are you sure you want to clear ALL data? This will delete your pantry, recipes, meal plan, and shopping list. This cannot be undone.")) {
    return;
  }

  // Clear all localStorage
  localStorage.clear();

  // Reset arrays
  pantry = [];
  recipes = [];
  planner = {};
  shopping = [];

  // Reload page
  location.reload();
}

document.addEventListener("DOMContentLoaded", init);