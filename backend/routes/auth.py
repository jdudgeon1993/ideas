"""
Authentication Routes - Python Age 5.0

Proxy to Supabase auth (keeping what works!)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from utils.supabase_client import get_supabase

router = APIRouter(prefix="/api/auth", tags=["authentication"])


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup")
async def signup(request: SignUpRequest):
    """
    Create new user account and household.
    """
    supabase = get_supabase()

    try:
        # Create user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )

        user = auth_response.user

        # Create household for user
        household_response = supabase.table('households').insert({
            'name': f"{request.email.split('@')[0]}'s Household",
            'owner_id': user.id
        }).execute()

        household_id = household_response.data[0]['id']

        # Add user to household
        supabase.table('household_members').insert({
            'household_id': household_id,
            'user_id': user.id,
            'role': 'owner'
        }).execute()

        return {
            "user": {
                "id": user.id,
                "email": user.email
            },
            "household_id": household_id,
            "session": auth_response.session.model_dump() if auth_response.session else None
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/signin")
async def signin(request: SignInRequest):
    """
    Sign in existing user.
    """
    supabase = get_supabase()

    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        user = auth_response.user

        # Get user's household
        household_response = supabase.table('household_members')\
            .select('household_id')\
            .eq('user_id', user.id)\
            .execute()

        household_id = household_response.data[0]['household_id'] if household_response.data else None

        return {
            "user": {
                "id": user.id,
                "email": user.email
            },
            "household_id": household_id,
            "session": auth_response.session.model_dump() if auth_response.session else None
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )


@router.post("/signout")
async def signout():
    """
    Sign out current user.
    """
    supabase = get_supabase()

    try:
        supabase.auth.sign_out()
        return {"message": "Signed out successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/me")
async def get_current_user_info():
    """
    Get current user information.
    """
    supabase = get_supabase()

    try:
        user = supabase.auth.get_user()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )

        # Get household
        household_response = supabase.table('household_members')\
            .select('household_id')\
            .eq('user_id', user.id)\
            .execute()

        household_id = household_response.data[0]['household_id'] if household_response.data else None

        return {
            "user": {
                "id": user.id,
                "email": user.email
            },
            "household_id": household_id
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
