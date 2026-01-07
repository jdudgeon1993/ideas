/* ---------------------------------------------------
   Chef's Cove — Cottagecore Edition
   PART 1: State, Storage, Utilities, Modal System
--------------------------------------------------- */

/* ---------------------------------------------------
   PHASE 4A — UNIFIED MODAL FRAMEWORK
--------------------------------------------------- */

function closeModal() {
  const overlay = document.querySelector(".modal-overlay");
  if (overlay) overlay.remove();
}

function openCardModal({ title, subtitle = "", contentHTML = "", actions = [] }) {
  // Remove any existing modal first
  closeModal();

  // Build overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  // Build modal card
  const card = document.createElement("div");
  card.className = "modal-card";

  // Close button
  const closeBtn = document.createElement("div");
  closeBtn.className = "modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", closeModal);

  // Title + subtitle
  const titleEl = document.createElement("div");
  titleEl.className = "modal-card-title";
  titleEl.textContent = title;

  const subtitleEl = document.createElement("div");
  subtitleEl.className = "modal-card-subtitle";
  subtitleEl.textContent = subtitle;

  // Divider
  const dividerTop = document.createElement("div");
  dividerTop.className = "modal-divider";

  // Content container
  const contentEl = document.createElement("div");
  contentEl.className = "modal-content";
  contentEl.innerHTML = contentHTML;

  // Divider before actions
  const dividerBottom = document.createElement("div");
  dividerBottom.className = "modal-divider";

  // Action buttons
  const actionsRow = document.createElement("div");
  actionsRow.className = "modal-actions";

  actions.forEach(action => {
    const btn = document.createElement("button");
    btn.textContent = action.label;
    btn.className = `btn ${action.class || ""}`;
    btn.addEventListener("click", action.onClick);
    actionsRow.appendChild(btn);
  });

  // Assemble modal
  card.appendChild(closeBtn);
  card.appendChild(titleEl);
  if (subtitle) card.appendChild(subtitleEl);
  card.appendChild(dividerTop);
  card.appendChild(contentEl);
  card.appendChild(dividerBottom);
  card.appendChild(actionsRow);

  overlay.appendChild(card);

  // Add to DOM
  document.getElementById("modal-root").appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // Close on ESC key
  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escHandler);
    }
  });
}

/* ---------------------------------------------------
   PHASE 4B — MODAL CONTENT HELPERS
--------------------------------------------------- */

/* Create a labeled input/select/textarea field */
function modalField({ label, type = "text", value = "", options = [], placeholder = "", rows = 3 }) {
  let inputHTML = "";

  if (type === "select") {
    inputHTML = `
      <select>
        ${options.map(opt => `<option value="${opt}">${opt}</option>`).join("")}
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

/* Create a two-column row of fields */
function modalRow(fieldsArray) {
  return `
    <div class="modal-fields">
      ${fieldsArray.join("")}
    </div>
  `;
}

/* Create a full-width block (instructions, lists, etc.) */
function modalFull(content) {
  return `
    <div class="modal-fields-full">
      ${content}
    </div>
  `;
}

/* Create a recipe ingredient row */
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
   PHASE 5A‑1 — PANTRY DATA MODEL + HELPERS
--------------------------------------------------- */

let pantry = JSON.parse(localStorage.getItem("pantry") || "[]");

/* Save pantry to localStorage */
function savePantry() {
  localStorage.setItem("pantry", JSON.stringify(pantry));
}

/* Find ingredient by ID */
function getIngredient(id) {
  return pantry.find(item => item.id === id);
}

/* Generate unique IDs */
function uid() {
  return Math.random().toString(36).substr(2, 9);
}

/* ---------------------------------------------------
   PHASE 5A‑3 — SAVE INGREDIENT + RENDER PANTRY
--------------------------------------------------- */

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
    // Update existing ingredient
    existing.name = name;
    existing.category = category;
    existing.qty = Number(qty);
    existing.unit = unit;
    existing.min = Number(min);
    existing.location = location;
    existing.expiry = expiry;
    existing.notes = notes;
  } else {
    // Add new ingredient
    pantry.push({
      id: uid(),
      name,
      category,
      qty: Number(qty),
      unit,
      min: Number(min),
      location,
      expiry,
      notes
    });
  }

  savePantry();
  renderPantry();
  closeModal();
}

/* Render pantry list */
function renderPantry() {
  const container = document.getElementById("pantry-display");
  container.innerHTML = "";

  pantry.forEach(item => {
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


/* -----------------------------
   GLOBAL STATE (Empty Start)
----------------------------- */
let pantry = [];          // { id, name, category, locations: [{place, qty}], unit, expiry }
let recipes = [];         // { id, name, ingredients: [...], steps: "...", tags: [] }
let planner = {};         // { "2026-01-07": recipeId }
let shopping = [];        // { id, name, source, checked }
let seasonal = [];        // generated dynamically

/* -----------------------------
   LOCAL STORAGE HELPERS
----------------------------- */
function saveState() {
  localStorage.setItem("cc_pantry", JSON.stringify(pantry));
  localStorage.setItem("cc_recipes", JSON.stringify(recipes));
  localStorage.setItem("cc_planner", JSON.stringify(planner));
  localStorage.setItem("cc_shopping", JSON.stringify(shopping));
}

function loadState() {
  pantry = JSON.parse(localStorage.getItem("cc_pantry")) || [];
  recipes = JSON.parse(localStorage.getItem("cc_recipes")) || [];
  planner = JSON.parse(localStorage.getItem("cc_planner")) || {};
  shopping = JSON.parse(localStorage.getItem("cc_shopping")) || [];
}

/* -----------------------------
   UTILITY FUNCTIONS
----------------------------- */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function formatDatePretty(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

/* -----------------------------
   MODAL SYSTEM (Dynamic)
----------------------------- */
let modalRoot = null;

function injectModalRoot() {
  modalRoot = document.createElement("div");
  modalRoot.id = "modal-root";
  document.body.appendChild(modalRoot);
}

function closeModal() {
  if (modalRoot) modalRoot.innerHTML = "";
}

function showModal(html) {
  modalRoot.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-card">
        ${html}
      </div>
    </div>
  `;

  // Close on overlay click
  modalRoot.querySelector(".modal-overlay").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) closeModal();
  });
}

