"""
Meal Plan Models - Python Age 5.0
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class MealPlan(BaseModel):
    """Meal planned for a specific date"""
    id: int
    household_id: int
    date: date
    recipe_id: int
    serving_multiplier: float = 1.0
    cooked: bool = False

    @classmethod
    def from_supabase(cls, meal_data: dict):
        """Convert Supabase data to model"""
        return cls(
            id=meal_data['id'],
            household_id=meal_data['household_id'],
            date=meal_data['date'] if isinstance(meal_data['date'], date) else date.fromisoformat(meal_data['date']),
            recipe_id=meal_data['recipe_id'],
            serving_multiplier=meal_data.get('serving_multiplier', 1.0),
            cooked=meal_data.get('cooked', False)
        )


class MealPlanCreate(BaseModel):
    """Create new meal plan"""
    date: date
    recipe_id: int
    serving_multiplier: float = Field(default=1.0, gt=0, le=10)

    class Config:
        json_schema_extra = {
            "example": {
                "date": "2024-12-25",
                "recipe_id": 1,
                "serving_multiplier": 1.5
            }
        }


class MealPlanUpdate(BaseModel):
    """Update existing meal plan"""
    date: Optional[date] = None
    recipe_id: Optional[int] = None
    serving_multiplier: Optional[float] = Field(None, gt=0, le=10)
    cooked: Optional[bool] = None
