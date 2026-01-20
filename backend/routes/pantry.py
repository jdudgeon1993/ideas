"""
Pantry Routes - Python Age 5.0

The pantry is the heart of Chef's Kiss.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from models.pantry import PantryItemCreate, PantryItemUpdate
from utils.auth import get_current_household
from utils.supabase_client import get_supabase
from state_manager import StateManager

router = APIRouter(prefix="/api/pantry", tags=["pantry"])


@router.get("/")
async def get_pantry(household_id: int = Depends(get_current_household)):
    """
    Get all pantry items with automatically calculated data.

    Returns pantry + shopping list + ready recipes all at once!
    Everything syncs automatically.
    """
    state = StateManager.get_state(household_id)

    return {
        "pantry_items": [item.model_dump() for item in state.pantry_items],
        "shopping_list": [item.model_dump() for item in state.shopping_list],
        "ready_recipes": state.ready_to_cook_recipe_ids,
        "pantry_health": state.get_pantry_health(),
        "last_updated": state.last_updated.isoformat()
    }


@router.post("/")
async def add_pantry_item(
    item: PantryItemCreate,
    household_id: int = Depends(get_current_household)
):
    """
    Add new pantry item.

    Shopping list automatically updates!
    """
    supabase = get_supabase()

    def update():
        # Insert pantry item
        item_response = supabase.table('pantry_items').insert({
            'household_id': household_id,
            'name': item.name,
            'category': item.category,
            'unit': item.unit,
            'min_threshold': item.min_threshold
        }).execute()

        item_id = item_response.data[0]['id']

        # Insert locations
        for location in item.locations:
            supabase.table('pantry_locations').insert({
                'pantry_item_id': item_id,
                'location': location['location'],
                'quantity': location['quantity'],
                'expiration_date': location.get('expiration_date')
            }).execute()

        return item_id

    item_id = StateManager.update_and_invalidate(household_id, update)

    # Return fresh state
    state = StateManager.get_state(household_id)

    return {
        "id": item_id,
        "pantry_items": [item.model_dump() for item in state.pantry_items],
        "shopping_list": [item.model_dump() for item in state.shopping_list],
        "ready_recipes": state.ready_to_cook_recipe_ids
    }


@router.put("/{item_id}")
async def update_pantry_item(
    item_id: int,
    item: PantryItemUpdate,
    household_id: int = Depends(get_current_household)
):
    """
    Update pantry item.

    Everything syncs automatically!
    """
    supabase = get_supabase()

    def update():
        # Build update dict (only include provided fields)
        update_data = {}
        if item.name is not None:
            update_data['name'] = item.name
        if item.category is not None:
            update_data['category'] = item.category
        if item.unit is not None:
            update_data['unit'] = item.unit
        if item.min_threshold is not None:
            update_data['min_threshold'] = item.min_threshold

        if update_data:
            supabase.table('pantry_items').update(update_data)\
                .eq('id', item_id)\
                .eq('household_id', household_id)\
                .execute()

        # Update locations if provided
        if item.locations is not None:
            # Delete old locations
            supabase.table('pantry_locations')\
                .delete()\
                .eq('pantry_item_id', item_id)\
                .execute()

            # Insert new locations
            for location in item.locations:
                supabase.table('pantry_locations').insert({
                    'pantry_item_id': item_id,
                    'location': location['location'],
                    'quantity': location['quantity'],
                    'expiration_date': location.get('expiration_date')
                }).execute()

    StateManager.update_and_invalidate(household_id, update)

    # Return fresh state
    state = StateManager.get_state(household_id)

    return {
        "pantry_items": [item.model_dump() for item in state.pantry_items],
        "shopping_list": [item.model_dump() for item in state.shopping_list],
        "ready_recipes": state.ready_to_cook_recipe_ids
    }


@router.delete("/{item_id}")
async def delete_pantry_item(
    item_id: int,
    household_id: int = Depends(get_current_household)
):
    """
    Delete pantry item.

    Shopping list updates automatically!
    """
    supabase = get_supabase()

    def update():
        # Delete locations first (foreign key constraint)
        supabase.table('pantry_locations')\
            .delete()\
            .eq('pantry_item_id', item_id)\
            .execute()

        # Delete item
        supabase.table('pantry_items')\
            .delete()\
            .eq('id', item_id)\
            .eq('household_id', household_id)\
            .execute()

    StateManager.update_and_invalidate(household_id, update)

    # Return fresh state
    state = StateManager.get_state(household_id)

    return {
        "pantry_items": [item.model_dump() for item in state.pantry_items],
        "shopping_list": [item.model_dump() for item in state.shopping_list],
        "ready_recipes": state.ready_to_cook_recipe_ids
    }
