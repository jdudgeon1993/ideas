/* ---------------------------------------------------
   STATE + LOCAL STORAGE
--------------------------------------------------- */
const STORAGE_KEY = "chefsCoveV2_state";

let pantry = {};
let recipes = [];
let planner = {};
let shoppingExtras = [];
let currentTheme = "daylight";

let selectedIngredient = null;
let selectedRecipeIndex = null;
let pendingCook = null;
let checkoutItem = null;

/* Load saved state */
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    pantry = data.pantry || {};
    recipes = data.recipes || [];
    planner = data.planner || {};
    shoppingExtras = data.shoppingExtras || [];
    currentTheme = data.theme || "daylight";
  } catch (e) {
    console.warn("State load failed", e);
  }
}

/* Save state */
function saveState() {
  const data = {
    pantry,
    recipes,
    planner,
    shoppingExtras,
    theme: currentTheme
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ---------------------------------------------------
   INITIAL DEFAULT DATA (if none saved)
--------------------------------------------------- */
function ensureDefaults() {
  if (Object.keys(pantry).length === 0) {
    pantry = {
      "Chicken breast": {
        unit: "lb",
        category: "Meat",
        threshold: 0.5,
        notes: "",
        locations: {
          Freezer: { qty: 1.5, expires: "" },
          Fridge: { qty: 0.5, expires: "" }
        }
      },
      "Sage": {
        unit: "g",
        category: "Spices",
        threshold: 5,
        notes: "",
        locations: {
          Pantry: { qty: 20, expires: "" }
        }
      },
      "Pasta": {
        unit: "g",
        category: "Pantry",
        threshold: 150,
        notes: "",
        locations: {
          Pantry: { qty: 500, expires: "" }
        }
      },
      "Tomato": {
        unit: "pcs",
        category: "Produce",
        threshold: 2,
        notes: "",
        locations: {
          Fridge: { qty: 3, expires: "" }
        }
      }
    };
  }

  if (recipes.length === 0) {
    recipes = [
      {
        name: "Herb Chicken",
        tags: ["Comfort", "Weeknight"],
        steps: [
          "Preheat oven to 190°C (375°F).",
          "Season chicken with salt, pepper, and chopped sage.",
          "Roast until golden and cooked through."
        ],
        totalTime: "30 min",
        servings: 2,
        notes: "",
        ingredients: [
          { name: "Chicken breast", amount: 1, unit: "lb" },
          { name: "Sage", amount: 5, unit: "g" }
        ]
      },
      {
        name: "Tomato Pasta",
        tags: ["Quick", "Light"],
        steps: [
          "Cook pasta in salted boiling water until al dente.",
          "Sauté chopped tomatoes with garlic and olive oil.",
          "Toss pasta with sauce and finish with herbs."
        ],
        totalTime: "20 min",
        servings: 2,
        notes: "",
        ingredients: [
          { name: "Pasta", amount: 120, unit: "g" },
          { name: "Tomato", amount: 2, unit: "pcs" }
        ]
      }
    ];
  }

  if (Object.keys(planner).length === 0) {
    planner = {
      Mon: null,
      Tue: null,
      Wed: null,
      Thu: null,
      Fri: null,
      Sat: null,
      Sun: null
    };
  }
}

/* ---------------------------------------------------
   UTILITIES
--------------------------------------------------- */
function totalQty(item) {
  if (!item || !item.locations) return 0;
  return Object.values(item.locations).reduce((sum, loc) => sum + (loc.qty || 0), 0);
}

function todayKey() {
  const d = new Date();
  const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  return ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][idx];
}

/* ---------------------------------------------------
   NAVIGATION
--------------------------------------------------- */
function switchSection(name) {
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.section === name);
  });

  document.querySelectorAll(".section").forEach(sec => {
    sec.classList.toggle("active", sec.id === "section-" + name);
  });
}

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    switchSection(item.dataset.section);
  });
});

document.querySelectorAll("[data-nav]").forEach(btn => {
  btn.addEventListener("click", () => {
    switchSection(btn.dataset.nav);
  });
});

/* ---------------------------------------------------
   THEMES
--------------------------------------------------- */
function setTheme(theme) {
  document.body.classList.remove("theme-daylight","theme-hearth","theme-garden");
  document.body.classList.add("theme-" + theme);

  document.getElementById("theme-daylight").classList.remove("active");
  document.getElementById("theme-hearth").classList.remove("active");
  document.getElementById("theme-garden").classList.remove("active");

  document.getElementById("theme-" + theme).classList.add("active");

  currentTheme = theme;
  saveState();
}