/* -----------------------------
   SECTION REFERENCES
----------------------------- */
let elPantryList;
let elRecipeList;
let elDayGrid;
let elShoppingList;
let elSeasonalList;
let elDashTodayMeal;
let elDashReadyRecipes;

function hookElements() {
  elPantryList = document.getElementById("pantry-display");
  elRecipeList = document.getElementById("recipe-list");
  elDayGrid = document.getElementById("day-grid");
  elShoppingList = document.getElementById("shopping-list");
  elSeasonalList = document.getElementById("seasonal-list");
  elDashTodayMeal = document.getElementById("dash-today-meal");
  elDashReadyRecipes = document.getElementById("dash-ready-recipes");
}

/* ---------------------------------------------------
   PART 2: Pantry Logic & Rendering
--------------------------------------------------- */

/* -----------------------------
   PANTRY RENDERING
----------------------------- */

function getTotalQty(pantryItem) {
  return pantryItem.locations?.reduce((sum, loc) => sum + (Number(loc.qty) || 0), 0) || 0;
}

function renderPantry() {
  if (!elPantryList) return;

  const categoryFilter = document.getElementById("filter-category")?.value || "";
  elPantryList.innerHTML = "";

  const items = pantry
    .filter(item => !categoryFilter || item.category === categoryFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!items.length) {
    elPantryList.innerHTML = `<p>No ingredients yet. Start by stocking your pantry with what you really use.</p>`;
    return;
  }

  items.forEach(item => {
    const totalQty = getTotalQty(item);
    const low = totalQty <= 0;

    const expiryText = item.expiry
      ? `Best before: ${formatDatePretty(item.expiry)}`
      : `No expiry set`;

    const locationsText = item.locations && item.locations.length
      ? item.locations.map(loc => `${loc.place}: ${loc.qty} ${item.unit || ""}`).join(" · ")
      : `No locations yet`;

    const barPercent = Math.max(5, Math.min(100, totalQty * 20)); // super soft visual

    const div = document.createElement("div");
    div.className = "pantry-item";
    div.innerHTML = `
      <h3>${item.name}</h3>
      <div class="pantry-locations">${locationsText}</div>
      <p><em>${item.category || "Uncategorized"}</em></p>
      <p>${expiryText}</p>
      <div class="bar-container">
        <div class="bar-fill ${low ? "low" : ""}" style="width:${barPercent}%;"></div>
      </div>
      <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-ghost btn-edit-ingredient" data-id="${item.id}">Edit</button>
        <button class="btn btn-ghost btn-delete-ingredient" data-id="${item.id}">Remove</button>
      </div>
    `;

    elPantryList.appendChild(div);
  });

  attachPantryItemButtons();
}

/* -----------------------------
   PANTRY MODALS
----------------------------- */

function openIngredientModal(existingId = null) {
  const editing = !!existingId;
  const item = editing ? pantry.find(p => p.id === existingId) : null;

  const name = editing ? item.name : "";
  const category = editing ? item.category || "" : "";
  const unit = editing ? item.unit || "" : "";
  const expiry = editing ? (item.expiry || "") : "";
  const firstLocation = editing && item.locations && item.locations[0]
    ? item.locations[0].place
    : "";
  const firstQty = editing && item.locations && item.locations[0]
    ? item.locations[0].qty
    : "";

  showModal(`
    <h2>${editing ? "Edit ingredient" : "Add ingredient"}</h2>
    <p>Keep it honest and human. Name it how you think of it.</p>
    <form id="ingredient-form">
      <label>
        Name<br>
        <input type="text" id="ing-name" value="${name}">
      </label>
      <br><br>
      <label>
        Category<br>
        <select id="ing-category">
          <option value="">Choose</option>
          <option value="Meat" ${category === "Meat" ? "selected" : ""}>Meat</option>
          <option value="Dairy" ${category === "Dairy" ? "selected" : ""}>Dairy</option>
          <option value="Produce" ${category === "Produce" ? "selected" : ""}>Produce</option>
          <option value="Pantry" ${category === "Pantry" ? "selected" : ""}>Pantry Staples</option>
          <option value="Frozen" ${category === "Frozen" ? "selected" : ""}>Frozen</option>
          <option value="Spices" ${category === "Spices" ? "selected" : ""}>Spices</option>
          <option value="Other" ${category === "Other" ? "selected" : ""}>Other</option>
        </select>
      </label>
      <br><br>
      <label>
        Soft unit (cups, pieces, bags, etc.)<br>
        <input type="text" id="ing-unit" value="${unit}">
      </label>
      <br><br>
      <label>
        Location<br>
        <input type="text" id="ing-location" placeholder="Fridge, Freezer, Pantry..." value="${firstLocation}">
      </label>
      <br><br>
      <label>
        Quantity<br>
        <input type="number" step="0.1" id="ing-qty" value="${firstQty}">
      </label>
      <br><br>
      <label>
        Best-by date (optional)<br>
        <input type="date" id="ing-expiry" value="${expiry}">
      </label>
      <br><br>
      <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:10px;">
        <button type="button" class="btn btn-ghost" id="btn-cancel-ingredient">Cancel</button>
        <button type="submit" class="btn">${editing ? "Save changes" : "Add to pantry"}</button>
      </div>
    </form>
  `);

  const form = document.getElementById("ingredient-form");
  const btnCancel = document.getElementById("btn-cancel-ingredient");

  btnCancel.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ingName = document.getElementById("ing-name").value.trim();
    const ingCat = document.getElementById("ing-category").value;
    const ingUnit = document.getElementById("ing-unit").value.trim();
    const ingLoc = document.getElementById("ing-location").value.trim();
    const ingQty = parseFloat(document.getElementById("ing-qty").value || "0");
    const ingExp = document.getElementById("ing-expiry").value || "";

    if (!ingName) {
      alert("Give this ingredient a name you’ll recognize.");
      return;
    }

    if (editing && item) {
      item.name = ingName;
      item.category = ingCat;
      item.unit = ingUnit;
      item.expiry = ingExp || null;
      item.locations = ingLoc
        ? [{ place: ingLoc, qty: ingQty || 0 }]
        : [];
    } else {
      const newItem = {
        id: uid(),
        name: ingName,
        category: ingCat,
        unit: ingUnit,
        expiry: ingExp || null,
        locations: ingLoc
          ? [{ place: ingLoc, qty: ingQty || 0 }]
          : []
      };
      pantry.push(newItem);
    }

    saveState();
    renderPantry();
    closeModal();
  });
}

