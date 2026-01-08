/**
 * Supabase Configuration Template
 *
 * SETUP INSTRUCTIONS:
 * 1. Copy this file and rename it to: supabase-config.js
 * 2. Go to your Supabase project: https://supabase.com/dashboard
 * 3. Go to Project Settings > API
 * 4. Copy your Project URL and paste it below
 * 5. Copy your anon/public key and paste it below
 * 6. Save the file
 *
 * SECURITY NOTE:
 * - The anon key is safe to use in the browser
 * - Row Level Security (RLS) policies protect your data
 */

const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';  // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';  // Your anon/public key

// Initialize Supabase client (using window.supabaseClient to avoid conflicts)
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
}
