"""
Shopping List Routes - Python Age 5.0

The shopping list is what makes everything beat!

Features:
- Auto-generated from meals + thresholds
- Manual items (toilet paper, soap, etc.)
- Check off items as you shop
- Focus mode support
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

from models.shopping import ManualShoppingItemCreate, ShoppingItemUpdate
from utils.auth import get_current_household, get_current_user
from utils.supabase_client import get_supabase
from state_manager import StateManager

router = APIRouter(prefix="/api/shopping-list", tags=["shopping"])


@router.get("/")
async def get_shopping_list(household_id: int = Depends(get_current_household)):
    """
    Get complete shopping list.

    Combines:
    - Auto-generated from meals
    - Auto-generated from thresholds
    - Manual items
    """
    state = StateManager.get_state(household_id)

    return {
        "shopping_list": [item.model_dump() for item in state.shopping_list],
        "last_updated": state.last_updated.isoformat(),
        "total_items": len(state.shopping_list),
        "checked_items": sum(1 for item in state.shopping_list if item.checked),
        "unchecked_items": sum(1 for item in state.shopping_list if not item.checked)
    }


@router.post("/regenerate")
async def regenerate_shopping_list(household_id: int = Depends(get_current_household)):
    """
    Force regeneration of shopping list.

    Invalidates cache - next request will recalculate.
    """
    StateManager.invalidate(household_id)

    state = StateManager.get_state(household_id)

    return {
        "shopping_list": [item.model_dump() for item in state.shopping_list],
        "last_updated": state.last_updated.isoformat()
    }


@router.post("/items")
async def add_manual_item(
    item: ManualShoppingItemCreate,
    household_id: int = Depends(get_current_household)
):
    """
    Add manual shopping item (toilet paper, soap, etc.)

    These persist separately from auto-generated items.
    """
    supabase = get_supabase()

    def update():
        response = supabase.table('shopping_list_manual').insert({
            'household_id': household_id,
            'name': item.name,
            'quantity': item.quantity,
            'unit': item.unit,
            'category': item.category,
            'checked': False
        }).execute()

        return response.data[0]['id']

    item_id = StateManager.update_and_invalidate(household_id, update)

    # Return fresh state
    state = StateManager.get_state(household_id)

    return {
        "id": item_id,
        "shopping_list": [item.model_dump() for item in state.shopping_list]
    }


@router.patch("/items/{item_id}")
async def update_shopping_item(
    item_id: int,
    update: ShoppingItemUpdate,
    household_id: int = Depends(get_current_household),
    user: dict = Depends(get_current_user)
):
    """
    Update shopping item (mainly for checking off).

    Only works for manual items (auto-generated items can't be edited).
    """
    supabase = get_supabase()

    def update_item():
        update_data = {}

        if update.checked is not None:
            update_data['checked'] = update.checked
            if update.checked:
                update_data['checked_at'] = datetime.now().isoformat()
                update_data['checked_by'] = user['id']
            else:
                update_data['checked_at'] = None
                update_data['checked_by'] = None

        if update.quantity is not None:
            update_data['quantity'] = update.quantity

        if update.name is not None:
            update_data['name'] = update.name

        if update.category is not None:
            update_data['category'] = update.category

        if update_data:
            supabase.table('shopping_list_manual')\
                .update(update_data)\
                .eq('id', item_id)\
                .eq('household_id', household_id)\
                .execute()

    StateManager.update_and_invalidate(household_id, update_item)

    # Return fresh state
    state = StateManager.get_state(household_id)

    return {
        "shopping_list": [item.model_dump() for item in state.shopping_list]
    }


@router.delete("/items/{item_id}")
async def delete_manual_item(
    item_id: int,
    household_id: int = Depends(get_current_household)
):
    """
    Delete manual shopping item.

    Only works for manual items (can't delete auto-generated items).
    """
    supabase = get_supabase()

    def update():
        supabase.table('shopping_list_manual')\
            .delete()\
            .eq('id', item_id)\
            .eq('household_id', household_id)\
            .execute()

    StateManager.update_and_invalidate(household_id, update)

    # Return fresh state
    state = StateManager.get_state(household_id)

    return {
        "shopping_list": [item.model_dump() for item in state.shopping_list]
    }


@router.post("/clear-checked")
async def clear_checked_items(household_id: int = Depends(get_current_household)):
    """
    Delete all checked manual items.

    Useful after shopping is complete.
    """
    supabase = get_supabase()

    def update():
        supabase.table('shopping_list_manual')\
            .delete()\
            .eq('household_id', household_id)\
            .eq('checked', True)\
            .execute()

    StateManager.update_and_invalidate(household_id, update)

    # Return fresh state
    state = StateManager.get_state(household_id)

    return {
        "shopping_list": [item.model_dump() for item in state.shopping_list],
        "message": "Checked items cleared"
    }


@router.post("/add-checked-to-pantry")
async def add_checked_to_pantry(household_id: int = Depends(get_current_household)):
    """
    Add all checked items to pantry.

    Smart feature: After shopping, add purchased items to pantry automatically!
    """
    state = StateManager.get_state(household_id)
    supabase = get_supabase()

    added_count = 0

    def update():
        nonlocal added_count

        for item in state.shopping_list:
            if not item.checked:
                continue

            # Check if item already exists in pantry
            existing = supabase.table('pantry_items')\
                .select('id')\
                .eq('household_id', household_id)\
                .eq('name', item.name)\
                .eq('unit', item.unit)\
                .execute()

            if existing.data:
                # Update existing item quantity
                pantry_id = existing.data[0]['id']

                # Get current location or create default
                location_response = supabase.table('pantry_locations')\
                    .select('*')\
                    .eq('pantry_item_id', pantry_id)\
                    .limit(1)\
                    .execute()

                if location_response.data:
                    # Add to existing location
                    location = location_response.data[0]
                    new_qty = location['quantity'] + item.quantity
                    supabase.table('pantry_locations')\
                        .update({'quantity': new_qty})\
                        .eq('id', location['id'])\
                        .execute()
                else:
                    # Create new location
                    supabase.table('pantry_locations').insert({
                        'pantry_item_id': pantry_id,
                        'location': 'Pantry',
                        'quantity': item.quantity
                    }).execute()

                added_count += 1
            else:
                # Create new pantry item
                pantry_response = supabase.table('pantry_items').insert({
                    'household_id': household_id,
                    'name': item.name,
                    'unit': item.unit,
                    'category': item.category,
                    'min_threshold': 0
                }).execute()

                pantry_id = pantry_response.data[0]['id']

                # Create location
                supabase.table('pantry_locations').insert({
                    'pantry_item_id': pantry_id,
                    'location': 'Pantry',
                    'quantity': item.quantity
                }).execute()

                added_count += 1

    StateManager.update_and_invalidate(household_id, update)

    # Return fresh state
    state = StateManager.get_state(household_id)

    return {
        "pantry_items": [item.model_dump() for item in state.pantry_items],
        "shopping_list": [item.model_dump() for item in state.shopping_list],
        "added_count": added_count,
        "message": f"Added {added_count} items to pantry"
    }