/* -----------------------------
   PANTRY ITEM BUTTONS
----------------------------- */

function attachPantryItemButtons() {
  const editButtons = document.querySelectorAll(".btn-edit-ingredient");
  const deleteButtons = document.querySelectorAll(".btn-delete-ingredient");

  editButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      openIngredientModal(id);
    });
  });

  deleteButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const item = pantry.find(p => p.id === id);
      const confirmDelete = confirm(
        item
          ? `Remove "${item.name}" from your pantry?`
          : "Remove this ingredient?"
      );
      if (!confirmDelete) return;
      pantry = pantry.filter(p => p.id !== id);
      saveState();
      renderPantry();
    });
  });
}

/* -----------------------------
   PANTRY EVENT HOOKS
----------------------------- */

function setupPantryInteractions() {
  const btnAdd = document.getElementById("btn-add-ingredient");
  const filterCat = document.getElementById("filter-category");

  if (btnAdd) {
    btnAdd.addEventListener("click", () => openIngredientModal(null));
  }

  if (filterCat) {
    filterCat.addEventListener("change", () => renderPantry());
  }
}

/* ---------------------------------------------------
   PHASE 5B‑1 — RECIPE DATA MODEL + HELPERS
--------------------------------------------------- */

let recipes = JSON.parse(localStorage.getItem("recipes") || "[]");

/* Save recipes to localStorage */
function saveRecipes() {
  localStorage.setItem("recipes", JSON.stringify(recipes));
}

/* Find recipe by ID */
function getRecipe(id) {
  return recipes.find(r => r.id === id);
}

/* Generate unique IDs (shared with pantry) */
function uid() {
  return Math.random().toString(36).substr(2, 9);
}

/* ---------------------------------------------------
   PHASE 5B‑2 — RECIPE MODAL (ADD/EDIT)
--------------------------------------------------- */

function openRecipeModal(existing = null) {
  const isEdit = !!existing;

  const title = isEdit ? "Edit Recipe" : "New Recipe";
  const subtitle = isEdit
    ? "Update your cozy kitchen creation."
    : "Add a new recipe to your box.";

  // Build ingredient rows
  const ingredientRows = (existing?.ingredients || [])
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
        value: existing?.name || ""
      }),
      modalField({
        label: "Servings",
        type: "number",
        value: existing?.servings || ""
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
        value: existing?.instructions || "",
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

  // Add ingredient row button logic
  document.getElementById("add-ingredient-row").addEventListener("click", () => {
    const list = document.getElementById("modal-ingredient-list");
    list.insertAdjacentHTML("beforeend", modalIngredientRow({}));
  });
}

/* ---------------------------------------------------
   PHASE 5B‑3 — SAVE RECIPE
--------------------------------------------------- */

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

  // Collect ingredient rows
  const ingRows = modal.querySelectorAll(".modal-ingredient-row");
  const ingredients = Array.from(ingRows).map(row => {
    const inputs = row.querySelectorAll("input");
    return {
      name: inputs[0].value.trim(),
      qty: Number(inputs[1].value.trim()),
      unit: inputs[2].value.trim()
    };
  }).filter(ing => ing.name);

  if (existing) {
    existing.name = name;
    existing.servings = Number(servings);
    existing.instructions = instructions;
    existing.ingredients = ingredients;
  } else {
    recipes.push({
      id: uid(),
      name,
      servings: Number(servings),
      instructions,
      ingredients
    });
  }

  saveRecipes();
  renderRecipes();
  closeModal();
}

/* ---------------------------------------------------
   PART 3: Recipes — Cards, Modals, Cooking Flow
--------------------------------------------------- */

/* ---------------------------------------------------
   PHASE 5B‑4 — RENDER RECIPES
--------------------------------------------------- */

