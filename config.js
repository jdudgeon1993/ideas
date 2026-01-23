/**
 * Chef's Kiss Configuration - Python Age 5.0
 *
 * UPDATE THIS FILE with your Railway backend URL!
 */

// STEP 1: Get your Railway URL
// Go to Railway → Your service → Settings → Domains
// Copy the URL (e.g., https://chefs-kiss-production.up.railway.app)

// STEP 2: Paste it here (replace the placeholder)
const RAW_BACKEND_URL = 'https://chefs-kiss-production.up.railway.app';  // ✅ HTTPS required

// Normalize: force https and strip trailing slash
const BACKEND_URL = RAW_BACKEND_URL.replace(/^http:/, 'https:').replace(/\/+$/, '');
window.CONFIG = { BACKEND_URL, API_BASE: `${BACKEND_URL}/api` };
