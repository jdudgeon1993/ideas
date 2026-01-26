"""
Settings Routes - Python Age 5.0

Household settings for categories, locations, etc.
Replaces localStorage with proper database storage.
"""

from fastapi import APIRouter, Depends
import logging

from models.settings import HouseholdSettings, SettingsUpdate
from utils.auth import get_current_household
from utils.supabase_client import get_supabase

router = APIRouter(prefix="/api/settings", tags=["settings"])
logger = logging.getLogger(__name__)

# Default values
DEFAULT_LOCATIONS = ['Pantry', 'Refrigerator', 'Freezer', 'Cabinet', 'Counter']
DEFAULT_CATEGORIES = ['Meat', 'Dairy', 'Produce', 'Pantry', 'Frozen', 'Spices', 'Beverages', 'Snacks', 'Other']


@router.get("/")
async def get_settings(household_id: str = Depends(get_current_household)):
    """
    Get household settings.

    Creates default settings if none exist.
    """
    supabase = get_supabase()

    # Try to get existing settings
    response = supabase.table('household_settings')\
        .select('*')\
        .eq('household_id', household_id)\
        .execute()

    if response.data:
        settings = HouseholdSettings.from_supabase(response.data[0])
    else:
        # Create default settings
        logger.info(f"Creating default settings for household {household_id}")
        insert_response = supabase.table('household_settings').insert({
            'household_id': household_id,
            'locations': DEFAULT_LOCATIONS,
            'categories': DEFAULT_CATEGORIES,
            'category_emojis': {}
        }).execute()

        settings = HouseholdSettings.from_supabase(insert_response.data[0])

    return {
        "settings": settings.model_dump(),
        "locations": settings.locations,
        "categories": settings.categories,
        "category_emojis": settings.category_emojis
    }


@router.put("/")
async def update_settings(
    update: SettingsUpdate,
    household_id: str = Depends(get_current_household)
):
    """
    Update household settings.

    Only updates fields that are provided.
    """
    supabase = get_supabase()

    # Build update dict (only include provided fields)
    update_data = {}
    if update.locations is not None:
        update_data['locations'] = update.locations
    if update.categories is not None:
        update_data['categories'] = update.categories
    if update.category_emojis is not None:
        update_data['category_emojis'] = update.category_emojis

    if not update_data:
        # Nothing to update, just return current settings
        return await get_settings(household_id)

    # Check if settings exist
    existing = supabase.table('household_settings')\
        .select('id')\
        .eq('household_id', household_id)\
        .execute()

    if existing.data:
        # Update existing
        response = supabase.table('household_settings')\
            .update(update_data)\
            .eq('household_id', household_id)\
            .execute()
    else:
        # Create new with updates
        update_data['household_id'] = household_id
        response = supabase.table('household_settings')\
            .insert(update_data)\
            .execute()

    settings = HouseholdSettings.from_supabase(response.data[0])

    return {
        "settings": settings.model_dump(),
        "locations": settings.locations,
        "categories": settings.categories,
        "category_emojis": settings.category_emojis,
        "message": "Settings saved"
    }


@router.post("/locations")
async def add_location(
    location: dict,
    household_id: str = Depends(get_current_household)
):
    """Add a new location."""
    name = location.get('name', '').strip()
    if not name:
        return {"error": "Location name required"}, 400

    supabase = get_supabase()

    # Get current settings
    response = supabase.table('household_settings')\
        .select('locations')\
        .eq('household_id', household_id)\
        .execute()

    if response.data:
        locations = response.data[0].get('locations', DEFAULT_LOCATIONS)
    else:
        locations = DEFAULT_LOCATIONS.copy()

    # Add if not already present
    if name not in locations:
        locations.append(name)

        if response.data:
            supabase.table('household_settings')\
                .update({'locations': locations})\
                .eq('household_id', household_id)\
                .execute()
        else:
            supabase.table('household_settings').insert({
                'household_id': household_id,
                'locations': locations
            }).execute()

    return {"locations": locations, "message": f"Location '{name}' added"}


@router.delete("/locations/{location_name}")
async def remove_location(
    location_name: str,
    household_id: str = Depends(get_current_household)
):
    """Remove a location."""
    supabase = get_supabase()

    response = supabase.table('household_settings')\
        .select('locations')\
        .eq('household_id', household_id)\
        .execute()

    if response.data:
        locations = response.data[0].get('locations', DEFAULT_LOCATIONS)
        if location_name in locations:
            locations.remove(location_name)
            supabase.table('household_settings')\
                .update({'locations': locations})\
                .eq('household_id', household_id)\
                .execute()

    return {"locations": locations, "message": f"Location '{location_name}' removed"}


@router.post("/categories")
async def add_category(
    category: dict,
    household_id: str = Depends(get_current_household)
):
    """Add a new category."""
    name = category.get('name', '').strip()
    emoji = category.get('emoji', '')

    if not name:
        return {"error": "Category name required"}, 400

    supabase = get_supabase()

    # Get current settings
    response = supabase.table('household_settings')\
        .select('categories, category_emojis')\
        .eq('household_id', household_id)\
        .execute()

    if response.data:
        categories = response.data[0].get('categories', DEFAULT_CATEGORIES)
        emojis = response.data[0].get('category_emojis', {})
    else:
        categories = DEFAULT_CATEGORIES.copy()
        emojis = {}

    # Add if not already present
    if name not in categories:
        categories.append(name)

    # Update emoji if provided
    if emoji:
        emojis[name] = emoji

    if response.data:
        supabase.table('household_settings')\
            .update({'categories': categories, 'category_emojis': emojis})\
            .eq('household_id', household_id)\
            .execute()
    else:
        supabase.table('household_settings').insert({
            'household_id': household_id,
            'categories': categories,
            'category_emojis': emojis
        }).execute()

    return {
        "categories": categories,
        "category_emojis": emojis,
        "message": f"Category '{name}' added"
    }


@router.delete("/categories/{category_name}")
async def remove_category(
    category_name: str,
    household_id: str = Depends(get_current_household)
):
    """Remove a category."""
    supabase = get_supabase()

    response = supabase.table('household_settings')\
        .select('categories, category_emojis')\
        .eq('household_id', household_id)\
        .execute()

    if response.data:
        categories = response.data[0].get('categories', DEFAULT_CATEGORIES)
        emojis = response.data[0].get('category_emojis', {})

        if category_name in categories:
            categories.remove(category_name)
        if category_name in emojis:
            del emojis[category_name]

        supabase.table('household_settings')\
            .update({'categories': categories, 'category_emojis': emojis})\
            .eq('household_id', household_id)\
            .execute()
    else:
        categories = DEFAULT_CATEGORIES
        emojis = {}

    return {
        "categories": categories,
        "category_emojis": emojis,
        "message": f"Category '{category_name}' removed"
    }