function renderRecipes() {
  const container = document.getElementById("recipe-list");
  container.innerHTML = "";

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

/* ---------------------------------------------------
   PHASE 5B‑5 — VIEW RECIPE MODAL
--------------------------------------------------- */

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
      <p>${recipe.instructions.replace(/\n/g, "<br>")}</p>
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

/* -----------------------------
   RENDER RECIPE GRID
----------------------------- */

function renderRecipes() {
  if (!elRecipeList) return;

  if (!recipes.length) {
    elRecipeList.innerHTML = `<p>No recipes yet. Start by adding something cozy.</p>`;
    return;
  }

  elRecipeList.innerHTML = "";

  recipes
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(recipe => {
      const ready = recipe.ingredients.every(ing => {
        const pantryItem = pantry.find(p => p.name.toLowerCase() === ing.name.toLowerCase());
        if (!pantryItem) return false;
        const total = getTotalQty(pantryItem);
        return total >= ing.qty;
      });

      const card = document.createElement("div");
      card.className = "recipe-card";
      card.setAttribute("data-id", recipe.id);

      card.innerHTML = `
        <div class="recipe-name">${recipe.name}</div>
        <div class="recipe-status">${ready ? "Ready to cook" : "Missing ingredients"}</div>
        <div class="recipe-tags">
          ${(recipe.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}
        </div>
      `;

      card.addEventListener("click", () => openRecipeViewModal(recipe.id));
      elRecipeList.appendChild(card);
    });
}

/* -----------------------------
   RECIPE VIEW MODAL
----------------------------- */

function openRecipeViewModal(id) {
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;

  const ingredientsHTML = recipe.ingredients
    .map(ing => {
      const pantryItem = pantry.find(p => p.name.toLowerCase() === ing.name.toLowerCase());
      const total = pantryItem ? getTotalQty(pantryItem) : 0;
      const enough = total >= ing.qty;

      return `
        <li>
          ${ing.qty} ${ing.unit || ""} ${ing.name}
          <span style="opacity:0.7;">(${enough ? "✓" : "✗"})</span>
        </li>
      `;
    })
    .join("");

  const stepsHTML = recipe.steps
    ? `<p style="white-space:pre-wrap;">${recipe.steps}</p>`
    : `<p>No steps added yet.</p>`;

  showModal(`
    <h2>${recipe.name}</h2>
    <h3>Ingredients</h3>
    <ul>${ingredientsHTML}</ul>
    <h3>Steps</h3>
    ${stepsHTML}

    <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
      <button class="btn btn-ghost" id="btn-edit-recipe" data-id="${recipe.id}">Edit</button>
      <button class="btn btn-ghost" id="btn-delete-recipe" data-id="${recipe.id}">Delete</button>
      <button class="btn" id="btn-cook-recipe" data-id="${recipe.id}">Cook now</button>
    </div>
  `);

  document.getElementById("btn-edit-recipe").addEventListener("click", () => {
    closeModal();
    openRecipeEditModal(recipe.id);
  });

  document.getElementById("btn-delete-recipe").addEventListener("click", () => {
    const confirmDelete = confirm(`Delete recipe "${recipe.name}"?`);
    if (!confirmDelete) return;
    recipes = recipes.filter(r => r.id !== recipe.id);
    saveState();
    renderRecipes();
    closeModal();
  });

  document.getElementById("btn-cook-recipe").addEventListener("click", () => {
    closeModal();
    openCookConfirmModal(recipe.id);
  });
}

/* -----------------------------
   ADD / EDIT RECIPE MODAL
----------------------------- */

function openRecipeEditModal(existingId = null) {
  const editing = !!existingId;
  const recipe = editing ? recipes.find(r => r.id === existingId) : null;

  const name = editing ? recipe.name : "";
  const tags = editing ? (recipe.tags || []).join(", ") : "";
  const steps = editing ? recipe.steps || "" : "";

  const ingredients = editing ? recipe.ingredients : [];

  showModal(`
    <h2>${editing ? "Edit recipe" : "New recipe"}</h2>
    <form id="recipe-form">
      <label>
        Name<br>
        <input type="text" id="rec-name" value="${name}">
      </label>
      <br><br>

      <label>
        Tags (comma separated)<br>
        <input type="text" id="rec-tags" value="${tags}">
      </label>
      <br><br>

      <label>
        Ingredients<br>
        <div id="ingredient-list">
          ${ingredients
            .map(
              ing => `
            <div class="recipe-ing-row">
              <input type="text" class="ing-name" value="${ing.name}" placeholder="Name">
              <input type="number" class="ing-qty" value="${ing.qty}" step="0.1" placeholder="Qty">
              <input type="text" class="ing-unit" value="${ing.unit || ""}" placeholder="Unit">
            </div>
          `
            )
            .join("")}
        </div>
        <button type="button" class="btn btn-ghost" id="btn-add-ing-row">Add ingredient</button>
      </label>
      <br><br>

      <label>
        Steps<br>
        <textarea id="rec-steps" rows="5">${steps}</textarea>
      </label>

      <br><br>
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button type="button" class="btn btn-ghost" id="btn-cancel-recipe">Cancel</button>
        <button type="submit" class="btn">${editing ? "Save changes" : "Add recipe"}</button>
      </div>
    </form>
  `);

  document.getElementById("btn-cancel-recipe").addEventListener("click", () => closeModal());

  document.getElementById("btn-add-ing-row").addEventListener("click", () => {
    const list = document.getElementById("ingredient-list");
    const row = document.createElement("div");
    row.className = "recipe-ing-row";
    row.innerHTML = `
      <input type="text" class="ing-name" placeholder="Name">
      <input type="number" class="ing-qty" step="0.1" placeholder="Qty">
      <input type="text" class="ing-unit" placeholder="Unit">
    `;
    list.appendChild(row);
  });

  document.getElementById("recipe-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const recName = document.getElementById("rec-name").value.trim();
    const recTags = document.getElementById("rec-tags").value
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);
    const recSteps = document.getElementById("rec-steps").value.trim();

    if (!recName) {
      alert("Give this recipe a name that feels like home.");
      return;
    }

    const ingRows = [...document.querySelectorAll(".recipe-ing-row")];
    const recIngredients = ingRows
      .map(row => {
        const name = row.querySelector(".ing-name").value.trim();
        const qty = parseFloat(row.querySelector(".ing-qty").value || "0");
        const unit = row.querySelector(".ing-unit").value.trim();
        if (!name) return null;
        return { name, qty, unit };
      })
      .filter(Boolean);

    if (editing) {
      recipe.name = recName;
      recipe.tags = recTags;
      recipe.steps = recSteps;
      recipe.ingredients = recIngredients;
    } else {
      recipes.push({
        id: uid(),
        name: recName,
        tags: recTags,
        steps: recSteps,
        ingredients: recIngredients
      });
    }

    saveState();
    renderRecipes();
    closeModal();
  });
}

/* -----------------------------
   COOKING FLOW
----------------------------- */