document.getElementById("theme-daylight").onclick = () => setTheme("daylight");
document.getElementById("theme-hearth").onclick = () => setTheme("hearth");
document.getElementById("theme-garden").onclick = () => setTheme("garden");

/* ---------------------------------------------------
   MODALS
--------------------------------------------------- */
function openModal(id) {
  document.getElementById(id).style.display = "flex";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => {
    closeModal(btn.dataset.close);
  });
});

/* ---------------------------------------------------
   PANTRY UI
--------------------------------------------------- */
function updatePantryUI() {
  const display = document.getElementById("pantry-display");
  const filterCat = document.getElementById("filter-category").value;
  const filterLoc = document.getElementById("filter-location").value;

  display.innerHTML = "";

  Object.keys(pantry).sort().forEach(name => {
    const item = pantry[name];

    if (filterCat && item.category !== filterCat) return;

    const hasLoc = filterLoc
      ? item.locations && Object.keys(item.locations).includes(filterLoc)
      : true;

    if (!hasLoc) return;

    const total = totalQty(item);
    const threshold = item.threshold || 0;
    const pct = threshold > 0 ? Math.min(100, (total / threshold) * 100) : 100;
    const isLow = threshold > 0 && total <= threshold;

    const wrapper = document.createElement("div");
    wrapper.className = "pantry-item";

    wrapper.innerHTML = `
      <div class="pantry-header-row">
        <div class="pantry-label">
          <span>${name}</span>
          <span style="font-size:0.8rem; font-weight:normal;">Total: ${total} ${item.unit || ""}</span>
        </div>
        <div class="pantry-actions">
          <button onclick="openEditIngredient('${name}')">Edit</button>
          <button onclick="openTransferModal('${name}')">Transfer</button>
        </div>
      </div>
      <div class="pantry-meta">${item.category || "Uncategorized"}</div>
      <div class="pantry-locations">
        ${Object.keys(item.locations).map(loc => {
          const e = item.locations[loc];
          const exp = e.expires ? ` (exp ${e.expires})` : "";
          return `${loc}: ${e.qty} ${item.unit || ""}${exp}`;
        }).join("<br>")}
      </div>
      <div class="bar-container">
        <div class="bar-fill ${isLow ? "low" : ""}" style="width:${pct}%"></div>
      </div>
    `;

    display.appendChild(wrapper);
  });

  updateDashboardCounts();
}

/* ---------------------------------------------------
   ADD INGREDIENT
--------------------------------------------------- */
document.getElementById("btn-add-ingredient").onclick = () => openModal("addIngModal");

document.getElementById("btn-save-ingredient").onclick = () => {
  const name = document.getElementById("modal-ing-name").value.trim();
  const qty = parseFloat(document.getElementById("modal-ing-qty").value);
  const unit = document.getElementById("modal-ing-unit").value.trim();
  const cat = document.getElementById("modal-ing-category").value;
  const loc = document.getElementById("modal-ing-location").value;
  const th = parseFloat(document.getElementById("modal-ing-threshold").value);
  const exp = document.getElementById("modal-ing-expiry").value;
  const notes = document.getElementById("modal-ing-notes").value;

  if (!name || isNaN(qty) || !loc) return;

  if (!pantry[name]) {
    pantry[name] = {
      unit,
      category: cat,
      threshold: isNaN(th) ? 0 : th,
      notes,
      locations: {}
    };
  } else {
    if (unit) pantry[name].unit = unit;
    if (cat) pantry[name].category = cat;
    if (!isNaN(th)) pantry[name].threshold = th;
    if (notes) pantry[name].notes = notes;
  }

  if (!pantry[name].locations[loc]) pantry[name].locations[loc] = { qty: 0, expires: "" };
  pantry[name].locations[loc].qty += qty;
  if (exp) pantry[name].locations[loc].expires = exp;

  closeModal("addIngModal");
  updatePantryUI();
  renderRecipes();
  updateShoppingList();
  updateSeasonal();
  updateDashboard();
  saveState();
};

