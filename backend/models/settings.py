"""
Household Settings Models - Python Age 5.0
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class HouseholdSettings(BaseModel):
    """Settings for a household"""
    id: Optional[str] = None
    household_id: str
    locations: List[str] = Field(
        default=['Pantry', 'Refrigerator', 'Freezer', 'Cabinet', 'Counter']
    )
    categories: List[str] = Field(
        default=['Meat', 'Dairy', 'Produce', 'Pantry', 'Frozen', 'Spices', 'Beverages', 'Snacks', 'Other']
    )
    category_emojis: Dict[str, str] = Field(default_factory=dict)

    @classmethod
    def from_supabase(cls, data: dict):
        """Convert Supabase data to model"""
        return cls(
            id=data.get('id'),
            household_id=data['household_id'],
            locations=data.get('locations', cls.model_fields['locations'].default),
            categories=data.get('categories', cls.model_fields['categories'].default),
            category_emojis=data.get('category_emojis', {})
        )


class SettingsUpdate(BaseModel):
    """Update household settings"""
    locations: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    category_emojis: Optional[Dict[str, str]] = None
