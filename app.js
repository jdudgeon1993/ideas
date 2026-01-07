/* ---------------------------------------------------
   CORE DATA MODELS
--------------------------------------------------- */

// Shared ID generator
function uid() {
  return Math.random().toString(36).substr(2, 9);
}

// Pantry
let pantry = JSON.parse(localStorage.getItem("pantry") || "[]");

function savePantry() {
  localStorage.setItem("pantry", JSON.stringify(pantry));
}

function getIngredient(id) {
  return pantry.find(item => item.id === id);
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

function openIngredientModal(existing = null) {
  const isEdit = !!existing;

  const title = isEdit ? "Edit Ingredient" : "Add Ingredient";
  const subtitle = isEdit
    ? "Update your pantry item."
    : "Keep your pantry honest and human.";

  const contentHTML = `
    ${modalRow([
      modalField({
        label: "Ingredient Name",
        value: existing ? existing.name : ""
      }),
      modalField({
        label: "Category",
        type: "select",
        options: ["Meat", "Dairy", "Produce", "Pantry", "Frozen", "Spices", "Other"],
        value: existing ? existing.category : ""
      })
    ])}

    ${modalRow([
      modalField({
        label: "Quantity On Hand",
        type: "number",
        value: existing ? existing.qty : ""
      }),
      modalField({
        label: "Unit of Measure",
        value: existing ? existing.unit : ""
      })
    ])}

    ${modalRow([
      modalField({
        label: "Minimum Threshold",
        type: "number",
        value: existing ? existing.min : ""
      }),
      modalField({
        label: "Storage Location",
        type: "select",
        options: ["Pantry", "Fridge", "Freezer", "Cellar", "Other"],
        value: existing ? existing.location : ""
      })
    ])}

    ${modalRow([
      modalField({
        label: "Expiration Date",
        type: "date",
        value: existing ? (existing.expiry || "") : ""
      }),
      modalField({
        label: "Notes (optional)",
        placeholder: "Optional notes...",
        value: existing ? (existing.notes || "") : ""
      })
    ])}
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
}

function saveIngredient(existing) {
  const modal = document.querySelector(".modal-card");
  const fields = modal.querySelectorAll(".modal-field input, .modal-field select, .modal-field textarea");
  const values = Array.from(fields).map(f => f.value.trim());

  const [
    name,
    category,
    qty,
    unit,
    min,
    location,
    expiry,
    notes
  ] = values;

  if (!name) {
    alert("Ingredient name is required.");
    return;
  }

  if (existing) {
    existing.name = name;
    existing.category = category;
    existing.qty = Number(qty);
    existing.unit = unit;
    existing.min = Number(min);
    existing.location = location;
    existing.expiry = expiry;
    existing.notes = notes;
  } else {
    pantry.push({
      id: uid(),
      name,
      category,
      qty: Number(qty || 0),
      unit,
      min: Number(min || 0),
      location,
      expiry,
      notes
    });
  }

  savePantry();
  renderPantry();
  renderShoppingList();
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
        value: existing ? existing.name : ""
      }),
      modalField({
        label: "Servings",
        type: "number",
        value: existing ? existing.servings : ""
      })
    ])}

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
        rows: 6
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
    existing.instructions = instructions;
    existing.ingredients = ingredients;
  } else {
    recipes.push({
      id: uid(),
      name,
      servings: Number(servings || 0),
      instructions,
      ingredients
    });
  }

  saveRecipes();
  renderRecipes();
  renderShoppingList();
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

    card.innerHTML = `
      <strong>${recipe.name}</strong><br>
      <span>${recipe.servings} servings</span><br>
      <span>${recipe.ingredients.length} ingredients</span>
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
   PLANNER: RENDER + DAY MODAL
--------------------------------------------------- */

function renderPlanner() {
  const container = document.getElementById("day-grid");
  const monthLabel = document.getElementById("planner-month-label");
  if (!container || !monthLabel) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const monthName = firstDay.toLocaleString("default", { month: "long" });
  monthLabel.textContent = `${monthName} ${year}`;

  container.innerHTML = "";

  for (let i = 0; i < firstDay.getDay(); i++) {
    const empty = document.createElement("div");
    empty.className = "planner-day empty";
    container.appendChild(empty);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split("T")[0];

    const cell = document.createElement("div");
    cell.className = "planner-day";

    const plannedId = getPlannedRecipe(dateStr);
    const plannedRecipe = plannedId ? getRecipe(plannedId) : null;

    cell.innerHTML = `
      <div class="planner-day-number">${day}</div>
      <div class="planner-day-content">
        ${plannedRecipe
          ? `<span class="planner-recipe">${plannedRecipe.name}</span>`
          : `<span class="planner-empty">No meal</span>`}
      </div>
    `;

    cell.addEventListener("click", () => openDayModal(dateStr));

    container.appendChild(cell);
  }
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
          renderPlanner();
          renderShoppingList();
          closeModal();
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

  renderPlanner();
  renderShoppingList();
  closeModal();
}

/* ---------------------------------------------------
   SHOPPING: GENERATE + RENDER + MODALS
--------------------------------------------------- */

function generateShoppingList() {
  clearShopping();

  // Threshold-based items
  pantry.forEach(item => {
    if (item.min && item.qty < item.min) {
      const needed = item.min - item.qty;
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
  Object.keys(planner).forEach(dateStr => {
    const recipeId = planner[dateStr];
    const recipe = getRecipe(recipeId);
    if (!recipe) return;

    recipe.ingredients.forEach(ing => {
      const pantryItem = pantry.find(p => p.name === ing.name && p.unit === ing.unit);
      const available = pantryItem ? pantryItem.qty : 0;
      const missing = ing.qty - available;

      if (missing > 0) {
        const existing = findShoppingItem(ing.name, ing.unit);
        if (existing) {
          existing.qty += missing;
        } else {
          addShoppingItem({
            name: ing.name,
            qty: missing,
            unit: ing.unit,
            category: pantryItem ? pantryItem.category : "Other",
            source: "Planner"
          });
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
      pantryItem.qty += qty;
      pantryItem.category = category;
      pantryItem.location = storage;
      pantryItem.expiry = expiry;
    } else {
      pantry.push({
        id: uid(),
        name,
        qty,
        unit,
        category,
        location: storage,
        min: 0,
        expiry,
        notes: ""
      });
    }
  });

  savePantry();

  shopping = shopping.filter(i => !i.checked);
  saveShopping();

  renderPantry();
  renderShoppingList();
  closeModal();
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

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "pantry-item";

    card.innerHTML = `
      <strong>${item.name}</strong><br>
      <span>${item.qty} ${item.unit}</span><br>
      <span>Category: ${item.category}</span><br>
      <span>Location: ${item.location}</span><br>
      <span>Min: ${item.min}</span><br>
      <span>Expiry: ${item.expiry || "—"}</span>
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
  // Update date/time immediately and every minute
  updateDateTime();
  setInterval(updateDateTime, 60000);

  // Render initial state
  renderPantry();
  renderRecipes();
  renderPlanner();
  renderShoppingList();

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

  // Shopping buttons
  const btnGenerate = document.getElementById("btn-generate-shopping");
  if (btnGenerate) {
    btnGenerate.addEventListener("click", generateShoppingList);
  }

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