/* ---------------------------------------------------
   EDIT INGREDIENT
--------------------------------------------------- */
function openEditIngredient(name) {
  selectedIngredient = name;
  const item = pantry[name];

  document.getElementById("edit-ing-title").textContent = `Edit ${name}`;
  document.getElementById("edit-ing-unit").value = item.unit || "";
  document.getElementById("edit-ing-threshold").value = item.threshold || "";
  document.getElementById("edit-ing-category").value = item.category || "";
  document.getElementById("edit-ing-notes").value = item.notes || "";

  const locDiv = document.getElementById("edit-ing-locations");
  locDiv.innerHTML = Object.keys(item.locations).map(loc => {
    const e = item.locations[loc];
    const exp = e.expires ? ` (exp ${e.expires})` : "";
    return `${loc}: ${e.qty} ${item.unit || ""}${exp}`;
  }).join("<br>");

  openModal("editIngModal");
}

document.getElementById("btn-update-ingredient").onclick = () => {
  if (!selectedIngredient) return;

  const item = pantry[selectedIngredient];
  const unit = document.getElementById("edit-ing-unit").value.trim();
  const th = parseFloat(document.getElementById("edit-ing-threshold").value);
  const cat = document.getElementById("edit-ing-category").value;
  const notes = document.getElementById("edit-ing-notes").value;

  if (unit) item.unit = unit;
  if (!isNaN(th)) item.threshold = th;
  if (cat) item.category = cat;
  if (notes) item.notes = notes;

  closeModal("editIngModal");
  updatePantryUI();
  renderRecipes();
  updateShoppingList();
  updateSeasonal();
  updateDashboard();
  saveState();

  selectedIngredient = null;
};

document.getElementById("btn-delete-ingredient").onclick = () => {
  if (!selectedIngredient) return;

  delete pantry[selectedIngredient];

  closeModal("editIngModal");
  updatePantryUI();
  renderRecipes();
  updateShoppingList();
  updateSeasonal();
  updateDashboard();
  saveState();

  selectedIngredient = null;
};

/* ---------------------------------------------------
   TRANSFER
--------------------------------------------------- */
function openTransferModal(name) {
  selectedIngredient = name;
  const item = pantry[name];

  const fromSel = document.getElementById("transfer-from");
  fromSel.innerHTML = '<option value="">From location</option>';

  Object.keys(item.locations).forEach(loc => {
    const e = item.locations[loc];
    const opt = document.createElement("option");
    opt.value = loc;
    opt.textContent = `${loc} (${e.qty} ${item.unit || ""})`;
    fromSel.appendChild(opt);
  });

  document.getElementById("transfer-to").value = "";
  document.getElementById("transfer-qty").value = "";
  document.getElementById("transfer-expiry").value = "";

  openModal("transferModal");
}

document.getElementById("btn-confirm-transfer").onclick = () => {
  if (!selectedIngredient) return;

  const item = pantry[selectedIngredient];
  const from = document.getElementById("transfer-from").value;
  const to = document.getElementById("transfer-to").value;
  const qty = parseFloat(document.getElementById("transfer-qty").value);
  const exp = document.getElementById("transfer-expiry").value;

  if (!from || !to || from === to || isNaN(qty) || qty <= 0) return;
  if (!item.locations[from] || item.locations[from].qty < qty) return;

  item.locations[from].qty -= qty;
  if (item.locations[from].qty <= 0.0001) delete item.locations[from];

  if (!item.locations[to]) item.locations[to] = { qty: 0, expires: "" };
  item.locations[to].qty += qty;
  if (exp) item.locations[to].expires = exp;

  closeModal("transferModal");
  updatePantryUI();
  renderRecipes();
  updateShoppingList();
  updateSeasonal();
  updateDashboard();
  saveState();

  selectedIngredient = null;
};

/* ---------------------------------------------------
   RECIPES
--------------------------------------------------- */
function recipeReadiness(recipe) {
  let status = "ready";
  recipe.ingredients.forEach(ing => {
    const total = totalQty(pantry[ing.name]);
    if (total === 0) status = "missing";
    else if (total < ing.amount && status !== "missing") status = "low";
  });
  return status;
}

function renderRecipes() {
  const grid = document.getElementById("recipe-list");
  grid.innerHTML = "";

  let readyCount = 0;

  recipes.forEach((recipe, idx) => {
    const status = recipeReadiness(recipe);
    if (status === "ready") readyCount++;

    const card = document.createElement("div");
    card.className = "recipe-card";
    card.onclick = () => openRecipeView(idx);

    const label =
      status === "ready" ? "✔️ Ready" :
      status === "low" ? "⚠️ Low / partial" :
      "❌ Missing ingredients";

    card.innerHTML = `
      <div style="font-size:1.4rem;">🍲</div>
      <div class="recipe-name">${recipe.name}</div>
      <div class="recipe-status">${label}</div>
      <div>${(recipe.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}</div>
    `;

    grid.appendChild(card);
  });

  document.getElementById("dash-ready-recipes").textContent = readyCount;
}

