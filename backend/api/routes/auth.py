"""
@file        backend/api/routes/auth.py
@description Authentication and authorisation endpoints for the Groundr platform.
             Handles registration, login, JWT generation, invite flow, and the
             new role-based access control (RBAC) system.

             All login and /me responses now include a `roles` array so the
             frontend can gate modules and routes by role without a second request.

             Role system:
               - admin     — full platform access
               - agent     — makelaar dashboard
               - appraiser — taxatie module
               - notary    — documents + signing
               - buyer     — client portal
               - seller    — submission tracking

             Multi-role: one user can hold multiple roles simultaneously.
             The login response returns all assigned roles. If a user has
             more than one role, the frontend shows a role-selector screen.

@layer       API → Routes → Auth
@depends     db/models.py, db/connection.py, api/dependencies.py,
             config/settings.py, services/email_service.py
@used-by     frontend/lib/services/AuthService.ts, all protected routes
@author      Groundr Engineering
@updated     2026-05-28
"""

import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import ALGORITHM, require_user
from config.settings import settings
from db.connection import get_db
from db.models import User

logger = logging.getLogger(__name__)
router = APIRouter()

# Token expiry constants
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
INVITE_EXPIRE_DAYS          = 7


# ── Request / Response models ─────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email:     EmailStr
    password:  str
    full_name: Optional[str] = None

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class TokenResponse(BaseModel):
    """
    Returned on login, register, and join.
    `roles` drives frontend routing and module visibility.
    `active_role` is the role the user is currently acting as
    (set by the frontend after the role-selector screen).
    """
    access_token: str
    token_type:   str = "bearer"
    user_id:      int
    email:        str
    full_name:    Optional[str]
    roles:        list[str]   # e.g. ["agent", "appraiser"]

class UserResponse(BaseModel):
    id:           int
    email:        str
    full_name:    Optional[str]
    subscription: str
    roles:        list[str]
    created_at:   datetime

class InviteRequest(BaseModel):
    email: EmailStr

class InviteResponse(BaseModel):
    invite_url: str
    email:      str
    expires_at: datetime

class JoinRequest(BaseModel):
    token:     str
    password:  str
    full_name: Optional[str] = None


# ── Role helper ───────────────────────────────────────────────────────────────

async def _get_user_roles(user_id: int, db: AsyncSession) -> list[str]:
    """
    Fetches all role names for a given user_id from the user_roles
    junction table. Returns an empty list if the user has no roles.
    """
    result = await db.execute(text("""
        SELECT r.name
        FROM roles r
        JOIN user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id = :uid
        ORDER BY r.name
    """), {"uid": user_id})
    return [row.name for row in result.fetchall()]


# ── Token helper ──────────────────────────────────────────────────────────────

def _create_token(user_id: int, roles: list[str]) -> str:
    """
    Creates a signed JWT containing user_id and roles.
    Roles are embedded in the token so middleware can gate routes
    without a DB lookup on every request.
    """
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "roles": roles, "exp": expire},
        settings.SECRET_KEY,
        algorithm=ALGORITHM
    )


# ── REGISTER ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Creates a new user account with the default 'buyer' role.
    Returns a JWT token immediately — no email verification required for MVP.
    """
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "An account with this email already exists.")

    hashed_pw = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    new_user  = User(
        email           = body.email,
        hashed_password = hashed_pw,
        full_name       = body.full_name,
        subscription    = "free",
        is_active       = True,
    )
    db.add(new_user)
    await db.flush()

    # Assign default 'buyer' role to all self-registered users
    await db.execute(text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT :uid, r.id FROM roles r WHERE r.name = 'buyer'
        ON CONFLICT DO NOTHING
    """), {"uid": new_user.id})

    roles = await _get_user_roles(new_user.id, db)
    logger.info(f"[AUTH] Registered: {body.email} roles={roles}")

    return TokenResponse(
        access_token = _create_token(new_user.id, roles),
        user_id      = new_user.id,
        email        = new_user.email,
        full_name    = new_user.full_name,
        roles        = roles,
    )


# ── LOGIN ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticates a user and returns a JWT with their roles embedded.
    The frontend uses the roles array to:
      1. Show the role-selector screen if len(roles) > 1
      2. Redirect directly to the correct dashboard if len(roles) == 1
      3. Block access if roles is empty
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user   = result.scalar_one_or_none()

    password_ok = user and bcrypt.checkpw(body.password.encode(), user.hashed_password.encode())
    if not password_ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated.")

    roles = await _get_user_roles(user.id, db)
    logger.info(f"[AUTH] Login: {body.email} roles={roles}")

    return TokenResponse(
        access_token = _create_token(user.id, roles),
        user_id      = user.id,
        email        = user.email,
        full_name    = user.full_name,
        roles        = roles,
    )


