"""
Shopping List Models - Python Age 5.0

The shopping list is what makes everything beat!
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ShoppingItem(BaseModel):
    """Single item on shopping list (auto-generated or manual)"""
    id: Optional[int] = None  # Only for manual items stored in DB
    name: str
    quantity: float
    unit: str
    category: str
    source: str  # "Meals", "Threshold", or "Manual"
    checked: bool = False
    checked_at: Optional[datetime] = None
    checked_by: Optional[int] = None
    household_id: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Eggs",
                "quantity": 2,
                "unit": "dozen",
                "category": "Dairy",
                "source": "Meals",
                "checked": False
            }
        }


class ManualShoppingItemCreate(BaseModel):
    """Create manual shopping list item (toilet paper, soap, etc.)"""
    name: str = Field(..., min_length=1, max_length=100)
    quantity: float = Field(..., gt=0)
    unit: str = Field(..., min_length=1, max_length=20)
    category: str = Field(default="Other")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Toilet Paper",
                "quantity": 1,
                "unit": "pack",
                "category": "Household"
            }
        }


class ShoppingItemUpdate(BaseModel):
    """Update shopping item (mainly for checking off)"""
    checked: Optional[bool] = None
    quantity: Optional[float] = Field(None, gt=0)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = None
