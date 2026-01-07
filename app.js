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
  document.getElementById("nr-tags
