/* ============================================================================
   APP STATE
============================================================================ */

const AppState = {
  user: null,
  household: null,
  view: null,
  loading: false
};

/* ============================================================================
   CORE HELPERS
============================================================================ */

function waitForPaint() {
  return new Promise(requestAnimationFrame);
}

function showLoading() {
  if (AppState.loading) return;
  AppState.loading = true;
  document.body.classList.add('loading');
}

function hideLoading() {
  AppState.loading = false;
  document.body.classList.remove('loading');
}

function showError(msg) {
  alert(msg);
  console.error(msg);
}

function showSuccess(msg) {
  console.log(msg);
}

function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
const Auth = {
  async signIn(email, password) {
    showLoading();
    try {
      const res = await API.call('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      API.setToken(res.access_token);
      AppState.user = res.user;
      AppState.household = res.household_id;

      await App.load();
      showSuccess('Signed in');
    } catch {
      showError('Sign in failed');
    } finally {
      hideLoading();
    }
  },

  async signUp(email, password) {
    showLoading();
    try {
      const res = await API.call('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      API.setToken(res.access_token);
      AppState.user = res.user;
      AppState.household = res.household_id;

      await App.load();
      showSuccess('Account created');
    } catch {
      showError('Sign up failed');
    } finally {
      hideLoading();
    }
  },

  async check() {
    const token = API.getToken();
    if (!token) return false;

    try {
      const res = await API.call('/auth/me');
      AppState.user = res.user;
      AppState.household = res.household_id;
      return true;
    } catch {
      API.clearToken();
      return false;
    }
  },

  signOut() {
    API.clearToken();
    AppState.user = null;
    App.showLanding();
  }
};
const Views = {
  show(name) {
    AppState.view = name;

    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const viewEl = document.getElementById(`${name}-view`);
    if (viewEl) {
    viewEl.style.display = 'block';
}

    const navEl = document.querySelector(`[data-view="${name}"]`);
    if (navEl) {
    navEl.classList.add('active');
}
};
const Pantry = {
  container: null,

  init() {
    this.container = document.getElementById('pantry-list');
    if (!this.container) return;

    this.container.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'delete') this.delete(btn.dataset.id);
    });
  },

  async load() {
    showLoading();
    try {
      const items = await API.call('/pantry');
      this.render(items);
    } catch {
      this.container.innerHTML = '<p>Error loading pantry</p>';
    } finally {
      hideLoading();
    }
  },

  render(items) {
    if (!items.length) {
      this.container.innerHTML = '<p>No pantry items</p>';
      return;
    }

    const grouped = items.reduce((a, i) => {
  const category = i.category || 'Other';
  if (!a[category]) a[category] = [];
  a[category].push(i);
  return a;
}, {});


    this.container.innerHTML = Object.entries(grouped).map(([cat, list]) => `
      <section>
        <h3>${escapeHTML(cat)}</h3>
        ${list.map(i => `
          <div class="pantry-item">
            <span>${escapeHTML(i.name)}</span>
            <span>${i.total_quantity} ${escapeHTML(i.unit)}</span>
            <button data-action="delete" data-id="${i.id}">🗑️</button>
          </div>
        `).join('')}
      </section>
    `).join('');
  },

  async delete(id) {
    if (!confirm('Delete item?')) return;
    await API.call(`/pantry/${id}`, { method: 'DELETE' });
    await this.load();
  }
};
const Recipes = {
  container: null,

  init() {
    this.container = document.getElementById('recipes-list');
  },

  async load() {
    showLoading();
    try {
      const recipes = await API.call('/recipes');
      this.render(recipes);
    } finally {
      hideLoading();
    }
  },

  render(recipes) {
    this.container.innerHTML = recipes.map(r => `
      <div class="recipe-card">
        <h3>${escapeHTML(r.name)}</h3>
        <button onclick="alert('TODO')">View</button>
      </div>
    `).join('');
  }
};
const Planner = {
  container: null,

  init() {
    this.container = document.getElementById('meal-calendar');
  },

  async load() {
    showLoading();
    try {
      const meals = await API.call('/meal-plans');
      this.render(meals);
    } finally {
      hideLoading();
    }
  },

  render(meals) {
    if (!meals.length) {
      this.container.innerHTML = '<p>No meals planned</p>';
      return;
    }

    const byDate = meals.reduce((a, m) => {
  if (!a[m.date]) a[m.date] = [];
  a[m.date].push(m);
  return a;
}, {});


    this.container.innerHTML = Object.entries(byDate)
      .sort(([a],[b]) => new Date(a)-new Date(b))
      .map(([date, list]) => `
        <section>
          <h3>${new Date(date).toLocaleDateString()}</h3>
          ${list.map(m => `<div>${m.recipe_name}</div>`).join('')}
        </section>
      `).join('');
  }
};
const Shopping = {
  container: null,

  init() {
    this.container = document.getElementById('shopping-list');
  },

  async load() {
    showLoading();
    try {
      const res = await API.call('/shopping-list');
      this.render(res.items || res);
    } finally {
      hideLoading();
    }
  },

  render(items) {
    this.container.innerHTML = items.map(i => `
      <label>
        <input type="checkbox" ${i.checked ? 'checked' : ''}>
        ${escapeHTML(i.name)}
      </label>
    `).join('');
  }
};
const Dashboard = {
  container: null,

  init() {
    this.container = document.getElementById('dashboard');
  },

  async load() {
    const data = await API.call('/alerts/dashboard');
    this.container.innerHTML = `
      <p>Pantry: ${data.pantry_count}</p>
      <p>Recipes: ${data.recipe_count}</p>
    `;
  }
};
const App = {
  async load() {
    this.showApp();
    await waitForPaint();

    Pantry.init();
    Recipes.init();
    Planner.init();
    Shopping.init();
    Dashboard.init();

    Views.show('pantry');
    await Pantry.load();
  },

  showApp() {
   const landing = document.getElementById('landing-page');
if (landing) landing.style.display = 'none';

const app = document.getElementById('app');
if (app) app.style.display = 'block';
  },

  showLanding() {
    const landing = document.getElementById('landing-page');
if (landing) landing.style.display = 'block';

const app = document.getElementById('app');
if (app) app.style.display = 'none';
  }
};
document.addEventListener('DOMContentLoaded', async () => {
  if (await Auth.check()) {
    await App.load();
  } else {
    App.showLanding();
  }

  document.querySelectorAll('.nav-item').forEach(i => {
    i.addEventListener('click', async e => {
      e.preventDefault();
      const v = i.dataset.view;
      Views.show(v);
      const modules = {
  pantry: Pantry,
  recipes: Recipes,
  planner: Planner,
  shopping: Shopping,
  dashboard: Dashboard
};

const mod = modules[v];
if (mod && typeof mod.load === 'function') {
  await mod.load();
}
    });
  });
});