function openRecipeView(index) {
  selectedRecipeIndex = index;
  const recipe = recipes[index];

  pendingCook = { recipe, scale: 1 };

  document.getElementById("recipe-title").textContent = recipe.name;
  document.getElementById("recipe-card-tab").textContent = recipe.name;

  document.getElementById("recipe-tags").innerHTML =
    (recipe.tags || []).map(t => `<span class="tag">${t}</span>`).join("");

  const metaParts = [];
  if (recipe.servings) metaParts.push(`Serves: ${recipe.servings}`);
  if (recipe.totalTime) metaParts.push(recipe.totalTime);
  document.getElementById("recipe-meta-right").textContent = metaParts.join(" · ");

  renderRecipeIngredients(recipe, 1);

  const stepsOl = document.getElementById("recipe-steps");
  stepsOl.innerHTML = "";
  recipe.steps.forEach(step => {
    const li = document.createElement("li");
    li.textContent = step;
    stepsOl.appendChild(li);
  });

  openModal("recipeViewModal");
}

function renderRecipeIngredients(recipe, scale) {
  const div = document.getElementById("recipe-ingredients");
  div.innerHTML = "";

  recipe.ingredients.forEach(ing => {
    const needed = ing.amount * scale;
    const total = totalQty(pantry[ing.name]);

    let icon = "✔️";
    if (total === 0) icon = "❌";
    else if (total < needed) icon = "⚠️";

    const line = document.createElement("div");
    line.textContent = `${icon} ${needed} ${ing.unit || ""} ${ing.name} (pantry: ${total})`;
    div.appendChild(line);
  });
}

document.getElementById("scale-select").addEventListener("change", e => {
  if (!pendingCook) return;
  const scale = parseFloat(e.target.value);
  pendingCook.scale = scale;
  renderRecipeIngredients(pendingCook.recipe, scale);
});

/* ---------------------------------------------------
   NEW RECIPE
--------------------------------------------------- */
document.getElementById("btn-new-recipe").onclick = () => {
  document.getElementById("nr-name").value = "";
  document.getElementById("nr-tags").value = "";
  document.getElementById("nr-servings").value = "";
  document.getElementById("nr-time").value = "";
  document.getElementById("nr-ings").value = "";
  document.getElementById("nr-steps").value = "";
  document.getElementById("nr-notes").value = "";
  openModal("newRecipeModal");
};

function parseIngredientLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const amount = parseFloat(parts[0].replace(",", "."));
  if (isNaN(amount)) return null;

  const unit = parts[1];
  const name = parts.slice(2).join(" ");
  if (!name) return null;

  return { name, amount, unit };
}

document.getElementById("btn-save-new-recipe").onclick = () => {
  const name = document.getElementById("nr-name").value.trim();
  const tagStr = document.getElementById("nr-tags").value;
  const ingsStr = document.getElementById("nr-ings").value;
  const stepsStr = document.getElementById("nr-steps").value;
  const notesStr = document.getElementById("nr-notes").value;
  const servingsVal = parseInt(document.getElementById("nr-servings").value, 10);
  const timeStr = document.getElementById("nr-time").value.trim();

  if (!name || !ingsStr.trim()) return;

  const tags = tagStr.split(",").map(t => t.trim()).filter(Boolean);
  const ingLines = ingsStr.split("\n").map(l => l.trim()).filter(Boolean);

  const ingredients = [];
  const missingForShopping = [];

  ingLines.forEach(line => {
    const ing = parseIngredientLine(line);
    if (!ing) return;
    ingredients.push(ing);

    if (!pantry[ing.name]) {
      pantry[ing.name] = {
        unit: ing.unit,
        category: "",
        threshold: ing.amount,
        notes: "",
        locations: { Pantry: { qty: 0, expires: "" } }
      };
      missingForShopping.push(ing);
    }
  });

  const steps = stepsStr.split("\n").map(s => s.trim()).filter(Boolean);

  const recipe = {
    name,
    tags,
    steps,
    totalTime: timeStr || "",
    servings: !isNaN(servingsVal) && servingsVal > 0 ? servingsVal : null,
    notes: notesStr || "",
    ingredients
  };

  recipes.push(recipe);

  missingForShopping.forEach(ing => {
    shoppingExtras.push({
      id: "missing-" + ing.name + "-" + Date.now() + Math.random(),
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      source: "missing"
    });
  });

  closeModal("newRecipeModal");
  updatePantryUI();
  renderRecipes();
  renderPlanner();
  updateShoppingList();
  updateSeasonal();
  updateDashboard();
  saveState();
};

