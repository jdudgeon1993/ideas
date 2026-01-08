/**
 * Supabase Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to your Supabase project: https://supabase.com/dashboard
 * 2. Go to Project Settings > API
 * 3. Copy your Project URL and paste it below
 * 4. Copy your anon/public key and paste it below
 * 5. Save this file
 *
 * SECURITY NOTE:
 * - The anon key is safe to use in the browser
 * - Row Level Security (RLS) policies protect your data
 * - Never commit this file with real credentials to a public repo
 */

// TODO: Replace these with your actual Supabase credentials
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';  // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';  // Your anon/public key

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in app.js
window.supabase = supabase;

// Helper to check if Supabase is configured
window.isSupabaseConfigured = function() {
  return SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL' &&
         SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
};

// Log configuration status
if (window.isSupabaseConfigured()) {
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️ Supabase not configured. Please update supabase-config.js with your credentials.');
  console.warn('📖 See: https://supabase.com/dashboard/project/_/settings/api');
}
