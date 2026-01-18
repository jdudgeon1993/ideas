/* ===================================================================
   LANDING PAGE MODULE
   Handles landing page display, demo account, and transitions
   =================================================================== */

/**
 * Demo account data - Sample data for "Try Demo" feature
 * Saved to localStorage only, NOT synced to Supabase
 */
const DEMO_DATA = {
  pantry: [
    {
      id: 'demo-pantry-1',
      name: 'Flour',
      unit: 'lb',
      category: 'Baking',
      min: 2,
      totalQty: 5,
      locations: [
        { id: 'demo-loc-1', location: 'Pantry', qty: 3, expiry: '' },
        { id: 'demo-loc-2', location: 'Storage', qty: 2, expiry: '' }
      ],
      notes: ''
    },
    {
      id: 'demo-pantry-2',
      name: 'Sugar',
      unit: 'lb',
      category: 'Baking',
      min: 1,
      totalQty: 3,
      locations: [
        { id: 'demo-loc-3', location: 'Pantry', qty: 3, expiry: '' }
      ],
      notes: ''
    },
    {
      id: 'demo-pantry-3',
      name: 'Eggs',
      unit: 'unit',
      category: 'Dairy',
      min: 12,
      totalQty: 4,
      locations: [
        { id: 'demo-loc-4', location: 'Fridge', qty: 4, expiry: '2026-02-01' }
      ],
      notes: ''
    },
    {
      id: 'demo-pantry-4',
      name: 'Milk',
      unit: 'gal',
      category: 'Dairy',
      min: 1,
      totalQty: 0.25,
      locations: [
        { id: 'demo-loc-5', location: 'Fridge', qty: 0.25, expiry: '2026-01-25' }
      ],
      notes: ''
    },
    {
      id: 'demo-pantry-5',
      name: 'Butter',
      unit: 'lb',
      category: 'Dairy',
      min: 1,
      totalQty: 0.25,
      locations: [
        { id: 'demo-loc-6', location: 'Fridge', qty: 0.25, expiry: '' }
      ],
      notes: ''
    },
    {
      id: 'demo-pantry-6',
      name: 'Chicken Breast',
      unit: 'lb',
      category: 'Meat',
      min: 2,
      totalQty: 4,
      locations: [
        { id: 'demo-loc-7', location: 'Freezer', qty: 4, expiry: '2026-03-01' }
      ],
      notes: ''
    },
    {
      id: 'demo-pantry-7',
      name: 'Tomatoes',
      unit: 'unit',
      category: 'Produce',
      min: 6,
      totalQty: 2,
      locations: [
        { id: 'demo-loc-8', location: 'Counter', qty: 2, expiry: '' }
      ],
      notes: ''
    },
    {
      id: 'demo-pantry-8',
      name: 'Pasta',
      unit: 'lb',
      category: 'Grains',
      min: 1,
      totalQty: 2,
      locations: [
        { id: 'demo-loc-9', location: 'Pantry', qty: 2, expiry: '' }
      ],
      notes: ''
    },
    {
      id: 'demo-pantry-9',
      name: 'Olive Oil',
      unit: 'bottle',
      category: 'Oils',
      min: 2,
      totalQty: 0.5,
      locations: [
        { id: 'demo-loc-10', location: 'Pantry', qty: 0.5, expiry: '' }
      ],
      notes: ''
    },
    {
      id: 'demo-pantry-10',
      name: 'Garlic',
      unit: 'bulb',
      category: 'Produce',
      min: 3,
      totalQty: 1,
      locations: [
        { id: 'demo-loc-11', location: 'Counter', qty: 1, expiry: '' }
      ],
      notes: ''
    },
    {
      id: 'demo-pantry-11',
      name: 'Chocolate Chips',
      unit: 'bag',
      category: 'Baking',
      min: 1,
      totalQty: 0,
      locations: [],
      notes: ''
    }
  ],
  recipes: [
    {
      id: 'demo-recipe-1',
      name: 'Chocolate Chip Cookies',
      servings: 24,
      ingredients: [
        { name: 'Flour', qty: 2.5, unit: 'cup' },
        { name: 'Sugar', qty: 1, unit: 'cup' },
        { name: 'Butter', qty: 0.5, unit: 'lb' },
        { name: 'Eggs', qty: 2, unit: 'unit' },
        { name: 'Chocolate Chips', qty: 2, unit: 'cup' }
      ],
      instructions: '1. Preheat oven to 375°F\n2. Mix butter and sugar until fluffy\n3. Add eggs and mix well\n4. Gradually add flour\n5. Fold in chocolate chips\n6. Drop spoonfuls onto baking sheet\n7. Bake 10-12 minutes until golden',
      photo: '',
      tags: ['Dessert', 'Baking'],
      isFavorite: true
    },
    {
      id: 'demo-recipe-2',
      name: 'Grilled Chicken',
      servings: 4,
      ingredients: [
        { name: 'Chicken Breast', qty: 2, unit: 'lb' },
        { name: 'Olive Oil', qty: 2, unit: 'tbsp' },
        { name: 'Garlic Powder', qty: 1, unit: 'tsp' },
        { name: 'Paprika', qty: 1, unit: 'tsp' }
      ],
      instructions: '1. Season chicken with oil and spices\n2. Let marinate 30 minutes\n3. Preheat grill to medium-high\n4. Grill 6-7 minutes per side\n5. Let rest 5 minutes before serving',
      photo: '',
      tags: ['Main Dish', 'Healthy', 'Quick'],
      isFavorite: true
    },
    {
      id: 'demo-recipe-3',
      name: 'Pasta with Tomato Sauce',
      servings: 4,
      ingredients: [
        { name: 'Pasta', qty: 1, unit: 'lb' },
        { name: 'Tomatoes', qty: 6, unit: 'unit' },
        { name: 'Olive Oil', qty: 3, unit: 'tbsp' },
        { name: 'Garlic', qty: 4, unit: 'clove' },
        { name: 'Basil', qty: 0.25, unit: 'cup' }
      ],
      instructions: '1. Boil water for pasta\n2. Dice tomatoes and sauté with garlic and oil\n3. Cook pasta until al dente\n4. Combine pasta with sauce\n5. Top with fresh basil',
      photo: '',
      tags: ['Main Dish', 'Italian', 'Vegetarian'],
      isFavorite: false
    }
  ],
  planner: {
    '2026-01-19': [
      {
        id: 'demo-meal-1',
        recipeId: 'demo-recipe-2',
        mealType: 'dinner',
        cooked: true
      }
    ],
    '2026-01-20': [
      {
        id: 'demo-meal-2',
        recipeId: 'demo-recipe-3',
        mealType: 'dinner',
        cooked: false
      }
    ],
    '2026-01-21': [
      {
        id: 'demo-meal-3',
        recipeId: 'demo-recipe-2',
        mealType: 'dinner',
        cooked: false
      }
    ],
    '2026-01-22': [
      {
        id: 'demo-meal-4',
        recipeId: 'demo-recipe-1',
        mealType: 'snack',
        cooked: false
      }
    ],
    '2026-01-23': [
      {
        id: 'demo-meal-5',
        recipeId: 'demo-recipe-3',
        mealType: 'lunch',
        cooked: false
      },
      {
        id: 'demo-meal-6',
        recipeId: 'demo-recipe-2',
        mealType: 'dinner',
        cooked: false
      }
    ],
    '2026-01-24': [
      {
        id: 'demo-meal-7',
        recipeId: 'demo-recipe-1',
        mealType: 'dessert',
        cooked: false
      }
    ],
    '2026-01-25': [
      {
        id: 'demo-meal-8',
        recipeId: 'demo-recipe-3',
        mealType: 'dinner',
        cooked: false
      }
    ]
  }
};

