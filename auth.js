/* ---------------------------------------------------
   AUTHENTICATION MODULE
   Handles Supabase authentication and session management
--------------------------------------------------- */

// Current user and session state
let currentUser = null;
let currentSession = null;
let currentHouseholdId = null;

/* ---------------------------------------------------
   SESSION MANAGEMENT
--------------------------------------------------- */

/**
 * Initialize auth - Check for existing session on page load
 */
async function initAuth() {
  if (!window.isSupabaseConfigured()) {
    console.log('⚠️ Supabase not configured - running in offline mode');
    updateAuthUI(null);
    return;
  }

  try {
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();

    if (error) throw error;

    if (session) {
      currentSession = session;
      currentUser = session.user;
      await loadUserHousehold();
      console.log('✅ Session restored:', currentUser.email);
      updateAuthUI(currentUser);
    } else {
      console.log('No active session');
      updateAuthUI(null);
    }
  } catch (err) {
    console.error('Error initializing auth:', err);
    updateAuthUI(null);
  }

  // Listen for auth state changes
  window.supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);

    if (event === 'SIGNED_IN') {
      currentSession = session;
      currentUser = session.user;
      loadUserHousehold();
      updateAuthUI(currentUser);
    } else if (event === 'SIGNED_OUT') {
      currentSession = null;
      currentUser = null;
      currentHouseholdId = null;
      updateAuthUI(null);
    }
  });
}

/**
 * Load user's household ID
 */
async function loadUserHousehold() {
  if (!currentUser) return;

  try {
    const { data, error } = await window.supabaseClient
      .from('household_members')
      .select('household_id')
      .eq('user_id', currentUser.id)
      .single();

    if (error) {
      console.error('Error loading household:', error);
      return;
    }

    currentHouseholdId = data.household_id;
    console.log('✅ Household loaded:', currentHouseholdId);
  } catch (err) {
    console.error('Error in loadUserHousehold:', err);
  }
}

/* ---------------------------------------------------
   SIGN UP
--------------------------------------------------- */

/**
 * Create a new user account and household
 */
async function signUp(email, password, householdName = null) {
  if (!window.isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please add your credentials to supabase-config.js');
  }

  try {
    // Create auth user
    const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    if (!authData.user) {
      throw new Error('User creation failed');
    }

    console.log('✅ User created:', authData.user.email);

    // Create household for user
    const defaultHouseholdName = householdName || `${email.split('@')[0]}'s Kitchen`;

    const { data: householdData, error: householdError } = await window.supabaseClient
      .rpc('create_household_for_user', {
        p_household_name: defaultHouseholdName,
        p_user_id: authData.user.id
      });

    if (householdError) {
      console.error('Error creating household:', householdError);
      // Don't throw - user is created, household can be created later
    } else {
      currentHouseholdId = householdData;
      console.log('✅ Household created:', currentHouseholdId);
    }

    // Update state
    currentUser = authData.user;
    currentSession = authData.session;

    return {
      success: true,
      user: authData.user,
      message: 'Account created successfully! Please check your email to verify your account.'
    };

  } catch (err) {
    console.error('Sign up error:', err);
    return {
      success: false,
      error: err.message || 'Failed to create account'
    };
  }
}

/* ---------------------------------------------------
   SIGN IN
--------------------------------------------------- */

/**
 * Sign in with email and password
 */
async function signIn(email, password) {
  if (!window.isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please add your credentials to supabase-config.js');
  }

  try {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    currentUser = data.user;
    currentSession = data.session;
    await loadUserHousehold();

    console.log('✅ Signed in:', currentUser.email);

    return {
      success: true,
      user: data.user
    };

  } catch (err) {
    console.error('Sign in error:', err);
    return {
      success: false,
      error: err.message || 'Failed to sign in'
    };
  }
}

/* ---------------------------------------------------
   SIGN OUT
--------------------------------------------------- */

/**
 * Sign out current user
 */
async function signOut() {
  if (!window.isSupabaseConfigured()) {
    return;
  }

  try {
    const { error } = await window.supabaseClient.auth.signOut();

    if (error) throw error;

    currentUser = null;
    currentSession = null;
    currentHouseholdId = null;

    console.log('✅ Signed out');

    return { success: true };

  } catch (err) {
    console.error('Sign out error:', err);
    return {
      success: false,
      error: err.message || 'Failed to sign out'
    };
  }
}

/* ---------------------------------------------------
   UI UPDATES
--------------------------------------------------- */

/**
 * Update UI based on auth state
 */
function updateAuthUI(user) {
  const btnSignin = document.getElementById('btn-signin');

  if (!btnSignin) return;

  if (user) {
    // User is signed in
    btnSignin.textContent = '👤';
    btnSignin.title = `Signed in as ${user.email}`;
    btnSignin.style.opacity = '1';
  } else {
    // User is signed out
    btnSignin.textContent = '👤';
    btnSignin.title = 'Sign In';
    btnSignin.style.opacity = '0.6';
  }
}

/* ---------------------------------------------------
   HELPERS
--------------------------------------------------- */

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  return currentUser !== null && currentSession !== null;
}

/**
 * Get current user
 */
function getCurrentUser() {
  return currentUser;
}

/**
 * Get current household ID
 */
function getCurrentHouseholdId() {
  return currentHouseholdId;
}

/**
 * Require authentication - redirect to sign in if not authenticated
 */
function requireAuth() {
  if (!isAuthenticated()) {
    openSigninModal();
    return false;
  }
  return true;
}

/* ---------------------------------------------------
   EXPORTS (attached to window for global access)
--------------------------------------------------- */

window.auth = {
  initAuth,
  signUp,
  signIn,
  signOut,
  isAuthenticated,
  getCurrentUser,
  getCurrentHouseholdId,
  requireAuth,
  updateAuthUI
};
