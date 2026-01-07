/* ---------------------------------------------------
   CORE DATA MODELS
--------------------------------------------------- */

// Shared ID generator
function uid() {
  return Math.random().toString(36).substr(2, 9);
}

// Pantry - Multi-location data model
let pantry = JSON.parse(localStorage.getItem("pantry") || "[]");

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

function savePantry() {
  localStorage.setItem("pantry", JSON.stringify(pantry));
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

function saveRecipes() {
  localStorage.setItem("recipes", JSON.stringify(recipes));
}

function getRecipe(id) {
  return recipes.find(r => r.id === id);
}

// Planner (YYYY-MM-DD → recipeId)
let planner = JSON.parse(localStorage.getItem("planner") || "{}");

function savePlanner() {
  localStorage.setItem("planner", JSON.stringify(planner));
}

function getPlannedRecipe(date) {
  return planner[date] || null;
}

function setPlannedRecipe(date, recipeId) {
  planner[date] = recipeId;
  savePlanner();
}

function clearPlannedRecipe(date) {
  delete planner[date];
  savePlanner();
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
    qty: Number(qty),
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

function openCardModal({ title, subtitle = "", contentHTML = "", actions = [] }) {
  closeModal();

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const card = document.createElement("div");
  card.className = "modal-card";

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
      <input type="text" value="${ingredient}" placeholder="Ingredient">
      <input type="text" value="${qty}" placeholder="Qty">
      <input type="text" value="${unit}" placeholder="Unit">
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
      }
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
      }
    });
  }
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
    const inputs = row.querySelectorAll("input");
    return {
      name: inputs[0].value.trim(),
      qty: Number(inputs[1].value.trim() || 0),
      unit: inputs[2].value.trim()
    };
  }).filter(ing => ing.name);

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
  renderRecipes();
  generateShoppingList();
  updateDashboard();
  closeModal();
}

function renderRecipes() {
  const container = document.getElementById("recipe-list");
  if (!container) return;

  container.innerHTML = "";

  if (recipes.length === 0) {
    container.innerHTML = `<p style="opacity:0.7;">No recipes yet. Add your first cozy dish.</p>`;
    return;
  }

  recipes.forEach(recipe => {
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
      }
    ]
  });
}