/* ===================================================================
   LANDING PAGE VISIBILITY
   =================================================================== */

/**
 * Show or hide landing page based on authentication state
 */
function updateLandingPageVisibility(isAuthenticated) {
  const landingPage = document.getElementById('landing-page');
  const body = document.body;

  if (!landingPage) return;

  // Check if in demo mode (don't show landing if demo is active)
  const isDemoMode = localStorage.getItem('demo-mode') === 'true';

  if (!isAuthenticated && !isDemoMode) {
    // Show landing page
    landingPage.classList.add('show');
    body.classList.add('landing-active');
  } else {
    // Hide landing page
    landingPage.classList.remove('show');
    body.classList.remove('landing-active');
  }
}

/* ===================================================================
   DEMO ACCOUNT FUNCTIONALITY
   =================================================================== */

/**
 * Load demo data into localStorage and show the app
 */
function loadDemoAccount() {
  try {
    // Set demo mode flag
    localStorage.setItem('demo-mode', 'true');

    // Load demo data into localStorage
    localStorage.setItem('pantry', JSON.stringify(DEMO_DATA.pantry));
    localStorage.setItem('recipes', JSON.stringify(DEMO_DATA.recipes));
    localStorage.setItem('planner', JSON.stringify(DEMO_DATA.planner));

    // Update global variables if they exist
    if (window.pantry !== undefined) {
      window.pantry = DEMO_DATA.pantry;
    }
    if (window.recipes !== undefined) {
      window.recipes = DEMO_DATA.recipes;
    }
    if (window.planner !== undefined) {
      window.planner = DEMO_DATA.planner;
    }

    // Hide landing page and show app
    const landingPage = document.getElementById('landing-page');
    const body = document.body;

    if (landingPage) {
      landingPage.classList.remove('show');
      body.classList.remove('landing-active');
    }

    // Show demo mode banner
    const demoBanner = document.getElementById('demo-banner');
    if (demoBanner) {
      demoBanner.style.display = 'block';
    }

    // Show toast notification
    if (window.showToast) {
      window.showToast('🎉 Welcome to the demo! Explore all features with sample data.');
    }

    // Refresh all views
    if (window.renderPantry) window.renderPantry();
    if (window.renderRecipes) window.renderRecipes();
    if (window.generateShoppingList) window.generateShoppingList();
    if (window.updateDashboard) window.updateDashboard();
    if (window.renderCalendar) window.renderCalendar();

    console.log('✅ Demo mode activated');

  } catch (err) {
    console.error('Error loading demo account:', err);
    if (window.showToast) {
      window.showToast('❌ Failed to load demo');
    }
  }
}

/**
 * Exit demo mode and show landing page again
 */
function exitDemoMode() {
  if (confirm('Exit demo mode? All demo data will be cleared.')) {
    // Clear demo flag
    localStorage.removeItem('demo-mode');

    // Clear demo data
    localStorage.removeItem('pantry');
    localStorage.removeItem('recipes');
    localStorage.removeItem('planner');

    // Reset global arrays
    if (window.pantry !== undefined) window.pantry = [];
    if (window.recipes !== undefined) window.recipes = [];
    if (window.planner !== undefined) window.planner = {};

    // Hide demo banner
    const demoBanner = document.getElementById('demo-banner');
    if (demoBanner) {
      demoBanner.style.display = 'none';
    }

    // Show landing page
    updateLandingPageVisibility(false);

    console.log('✅ Demo mode exited');
  }
}

/**
 * Check if currently in demo mode
 */
function isDemoMode() {
  return localStorage.getItem('demo-mode') === 'true';
}

/* ===================================================================
   BUTTON HANDLERS
   =================================================================== */

/**
 * Handle "Get Started" button click
 */
function handleGetStarted() {
  // Temporarily hide landing page so modal is visible
  const landingPage = document.getElementById('landing-page');
  const body = document.body;

  if (landingPage) {
    landingPage.classList.remove('show');
    body.classList.remove('landing-active');
  }

  // Open the sign-in modal (defined in app.js)
  if (window.openSigninModal) {
    window.openSigninModal();

    // Set up a check to restore landing page if modal closes without auth
    // Wait 1 second before starting to poll, to give modal time to fully open
    setTimeout(() => {
      let pollCount = 0;
      const maxPolls = 60; // Stop after 30 seconds (60 checks * 500ms)

      const checkModalClosed = setInterval(() => {
        pollCount++;
        const modal = document.getElementById('card-modal');
        const isAuthenticated = window.auth && window.auth.isAuthenticated && window.auth.isAuthenticated();

        // If user is now authenticated, stop checking
        if (isAuthenticated) {
          clearInterval(checkModalClosed);
          return;
        }

        // If modal is closed (or doesn't exist) and user is still not authenticated
        if ((!modal || !modal.classList.contains('show')) && !isAuthenticated && !isDemoMode()) {
          clearInterval(checkModalClosed);
          // Show landing page again after a short delay
          setTimeout(() => {
            if (!window.auth || !window.auth.isAuthenticated()) {
              updateLandingPageVisibility(false);
            }
          }, 100);
          return;
        }

        // Safety: stop checking after max polls
        if (pollCount >= maxPolls) {
          clearInterval(checkModalClosed);
        }
      }, 500);
    }, 1000);
  } else {
    console.error('Sign-in modal function not found');
    // Restore landing page if modal can't open
    if (landingPage) {
      landingPage.classList.add('show');
      body.classList.add('landing-active');
    }
  }
}

/**
 * Handle "Try Demo Account" button click
 */
function handleTryDemo() {
  loadDemoAccount();
}

/**
 * Handle "Already have an account? Sign in" link click
 */
function handleSignInLink(e) {
  e.preventDefault();
  handleGetStarted();
}

/* ===================================================================
   INITIALIZATION
   =================================================================== */

/**
 * Initialize landing page - wire up event listeners
 */
function initLandingPage() {
  // Get button elements
  const btnGetStarted = document.getElementById('landing-get-started');
  const btnTryDemo = document.getElementById('landing-try-demo');
  const btnFooterCTA = document.getElementById('landing-footer-cta');
  const linkFooterSignin = document.getElementById('landing-footer-signin');
  const linkDemoExit = document.getElementById('demo-exit-link');

  // Wire up click handlers
  if (btnGetStarted) {
    btnGetStarted.addEventListener('click', handleGetStarted);
  }

  if (btnTryDemo) {
    btnTryDemo.addEventListener('click', handleTryDemo);
  }

  if (btnFooterCTA) {
    btnFooterCTA.addEventListener('click', handleGetStarted);
  }

  if (linkFooterSignin) {
    linkFooterSignin.addEventListener('click', handleSignInLink);
  }

  if (linkDemoExit) {
    linkDemoExit.addEventListener('click', (e) => {
      e.preventDefault();
      exitDemoMode();
    });
  }

  // Check initial state - show landing if not authenticated and not in demo
  const isAuth = window.auth && window.auth.isAuthenticated ? window.auth.isAuthenticated() : false;
  updateLandingPageVisibility(isAuth);

  // Show demo banner if in demo mode
  if (isDemoMode()) {
    const demoBanner = document.getElementById('demo-banner');
    if (demoBanner) {
      demoBanner.style.display = 'block';
    }
  }

  console.log('✅ Landing page initialized');
}

/* ===================================================================
   EXPORTS
   =================================================================== */

window.landing = {
  updateLandingPageVisibility,
  loadDemoAccount,
  exitDemoMode,
  isDemoMode,
  initLandingPage
};
