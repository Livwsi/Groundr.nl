# ─────────────────────────────────────────────────────────────
# backend/api/dependencies.py
#
# PURPOSE:
#   Shared dependencies used across all API routes.
#   FastAPI's "Depends()" system injects these automatically.
#
# WHAT IS Depends()?
#   Instead of writing the same code in every route,
#   you declare it once here and FastAPI injects it.
#
#   Example without Depends (repetitive):
#       async def my_route():
#           db = get_db()           ← repeated everywhere
#           user = check_token()    ← repeated everywhere
#
#   Example with Depends (clean):
#       async def my_route(
#           db:   AsyncSession = Depends(get_db),
#           user: User         = Depends(get_current_user),
#       ):
#
# TWO DEPENDENCIES:
#   get_db           → opens a database session for this request
#   get_current_user → reads JWT token, returns logged-in user
# ─────────────────────────────────────────────────────────────

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import settings
from db.connection import get_db
from db.models import User

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# DATABASE DEPENDENCY
#
# Opens a database session for the duration of one request.
# Automatically commits on success, rolls back on error.
# Already defined in db/connection.py — we just re-export it.
# ─────────────────────────────────────────────────────────────

# This is imported directly from db/connection.py
# Usage in routes:
#   async def my_route(db: AsyncSession = Depends(get_db)):
#       result = await db.execute(...)


# ─────────────────────────────────────────────────────────────
# JWT TOKEN SETTINGS
#
# JWT = JSON Web Token.
# When a user logs in, we give them a signed token.
# They send this token with every request.
# We verify the signature to confirm it's valid.
#
# ALGORITHM: HS256 = HMAC with SHA-256
# This is symmetric — same key to sign and verify.
# For production, upgrade to RS256 (asymmetric keys).
# ─────────────────────────────────────────────────────────────

ALGORITHM     = "HS256"

# HTTPBearer reads the token from the Authorization header:
# Authorization: Bearer eyJhbGc...
bearer_scheme = HTTPBearer(auto_error=False)


# ─────────────────────────────────────────────────────────────
# DEPENDENCY: GET CURRENT USER
#
# Reads the JWT token from the request header.
# Decodes it to get the user ID.
# Loads and returns that user from the database.
#
# If the token is missing or invalid → returns None
# (routes can decide if they want to require auth or not)
# ─────────────────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db:          AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Read and verify the JWT token from the Authorization header.
    Returns the logged-in User object, or None if not logged in.

    Usage in a route:
        async def my_route(user = Depends(get_current_user)):
            if not user:
                raise HTTPException(401, "Not logged in")
    """

    if not credentials:
        return None

    token = credentials.credentials

    try:
        # ── Decode and verify the JWT token ───────────────
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        # The user ID is stored in the "sub" field of the token
        user_id: str = payload.get("sub")
        if not user_id:
            return None

    except JWTError:
        # Token is invalid or expired
        return None

    # ── Load the user from the database ───────────────────
    result = await db.execute(
        select(User).where(User.id == int(user_id))
    )
    user = result.scalar_one_or_none()

    return user


# ─────────────────────────────────────────────────────────────
# DEPENDENCY: REQUIRE LOGGED IN USER
#
# Same as get_current_user but raises an error if not logged in.
# Use this on routes that MUST have authentication.
#
# Usage:
#   async def protected_route(
#       user: User = Depends(require_user)
#   ):
# ─────────────────────────────────────────────────────────────

async def require_user(
    user: Optional[User] = Depends(get_current_user),
) -> User:
    """
    Require a logged-in user.
    Raises 401 Unauthorized if no valid token is provided.
    """
    if not user:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail      = "Not authenticated. Please log in.",
            headers     = {"WWW-Authenticate": "Bearer"},
        )
    return user