// Minimal cook modal for now
function openCookModal(recipe) {
  const contentHTML = `
    ${modalFull(`
      <p style="margin-bottom:1rem;">
        Ready to cook <strong>${recipe.name}</strong>? You can use this as a reference while you work.
      </p>
    `)}
  `;

  openCardModal({
    title: "Cook Now",
    subtitle: recipe.name,
    contentHTML,
    actions: [
      {
        label: "Close",
        class: "btn-secondary",
        onClick: closeModal
      }
    ]
  });
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

    const plannedId = getPlannedRecipe(dateStr);
    const plannedRecipe = plannedId ? getRecipe(plannedId) : null;

    dayGridHTML += `
      <div class="planner-day" data-date="${dateStr}">
        <div class="planner-day-number">${day}</div>
        <div class="planner-day-content">
          ${plannedRecipe
            ? `<span class="planner-recipe">${plannedRecipe.name}</span>`
            : `<span class="planner-empty">No meal</span>`}
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
  const plannedId = getPlannedRecipe(dateStr);
  const plannedRecipe = plannedId ? getRecipe(plannedId) : null;

  const recipeOptions = recipes.map(r => r.name);
  const currentName = plannedRecipe ? plannedRecipe.name : "None";

  const contentHTML = `
    ${modalRow([
      modalField({
        label: "Planned Recipe",
        type: "select",
        options: ["None", ...recipeOptions],
        value: currentName
      }),
      modalField({
        label: "Date",
        value: dateStr,
        type: "text"
      })
    ])}

    ${plannedRecipe ? modalFull(`
      <button class="btn btn-secondary" id="open-recipe-from-day">
        View Recipe Card
      </button>
    `) : ""}
  `;

  openCardModal({
    title: `Plan for ${dateStr}`,
    subtitle: plannedRecipe ? "Meal assigned" : "No meal assigned",
    contentHTML,
    actions: [
      {
        label: "Save",
        class: "btn-primary",
        onClick: () => saveDayPlan(dateStr)
      },
      {
        label: "Remove",
        class: "btn-secondary",
        onClick: () => {
          clearPlannedRecipe(dateStr);
          generateShoppingList();
          renderPantry();
          updateDashboard();
          closeModal();
          setTimeout(() => openPlannerModal(), 100);
        }
      }
    ]
  });

  if (plannedRecipe) {
    const btn = document.getElementById("open-recipe-from-day");
    if (btn) {
      btn.addEventListener("click", () => {
        closeModal();
        openRecipeViewModal(plannedRecipe);
      });
    }
  }
}

function saveDayPlan(dateStr) {
  const modal = document.querySelector(".modal-card");
  const select = modal.querySelector("select");

  const selectedName = select.value;

  if (selectedName === "None") {
    clearPlannedRecipe(dateStr);
  } else {
    const recipe = recipes.find(r => r.name === selectedName);
    if (recipe) setPlannedRecipe(dateStr, recipe.id);
  }

  generateShoppingList();
  renderPantry();
  updateDashboard();
  closeModal();
  setTimeout(() => openPlannerModal(), 100);
}

/* ---------------------------------------------------
   SHOPPING: GENERATE + RENDER + MODALS
--------------------------------------------------- */

function generateShoppingList() {
  clearShopping();

  // Threshold-based items
  pantry.forEach(item => {
    if (item.min && item.totalQty < item.min) {
      const needed = item.min - item.totalQty;
      addShoppingItem({
        name: item.name,
        qty: needed,
        unit: item.unit,
        category: item.category,
        source: "Threshold"
      });
    }
  });

  // Missing ingredients from planned meals
  const reserved = calculateReservedIngredients();

  Object.keys(planner).forEach(dateStr => {
    const recipeId = planner[dateStr];
    const recipe = getRecipe(recipeId);
    if (!recipe) return;

    recipe.ingredients.forEach(ing => {
      const pantryItem = pantry.find(p => p.name === ing.name && p.unit === ing.unit);

      if (!pantryItem) {
        // Ingredient doesn't exist in pantry at all
        const existing = findShoppingItem(ing.name, ing.unit);
        if (existing) {
          existing.qty = Math.max(existing.qty, ing.qty);
        } else {
          addShoppingItem({
            name: ing.name,
            qty: ing.qty,
            unit: ing.unit,
            category: "Other",
            source: "Planner"
          });
        }
      } else {
        // Check if we have enough after reservations
        const key = `${ing.name}|${ing.unit}`;
        const alreadyReserved = reserved[key] || 0;
        const available = pantryItem.totalQty - alreadyReserved;

        if (available < ing.qty) {
          const missing = ing.qty - Math.max(0, available);
          const existing = findShoppingItem(ing.name, ing.unit);
          if (existing) {
            existing.qty = Math.max(existing.qty, missing);
          } else {
            addShoppingItem({
              name: ing.name,
              qty: missing,
              unit: ing.unit,
              category: pantryItem.category,
              source: "Planner"
            });
          }
        }
      }
    });
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
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      const header = document.createElement("div");
      header.className = "shopping-category-header";
      header.textContent = currentCategory;
      container.appendChild(header);
    }

    const card = document.createElement("div");
    card.className = "shopping-item";

    card.innerHTML = `
      <input type="checkbox" class="shopping-check" ${item.checked ? "checked" : ""}>
      <div class="shopping-info">
        <strong>${item.name}</strong>
        <div class="shopping-sub">
          ${item.qty} ${item.unit} • ${item.source}
        </div>
      </div>
      <button class="shopping-remove">&times;</button>
    `;

    card.querySelector(".shopping-check").addEventListener("change", (e) => {
      item.checked = e.target.checked;
      saveShopping();
    });

    card.querySelector(".shopping-remove").addEventListener("click", () => {
      shopping = shopping.filter(i => i.id !== item.id);
      saveShopping();
      renderShoppingList();
    });

    container.appendChild(card);
  });
}

function openCustomShoppingModal() {
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

  const rows = purchased.map(item => `
    <div class="modal-ingredient-row">
      <input type="text" value="${item.name}" disabled>
      <input type="number" value="${item.qty}" placeholder="Qty">
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
  `).join("");

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
  // Calculate how much of each ingredient is reserved for planned meals
  const reserved = {};

  Object.keys(planner).forEach(dateStr => {
    const recipeId = planner[dateStr];
    const recipe = getRecipe(recipeId);
    if (!recipe) return;

    recipe.ingredients.forEach(ing => {
      const key = `${ing.name}|${ing.unit}`;
      if (!reserved[key]) {
        reserved[key] = 0;
      }
      reserved[key] += ing.qty;
    });
  });

  return reserved;
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
  // Today's meal
  const today = new Date().toISOString().split("T")[0];
  const todayRecipeId = getPlannedRecipe(today);
  const todayRecipe = todayRecipeId ? getRecipe(todayRecipeId) : null;
  const todayMealEl = document.getElementById("dash-today-meal");
  if (todayMealEl) {
    todayMealEl.textContent = todayRecipe ? todayRecipe.name : "Not planned";
  }

  // Ready-to-cook recipes (recipes where all ingredients are available)
  const reserved = calculateReservedIngredients();
  const readyRecipes = recipes.filter(recipe => {
    return recipe.ingredients.every(ing => {
      const pantryItem = pantry.find(p => p.name === ing.name && p.unit === ing.unit);
      if (!pantryItem) return false;

      const key = `${ing.name}|${ing.unit}`;
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

  // Meals planned this week
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

  let weekPlanned = 0;
  Object.keys(planner).forEach(dateStr => {
    const date = new Date(dateStr);
    if (date >= startOfWeek && date <= endOfWeek) {
      weekPlanned++;
    }
  });

  const weekPlannedEl = document.getElementById("dash-week-planned");
  if (weekPlannedEl) {
    weekPlannedEl.textContent = weekPlanned;
  }
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

function applyPantryFilter() {
  const filterSelect = document.getElementById("filter-category");
  const selectedCategory = filterSelect ? filterSelect.value : "";

  const container = document.getElementById("pantry-display");
  if (!container) return;

  container.innerHTML = "";

  const filtered = selectedCategory
    ? pantry.filter(item => item.category === selectedCategory)
    : pantry;

  if (filtered.length === 0) {
    container.innerHTML = `<p style="opacity:0.7;">${selectedCategory ? "No items in this category." : "Your pantry is empty. Add your first ingredient."}</p>`;
    return;
  }

  // Calculate reserved quantities
  const reserved = calculateReservedIngredients();

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "pantry-item";

    const key = `${item.name}|${item.unit}`;
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
    `;

    card.addEventListener("click", () => openIngredientModal(item));

    container.appendChild(card);
  });
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