/* ---------------------------------------------------
   EDIT RECIPE
--------------------------------------------------- */
document.getElementById("btn-edit-recipe").onclick = () => {
  if (selectedRecipeIndex == null) return;
  const r = recipes[selectedRecipeIndex];

  document.getElementById("er-name").value = r.name;
  document.getElementById("er-tags").value = (r.tags || []).join(", ");
  document.getElementById("er-servings").value = r.servings || "";
  document.getElementById("er-time").value = r.totalTime || "";
  document.getElementById("er-notes").value = r.notes || "";

  document.getElementById("er-ings").value = (r.ingredients || [])
    .map(ing => `${ing.amount} ${ing.unit || ""} ${ing.name}`.trim())
    .join("\n");

  document.getElementById("er-steps").value = (r.steps || []).join("\n");

  openModal("editRecipeModal");
};

document.getElementById("btn-save-edited-recipe").onclick = () => {
  if (selectedRecipeIndex == null) return;

  const r = recipes[selectedRecipeIndex];

  const newName = document.getElementById("er-name").value.trim();
  const tagStr = document.getElementById("er-tags").value;
  const ingsStr = document.getElementById("er-ings").value;
  const stepsStr = document.getElementById("er-steps").value;
  const notesStr = document.getElementById("er-notes").value;
  const servingsVal = parseInt(document.getElementById("er-servings").value, 10);
  const timeStr = document.getElementById("er-time").value.trim();

  if (!newName || !ingsStr.trim()) return;

  const tags = tagStr.split(",").map(t => t.trim()).filter(Boolean);
  const ingLines = ingsStr.split("\n").map(l => l.trim()).filter(Boolean);

  const ingredients = [];
  const missingForShopping = [];

  ingLines.forEach(line => {
    const ing = parseIngredientLine(line);
    if (!ing) return;
    ingredients.push(ing);

    if (!pantry[ing.name]) {
      pantry[ing.name] = {
        unit: ing.unit,
        category: "",
        threshold: ing.amount,
        notes: "",
        locations: { Pantry: { qty: 0, expires: "" } }
      };
      missingForShopping.push(ing);
    }
  });

  const steps = stepsStr.split("\n").map(s => s.trim()).filter(Boolean);

  const oldName = r.name;
  if (oldName !== newName) {
    Object.keys(planner).forEach(day => {
      if (planner[day] === oldName) planner[day] = newName;
    });
  }

  r.name = newName;
  r.tags = tags;
  r.servings = !isNaN(servingsVal) && servingsVal > 0 ? servingsVal : null;
  r.totalTime = timeStr || "";
  r.notes = notesStr || "";
  r.ingredients = ingredients;
  r.steps = steps;

  missingForShopping.forEach(ing => {
    shoppingExtras.push({
      id: "missing-" + ing.name + "-" + Date.now() + Math.random(),
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      source: "missing"
    });
  });

  closeModal("editRecipeModal");
  closeModal("recipeViewModal");
  updatePantryUI();
  renderRecipes();
  renderPlanner();
  updateShoppingList();
  updateSeasonal();
  updateDashboard();
  saveState();
};

document.getElementById("btn-delete-recipe").onclick = () => {
  if (selectedRecipeIndex == null) return;

  const r = recipes[selectedRecipeIndex];
  const name = r.name;

  Object.keys(planner).forEach(day => {
    if (planner[day] === name) planner[day] = null;
  });

  recipes.splice(selectedRecipeIndex, 1);

  selectedRecipeIndex = null;
  pendingCook = null;

  closeModal("editRecipeModal");
  closeModal("recipeViewModal");
  renderRecipes();
  renderPlanner();
  updateShoppingList();
  updateDashboard();
  saveState();
};

/* ---------------------------------------------------
   COOK FLOW
--------------------------------------------------- */
document.getElementById("btn-cook-now").onclick = () => {
  if (!pendingCook) return;
  document.getElementById("cook-servings").value = String(pendingCook.scale || 1);
  renderCookConfirmList();
  openModal("cookConfirmModal");
};

document.getElementById("cook-servings").addEventListener("change", () => {
  renderCookConfirmList();
});

