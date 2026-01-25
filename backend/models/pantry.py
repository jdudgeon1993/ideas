"""
Pantry Models - Python Age 5.0
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class PantryLocation(BaseModel):
    """Where an item is stored and how much"""
    id: Optional[str] = None
    location: str  # "Pantry", "Fridge", "Freezer"
    quantity: float
    expiration_date: Optional[date] = None


class PantryItem(BaseModel):
    """Complete pantry item with all locations"""
    id: str
    household_id: str
    name: str
    category: str
    unit: str
    min_threshold: float = 0
    locations: List[PantryLocation] = []

    @property
    def total_quantity(self) -> float:
        """Sum quantities across all locations"""
        return sum(loc.quantity for loc in self.locations)

    @property
    def expires_soon(self) -> bool:
        """Check if any location expires in next 3 days"""
        from datetime import timedelta
        cutoff = date.today() + timedelta(days=3)
        return any(
            loc.expiration_date and loc.expiration_date <= cutoff
            for loc in self.locations
        )

    @classmethod
    def from_supabase(cls, item_data: dict, locations_data: List[dict]):
        """Convert Supabase data to model"""
        # Build locations list, handling field name variations
        locations = []
        for loc in locations_data:
            if loc.get('pantry_item_id') == item_data['id']:
                # Handle both 'location' and 'storage_location' field names
                location_value = loc.get('location') or loc.get('storage_location') or loc.get('storage') or 'Unknown'

                locations.append(PantryLocation(**{
                    'id': loc.get('id'),
                    'location': location_value,
                    'quantity': loc.get('quantity', 0),
                    'expiration_date': loc.get('expiration_date')
                }))

        return cls(
            id=item_data['id'],
            household_id=item_data['household_id'],
            name=item_data['name'],
            category=item_data['category'],
            unit=item_data['unit'],
            min_threshold=item_data.get('min_threshold', 0),
            locations=locations
        )


class PantryItemCreate(BaseModel):
    """Create new pantry item"""
    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=50)
    unit: str = Field(..., min_length=1, max_length=20)
    min_threshold: float = Field(default=0, ge=0)
    locations: List[dict] = Field(..., min_items=1)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Eggs",
                "category": "Dairy",
                "unit": "dozen",
                "min_threshold": 1,
                "locations": [
                    {"location": "Fridge", "quantity": 2, "expiration_date": "2024-12-31"}
                ]
            }
        }


class PantryItemUpdate(BaseModel):
    """Update existing pantry item"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    min_threshold: Optional[float] = Field(None, ge=0)
    locations: Optional[List[dict]] = None
