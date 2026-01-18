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
const SUPABASE_URL = 'https://exojuwforrrtewccqjfu.supabase.co';  // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4b2p1d2ZvcnJydGV3Y2NxamZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NjYwNzcsImV4cCI6MjA4MjU0MjA3N30.ZE-vLmDg9y4FxLby3AEOGYyJcYLk0Tvazwl94CdzjUI';  // Your anon/public key

// Helper to check if Supabase is configured
window.isSupabaseConfigured = function() {
  return SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL' &&
         SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
};

// Clear any stale auth locks before initialization
try {
  const lockKey = 'supabase.auth.token';
  const storageKeys = Object.keys(localStorage);
  storageKeys.forEach(key => {
    if (key.includes('lock') && key.includes('supabase')) {
      localStorage.removeItem(key);
    }
  });
} catch (err) {
  console.warn('Could not clear stale locks:', err);
}

// Initialize Supabase client with proper configuration
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'chefs-kiss-app'
    }
  }
});

// Log configuration status
if (window.isSupabaseConfigured()) {
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️ Supabase not configured. Please update supabase-config.js with your credentials.');
  console.warn('📖 See: https://supabase.com/dashboard/project/_/settings/api');
}
