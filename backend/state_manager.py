"""
State Manager - Python Age 5.0

THE HEART OF CHEF'S KISS

This is where all the magic happens:
- Global state per household
- Automatic calculations
- Intelligent caching
- Everything syncs automatically

One source of truth. Everything flows from here.
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, date, timedelta
from collections import defaultdict
import redis
import pickle
import logging
import os

from models.pantry import PantryItem
from models.recipe import Recipe
from models.meal_plan import MealPlan
from models.shopping import ShoppingItem
from utils.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# Redis connection - works both locally and in Railway
try:
    # Railway provides REDIS_URL, local dev uses localhost
    redis_url = os.getenv('REDIS_URL')

    if redis_url:
        # Railway/production environment
        redis_client = redis.from_url(
            redis_url,
            decode_responses=False,  # We use pickle for complex objects
            socket_connect_timeout=2
        )
        logger.info("🔗 Connecting to Redis via REDIS_URL...")
    else:
        # Local development
        redis_client = redis.Redis(
            host='localhost',
            port=6379,
            db=0,
            decode_responses=False,
            socket_connect_timeout=2
        )
        logger.info("🔗 Connecting to Redis on localhost...")

    redis_client.ping()
    logger.info("✅ Redis connected successfully")
except (redis.ConnectionError, redis.TimeoutError) as e:
    logger.warning(f"⚠️ Redis not available - caching disabled: {e}")
    redis_client = None


class HouseholdState:
    """
    Complete state for a household.

    The pantry is the heart, but the shopping list is what makes everything beat!

    All calculations happen automatically when data changes.
    """

    def __init__(
        self,
        household_id: int,
        pantry_items: List[PantryItem],
        recipes: List[Recipe],
        meal_plans: List[MealPlan],
        manual_shopping_items: List[ShoppingItem] = None
    ):
        self.household_id = household_id
        self.pantry_items = pantry_items
        self.recipes = recipes
        self.meal_plans = meal_plans
        self.manual_shopping_items = manual_shopping_items or []

        # Calculated properties (set by calculate_all)
        self.reserved_ingredients: Dict[str, float] = {}
        self.shopping_list: List[ShoppingItem] = []
        self.ready_to_cook_recipe_ids: List[int] = []

        self.last_updated = datetime.now()

        # Calculate everything on initialization
        self.calculate_all()

    def calculate_all(self):
        """
        ONE method that calculates EVERYTHING.
        Call this whenever ANY data changes.

        This is the synchronization magic!
        """
        logger.info(f"🔄 Recalculating state for household {self.household_id}")

        self.reserved_ingredients = self._calculate_reserved()
        self.shopping_list = self._calculate_shopping_list()
        self.ready_to_cook_recipe_ids = self._calculate_ready_recipes()

        self.last_updated = datetime.now()

        logger.info(f"✅ State calculated: {len(self.shopping_list)} shopping items, "
                   f"{len(self.ready_to_cook_recipe_ids)} ready recipes")

    # ===== CORE CALCULATIONS =====

    def _calculate_reserved(self) -> Dict[str, float]:
        """
        Calculate what ingredients are reserved by upcoming meals.

        Returns:
            Dict mapping "name|unit" to quantity reserved
        """
        reserved = defaultdict(float)

        for meal in self.meal_plans:
            # Skip cooked meals
            if meal.cooked:
                continue

            # Skip past meals
            if meal.date < date.today():
                continue

            recipe = self._get_recipe(meal.recipe_id)
            if not recipe:
                continue

            for ingredient in recipe.ingredients:
                key = f"{ingredient.name.lower()}|{ingredient.unit}"
                reserved[key] += ingredient.quantity * meal.serving_multiplier

        return dict(reserved)

    def _calculate_shopping_list(self) -> List[ShoppingItem]:
        """
        Calculate what to buy.

        Combines:
        1. What meals need (that we don't have)
        2. Items below minimum threshold
        3. Manual items (toilet paper, soap, etc.)

        Returns:
            Complete shopping list
        """
        shopping = []
        added_keys = set()  # Track to avoid duplicates

        # Part 1: What meals need
        for key, needed_qty in self.reserved_ingredients.items():
            name, unit = key.split("|")

            pantry_item = self._find_pantry_item(name, unit)
            available = pantry_item.total_quantity if pantry_item else 0

            if available < needed_qty:
                shopping.append(ShoppingItem(
                    name=name.title(),
                    quantity=round(needed_qty - available, 2),
                    unit=unit,
                    category=pantry_item.category if pantry_item else "Other",
                    source="Meals",
                    checked=False
                ))
                added_keys.add(key)

        # Part 2: Items below threshold
        for item in self.pantry_items:
            key = f"{item.name.lower()}|{item.unit}"

            # Skip if already added from meals
            if key in added_keys:
                # But increase quantity if threshold requires more
                for shop_item in shopping:
                    if (shop_item.name.lower() == item.name.lower() and
                        shop_item.unit == item.unit):
                        threshold_shortfall = item.min_threshold - item.total_quantity
                        if threshold_shortfall > 0:
                            shop_item.quantity = max(
                                shop_item.quantity,
                                round(threshold_shortfall, 2)
                            )
                continue

            if item.total_quantity < item.min_threshold:
                shopping.append(ShoppingItem(
                    name=item.name.title(),
                    quantity=round(item.min_threshold - item.total_quantity, 2),
                    unit=item.unit,
                    category=item.category,
                    source="Threshold",
                    checked=False
                ))

        # Part 3: Manual items (the essentials!)
        shopping.extend(self.manual_shopping_items)

        # Sort by category then name
        shopping.sort(key=lambda x: (x.category, x.name))

        return shopping

    def _calculate_ready_recipes(self) -> List[int]:
        """
        Calculate which recipes can be made RIGHT NOW.

        Accounts for reserved ingredients from planned meals.

        Returns:
            List of recipe IDs that are ready to cook
        """
        ready = []

        for recipe in self.recipes:
            can_make = True

            for ingredient in recipe.ingredients:
                pantry_item = self._find_pantry_item(ingredient.name, ingredient.unit)
                available = pantry_item.total_quantity if pantry_item else 0

                # Subtract reserved ingredients
                key = f"{ingredient.name.lower()}|{ingredient.unit}"
                reserved = self.reserved_ingredients.get(key, 0)

                actual_available = available - reserved

                if actual_available < ingredient.quantity:
                    can_make = False
                    break

            if can_make:
                ready.append(recipe.id)

        return ready

    # ===== SMART FEATURES =====

    def get_expiring_soon(self, days: int = 3) -> List[dict]:
        """
        Get items expiring in next N days.

        Args:
            days: Number of days to look ahead

        Returns:
            List of expiring items with details
        """
        expiring = []
        cutoff = date.today() + timedelta(days=days)

        for item in self.pantry_items:
            for location in item.locations:
                if location.expiration_date and location.expiration_date <= cutoff:
                    days_until = (location.expiration_date - date.today()).days
                    expiring.append({
                        "item_name": item.name,
                        "item_id": item.id,
                        "location": location.location,
                        "quantity": location.quantity,
                        "unit": item.unit,
                        "expires_on": location.expiration_date,
                        "expires_in_days": days_until,
                        "is_expired": days_until < 0
                    })

        # Sort by expiration date (soonest first)
        expiring.sort(key=lambda x: x['expires_on'])

        return expiring

    def suggest_recipes_for_expiring_items(self) -> List[dict]:
        """
        Smart suggestions: Recipes that use expiring ingredients.

        This makes the app feel ALIVE and intelligent!

        Returns:
            List of suggestions with expiring item and matching recipes
        """
        expiring = self.get_expiring_soon(days=3)
        suggestions = []
        seen_items = set()

        for exp_item in expiring:
            # Skip if already processed this item
            if exp_item['item_name'] in seen_items:
                continue
            seen_items.add(exp_item['item_name'])

            # Find recipes that use this ingredient
            matching_recipes = []
            for recipe in self.recipes:
                for ingredient in recipe.ingredients:
                    if ingredient.name.lower() == exp_item['item_name'].lower():
                        matching_recipes.append({
                            "id": recipe.id,
                            "name": recipe.name,
                            "tags": recipe.tags,
                            "ready_to_cook": recipe.id in self.ready_to_cook_recipe_ids
                        })
                        break

            if matching_recipes:
                suggestions.append({
                    "expiring_item": exp_item['item_name'],
                    "expires_in_days": exp_item['expires_in_days'],
                    "quantity": exp_item['quantity'],
                    "unit": exp_item['unit'],
                    "recipes": matching_recipes
                })

        return suggestions

    def validate_can_cook_meal(self, meal_id: int) -> dict:
        """
        Validate if a meal can be cooked with current pantry.

        Returns:
            dict with can_cook (bool) and missing ingredients
        """
        meal = next((m for m in self.meal_plans if m.id == meal_id), None)
        if not meal:
            return {"can_cook": False, "error": "Meal not found"}

        recipe = self._get_recipe(meal.recipe_id)
        if not recipe:
            return {"can_cook": False, "error": "Recipe not found"}

        missing = []

        for ingredient in recipe.ingredients:
            needed = ingredient.quantity * meal.serving_multiplier
            pantry_item = self._find_pantry_item(ingredient.name, ingredient.unit)
            available = pantry_item.total_quantity if pantry_item else 0

            if available < needed:
                missing.append({
                    "ingredient": ingredient.name,
                    "unit": ingredient.unit,
                    "needed": round(needed, 2),
                    "available": round(available, 2),
                    "short": round(needed - available, 2)
                })

        return {
            "can_cook": len(missing) == 0,
            "missing": missing,
            "recipe_name": recipe.name
        }

    def get_pantry_health(self) -> dict:
        """
        Overall pantry health score.

        Returns:
            Health metrics and score
        """
        total_items = len(self.pantry_items)
        below_threshold = sum(
            1 for item in self.pantry_items
            if item.total_quantity < item.min_threshold
        )
        expiring_soon = len(self.get_expiring_soon(days=3))

        # Calculate health score (0-100)
        health_score = 100
        health_score -= below_threshold * 10  # -10 per item below threshold
        health_score -= expiring_soon * 5  # -5 per expiring item
        health_score = max(0, health_score)

        return {
            "total_items": total_items,
            "below_threshold": below_threshold,
            "expiring_soon": expiring_soon,
            "health_score": health_score,
            "status": "excellent" if health_score >= 80 else
                     "good" if health_score >= 60 else
                     "fair" if health_score >= 40 else "poor"
        }

    # ===== HELPER METHODS =====

    def _find_pantry_item(self, name: str, unit: str) -> Optional[PantryItem]:
        """Find pantry item by name and unit"""
        name_lower = name.lower()
        for item in self.pantry_items:
            if item.name.lower() == name_lower and item.unit == unit:
                return item
        return None

    def _get_recipe(self, recipe_id: int) -> Optional[Recipe]:
        """Get recipe by ID"""
        for recipe in self.recipes:
            if recipe.id == recipe_id:
                return recipe
        return None


class StateManager:
    """
    Manages state for all households with intelligent caching.

    This is the API that endpoints use.
    """

    CACHE_TTL = 300  # 5 minutes

    @classmethod
    def get_state(cls, household_id: int) -> HouseholdState:
        """
        Get state for household.

        Checks cache first, loads from DB if needed.
        """
        # Try cache
        if redis_client:
            cache_key = f"state:{household_id}"
            try:
                cached_data = redis_client.get(cache_key)

                if cached_data:
                    logger.info(f"💰 Cache HIT for household {household_id}")
                    return pickle.loads(cached_data)
            except Exception as e:
                logger.warning(f"Cache read error: {e}")

        # Load from database
        logger.info(f"📀 Cache MISS - Loading household {household_id} from database")
        state = cls._load_from_database(household_id)

        # Cache it
        if redis_client:
            cache_key = f"state:{household_id}"
            try:
                redis_client.setex(
                    cache_key,
                    cls.CACHE_TTL,
                    pickle.dumps(state)
                )
                logger.info(f"💾 Cached state for household {household_id}")
            except Exception as e:
                logger.warning(f"Cache write error: {e}")

        return state

    @classmethod
    def _load_from_database(cls, household_id: int) -> HouseholdState:
        """Load all data from Supabase"""
        supabase = get_supabase()

        # Load pantry items with locations
        logger.debug("Loading pantry items...")
        pantry_response = supabase.table('pantry_items')\
            .select('*, pantry_locations(*)')\
            .eq('household_id', household_id)\
            .execute()

        pantry_items = []
        for item_data in pantry_response.data:
            locations = item_data.pop('pantry_locations', [])
            pantry_items.append(
                PantryItem.from_supabase(item_data, locations)
            )

        # Load recipes with ingredients
        logger.debug("Loading recipes...")
        recipes_response = supabase.table('recipes')\
            .select('*, recipes_ingredients(*)')\
            .eq('household_id', household_id)\
            .execute()

        recipes = [
            Recipe.from_supabase(recipe_data)
            for recipe_data in recipes_response.data
        ]

        # Load meal plans (only future/today)
        logger.debug("Loading meal plans...")
        meals_response = supabase.table('meal_plans')\
            .select('*')\
            .eq('household_id', household_id)\
            .gte('date', date.today().isoformat())\
            .execute()

        meal_plans = [
            MealPlan.from_supabase(meal_data)
            for meal_data in meals_response.data
        ]

        # Load manual shopping items
        logger.debug("Loading manual shopping items...")
        try:
            shopping_response = supabase.table('shopping_list_manual')\
                .select('*')\
                .eq('household_id', household_id)\
                .execute()

            manual_shopping_items = [
                ShoppingItem(
                    id=item['id'],
                    name=item['name'],
                    quantity=item['quantity'],
                    unit=item['unit'],
                    category=item.get('category', 'Other'),
                    source="Manual",
                    checked=item.get('checked', False),
                    checked_at=item.get('checked_at'),
                    checked_by=item.get('checked_by'),
                    household_id=household_id
                )
                for item in shopping_response.data
            ]
        except Exception as e:
            logger.warning(f"Manual shopping items not loaded: {e}")
            manual_shopping_items = []

        # Create state (automatically calculates everything!)
        logger.info(f"✨ Creating state for household {household_id}")
        return HouseholdState(
            household_id=household_id,
            pantry_items=pantry_items,
            recipes=recipes,
            meal_plans=meal_plans,
            manual_shopping_items=manual_shopping_items
        )

    @classmethod
    def invalidate(cls, household_id: int):
        """
        Invalidate cache for a household.

        Next request will reload from DB and recalculate.
        """
        if redis_client:
            cache_key = f"state:{household_id}"
            try:
                redis_client.delete(cache_key)
                logger.info(f"🗑️ Cache invalidated for household {household_id}")
            except Exception as e:
                logger.warning(f"Cache delete error: {e}")

    @classmethod
    def update_and_invalidate(cls, household_id: int, update_function):
        """
        Execute database update and invalidate cache.

        Use this for ALL data modifications!

        Example:
            def update():
                supabase.table('pantry_items').insert(data).execute()

            StateManager.update_and_invalidate(household_id, update)

        Args:
            household_id: Household to invalidate
            update_function: Function that performs the database update
        """
        # Execute the update
        logger.info(f"📝 Executing update for household {household_id}")
        result = update_function()

        # Invalidate cache
        cls.invalidate(household_id)

        return result
