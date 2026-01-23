/**
 * Chef's Kiss API Client - Python Age 5.0
 *
 * Simple wrapper around fetch() that talks to Python backend.
 * Replaces ALL Supabase SDK calls.
 *
 * JavaScript's job: Make the site breathe.
 * Python's job: Make it think.
 */

// Get API base URL from config (update config.js with your Railway URL!)
const API_BASE = window.CONFIG?.API_BASE || 'http://localhost:8000/api';

class API {
  /**
   * Get auth token from localStorage
   */
  static getToken() {
    return localStorage.getItem('auth_token');
  }

  /**
   * Save auth token to localStorage
   */
  static setToken(token) {
    localStorage.setItem('auth_token', token);
  }

  /**
   * Clear auth token
   */
  static clearToken() {
    localStorage.removeItem('auth_token');
  }

  /**
   * Make API call
   */
  static async call(endpoint, options = {}) {
    const token = this.getToken();

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));

      // If we get 401 and it's an auth token error, clear the token and reload
      if (response.status === 401 && error.detail && error.detail.includes('authentication token')) {
        console.error('Invalid authentication token detected, clearing and reloading...');
        this.clearToken();
        // Don't reload immediately if this is an auth endpoint to avoid loops
        if (!endpoint.includes('/auth/')) {
          setTimeout(() => window.location.reload(), 1000);
        }
      }

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

    if (data.session?.access_token) {
      this.setToken(data.session.access_token);
    }

    return data;
  }

  static async signIn(email, password) {
    const data = await this.call('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.session?.access_token) {
      this.setToken(data.session.access_token);
    }

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

  static async getPantry() {
    return this.call('/pantry');
  }

  static async addPantryItem(item) {
    return this.call('/pantry', {
      method: 'POST',
      body: JSON.stringify(item)
    });
  }

  static async updatePantryItem(id, item) {
    return this.call(`/pantry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item)
    });
  }

  static async deletePantryItem(id) {
    return this.call(`/pantry/${id}`, {
      method: 'DELETE'
    });
  }

  // ===== RECIPES =====

  static async getRecipes() {
    return this.call('/recipes');
  }

  static async searchRecipes(params) {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.tags) params.tags.forEach(tag => query.append('tags', tag));
    if (params.ready_only) query.append('ready_only', 'true');
    if (params.has_ingredients) params.has_ingredients.forEach(ing => query.append('has_ingredients', ing));

    return this.call(`/recipes/search?${query}`);
  }

  static async getRecipe(id) {
    return this.call(`/recipes/${id}`);
  }

  static async addRecipe(recipe) {
    return this.call('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe)
    });
  }

  static async updateRecipe(id, recipe) {
    return this.call(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recipe)
    });
  }

  static async deleteRecipe(id) {
    return this.call(`/recipes/${id}`, {
      method: 'DELETE'
    });
  }

  static async getScaledRecipe(id, multiplier) {
    return this.call(`/recipes/${id}/scaled?multiplier=${multiplier}`);
  }

  // ===== MEAL PLANS =====

  static async getMealPlans() {
    return this.call('/meal-plans');
  }

  static async addMealPlan(meal) {
    return this.call('/meal-plans', {
      method: 'POST',
      body: JSON.stringify(meal)
    });
  }

  static async updateMealPlan(id, meal) {
    return this.call(`/meal-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(meal)
    });
  }

  static async deleteMealPlan(id) {
    return this.call(`/meal-plans/${id}`, {
      method: 'DELETE'
    });
  }

  static async validateCanCook(mealId) {
    return this.call(`/meal-plans/${mealId}/validate`, {
      method: 'POST'
    });
  }

  static async markMealCooked(mealId, force = false) {
    return this.call(`/meal-plans/${mealId}/cook?force=${force}`, {
      method: 'POST'
    });
  }

  // ===== SHOPPING LIST =====

  static async getShoppingList() {
    return this.call('/shopping-list');
  }

  static async regenerateShoppingList() {
    return this.call('/shopping-list/regenerate', {
      method: 'POST'
    });
  }

  static async addManualShoppingItem(item) {
    return this.call('/shopping-list/items', {
      method: 'POST',
      body: JSON.stringify(item)
    });
  }

  static async updateShoppingItem(id, update) {
    return this.call(`/shopping-list/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(update)
    });
  }

  static async deleteManualShoppingItem(id) {
    return this.call(`/shopping-list/items/${id}`, {
      method: 'DELETE'
    });
  }

  static async clearCheckedItems() {
    return this.call('/shopping-list/clear-checked', {
      method: 'POST'
    });
  }

  static async addCheckedToPantry() {
    return this.call('/shopping-list/add-checked-to-pantry', {
      method: 'POST'
    });
  }

  // ===== ALERTS & SUGGESTIONS =====

  static async getExpiringItems(days = 3) {
    return this.call(`/alerts/expiring?days=${days}`);
  }

  static async getExpiringSuggestions() {
    return this.call('/alerts/suggestions/use-expiring');
  }

  static async getReadyRecipes() {
    return this.call('/alerts/suggestions/ready-to-cook');
  }

  static async getPantryHealth() {
    return this.call('/alerts/pantry-health');
  }

  static async getDashboard() {
    return this.call('/alerts/dashboard');
  }
}

// Export for use in other files
window.API = API;
