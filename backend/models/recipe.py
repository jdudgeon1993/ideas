"""
Recipe Models - Python Age 5.0
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class RecipeIngredient(BaseModel):
    """Single ingredient in a recipe"""
    id: Optional[str] = None
    name: str
    quantity: float
    unit: str


class Recipe(BaseModel):
    """Complete recipe with ingredients"""
    id: str
    household_id: str
    name: str
    tags: List[str] = []
    photo_url: Optional[str] = None
    instructions: Optional[str] = None
    ingredients: List[RecipeIngredient] = []

    @classmethod
    def from_supabase(cls, recipe_data: dict):
        """Convert Supabase data to model"""
        # Ingredients are stored as JSONB in the recipes table
        ingredients_data = recipe_data.get('ingredients', [])

        # Parse ingredients from JSONB
        ingredients = []
        if isinstance(ingredients_data, list):
            for ing in ingredients_data:
                if isinstance(ing, dict):
                    ingredients.append(RecipeIngredient(**{
                        'id': None,  # No separate ID for JSONB ingredients
                        'name': ing.get('name', ''),
                        'quantity': float(ing.get('quantity', ing.get('qty', 0))),
                        'unit': ing.get('unit', '')
                    }))

        return cls(
            id=recipe_data['id'],
            household_id=recipe_data['household_id'],
            name=recipe_data['name'],
            tags=recipe_data.get('tags', []),
            photo_url=recipe_data.get('photo', recipe_data.get('photo_url', recipe_data.get('image_url'))),
            instructions=recipe_data.get('instructions'),
            ingredients=ingredients
        )


class RecipeCreate(BaseModel):
    """Create new recipe"""
    name: str = Field(..., min_length=1, max_length=200)
    tags: List[str] = Field(default=[])
    instructions: Optional[str] = None
    ingredients: List[dict] = Field(..., min_items=1)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Pasta Carbonara",
                "tags": ["Italian", "Quick", "Dinner"],
                "instructions": "1. Boil pasta\n2. Cook bacon\n3. Mix with eggs and cheese",
                "ingredients": [
                    {"name": "Pasta", "quantity": 1, "unit": "lb"},
                    {"name": "Bacon", "quantity": 6, "unit": "strips"},
                    {"name": "Eggs", "quantity": 3, "unit": "whole"},
                    {"name": "Parmesan", "quantity": 1, "unit": "cup"}
                ]
            }
        }


class RecipeUpdate(BaseModel):
    """Update existing recipe"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    tags: Optional[List[str]] = None
    instructions: Optional[str] = None
    ingredients: Optional[List[dict]] = None