# ── ME ────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """
    Returns the current user's profile including their roles.
    Called by the frontend on mount to verify token validity and
    hydrate the auth store.
    """
    roles = await _get_user_roles(user.id, db)
    return UserResponse(
        id           = user.id,
        email        = user.email,
        full_name    = user.full_name,
        subscription = user.subscription,
        roles        = roles,
        created_at   = user.created_at,
    )


# ── INVITE — agent invites a buyer ────────────────────────────────────────────

@router.post("/invite", response_model=InviteResponse)
async def invite_client(
    body: InviteRequest,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(require_user),
):
    """
    Agent creates a time-limited invite link for a buyer.
    The invited user will get the 'buyer' role on activation.
    Invalidates previous unused invites for the same email.
    """
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A user with this email already exists.")

    # Invalidate previous unused invites for this email from this agent
    await db.execute(text("""
        UPDATE invites SET used = TRUE
        WHERE email = :email AND makelaar_id = :mid AND used = FALSE
    """), {"email": body.email, "mid": user.id})

    token      = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=INVITE_EXPIRE_DAYS)

    await db.execute(text("""
        INSERT INTO invites (token, makelaar_id, email, expires_at)
        VALUES (:token, :mid, :email, :expires_at)
    """), {"token": token, "mid": user.id, "email": body.email, "expires_at": expires_at})

    invite_url = f"{settings.FRONTEND_URL}/client-portal/join?token={token}"
    logger.info(f"[AUTH] Invite created by agent {user.id} for {body.email}")

    from services.email_service import email as email_service
    await email_service.send_invite(
        to            = body.email,
        makelaar_name = user.full_name or user.email,
        invite_url    = invite_url,
    )

    return InviteResponse(invite_url=invite_url, email=body.email, expires_at=expires_at)


# ── VALIDATE INVITE TOKEN ─────────────────────────────────────────────────────

@router.get("/invite/{token}")
async def validate_invite(token: str, db: AsyncSession = Depends(get_db)):
    """
    Called by the join page on load to verify the invite token is
    valid, unused, and not expired before showing the signup form.
    """
    result = await db.execute(
        text("SELECT email, used, expires_at FROM invites WHERE token = :token"),
        {"token": token}
    )
    invite = result.mappings().one_or_none()

    if not invite:
        raise HTTPException(404, "Invalid invite link.")
    if invite["used"]:
        raise HTTPException(400, "This invite link has already been used.")
    if datetime.utcnow() > invite["expires_at"]:
        raise HTTPException(400, "This invite link has expired.")

    return {"email": invite["email"], "valid": True}


# ── JOIN — buyer activates account via invite ─────────────────────────────────

@router.post("/join", response_model=TokenResponse)
async def join(body: JoinRequest, db: AsyncSession = Depends(get_db)):
    """
    Buyer sets their password and activates their account using the
    invite token. Assigns the 'buyer' role automatically.
    Marks the invite token as used to prevent replay.
    """
    result = await db.execute(
        text("SELECT id, email, makelaar_id, used, expires_at FROM invites WHERE token = :token"),
        {"token": body.token}
    )
    invite = result.mappings().one_or_none()

    if not invite:
        raise HTTPException(404, "Invalid invite link.")
    if invite["used"]:
        raise HTTPException(400, "This invite link has already been used.")
    if datetime.utcnow() > invite["expires_at"]:
        raise HTTPException(400, "This invite link has expired.")

    existing = await db.execute(select(User).where(User.email == invite["email"]))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "An account with this email already exists.")

    hashed_pw = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    new_user  = User(
        email           = invite["email"],
        hashed_password = hashed_pw,
        full_name       = body.full_name,
        subscription    = "free",
        is_active       = True,
    )
    db.add(new_user)
    await db.flush()

    # Assign buyer role
    await db.execute(text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT :uid, r.id FROM roles r WHERE r.name = 'buyer'
        ON CONFLICT DO NOTHING
    """), {"uid": new_user.id})

    # Mark invite as used
    await db.execute(
        text("UPDATE invites SET used = TRUE WHERE token = :token"),
        {"token": body.token}
    )

    roles = await _get_user_roles(new_user.id, db)
    logger.info(f"[AUTH] Buyer joined via invite: {invite['email']} roles={roles}")

    return TokenResponse(
        access_token = _create_token(new_user.id, roles),
        user_id      = new_user.id,
        email        = new_user.email,
        full_name    = new_user.full_name,
        roles        = roles,
    )