function init() {
  // Migrate pantry data to new multi-location structure
  migratePantryData();

  // Update date/time immediately and every minute
  updateDateTime();
  setInterval(updateDateTime, 60000);

  // Render initial state and auto-generate shopping list
  renderPantry();
  renderRecipes();
  generateShoppingList(); // Auto-generate shopping list on page load
  updateDashboard();

  // Wire pantry button
  const btnAddIngredient = document.getElementById("btn-add-ingredient");
  if (btnAddIngredient) {
    btnAddIngredient.addEventListener("click", () => openIngredientModal(null));
  }

  // Wire pantry filter
  const filterCategory = document.getElementById("filter-category");
  if (filterCategory) {
    filterCategory.addEventListener("change", applyPantryFilter);
  }

  // Wire recipe button
  const btnAddRecipe = document.getElementById("btn-new-recipe");
  if (btnAddRecipe) {
    btnAddRecipe.addEventListener("click", () => openRecipeModal(null));
  }

  // Wire planner buttons
  const floatingPlannerBtn = document.getElementById("floating-planner-btn");
  if (floatingPlannerBtn) {
    floatingPlannerBtn.addEventListener("click", openPlannerModal);
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
    btnAddCustom.addEventListener("click", openCustomShoppingModal);
  }

  const btnCheckout = document.getElementById("btn-checkout");
  if (btnCheckout) {
    btnCheckout.addEventListener("click", openCheckoutModal);
  }

  // Setup smooth scroll
  setupSmoothScroll();
}

document.addEventListener("DOMContentLoaded", init);