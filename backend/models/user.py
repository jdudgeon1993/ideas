"""
User & Household Models - Python Age 5.0
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class User(BaseModel):
    """User account"""
    id: str  # Supabase user ID (UUID)
    email: EmailStr
    created_at: datetime

    @classmethod
    def from_supabase(cls, user_data: dict):
        """Convert Supabase auth user to model"""
        return cls(
            id=user_data['id'],
            email=user_data['email'],
            created_at=datetime.fromisoformat(user_data['created_at'].replace('Z', '+00:00'))
        )


class Household(BaseModel):
    """Household that users belong to"""
    id: int
    name: str
    owner_id: str  # User ID
    created_at: datetime

    @classmethod
    def from_supabase(cls, household_data: dict):
        """Convert Supabase data to model"""
        return cls(
            id=household_data['id'],
            name=household_data['name'],
            owner_id=household_data['owner_id'],
            created_at=datetime.fromisoformat(household_data['created_at'].replace('Z', '+00:00'))
        )