function openCookConfirmModal(id) {
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;

  showModal(`
    <h2>Cook "${recipe.name}"?</h2>
    <p>This will gently subtract ingredients from your pantry.</p>
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
      <button class="btn btn-ghost" id="btn-cancel-cook">Cancel</button>
      <button class="btn" id="btn-confirm-cook">Cook</button>
    </div>
  `);

  document.getElementById("btn-cancel-cook").addEventListener("click", () => closeModal());

  document.getElementById("btn-confirm-cook").addEventListener("click", () => {
    recipe.ingredients.forEach(ing => {
      const pantryItem = pantry.find(p => p.name.toLowerCase() === ing.name.toLowerCase());
      if (!pantryItem) return;

      let remaining = ing.qty;

      pantryItem.locations.forEach(loc => {
        if (remaining <= 0) return;
        const used = Math.min(loc.qty, remaining);
        loc.qty -= used;
        remaining -= used;
      });

      pantryItem.locations = pantryItem.locations.filter(loc => loc.qty > 0);
    });

    saveState();
    renderPantry();
    renderRecipes();
    closeModal();
  });
}

/* -----------------------------
   RECIPE EVENT HOOKS
----------------------------- */

function setupRecipeInteractions() {
  const btnNew = document.getElementById("btn-new-recipe");
  if (btnNew) {
    btnNew.addEventListener("click", () => openRecipeEditModal(null));
  }
}

/* ---------------------------------------------------
   PHASE 5C‑1 — PLANNER DATA MODEL + HELPERS
--------------------------------------------------- */

let planner = JSON.parse(localStorage.getItem("planner") || "{}");

/* Save planner to localStorage */
function savePlanner() {
  localStorage.setItem("planner", JSON.stringify(planner));
}

/* Get planned recipe for a given date (YYYY-MM-DD) */
function getPlannedRecipe(date) {
  return planner[date] || null;
}

/* Assign recipe to date */
function setPlannedRecipe(date, recipeId) {
  planner[date] = recipeId;
  savePlanner();
}

/* Remove recipe from date */
function clearPlannedRecipe(date) {
  delete planner[date];
  savePlanner();
}



/* ---------------------------------------------------
   PART 4: Planner & Dashboard (Monthly Calendar)
--------------------------------------------------- */

/* -----------------------------
   MONTH HELPERS
----------------------------- */

function getCurrentMonthInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0–11

  // First day of month
  const first = new Date(year, month, 1);
  const firstWeekday = first.getDay(); // 0=Sun, 1=Mon, ...

  // Days in month
  const nextMonth = new Date(year, month + 1, 0);
  const daysInMonth = nextMonth.getDate();

  return { year, month, firstWeekday, daysInMonth };
}

function getMonthLabel() {
  const now = new Date();
  return now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

/* -----------------------------
   RENDER MONTHLY PLANNER (7x6)
----------------------------- */

function renderPlanner() {
  if (!elDayGrid) return;

  const { year, month, firstWeekday, daysInMonth } = getCurrentMonthInfo();

  elDayGrid.innerHTML = "";

  // Add a heading inside the planner section if desired
  const plannerTitle = document.getElementById("planner-month-label");
  if (plannerTitle) {
    plannerTitle.textContent = getMonthLabel();
  }

  // Always render 6 rows x 7 columns = 42 cells
  const totalCells = 42;

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex++) {
    const dayNumber = cellIndex - firstWeekday + 1;
    const validDay = dayNumber >= 1 && dayNumber <= daysInMonth;

    const cell = document.createElement("div");
    cell.className = "calendar-day";

    if (!validDay) {
      cell.classList.add("calendar-day--empty");
      elDayGrid.appendChild(cell);
      continue;
    }

    // yyyy-mm-dd for planner state
    const dateISO = new Date(year, month, dayNumber).toISOString().split("T")[0];
    const assignedId = planner[dateISO];
    const recipe = recipes.find(r => r.id === assignedId);

    const isToday = dateISO === todayISO();

    cell.setAttribute("data-date", dateISO);

    cell.innerHTML = `
      <div class="calendar-day-inner ${isToday ? "calendar-day--today" : ""}">
        <div class="calendar-date-badge">
          <span class="calendar-date">${dayNumber}</span>
        </div>
        <div class="calendar-content">
          ${
            recipe
              ? `<div class="calendar-recipe-pill">${recipe.name}</div>`
              : `<div class="calendar-empty-note">No meal planned</div>`
          }
        </div>
        <button class="btn btn-ghost btn-plan-day" data-date="${dateISO}">
          ${recipe ? "Change" : "Plan"}
        </button>
      </div>
    `;

    elDayGrid.appendChild(cell);
  }

  attachPlannerButtons();
}

/* -----------------------------
   PLAN DAY MODAL (unchanged)
----------------------------- */

function openPlanDayModal(date) {
  const assignedId = planner[date] || "";
  const recipeOptions = recipes
    .map(
      r => `<option value="${r.id}" ${assignedId === r.id ? "selected" : ""}>${r.name}</option>`
    )
    .join("");

  showModal(`
    <h2>Plan for ${formatDatePretty(date)}</h2>
    <p>Choose a recipe for this day.</p>
    <label>
      Recipe<br>
      <select id="plan-select">
        <option value="">Nothing planned</option>
        ${recipeOptions}
      </select>
    </label>

    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
      <button class="btn btn-ghost" id="btn-cancel-plan">Cancel</button>
      <button class="btn" id="btn-save-plan">Save</button>
    </div>
  `);

  document.getElementById("btn-cancel-plan").addEventListener("click", () => closeModal());

  document.getElementById("btn-save-plan").addEventListener("click", () => {
    const selected = document.getElementById("plan-select").value;
    if (selected) {
      planner[date] = selected;
    } else {
      delete planner[date];
    }

    saveState();
    renderPlanner();
    updateDashboard();
    closeModal();
  });
}

/* -----------------------------
   PLANNER BUTTON HOOKS
----------------------------- */

