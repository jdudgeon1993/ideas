"""
Recipe Routes - Python Age 5.0

Recipes with smart search and filtering.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional

from models.recipe import RecipeCreate, RecipeUpdate
from utils.auth import get_current_household
from utils.supabase_client import get_supabase
from state_manager import StateManager

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


@router.get("/")
async def get_recipes(household_id: str = Depends(get_current_household)):
    """
    Get all recipes.
    """
    state = StateManager.get_state(household_id)

    return {
        "recipes": [recipe.model_dump() for recipe in state.recipes],
        "ready_to_cook": state.ready_to_cook_recipe_ids
    }


@router.get("/search")
async def search_recipes(
    q: Optional[str] = None,
    tags: Optional[List[str]] = Query(None),
    ready_only: bool = False,
    has_ingredients: Optional[List[str]] = Query(None),
    household_id: str = Depends(get_current_household)
):
    """
    Search and filter recipes.

    Args:
        q: Search term (searches recipe name)
        tags: Filter by tags
        ready_only: Only show ready-to-cook recipes
        has_ingredients: Filter by ingredients
    """
    state = StateManager.get_state(household_id)
    recipes = state.recipes

    # Filter by search term
    if q:
        q_lower = q.lower()
        recipes = [r for r in recipes if q_lower in r.name.lower()]

    # Filter by tags
    if tags:
        recipes = [r for r in recipes if any(tag in r.tags for tag in tags)]

    # Filter by ready to cook
    if ready_only:
        recipes = [r for r in recipes if r.id in state.ready_to_cook_recipe_ids]

    # Filter by ingredients
    if has_ingredients:
        has_lower = [ing.lower() for ing in has_ingredients]
        recipes = [
            r for r in recipes
            if any(ing.lower() in [i.name.lower() for i in r.ingredients] for ing in has_lower)
        ]

    return {
        "recipes": [recipe.model_dump() for recipe in recipes],
        "total": len(recipes)
    }


@router.get("/{recipe_id}")
async def get_recipe(
    recipe_id: str,
    household_id: str = Depends(get_current_household)
):
    """
    Get single recipe by ID.
    """
    state = StateManager.get_state(household_id)

    recipe = next((r for r in state.recipes if r.id == recipe_id), None)

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    return {
        "recipe": recipe.model_dump(),
        "ready_to_cook": recipe.id in state.ready_to_cook_recipe_ids
    }


@router.post("/")
async def add_recipe(
    recipe: RecipeCreate,
    household_id: str = Depends(get_current_household)
):
    """
    Add new recipe.
    """
    supabase = get_supabase()

    def update():
        # Insert recipe with ingredients as JSONB
        recipe_response = supabase.table('recipes').insert({
            'household_id': household_id,
            'name': recipe.name,
            'tags': recipe.tags,
            'instructions': recipe.instructions,
            'ingredients': recipe.ingredients  # Store as JSONB
        }).execute()

        recipe_id = recipe_response.data[0]['id']
        return recipe_id

    recipe_id = StateManager.update_and_invalidate(household_id, update)

    # Return fresh state
    state = StateManager.get_state(household_id)

    return {
        "id": recipe_id,
        "recipes": [recipe.model_dump() for recipe in state.recipes],
        "ready_to_cook": state.ready_to_cook_recipe_ids
    }


@router.put("/{recipe_id}")
async def update_recipe(
    recipe_id: str,
    recipe: RecipeUpdate,
    household_id: str = Depends(get_current_household)
):
    """
    Update existing recipe.
    """
    supabase = get_supabase()

    def update():
        # Build update dict
        update_data = {}
        if recipe.name is not None:
            update_data['name'] = recipe.name
        if recipe.tags is not None:
            update_data['tags'] = recipe.tags
        if recipe.instructions is not None:
            update_data['instructions'] = recipe.instructions

        if update_data:
            supabase.table('recipes').update(update_data)\
                .eq('id', recipe_id)\
                .eq('household_id', household_id)\
                .execute()

        # Update ingredients if provided (stored as JSONB)
        if recipe.ingredients is not None:
            if 'ingredients' not in update_data:
                update_data['ingredients'] = recipe.ingredients
            # Re-run update if ingredients were provided separately
            if update_data and 'ingredients' in update_data:
                supabase.table('recipes').update({'ingredients': update_data['ingredients']})\
                    .eq('id', recipe_id)\
                    .eq('household_id', household_id)\
                    .execute()

    StateManager.update_and_invalidate(household_id, update)

    # Return fresh state
    state = StateManager.get_state(household_id)

    return {
        "recipes": [recipe.model_dump() for recipe in state.recipes],
        "ready_to_cook": state.ready_to_cook_recipe_ids
    }


@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: str,
    household_id: str = Depends(get_current_household)
):
    """
    Delete recipe.
    """
    supabase = get_supabase()

    def update():
        # Delete recipe (ingredients stored as JSONB, no separate table)
        supabase.table('recipes')\
            .delete()\
            .eq('id', recipe_id)\
            .eq('household_id', household_id)\
            .execute()

    StateManager.update_and_invalidate(household_id, update)

    # Return fresh state
    state = StateManager.get_state(household_id)

    return {
        "recipes": [recipe.model_dump() for recipe in state.recipes],
        "ready_to_cook": state.ready_to_cook_recipe_ids
    }


@router.get("/{recipe_id}/scaled")
async def get_scaled_recipe(
    recipe_id: str,
    multiplier: float = 1.0,
    household_id: str = Depends(get_current_household)
):
    """
    Get recipe with scaled ingredient quantities.

    Args:
        multiplier: Serving multiplier (e.g., 2.0 for double)
    """
    state = StateManager.get_state(household_id)

    recipe = next((r for r in state.recipes if r.id == recipe_id), None)

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Scale ingredients
    scaled_recipe = recipe.model_dump()
    scaled_recipe['serving_multiplier'] = multiplier
    scaled_recipe['ingredients'] = [
        {
            **ing,
            'quantity': ing['quantity'] * multiplier
        }
        for ing in scaled_recipe['ingredients']
    ]

    return {"recipe": scaled_recipe}
