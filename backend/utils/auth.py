"""
Authentication Middleware - Python Age 5.0

Validates Supabase JWT tokens and extracts user/household info.
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from typing import Optional
import os
from dotenv import load_dotenv

from .supabase_client import get_supabase

load_dotenv()

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", os.getenv("JWT_SECRET_KEY"))
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Validate JWT token using Supabase API and return user info.

    Raises:
        HTTPException: If token is invalid or expired

    Returns:
        dict: User info from Supabase
    """
    token = credentials.credentials
    supabase = get_supabase()

    try:
        # Use Supabase API to validate token (works with any algorithm)
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

        user = user_response.user

        return {
            "id": user.id,
            "email": user.email,
            "role": user.role if hasattr(user, 'role') else None
        }

    except Exception as e:
        # Log the error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Token validation failed: {str(e)}")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )


async def get_current_household(
    request: Request,
    user: dict = Depends(get_current_user)
) -> str:
    """
    Get the household ID for the current user.

    Supports multi-household via X-Household-Id header.
    If header is provided and user is a member, use that household.
    Otherwise fall back to the user's first household.

    Raises:
        HTTPException: If user has no household

    Returns:
        str: Household ID (UUID)
    """
    supabase = get_supabase()

    # Check for explicit household selection via header
    requested_hid = request.headers.get('X-Household-Id')

    # Get all household memberships
    response = supabase.table('household_members')\
        .select('household_id')\
        .eq('user_id', user['id'])\
        .execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not part of any household"
        )

    member_hids = [m['household_id'] for m in response.data]

    # If a specific household was requested, verify membership
    if requested_hid and requested_hid in member_hids:
        return requested_hid

    # Default to first household
    return member_hids[0]


async def get_optional_household(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[str]:
    """
    Get household ID if authenticated, None otherwise.
    Use for optional authentication.

    Returns:
        Optional[str]: Household ID (UUID) if authenticated, None otherwise
    """
    if not credentials:
        return None

    try:
        user = await get_current_user(credentials)
        return await get_current_household(request, user)
    except HTTPException:
        return None