function attachPlannerButtons() {
  const buttons = document.querySelectorAll(".btn-plan-day");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const date = btn.getAttribute("data-date");
      openPlanDayModal(date);
    });
  });
}

/* -----------------------------
   DASHBOARD LOGIC (same idea)
----------------------------- */

function updateDashboard() {
  if (!elDashTodayMeal || !elDashReadyRecipes) return;

  // Today’s meal
  const today = todayISO();
  const todayId = planner[today];
  const todayRecipe = recipes.find(r => r.id === todayId);

  elDashTodayMeal.textContent = todayRecipe ? todayRecipe.name : "Not planned";

  // Ready recipes count
  const readyCount = recipes.filter(r =>
    r.ingredients.every(ing => {
      const pantryItem = pantry.find(p => p.name.toLowerCase() === ing.name.toLowerCase());
      if (!pantryItem) return false;
      return getTotalQty(pantryItem) >= ing.qty;
    })
  ).length;

  elDashReadyRecipes.textContent = readyCount || "0";
}

/* -----------------------------
   PLANNER EVENT HOOKS
----------------------------- */

function setupPlannerInteractions() {
  // Reserved for any planner-specific controls later
  // (month navigation, filters, etc.)
}

/* ---------------------------------------------------
   PHASE 5C‑2 — RENDER MONTHLY CALENDAR
--------------------------------------------------- */

function renderPlanner() {
  const container = document.getElementById("day-grid");
  const monthLabel = document.getElementById("planner-month-label");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const monthName = firstDay.toLocaleString("default", { month: "long" });
  monthLabel.textContent = `${monthName} ${year}`;

  container.innerHTML = "";

  // Fill empty cells before the 1st
  for (let i = 0; i < firstDay.getDay(); i++) {
    const empty = document.createElement("div");
    empty.className = "planner-day empty";
    container.appendChild(empty);
  }

  // Fill actual days
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
        ${plannedRecipe ? `<span class="planner-recipe">${plannedRecipe.name}</span>` : `<span class="planner-empty">No meal</span>`}
      </div>
    `;

    cell.addEventListener("click", () => openDayModal(dateStr));

    container.appendChild(cell);
  }
}

/* ---------------------------------------------------
   PHASE 5C‑3 — DAY MODAL (VIEW / CHANGE / REMOVE)
--------------------------------------------------- */

function openDayModal(dateStr) {
  const plannedId = getPlannedRecipe(dateStr);
  const plannedRecipe = plannedId ? getRecipe(plannedId) : null;

  // Build recipe dropdown options
  const recipeOptions = recipes.map(r => r.name);

  const contentHTML = `
    ${modalRow([
      modalField({
        label: "Planned Recipe",
        type: "select",
        options: ["None", ...recipeOptions],
        value: plannedRecipe ? plannedRecipe.name : "None"
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
          closeModal();
        }
      }
    ]
  });

  // If a recipe is planned, allow opening the recipe card
  if (plannedRecipe) {
    document.getElementById("open-recipe-from-day").addEventListener("click", () => {
      closeModal();
      openRecipeViewModal(plannedRecipe);
    });
  }
}

/* ---------------------------------------------------
   PHASE 5C‑4 — SAVE DAY PLAN
--------------------------------------------------- */

function saveDayPlan(dateStr) {
  const modal = document.querySelector(".modal-card");

  const selects = modal.querySelectorAll("select");
  const selectedRecipeName = selects[0].value;

  if (selectedRecipeName === "None") {
    clearPlannedRecipe(dateStr);
  } else {
    const recipe = recipes.find(r => r.name === selectedRecipeName);
    if (recipe) {
      setPlannedRecipe(dateStr, recipe.id);
    }
  }

  renderPlanner();
  closeModal();
}

/* ---------------------------------------------------
   PHASE 5D‑1 — SHOPPING DATA MODEL + HELPERS
--------------------------------------------------- */

let shopping = JSON.parse(localStorage.getItem("shopping") || "[]");

/* Save shopping list */
function saveShopping() {
  localStorage.setItem("shopping", JSON.stringify(shopping));
}

/* Clear shopping list */
function clearShopping() {
  shopping = [];
  saveShopping();
}

/* Add item to shopping list */
function addShoppingItem({ name, qty, unit, category, source }) {
  shopping.push({
    id: uid(),
    name,
    qty: Number(qty),
    unit,
    category,
    source, // "Threshold", "Planner", or "Custom"
    checked: false
  });
  saveShopping();
}

/* Check if item already exists (by name + unit) */
function findShoppingItem(name, unit) {
  return shopping.find(i => i.name === name && i.unit === unit);
}

/* ---------------------------------------------------
   PART 5: Shopping List Logic & Checkout Flow
--------------------------------------------------- */

/* -----------------------------
   RENDER SHOPPING LIST
----------------------------- */

function renderShoppingList() {
  if (!elShoppingList) return;

  if (!shopping.length) {
    elShoppingList.innerHTML = `<p>Your list is empty. Add items or let the planner generate them.</p>`;
    return;
  }

  elShoppingList.innerHTML = "";

  shopping.forEach(item => {
    const div = document.createElement("div");
    div.className = "shopping-item";

    div.innerHTML = `
      <input type="checkbox" class="shop-check" data-id="${item.id}" ${item.checked ? "checked" : ""}>
      <div class="shopping-label">
        <strong>${item.name}</strong>
        <div class="shopping-meta">${item.source || "Custom"}</div>
      </div>
      <button class="btn btn-ghost btn-remove-shop" data-id="${item.id}">Remove</button>
    `;

    elShoppingList.appendChild(div);
  });

  attachShoppingButtons();
}

/* -----------------------------
   GENERATE SHOPPING LIST FROM PLANNER
----------------------------- */

