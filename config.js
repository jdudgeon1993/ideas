/**
 * Chef's Kiss Configuration - Python Age 5.0
 *
 * UPDATE THIS FILE with your Railway backend URL!
 */

// STEP 1: Get your Railway URL
// Go to Railway → Your service → Settings → Domains
// Copy the URL (e.g., https://chefs-kiss-production.up.railway.app)

// STEP 2: Paste it here (replace the placeholder)
const BACKEND_URL = 'https://chefs-kiss-production.up.railway.app';

window.CONFIG = {
  BACKEND_URL,
  API_BASE: `${BACKEND_URL}/api`  // include /api here
};

