"""
Alerts & Suggestions Routes - Python Age 5.0

Smart features that make the app feel ALIVE!
"""

from fastapi import APIRouter, Depends

from utils.auth import get_current_household
from state_manager import StateManager

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/expiring")
async def get_expiring_items(
    days: int = 3,
    household_id: int = Depends(get_current_household)
):
    """
    Get items expiring soon.

    Args:
        days: Look ahead this many days (default 3)

    Returns:
        List of expiring items with recipes that use them
    """
    state = StateManager.get_state(household_id)

    expiring = state.get_expiring_soon(days=days)

    return {
        "expiring_items": expiring,
        "total_expiring": len(expiring),
        "days_ahead": days
    }


@router.get("/suggestions/use-expiring")
async def suggest_recipes_for_expiring(household_id: int = Depends(get_current_household)):
    """
    Smart suggestions: Recipes that use expiring ingredients.

    This makes the app feel intelligent and proactive!

    Returns:
        Suggestions with expiring item and matching recipes
    """
    state = StateManager.get_state(household_id)

    suggestions = state.suggest_recipes_for_expiring_items()

    return {
        "suggestions": suggestions,
        "total_suggestions": len(suggestions)
    }


@router.get("/suggestions/ready-to-cook")
async def suggest_ready_recipes(household_id: int = Depends(get_current_household)):
    """
    Get recipes you can make RIGHT NOW with what you have.

    Returns:
        List of ready-to-cook recipes
    """
    state = StateManager.get_state(household_id)

    ready_recipes = [
        recipe
        for recipe in state.recipes
        if recipe.id in state.ready_to_cook_recipe_ids
    ]

    return {
        "ready_recipes": [recipe.model_dump() for recipe in ready_recipes],
        "total_ready": len(ready_recipes)
    }


@router.get("/pantry-health")
async def get_pantry_health(household_id: int = Depends(get_current_household)):
    """
    Get overall pantry health status.

    Returns:
        Health score and breakdown
    """
    state = StateManager.get_state(household_id)

    health = state.get_pantry_health()

    return health


@router.get("/dashboard")
async def get_dashboard_summary(household_id: int = Depends(get_current_household)):
    """
    Complete dashboard summary.

    Everything you need to see at a glance!

    Returns:
        - Expiring items with recipe suggestions
        - Shopping list summary
        - Meal plan summary
        - Pantry health
        - Ready-to-cook recipes
    """
    state = StateManager.get_state(household_id)

    # Expiring items
    expiring = state.get_expiring_soon(days=3)
    expiring_suggestions = state.suggest_recipes_for_expiring_items()

    # Shopping list summary
    shopping_checked = sum(1 for item in state.shopping_list if item.checked)
    shopping_unchecked = sum(1 for item in state.shopping_list if not item.checked)

    # Meal plan summary
    upcoming_meals = [m for m in state.meal_plans if not m.cooked]

    # Pantry health
    health = state.get_pantry_health()

    # Ready recipes
    ready_count = len(state.ready_to_cook_recipe_ids)

    return {
        "expiring": {
            "items": expiring,
            "total": len(expiring),
            "suggestions": expiring_suggestions
        },
        "shopping_list": {
            "total_items": len(state.shopping_list),
            "checked": shopping_checked,
            "unchecked": shopping_unchecked,
            "is_empty": len(state.shopping_list) == 0
        },
        "meal_plans": {
            "upcoming_count": len(upcoming_meals),
            "next_meal": upcoming_meals[0].model_dump() if upcoming_meals else None
        },
        "pantry_health": health,
        "ready_to_cook": {
            "count": ready_count
        },
        "last_updated": state.last_updated.isoformat()
    }
