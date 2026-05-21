# ─────────────────────────────────────────────────────────────
# backend/api/routes/auth.py
#
# PURPOSE:
#   Handles user registration and login.
#   Returns JWT tokens that protect other routes.
#
# ENDPOINTS:
#   POST /api/auth/register  → create a new account
#   POST /api/auth/login     → get a JWT token
#   GET  /api/auth/me        → get your own profile
# ─────────────────────────────────────────────────────────────

import logging
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import ALGORITHM, require_user
from config.settings import settings
from db.connection import get_db
from db.models import User

logger = logging.getLogger(__name__)
router = APIRouter()

# How long tokens last before expiring
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24   # 24 hours


# ─────────────────────────────────────────────────────────────
# REQUEST / RESPONSE MODELS
# ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email:     EmailStr
    password:  str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      int
    email:        str
    full_name:    Optional[str]


class UserResponse(BaseModel):
    id:           int
    email:        str
    full_name:    Optional[str]
    subscription: str
    created_at:   datetime


# ─────────────────────────────────────────────────────────────
# ENDPOINT: REGISTER
# ─────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
async def register(
    body: RegisterRequest,
    db:   AsyncSession = Depends(get_db),
):
    """
    Create a new Groundr account.
    Returns a JWT token so the user is immediately logged in.
    """

    # ── Check if email already exists ─────────────────────
    existing = await db.execute(
        select(User).where(User.email == body.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = "An account with this email already exists.",
        )

    # ── Hash the password ─────────────────────────────────
    # bcrypt.hashpw needs bytes, returns bytes
    # We decode to string for storage in the database
    hashed_pw = bcrypt.hashpw(
        body.password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    # ── Create the user ───────────────────────────────────
    new_user = User(
        email           = body.email,
        hashed_password = hashed_pw,
        full_name       = body.full_name,
        subscription    = "free",
        is_active       = True,
    )
    db.add(new_user)
    await db.flush()

    # ── Create and return a JWT token ─────────────────────
    token = _create_token(user_id=new_user.id)
    logger.info(f"[AUTH] New user registered: {body.email}")

    return TokenResponse(
        access_token = token,
        user_id      = new_user.id,
        email        = new_user.email,
        full_name    = new_user.full_name,
    )


# ─────────────────────────────────────────────────────────────
# ENDPOINT: LOGIN
# ─────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    db:   AsyncSession = Depends(get_db),
):
    """
    Log in with email and password.
    Returns a JWT token valid for 24 hours.
    """

    # ── Find the user by email ────────────────────────────
    result = await db.execute(
        select(User).where(User.email == body.email)
    )
    user = result.scalar_one_or_none()

    # ── Verify password ───────────────────────────────────
    # Same error for wrong email and wrong password
    # So attackers cannot tell which one is wrong
    password_ok = user and bcrypt.checkpw(
        body.password.encode("utf-8"),
        user.hashed_password.encode("utf-8"),
    )
    if not password_ok:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail      = "Incorrect email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code = status.HTTP_403_FORBIDDEN,
            detail      = "This account has been deactivated.",
        )

    # ── Create and return a JWT token ─────────────────────
    token = _create_token(user_id=user.id)
    logger.info(f"[AUTH] User logged in: {body.email}")

    return TokenResponse(
        access_token = token,
        user_id      = user.id,
        email        = user.email,
        full_name    = user.full_name,
    )


# ─────────────────────────────────────────────────────────────
# ENDPOINT: GET MY PROFILE
# ─────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User = Depends(require_user),
):
    """
    Returns the profile of the currently logged-in user.
    Requires a valid JWT token in the Authorization header.
    """
    return UserResponse(
        id           = user.id,
        email        = user.email,
        full_name    = user.full_name,
        subscription = user.subscription,
        created_at   = user.created_at,
    )


# ─────────────────────────────────────────────────────────────
# HELPER: CREATE JWT TOKEN
# ─────────────────────────────────────────────────────────────

def _create_token(user_id: int) -> str:
    """
    Create a signed JWT token containing the user's ID.
    Expires after ACCESS_TOKEN_EXPIRE_MINUTES.
    """
    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "exp": expire,
    }
    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )