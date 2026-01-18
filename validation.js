/* ===================================================================
   VALIDATION MODULE - Input Validation & Sanitization
   =================================================================== */

/**
 * Maximum length constants
 */
const MAX_LENGTHS = {
  ITEM_NAME: 100,
  RECIPE_NAME: 100,
  CATEGORY_NAME: 50,
  LOCATION_NAME: 50,
  UNIT: 20,
  TAG: 30,
  INSTRUCTIONS: 5000,
  NOTES: 1000
};

/**
 * Quantity limits
 */
const QUANTITY_LIMITS = {
  MIN: 0,
  MAX: 99999
};

/**
 * Unit standardization mapping
 */
const UNIT_STANDARDS = {
  // Weight
  'pound': 'lb',
  'pounds': 'lb',
  'lbs': 'lb',
  'ounce': 'oz',
  'ounces': 'oz',
  'gram': 'g',
  'grams': 'g',
  'kilogram': 'kg',
  'kilograms': 'kg',
  'kgs': 'kg',

  // Volume
  'cup': 'cup',
  'cups': 'cup',
  'tablespoon': 'tbsp',
  'tablespoons': 'tbsp',
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'gallon': 'gal',
  'gallons': 'gal',
  'quart': 'qt',
  'quarts': 'qt',
  'pint': 'pt',
  'pints': 'pt',
  'liter': 'L',
  'liters': 'L',
  'milliliter': 'ml',
  'milliliters': 'ml',

  // Count
  'piece': 'unit',
  'pieces': 'unit',
  'item': 'unit',
  'items': 'unit',
  'count': 'unit',
  'ea': 'unit',
  'each': 'unit',

  // Misc
  'can': 'can',
  'cans': 'can',
  'jar': 'jar',
  'jars': 'jar',
  'bottle': 'bottle',
  'bottles': 'bottle',
  'package': 'pkg',
  'packages': 'pkg',
  'pkg': 'pkg',
  'box': 'box',
  'boxes': 'box',
  'bag': 'bag',
  'bags': 'bag',
  'bunch': 'bunch',
  'bunches': 'bunch',
  'head': 'head',
  'heads': 'head',
  'clove': 'clove',
  'cloves': 'clove'
};

/* ===================================================================
   SANITIZATION FUNCTIONS
   =================================================================== */

/**
 * Remove HTML tags and dangerous characters from input
 * @param {string} input - The string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeHTML(input) {
  if (typeof input !== 'string') return '';

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove script-related content
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Decode HTML entities to prevent double encoding
  const textarea = document.createElement('textarea');
  textarea.innerHTML = sanitized;
  sanitized = textarea.value;

  return sanitized.trim();
}

/**
 * Standardize unit to common abbreviation
 * @param {string} unit - The unit string to standardize
 * @returns {string} Standardized unit
 */
function standardizeUnit(unit) {
  if (!unit || typeof unit !== 'string') return 'unit';

  const normalized = unit.toLowerCase().trim();
  return UNIT_STANDARDS[normalized] || unit.trim();
}

/**
 * Truncate string to maximum length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
function truncateString(str, maxLength) {
  if (!str || typeof str !== 'string') return '';
  str = str.trim();
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

/* ===================================================================
   VALIDATION FUNCTIONS
   =================================================================== */

/**
 * Validate pantry item
 * @param {Object} item - Pantry item to validate
 * @returns {{valid: boolean, error?: string, sanitized?: Object}}
 */
function validatePantryItem(item) {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Invalid item data' };
  }

  // Validate and sanitize name
  if (!item.name || typeof item.name !== 'string') {
    return { valid: false, error: 'Item name is required' };
  }

  const sanitizedName = sanitizeHTML(item.name);
  if (sanitizedName.length === 0) {
    return { valid: false, error: 'Item name cannot be empty' };
  }

  if (sanitizedName.length > MAX_LENGTHS.ITEM_NAME) {
    return {
      valid: false,
      error: `Item name too long (max ${MAX_LENGTHS.ITEM_NAME} characters)`
    };
  }

  // Validate quantity
  const quantity = parseFloat(item.totalQty || item.quantity || 0);
  if (isNaN(quantity)) {
    return { valid: false, error: 'Quantity must be a number' };
  }

  if (quantity < QUANTITY_LIMITS.MIN) {
    return { valid: false, error: 'Quantity cannot be negative' };
  }

  if (quantity > QUANTITY_LIMITS.MAX) {
    return {
      valid: false,
      error: `Quantity too large (max ${QUANTITY_LIMITS.MAX})`
    };
  }

  // Validate and standardize unit
  const sanitizedUnit = sanitizeHTML(item.unit || 'unit');
  const standardizedUnit = standardizeUnit(sanitizedUnit);

  if (standardizedUnit.length > MAX_LENGTHS.UNIT) {
    return {
      valid: false,
      error: `Unit name too long (max ${MAX_LENGTHS.UNIT} characters)`
    };
  }

  // Validate category
  const sanitizedCategory = item.category ?
    truncateString(sanitizeHTML(item.category), MAX_LENGTHS.CATEGORY_NAME) :
    'Uncategorized';

  // Validate locations
  let sanitizedLocations = [];
  if (Array.isArray(item.locations)) {
    sanitizedLocations = item.locations.map(loc => ({
      location: truncateString(sanitizeHTML(loc.location || 'Pantry'), MAX_LENGTHS.LOCATION_NAME),
      qty: Math.max(0, Math.min(parseFloat(loc.qty) || 0, QUANTITY_LIMITS.MAX))
    })).filter(loc => loc.qty > 0);
  }

  // Return sanitized item
  return {
    valid: true,
    sanitized: {
      ...item,
      name: sanitizedName,
      totalQty: quantity,
      quantity: quantity,
      unit: standardizedUnit,
      category: sanitizedCategory,
      locations: sanitizedLocations
    }
  };
}

/**
 * Validate recipe
 * @param {Object} recipe - Recipe to validate
 * @returns {{valid: boolean, error?: string, sanitized?: Object}}
 */
function validateRecipe(recipe) {
  if (!recipe || typeof recipe !== 'object') {
    return { valid: false, error: 'Invalid recipe data' };
  }

  // Validate name
  if (!recipe.name || typeof recipe.name !== 'string') {
    return { valid: false, error: 'Recipe name is required' };
  }

  const sanitizedName = sanitizeHTML(recipe.name);
  if (sanitizedName.length === 0) {
    return { valid: false, error: 'Recipe name cannot be empty' };
  }

  if (sanitizedName.length > MAX_LENGTHS.RECIPE_NAME) {
    return {
      valid: false,
      error: `Recipe name too long (max ${MAX_LENGTHS.RECIPE_NAME} characters)`
    };
  }

  // Validate servings
  const servings = parseInt(recipe.servings) || 4;
  if (servings < 1 || servings > 100) {
    return { valid: false, error: 'Servings must be between 1 and 100' };
  }

  // Validate ingredients
  let sanitizedIngredients = [];
  if (Array.isArray(recipe.ingredients)) {
    sanitizedIngredients = recipe.ingredients
      .map(ing => {
        const name = sanitizeHTML(ing.name || '');
        if (!name) return null;

        return {
          name: truncateString(name, MAX_LENGTHS.ITEM_NAME),
          qty: Math.max(0, parseFloat(ing.qty) || 0),
          unit: standardizeUnit(sanitizeHTML(ing.unit || 'unit'))
        };
      })
      .filter(ing => ing !== null);
  }

  if (sanitizedIngredients.length === 0) {
    return { valid: false, error: 'Recipe must have at least one ingredient' };
  }

  // Validate instructions
  const sanitizedInstructions = recipe.instructions ?
    truncateString(sanitizeHTML(recipe.instructions), MAX_LENGTHS.INSTRUCTIONS) :
    '';

  // Validate tags
  let sanitizedTags = [];
  if (Array.isArray(recipe.tags)) {
    sanitizedTags = recipe.tags
      .map(tag => {
        const sanitized = sanitizeHTML(tag);
        return truncateString(sanitized, MAX_LENGTHS.TAG);
      })
      .filter(tag => tag.length > 0)
      .slice(0, 20); // Max 20 tags
  }

  return {
    valid: true,
    sanitized: {
      ...recipe,
      name: sanitizedName,
      servings: servings,
      ingredients: sanitizedIngredients,
      instructions: sanitizedInstructions,
      tags: sanitizedTags
    }
  };
}

/**
 * Validate shopping item
 * @param {Object} item - Shopping item to validate
 * @returns {{valid: boolean, error?: string, sanitized?: Object}}
 */
function validateShoppingItem(item) {
  // Shopping items use the same validation as pantry items
  return validatePantryItem(item);
}

/**
 * Validate category name
 * @param {string} name - Category name to validate
 * @returns {{valid: boolean, error?: string, sanitized?: string}}
 */
function validateCategoryName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Category name is required' };
  }

  const sanitized = sanitizeHTML(name);
  if (sanitized.length === 0) {
    return { valid: false, error: 'Category name cannot be empty' };
  }

  if (sanitized.length > MAX_LENGTHS.CATEGORY_NAME) {
    return {
      valid: false,
      error: `Category name too long (max ${MAX_LENGTHS.CATEGORY_NAME} characters)`
    };
  }

  return { valid: true, sanitized: sanitized };
}

/**
 * Validate location name
 * @param {string} name - Location name to validate
 * @returns {{valid: boolean, error?: string, sanitized?: string}}
 */
function validateLocationName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Location name is required' };
  }

  const sanitized = sanitizeHTML(name);
  if (sanitized.length === 0) {
    return { valid: false, error: 'Location name cannot be empty' };
  }

  if (sanitized.length > MAX_LENGTHS.LOCATION_NAME) {
    return {
      valid: false,
      error: `Location name too long (max ${MAX_LENGTHS.LOCATION_NAME} characters)`
    };
  }

  return { valid: true, sanitized: sanitized };
}

/* ===================================================================
   EXPOSE TO WINDOW
   =================================================================== */

window.validation = {
  // Constants
  MAX_LENGTHS,
  QUANTITY_LIMITS,

  // Sanitization functions
  sanitizeHTML,
  standardizeUnit,
  truncateString,

  // Validation functions
  validatePantryItem,
  validateRecipe,
  validateShoppingItem,
  validateCategoryName,
  validateLocationName
};
