"""
Authentication Middleware - Python Age 5.0

Validates Supabase JWT tokens and extracts user/household info.
"""

from fastapi import Depends, HTTPException, status
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
    Validate JWT token and return user info.

    Raises:
        HTTPException: If token is invalid or expired

    Returns:
        dict: User info from token payload
    """
    token = credentials.credentials

    try:
        # Decode token (Supabase uses HS256)
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase tokens don't use aud
        )

        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token: missing user ID"
            )

        return {
            "id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role")
        }

    except JWTError as e:
        # Log the error for debugging (but don't expose full token)
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"JWT validation failed: {str(e)}")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}"
        )


async def get_current_household(
    user: dict = Depends(get_current_user)
) -> int:
    """
    Get the household ID for the current user.

    Raises:
        HTTPException: If user has no household

    Returns:
        int: Household ID
    """
    supabase = get_supabase()

    # Get household membership
    response = supabase.table('household_members')\
        .select('household_id')\
        .eq('user_id', user['id'])\
        .execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not part of any household"
        )

    return response.data[0]['household_id']


async def get_optional_household(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[int]:
    """
    Get household ID if authenticated, None otherwise.
    Use for optional authentication.
    """
    if not credentials:
        return None

    try:
        user = await get_current_user(credentials)
        return await get_current_household(user)
    except HTTPException:
        return None
