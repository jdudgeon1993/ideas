// Top of file (replace existing top lines with this block)

const DEFAULT_API_BASE = 'https://chefs-kiss-production.up.railway.app';

// Pick API_BASE from window.CONFIG if present, otherwise default
let API_BASE = window.CONFIG?.API_BASE || DEFAULT_API_BASE;

// Force https and remove trailing slashes
try {
  API_BASE = API_BASE.replace(/^http:/, 'https:').replace(/\/+$/, '');
} catch (e) {
  API_BASE = DEFAULT_API_BASE;
}

// ===== CENTRAL API CALL =====
class API {
  static getToken() {
    return localStorage.getItem('auth_token');
  }

  // ... keep other helper methods ...

  static async call(endpoint, options = {}) {
    // Ensure endpoint begins with a single leading slash
    if (!endpoint.startsWith('/')) endpoint = `/${endpoint}`;

    let url = `${API_BASE}${endpoint}`;

    // Extra safety: convert http to https if present anywhere
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

  // ...
}

window.API = API;