function renderCookConfirmList() {
  if (!pendingCook) return;

  const scale = parseFloat(document.getElementById("cook-servings").value) || 1;
  const r = pendingCook.recipe;
  const listDiv = document.getElementById("cook-confirm-list");
  listDiv.innerHTML = "";

  r.ingredients.forEach(ing => {
    const needed = ing.amount * scale;
    const item = pantry[ing.name];
    const total = totalQty(item);
    const pUnit = item ? (item.unit || "") : "";
    const unitsMatch = item && item.unit && ing.unit && item.unit === ing.unit;

    const row = document.createElement("div");
    let text = `• ${ing.name}: need ${needed} ${ing.unit || ""}, pantry total ${total} ${pUnit}`;

    if (!item) {
      text += " — not in pantry.";
    } else if (!unitsMatch && ing.unit) {
      text += " — units differ.";
    } else if (total < needed) {
      text += " — low.";
    } else {
      text += " — OK.";
    }

    row.textContent = text;
    listDiv.appendChild(row);
  });
}

document.getElementById("btn-confirm-cook").onclick = () => {
  if (!pendingCook) return;

  const scale = parseFloat(document.getElementById("cook-servings").value) || 1;
  const r = pendingCook.recipe;

  r.ingredients.forEach(ing => {
    const item = pantry[ing.name];
    if (!item) return;

    let remaining = ing.amount * scale;

    const locEntries = Object.entries(item.locations || {}).sort((a, b) => {
      const expA = a[1].expires || "9999-12-31";
      const expB = b[1].expires || "9999-12-31";
      return expA.localeCompare(expB);
    });

    for (const [loc, data] of locEntries) {
      if (remaining <= 0) break;
      const usable = Math.min(data.qty, remaining);
      data.qty -= usable;
      remaining -= usable;
      if (data.qty <= 0.0001) delete item.locations[loc];
    }
  });

  const today = todayKey();
  planner[today] = r.name;

  closeModal("cookConfirmModal");
  closeModal("recipeViewModal");
  updatePantryUI();
  renderRecipes();
  renderPlanner();
  updateShoppingList();
  updateSeasonal();
  updateDashboard();
  saveState();
};

/* ---------------------------------------------------
   PLANNER
--------------------------------------------------- */
function renderPlanner() {
  const grid = document.getElementById("day-grid");
  grid.innerHTML = "";
  const today = todayKey();
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  days.forEach(day => {
    const card = document.createElement("div");
    card.className = "day-card";

    const head = document.createElement("div");
    head.className = "day-head";

    const left = document.createElement("div");
    left.innerHTML = `<strong>${day}</strong>${day === today ? ' <span class="badge">Today</span>' : ""}`;

    const select = document.createElement("select");
    select.style.fontSize = "0.78rem";

    const optNone = document.createElement("option");
    optNone.value = "";
    optNone.textContent = "— choose recipe —";
    select.appendChild(optNone);

    recipes.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r.name;
      opt.textContent = r.name;
      select.appendChild(opt);
    });

    select.value = planner[day] || "";
    select.onchange = () => {
      planner[day] = select.value || null;
      updatePlannerToday();
      updateShoppingList();
      renderPlanner();
      updateDashboard();
      saveState();
    };

    head.appendChild(left);
    head.appendChild(select);

    const body = document.createElement("div");
    body.style.fontSize = "0.78rem";
    const recipeName = planner[day];

    if (!recipeName) {
      body.textContent = "No recipe assigned.";
    } else {
      const recipe = recipes.find(r => r.name === recipeName);
      if (!recipe) {
        body.textContent = "Recipe not found.";
      } else {
        const readiness = recipeReadiness(recipe);
        body.textContent =
          readiness === "ready"
            ? "✔️ Pantry ready."
            : readiness === "low"
            ? "⚠️ Pantry low / partial."
            : "❌ Missing ingredients.";
      }
    }

    card.appendChild(head);
    card.appendChild(body);
    grid.appendChild(card);
  });

  updatePlannerToday();
}

function updatePlannerToday() {
  const today = todayKey();
  const meal = planner[today];
  const text = meal || "Not planned";
  const plannerToday = document.getElementById("today-meal");
  const dashToday = document.getElementById("dash-today-meal");
  if (plannerToday) plannerToday.textContent = text;
  if (dashToday) dashToday.textContent = text;
}

/* ---------------------------------------------------
   SHOPPING LIST
--------------------------------------------------- */
document.getElementById("btn-add-custom-item").onclick = () => {
  const name = document.getElementById("user-item-name").value.trim();
  if (!name) return;

  shoppingExtras.push({
    id: "user-" + Date.now() + Math.random(),
    name,
    amount: null,
    unit: "",
    source: "user"
  });

  document.getElementById("user-item-name").value = "";
  updateShoppingList();
  saveState();
};

