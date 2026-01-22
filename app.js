// Add helper near the top of app.js (after other helper functions or utilities)

function safeSetInnerHTMLById(id, html) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`safeSetInnerHTMLById: element with id="${id}" not found. Skipping update.`);
    return false;
  }
  el.innerHTML = html;
  return true;
}

// Example: update Dashboard.load to use safeSetInnerHTMLById
const Dashboard = {
  container: null,

  init() {
    this.container = document.getElementById('dashboard');
  },

  async load() {
    try {
      const data = await API.call('/alerts/dashboard');
      const html = `
        <p>Pantry: ${data.pantry_count}</p>
        <p>Recipes: ${data.recipe_count}</p>
      `;
      if (!safeSetInnerHTMLById('dashboard', html)) {
        // If the element is missing, optionally fall back to a console-only display
        console.info('Dashboard container missing; data:', data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      // Optionally render an error message if the container exists
      safeSetInnerHTMLById('dashboard', '<p>Unable to load dashboard</p>');
    }
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  console.log("APP INIT START");

  // Initialize components
  Dashboard.init();

  // Load initial data
  await Dashboard.load();

  console.log("APP INIT COMPLETE");
});

// Also ensure other places that do direct `el.innerHTML = ...` are wrapped similarly.
