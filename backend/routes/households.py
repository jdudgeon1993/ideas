"""
Household Management Routes - Invite, Members, Switching

Supports multi-household membership:
- Every user owns their own household (created at signup)
- Users can join additional households via invite codes
- Active household is selected per-request via X-Household-Id header
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
import secrets
from datetime import datetime, timedelta, timezone

from utils.supabase_client import get_supabase
from utils.auth import get_current_user

router = APIRouter(prefix="/api/households", tags=["households"])


class InviteRequest(BaseModel):
    expires_hours: int = 48


class AcceptInviteRequest(BaseModel):
    code: str


class SwitchHouseholdRequest(BaseModel):
    household_id: str


# ===== HOUSEHOLD LIST =====

@router.get("/")
async def list_my_households(user: dict = Depends(get_current_user)):
    """List all households the current user belongs to."""
    supabase = get_supabase()

    memberships = supabase.table('household_members')\
        .select('household_id, role')\
        .eq('user_id', user['id'])\
        .execute()

    if not memberships.data:
        return {"households": []}

    household_ids = [m['household_id'] for m in memberships.data]

    households = supabase.table('households')\
        .select('id, name, created_at')\
        .in_('id', household_ids)\
        .execute()

    # Merge role info
    role_map = {m['household_id']: m['role'] for m in memberships.data}
    result = []
    for h in households.data:
        result.append({
            "id": h['id'],
            "name": h['name'],
            "created_at": h['created_at'],
            "role": role_map.get(h['id'], 'member')
        })

    return {"households": result}


# ===== MEMBERS =====

@router.get("/members")
async def list_members(
    user: dict = Depends(get_current_user),
    household_id: Optional[str] = None
):
    """List all members of a household."""
    supabase = get_supabase()

    # Resolve household
    hid = household_id or _get_user_household(supabase, user['id'])
    if not hid:
        raise HTTPException(status_code=404, detail="No household found")

    # Verify caller is a member
    _verify_membership(supabase, user['id'], hid)

    members = supabase.table('household_members')\
        .select('user_id, role, created_at')\
        .eq('household_id', hid)\
        .execute()

    # Get emails from auth - we query supabase auth admin API if available,
    # otherwise return user_ids. For now, return what we have.
    # Supabase client-side can't query auth.users directly, so we return IDs and roles.
    result = []
    for m in members.data:
        member_info = {
            "user_id": m['user_id'],
            "role": m['role'],
            "joined_at": m['created_at'],
            "is_you": m['user_id'] == user['id']
        }
        result.append(member_info)

    return {
        "household_id": hid,
        "members": result,
        "count": len(result)
    }


# ===== INVITE =====

@router.post("/invite")
async def create_invite(
    request: InviteRequest,
    user: dict = Depends(get_current_user),
    household_id: Optional[str] = None
):
    """Generate an invite code for the current household."""
    supabase = get_supabase()

    hid = household_id or _get_user_household(supabase, user['id'])
    if not hid:
        raise HTTPException(status_code=404, detail="No household found")

    _verify_membership(supabase, user['id'], hid)

    # Generate a short, readable code (8 chars uppercase alphanumeric)
    code = secrets.token_hex(4).upper()

    expires_at = datetime.now(timezone.utc) + timedelta(hours=request.expires_hours)

    invite = supabase.table('household_invites').insert({
        'household_id': hid,
        'code': code,
        'expires_at': expires_at.isoformat(),
        'created_by': user['id'],
        'role': 'member'
    }).execute()

    return {
        "code": code,
        "expires_at": expires_at.isoformat(),
        "expires_hours": request.expires_hours
    }


@router.get("/invite")
async def get_active_invite(user: dict = Depends(get_current_user)):
    """Get the active (unused, unexpired) invite for the user's household."""
    supabase = get_supabase()

    hid = _get_user_household(supabase, user['id'])
    if not hid:
        raise HTTPException(status_code=404, detail="No household found")

    now = datetime.now(timezone.utc).isoformat()

    invites = supabase.table('household_invites')\
        .select('code, expires_at, created_at')\
        .eq('household_id', hid)\
        .is_('used_by', 'null')\
        .gte('expires_at', now)\
        .order('created_at', desc=True)\
        .limit(1)\
        .execute()

    if not invites.data:
        return {"invite": None}

    return {"invite": invites.data[0]}


@router.post("/invite/accept")
async def accept_invite(
    request: AcceptInviteRequest,
    user: dict = Depends(get_current_user)
):
    """Accept an invite code and join the household."""
    supabase = get_supabase()
    code = request.code.strip().upper()

    now = datetime.now(timezone.utc).isoformat()

    # Find valid invite
    invite = supabase.table('household_invites')\
        .select('id, household_id, role')\
        .eq('code', code)\
        .is_('used_by', 'null')\
        .gte('expires_at', now)\
        .execute()

    if not invite.data:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired invite code"
        )

    invite_data = invite.data[0]
    target_household = invite_data['household_id']
    role = invite_data['role'] or 'member'

    # Check if already a member
    existing = supabase.table('household_members')\
        .select('id')\
        .eq('household_id', target_household)\
        .eq('user_id', user['id'])\
        .execute()

    if existing.data:
        raise HTTPException(
            status_code=400,
            detail="You are already a member of this household"
        )

    # Add user to household
    supabase.table('household_members').insert({
        'household_id': target_household,
        'user_id': user['id'],
        'role': role
    }).execute()

    # Mark invite as used
    supabase.table('household_invites')\
        .update({
            'used_by': user['id'],
            'used_at': datetime.now(timezone.utc).isoformat()
        })\
        .eq('id', invite_data['id'])\
        .execute()

    # Get household name
    household = supabase.table('households')\
        .select('name')\
        .eq('id', target_household)\
        .single()\
        .execute()

    return {
        "message": f"Joined '{household.data['name']}' successfully",
        "household_id": target_household,
        "household_name": household.data['name'],
        "role": role
    }


# ===== LEAVE =====

@router.post("/leave")
async def leave_household(
    request: SwitchHouseholdRequest,
    user: dict = Depends(get_current_user)
):
    """Leave a household. Owners cannot leave their own household."""
    supabase = get_supabase()

    # Check membership and role
    membership = supabase.table('household_members')\
        .select('id, role')\
        .eq('household_id', request.household_id)\
        .eq('user_id', user['id'])\
        .execute()

    if not membership.data:
        raise HTTPException(status_code=404, detail="Not a member of this household")

    if membership.data[0]['role'] == 'owner':
        raise HTTPException(
            status_code=400,
            detail="Owners cannot leave their own household. Transfer ownership first."
        )

    # Remove membership
    supabase.table('household_members')\
        .delete()\
        .eq('household_id', request.household_id)\
        .eq('user_id', user['id'])\
        .execute()

    return {"message": "Left household successfully"}


# ===== HELPERS =====

def _get_user_household(supabase, user_id: str) -> Optional[str]:
    """Get the first household for a user."""
    response = supabase.table('household_members')\
        .select('household_id')\
        .eq('user_id', user_id)\
        .limit(1)\
        .execute()
    return response.data[0]['household_id'] if response.data else None


def _verify_membership(supabase, user_id: str, household_id: str):
    """Verify a user is a member of a household."""
    check = supabase.table('household_members')\
        .select('id')\
        .eq('user_id', user_id)\
        .eq('household_id', household_id)\
        .execute()
    if not check.data:
        raise HTTPException(status_code=403, detail="Not a member of this household")