function buildShoppingItems() {
  const items = [];
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const now = new Date();
  const soonDays = 3;

  // from planner
  days.forEach(day => {
    const recipeName = planner[day];
    if (!recipeName) return;
    const recipe = recipes.find(r => r.name === recipeName);
    if (!recipe) return;

    recipe.ingredients.forEach(ing => {
      const total = totalQty(pantry[ing.name]);
      if (total < ing.amount) {
        const diff = ing.amount - total;
        items.push({
          key: `planner-${day}-${ing.name}`,
          name: ing.name,
          amount: diff,
          unit: ing.unit,
          reason: `Planned for ${day}`,
          source: "planner"
        });
      }
    });
  });

  // low stock
  Object.keys(pantry).forEach(name => {
    const item = pantry[name];
    const total = totalQty(item);
    const th = item.threshold || 0;
    if (th > 0 && total <= th) {
      items.push({
        key: `low-${name}`,
        name,
        amount: Math.max(th * 2 - total, th),
        unit: item.unit || "",
        reason: "Low stock (total)",
        source: "low"
      });
    }
  });

  // expiring soon
  Object.keys(pantry).forEach(name => {
    const item = pantry[name];
    if (!item.locations) return;
    Object.keys(item.locations).forEach(loc => {
      const e = item.locations[loc];
      if (!e.expires) return;
      const expDate = new Date(e.expires + "T00:00:00");
      const diffDays = (expDate - now) / (1000*60*60*24);
      if (diffDays >= 0 && diffDays <= soonDays) {
        items.push({
          key: `expiring-${name}-${loc}`,
          name,
          amount: 0,
          unit: item.unit || "",
          reason: `Expiring in ${Math.round(diffDays)} day(s) in ${loc}`,
          source: "expiring"
        });
      }
    });
  });

  // extras
  shoppingExtras.forEach(extra => {
    items.push({
      key: extra.id,
      name: extra.name,
      amount: extra.amount || 0,
      unit: extra.unit || "",
      reason: extra.source === "missing" ? "New recipe ingredient" : "Custom item",
      source: extra.source
    });
  });

  return items;
}

function updateShoppingList() {
  const listDiv = document.getElementById("shopping-list");
  const items = buildShoppingItems();

  if (!items.length) {
    listDiv.innerHTML = "<small>No current needs. You're beautifully stocked.</small>";
    return;
  }

  listDiv.innerHTML = "";

  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "shopping-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    checkbox.onchange = () => {
      checkbox.checked = false;
      openCheckoutFromShopping(item);
    };

    const labelDiv = document.createElement("div");
    labelDiv.className = "shopping-label";

    const amtStr =
      item.amount && item.amount > 0
        ? `— need ${item.amount.toFixed(2)} ${item.unit || ""}`
        : "";

    labelDiv.innerHTML = `<strong>${item.name}</strong> ${amtStr}`;

    const meta = document.createElement("div");
    meta.className = "shopping-meta";
    meta.textContent = item.reason;

    const source = document.createElement("div");
    source.className = "shopping-source";

    const srcLabel =
      item.source === "planner"
        ? "From meal plan"
        : item.source === "low"
        ? "Low stock"
        : item.source === "expiring"
        ? "Expiring soon"
        : item.source === "missing"
        ? "New recipe ingredient"
        : "Added by you";

    source.textContent = srcLabel;

    labelDiv.appendChild(meta);
    labelDiv.appendChild(source);

    row.appendChild(checkbox);
    row.appendChild(labelDiv);
    listDiv.appendChild(row);
  });
}

function openCheckoutFromShopping(item) {
  checkoutItem = item;

  document.getElementById("checkout-title").innerText =
    `Add ${item.name} to pantry`;

  document.getElementById("checkout-name").value = item.name;
  document.getElementById("checkout-qty").value =
    item.amount && item.amount > 0 ? item.amount.toFixed(2) : "";
  document.getElementById("checkout-unit").value =
    item.unit || (pantry[item.name]?.unit || "");
  document.getElementById("checkout-location").value = "";
  document.getElementById("checkout-category").value =
    pantry[item.name]?.category || "";
  document.getElementById("checkout-threshold").value =
    pantry[item.name]?.threshold || "";
  document.getElementById("checkout-expiry").value = "";
  document.getElementById("checkout-notes").value =
    pantry[item.name]?.notes || "";

  openModal("checkoutModal");
}