function generateShoppingFromPlanner() {
  const { year, month, daysInMonth } = getCurrentMonthInfo();
  const needed = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const dateISO = new Date(year, month, day).toISOString().split("T")[0];
    const recipeId = planner[dateISO];
    if (!recipeId) continue;

    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) continue;

    recipe.ingredients.forEach(ing => {
      const key = ing.name.toLowerCase();
      if (!needed[key]) {
        needed[key] = { name: ing.name, qty: 0, unit: ing.unit || "" };
      }
      needed[key].qty += ing.qty;
    });
  }

  // Compare with pantry
  Object.values(needed).forEach(ing => {
    const pantryItem = pantry.find(p => p.name.toLowerCase() === ing.name.toLowerCase());
    const total = pantryItem ? getTotalQty(pantryItem) : 0;

    if (total < ing.qty) {
      const missing = ing.qty - total;

      // Avoid duplicates
      if (!shopping.find(s => s.name.toLowerCase() === ing.name.toLowerCase())) {
        shopping.push({
          id: uid(),
          name: `${ing.name} (${missing} ${ing.unit})`,
          source: "Planner",
          checked: false
        });
      }
    }
  });

  saveState();
  renderShoppingList();
}

/* -----------------------------
   ADD CUSTOM SHOPPING ITEM
----------------------------- */

function addCustomShoppingItem() {
  const input = document.getElementById("user-item-name");
  if (!input) return;

  const name = input.value.trim();
  if (!name) return;

  shopping.push({
    id: uid(),
    name,
    source: "Custom",
    checked: false
  });

  input.value = "";
  saveState();
  renderShoppingList();
}

/* -----------------------------
   SHOPPING BUTTON HOOKS
----------------------------- */

function attachShoppingButtons() {
  const checkboxes = document.querySelectorAll(".shop-check");
  const removeButtons = document.querySelectorAll(".btn-remove-shop");

  checkboxes.forEach(box => {
    box.addEventListener("change", () => {
      const id = box.getAttribute("data-id");
      const item = shopping.find(s => s.id === id);
      if (item) {
        item.checked = box.checked;
        saveState();
      }
    });
  });

  removeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      shopping = shopping.filter(s => s.id !== id);
      saveState();
      renderShoppingList();
    });
  });
}

/* -----------------------------
   CHECKOUT MODAL
----------------------------- */

function openCheckoutModal() {
  const purchased = shopping.filter(s => s.checked);

  if (!purchased.length) {
    alert("Check off items you bought before checking out.");
    return;
  }

  const listHTML = purchased
    .map(item => `<li>${item.name}</li>`)
    .join("");

  showModal(`
    <h2>Checkout</h2>
    <p>Add these items to your pantry?</p>
    <ul>${listHTML}</ul>

    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
      <button class="btn btn-ghost" id="btn-cancel-checkout">Cancel</button>
      <button class="btn" id="btn-confirm-checkout">Add to pantry</button>
    </div>
  `);

  document.getElementById("btn-cancel-checkout").addEventListener("click", () => closeModal());

  document.getElementById("btn-confirm-checkout").addEventListener("click", () => {
    purchased.forEach(item => {
      // Extract name + qty if formatted like "Tomatoes (2 cups)"
      const match = item.name.match(/^(.*?)\s*\((.*?)\)$/);
      let name = item.name;
      let qty = 1;
      let unit = "";

      if (match) {
        name = match[1].trim();
        const qtyParts = match[2].split(" ");
        qty = parseFloat(qtyParts[0]) || 1;
        unit = qtyParts.slice(1).join(" ");
      }

      let pantryItem = pantry.find(p => p.name.toLowerCase() === name.toLowerCase());

      if (!pantryItem) {
        pantryItem = {
          id: uid(),
          name,
          category: "",
          unit,
          expiry: null,
          locations: [{ place: "Pantry", qty }]
        };
        pantry.push(pantryItem);
      } else {
        // Add to first location or create one
        if (!pantryItem.locations.length) {
          pantryItem.locations.push({ place: "Pantry", qty });
        } else {
          pantryItem.locations[0].qty += qty;
        }
      }
    });

    // Remove purchased items from shopping list
    shopping = shopping.filter(s => !s.checked);

    saveState();
    renderPantry();
    renderShoppingList();
    closeModal();
  });
}

/* -----------------------------
   SHOPPING EVENT HOOKS
----------------------------- */

function setupShoppingInteractions() {
  const btnAdd = document.getElementById("btn-add-custom-item");
  if (btnAdd) {
    btnAdd.addEventListener("click", addCustomShoppingItem);
  }

  // Auto-generate from planner when page loads
  generateShoppingFromPlanner();

  // Add checkout button if you want one later
}

/* ---------------------------------------------------
   PHASE 5D‑2 — AUTO-GENERATE SHOPPING LIST
--------------------------------------------------- */

