const API_BASE = window.CONFIG?.API_BASE || 'https://chefs-kiss-production.up.railway.app';

class API {
  // ===== AUTH TOKEN MANAGEMENT =====
  static getToken() {
    return localStorage.getItem('auth_token');
  }

  static setToken(token) {
    localStorage.setItem('auth_token', token);
  }

  static clearToken() {
    localStorage.removeItem('auth_token');
  }

  // ===== CENTRAL API CALL =====
  static async call(endpoint, options = {}) {
    let url = `${API_BASE}${endpoint}`;
    // Force HTTPS to avoid mixed content
    if (url.startsWith('http://')) url = url.replace('http://', 'https://');

    const token = this.getToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || response.statusText);
    }

    return response.json();
  }

  // ===== AUTHENTICATION =====
  static async signUp(email, password) {
    const data = await this.call('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.session?.access_token) this.setToken(data.session.access_token);
    return data;
  }

  static async signIn(email, password) {
    const data = await this.call('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.session?.access_token) this.setToken(data.session.access_token);
    return data;
  }

  static async signOut() {
    await this.call('/auth/signout', { method: 'POST' });
    this.clearToken();
  }

  static async getCurrentUser() {
    return this.call('/auth/me');
  }

  // ===== PANTRY =====
  static async getPantry() { return this.call('/pantry'); }
  static async addPantryItem(item) { return this.call('/pantry', { method: 'POST', body: JSON.stringify(item) }); }
  static async updatePantryItem(id, item) { return this.call(`/pantry/${id}`, { method: 'PUT', body: JSON.stringify(item) }); }
  static async deletePantryItem(id) { return this.call(`/pantry/${id}`, { method: 'DELETE' }); }

  // ===== RECIPES =====
  static async getRecipes() { return this.call('/recipes'); }
  static async getRecipe(id) { return this.call(`/recipes/${id}`); }
  static async addRecipe(recipe) { return this.call('/recipes', { method: 'POST', body: JSON.stringify(recipe) }); }
  static async updateRecipe(id, recipe) { return this.call(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(recipe) }); }
  static async deleteRecipe(id) { return this.call(`/recipes/${id}`, { method: 'DELETE' }); }
  static async searchRecipes(params) {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.tags) params.tags.forEach(tag => query.append('tags', tag));
    if (params.ready_only) query.append('ready_only', 'true');
    if (params.has_ingredients) params.has_ingredients.forEach(i => query.append('has_ingredients', i));
    return this.call(`/recipes/search?${query}`);
  }
  static async getScaledRecipe(id, multiplier) { return this.call(`/recipes/${id}/scaled?multiplier=${multiplier}`); }

  // ===== MEAL PLANS =====
  static async getMealPlans() { return this.call('/meal-plans'); }
  static async addMealPlan(meal) { return this.call('/meal-plans', { method: 'POST', body: JSON.stringify(meal) }); }
  static async updateMealPlan(id, meal) { return this.call(`/meal-plans/${id}`, { method: 'PUT', body: JSON.stringify(meal) }); }
  static async deleteMealPlan(id) { return this.call(`/meal-plans/${id}`, { method: 'DELETE' }); }
  static async validateCanCook(mealId) { return this.call(`/meal-plans/${mealId}/validate`, { method: 'POST' }); }
  static async markMealCooked(mealId, force = false) { return this.call(`/meal-plans/${mealId}/cook?force=${force}`, { method: 'POST' }); }

  // ===== SHOPPING LIST =====
  static async getShoppingList() { return this.call('/shopping-list'); }
  static async regenerateShoppingList() { return this.call('/shopping-list/regenerate', { method: 'POST' }); }
  static async addManualShoppingItem(item) { return this.call('/shopping-list/items', { method: 'POST', body: JSON.stringify(item) }); }
  static async updateShoppingItem(id, update) { return this.call(`/shopping-list/items/${id}`, { method: 'PATCH', body: JSON.stringify(update) }); }
  static async deleteManualShoppingItem(id) { return this.call(`/shopping-list/items/${id}`, { method: 'DELETE' }); }
  static async clearCheckedItems() { return this.call('/shopping-list/clear-checked', { method: 'POST' }); }
  static async addCheckedToPantry() { return this.call('/shopping-list/add-checked-to-pantry', { method: 'POST' }); }

  // ===== ALERTS & SUGGESTIONS =====
  static async getExpiringItems(days = 3) { return this.call(`/alerts/expiring?days=${days}`); }
  static async getExpiringSuggestions() { return this.call('/alerts/suggestions/use-expiring'); }
  static async getReadyRecipes() { return this.call('/alerts/suggestions/ready-to-cook'); }
  static async getPantryHealth() { return this.call('/alerts/pantry-health'); }
  static async getDashboard() { return this.call('/alerts/dashboard'); }
}

// Export globally
window.API = API;