document.getElementById("btn-confirm-checkout").onclick = () => {
  if (!checkoutItem) return;

  const name = document.getElementById("checkout-name").value.trim();
  const qty = parseFloat(document.getElementById("checkout-qty").value);
  const unit = document.getElementById("checkout-unit").value.trim();
  const location = document.getElementById("checkout-location").value;
  const category = document.getElementById("checkout-category").value;
  const threshold = parseFloat(document.getElementById("checkout-threshold").value);
  const expiry = document.getElementById("checkout-expiry").value;
  const notes = document.getElementById("checkout-notes").value;

  if (!name || isNaN(qty) || !location) return;

  if (!pantry[name]) {
    pantry[name] = {
      unit,
      category,
      threshold: isNaN(threshold) ? 0 : threshold,
      notes,
      locations: {}
    };
  } else {
    const p = pantry[name];
    if (unit) p.unit = unit;
    if (category) p.category = category;
    if (!isNaN(threshold)) p.threshold = threshold;
    if (notes) p.notes = notes;
  }

  if (!pantry[name].locations[location])
    pantry[name].locations[location] = { qty: 0, expires: "" };

  pantry[name].locations[location].qty += qty;
  if (expiry) pantry[name].locations[location].expires = expiry;

  shoppingExtras = shoppingExtras.filter(
    extra => extra.id !== checkoutItem.key && extra.id !== checkoutItem.id
  );

  checkoutItem = null;

  closeModal("checkoutModal");
  updatePantryUI();
  renderRecipes();
  renderPlanner();
  updateShoppingList();
  updateSeasonal();
  updateDashboard();
  saveState();
};

/* ---------------------------------------------------
   SEASONAL + DASHBOARD
--------------------------------------------------- */
function updateSeasonal() {
  const now = new Date();
  const month = now.getMonth();
  const notes = [];

  if (month === 11 || month <= 1) {
    notes.push("Cold months invite soups, stews, and slow roasts.");
  } else if (month >= 5 && month <= 8) {
    notes.push("Warm months lean toward grills, salads, and fresh herbs.");
  } else {
    notes.push("Transitional seasons love bakes, gratins, and one‑pan meals.");
  }

  Object.keys(pantry).forEach(name => {
    const item = pantry[name];
    if (!item.locations) return;
    Object.keys(item.locations).forEach(loc => {
      const e = item.locations[loc];
      if (!e.expires) return;
      const d = new Date(e.expires + "T00:00:00");
      const diffDays = (d - now) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= 3) {
        notes.push(
          `Use soon: ${name} in ${loc} (expiring in ${Math.round(diffDays)} day(s)).`
        );
      }
    });
  });

  const seasonalDiv = document.getElementById("seasonal-list");
  seasonalDiv.innerHTML = "";
  notes.forEach(text => {
    const d = document.createElement("div");
    d.className = "seasonal-item";
    d.textContent = "• " + text;
    seasonalDiv.appendChild(d);
  });

  const dashSeasonal = document.getElementById("dash-seasonal");
  if (dashSeasonal) {
    dashSeasonal.innerHTML = "";
    notes.slice(0, 3).forEach(text => {
      const d = document.createElement("div");
      d.className = "seasonal-item";
      d.textContent = "• " + text;
      dashSeasonal.appendChild(d);
    });
  }

  updateDashboardCounts();
}

function updateDashboardCounts() {
  const now = new Date();
  let lowCount = 0;
  let expiringCount = 0;

  Object.keys(pantry).forEach(name => {
    const item = pantry[name];
    const total = totalQty(item);
    const th = item.threshold || 0;
    if (th > 0 && total <= th) lowCount++;

    if (!item.locations) return;
    Object.keys(item.locations).forEach(loc => {
      const e = item.locations[loc];
      if (!e.expires) return;
      const d = new Date(e.expires + "T00:00:00");
      const diffDays = (d - now) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= 3) expiringCount++;
    });
  });

  const lowEl = document.getElementById("dash-low-count");
  const expEl = document.getElementById("dash-expiring-count");
  if (lowEl) lowEl.textContent = lowCount;
  if (expEl) expEl.textContent = expiringCount;
}

function updateDashboard() {
  updatePlannerToday();
}

/* ---------------------------------------------------
   INIT
--------------------------------------------------- */
loadState();
ensureDefaults();
updatePantryUI();
renderRecipes();
renderPlanner();
updateShoppingList();
updateSeasonal();
updateDashboard();
setTheme(currentTheme);