function generateShoppingList() {
  clearShopping();

  /* A) Threshold-based items */
  pantry.forEach(item => {
    if (item.qty < item.min) {
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

  /* B) Missing ingredients from planned meals */
  Object.keys(planner).forEach(dateStr => {
    const recipeId = planner[dateStr];
    const recipe = getRecipe(recipeId);
    if (!recipe) return;

    recipe.ingredients.forEach(ing => {
      const pantryItem = pantry.find(p => p.name === ing.name);

      const available = pantryItem ? pantryItem.qty : 0;
      const missing = ing.qty - available;

      if (missing > 0) {
        // Avoid duplicates
        const existing = findShoppingItem(ing.name, ing.unit);
        if (existing) {
          existing.qty += missing;
        } else {
          addShoppingItem({
            name: ing.name,
            qty: missing,
            unit: ing.unit,
            category: pantryItem?.category || "Other",
            source: "Planner"
          });
        }
      }
    });
  });

  saveShopping();
  renderShoppingList();
}

/* ---------------------------------------------------
   PHASE 5D‑4 — ADD CUSTOM SHOPPING ITEM MODAL
--------------------------------------------------- */

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

/* ---------------------------------------------------
   SAVE CUSTOM SHOPPING ITEM
--------------------------------------------------- */

function saveCustomShoppingItem() {
  const modal = document.querySelector(".modal-card");

  const fields = modal.querySelectorAll(".modal-field input, .modal-field select");
  const values = Array.from(fields).map(f => f.value.trim());

  const [
    name,
    category,
    qty,
    unit,
    storage,
    notes
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

/* ---------------------------------------------------
   PHASE 5D‑5 — CHECKOUT MODAL
--------------------------------------------------- */

function openCheckoutModal() {
  const purchased = shopping.filter(i => i.checked);

  if (purchased.length === 0) {
    alert("Please check off at least one item before checking out.");
    return;
  }

  // Build rows for each purchased item
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

/* ---------------------------------------------------
   SAVE CHECKOUT ITEMS → ADD TO PANTRY
--------------------------------------------------- */

function saveCheckoutItems() {
  const modal = document.querySelector(".modal-card");
  const rows = modal.querySelectorAll(".modal-ingredient-row");

  rows.forEach((row, index) => {
    const inputs = row.querySelectorAll("input, select");

    const name = inputs[0].value.trim();
    const qty = Number(inputs[1].value.trim());
    const unit = inputs[2].value.trim();
    const category = inputs[3].value.trim();
    const storage = inputs[4].value.trim();
    const expiry = inputs[5].value.trim();

    // Find matching pantry item
    let pantryItem = pantry.find(p => p.name === name && p.unit === unit);

    if (pantryItem) {
      // Increase quantity
      pantryItem.qty += qty;
      pantryItem.category = category;
      pantryItem.location = storage;
      pantryItem.expiry = expiry;
    } else {
      // Add new pantry item
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

  // Clear shopping list
  shopping = shopping.filter(i => !i.checked);
  saveShopping();

  renderPantry();
  renderShoppingList();
  closeModal();
}

/* ---------------------------------------------------
   PHASE 5D‑3 — RENDER SHOPPING LIST (SORTED BY CATEGORY)
--------------------------------------------------- */

function renderShoppingList() {
  const container = document.getElementById("shopping-list");
  container.innerHTML = "";

  if (shopping.length === 0) {
    container.innerHTML = `<p style="opacity:0.7;">Your shopping list is empty.</p>`;
    return;
  }

  // Sort by category, then alphabetically
  const sorted = [...shopping].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  let currentCategory = "";

  sorted.forEach(item => {
    // Insert category header
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      const header = document.createElement("div");
      header.className = "shopping-category-header";
      header.textContent = currentCategory;
      container.appendChild(header);
    }

    // Build item card
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

    // Checkbox logic
    card.querySelector(".shopping-check").addEventListener("change", (e) => {
      item.checked = e.target.checked;
      saveShopping();
    });

    // Remove button logic
    card.querySelector(".shopping-remove").addEventListener("click", () => {
      shopping = shopping.filter(i => i.id !== item.id);
      saveShopping();
      renderShoppingList();
    });

    container.appendChild(card);
  });
}

/* ---------------------------------------------------
   PART 6: Seasonal Nudges, Theme Switching, Init
--------------------------------------------------- */

/* -----------------------------
   SEASONAL NUDGES
----------------------------- */

function generateSeasonalNudges() {
  const month = new Date().getMonth(); // 0–11
  const nudges = [];

  const monthThemes = {
    0: ["January whispers soup and sourdough.", "Warm stews love cold nights."],
    1: ["February leans into chocolate and comfort.", "A good time for slow roasts."],
    2: ["March brings greens and gentle transitions.", "Try something bright and fresh."],
    3: ["April loves herbs and light broths.", "Spring produce begins to shine."],
    4: ["May invites salads and early berries.", "Freshness is your friend."],
    5: ["June calls for grilling and citrus.", "Summer flavors are waking up."],
    6: ["July celebrates cold drinks and crisp veggies.", "Keep meals light and lively."],
    7: ["August leans into tomatoes and stone fruit.", "Peak produce season."],
    8: ["September welcomes warm spices.", "Harvest flavors begin to appear."],
    9: ["October loves squash and cozy bakes.", "A perfect month for roasting."],
    10: ["November whispers gratitude and gatherings.", "Root veggies shine now."],
    11: ["December brings baking and warm spices.", "Comfort food season is here."]
  };

  nudges.push(...(monthThemes[month] || []));

  pantry.forEach(item => {
    if (!item.expiry) return;
    const diff = (new Date(item.expiry) - new Date()) / (1000 * 60 * 60 * 24);
    if (diff >= 0 && diff <= 3) {
      nudges.push(`Your ${item.name} wants to be used soon.`);
    }
  });

  seasonal = nudges;
  renderSeasonal();
}

function renderSeasonal() {
  if (!elSeasonalList) return;

  if (!seasonal.length) {
    elSeasonalList.innerHTML = `<p>The seasons are quiet right now.</p>`;
    return;
  }

  elSeasonalList.innerHTML = seasonal
    .map(n => `<div class="seasonal-item">${n}</div>`)
    .join("");
}

/* -----------------------------
   THEME SWITCHING (Optional)
----------------------------- */

function setTheme(theme) {
  document.body.className = theme;
  localStorage.setItem("cc_theme", theme);
}

function loadTheme() {
  const saved = localStorage.getItem("cc_theme") || "theme-daylight";
  document.body.className = saved;
}

/* -----------------------------
   INIT — The Heartbeat
----------------------------- */

function init() {
  loadState();
  loadTheme();
  hookElements();
  injectModalRoot();

  renderPantry();
  renderRecipes();
  renderPlanner();
  renderShoppingList();
  generateSeasonalNudges();
  updateDashboard();

  setupPantryInteractions();
  setupRecipeInteractions();
  setupPlannerInteractions();
  setupShoppingInteractions();
}

document.addEventListener("DOMContentLoaded", init);