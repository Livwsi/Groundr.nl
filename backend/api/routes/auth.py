# ─────────────────────────────────────────────────────────────
# backend/api/routes/auth.py
#
# ENDPOINTS:
#   POST /api/auth/register      → create a new account
#   POST /api/auth/login         → get a JWT token
#   GET  /api/auth/me            → get your own profile
#   POST /api/auth/invite        → makelaar invites a buyer
#   GET  /api/auth/invite/{token}→ validate invite token (for join page)
#   POST /api/auth/join          → buyer activates account via invite link
# ─────────────────────────────────────────────────────────────

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
from config.settings import settings  # noqa: F401 — used in invite endpoint
from db.connection import get_db
from db.models import User

logger = logging.getLogger(__name__)
router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
INVITE_EXPIRE_DAYS          = 7


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


# ─────────────────────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "An account with this email already exists.")

    hashed_pw = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    new_user  = User(email=body.email, hashed_password=hashed_pw,
                     full_name=body.full_name, subscription="free", is_active=True)
    db.add(new_user)
    await db.flush()

    logger.info(f"[AUTH] Registered: {body.email}")
    return TokenResponse(access_token=_create_token(new_user.id),
                         user_id=new_user.id, email=new_user.email, full_name=new_user.full_name)


# ─────────────────────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user   = result.scalar_one_or_none()

    password_ok = user and bcrypt.checkpw(body.password.encode(), user.hashed_password.encode())
    if not password_ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated.")

    logger.info(f"[AUTH] Login: {body.email}")
    return TokenResponse(access_token=_create_token(user.id),
                         user_id=user.id, email=user.email, full_name=user.full_name)


# ─────────────────────────────────────────────────────────────
# ME
# ─────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(require_user)):
    return UserResponse(id=user.id, email=user.email, full_name=user.full_name,
                        subscription=user.subscription, created_at=user.created_at)


# ─────────────────────────────────────────────────────────────
# INVITE — makelaar creates an invite link for a buyer
# ─────────────────────────────────────────────────────────────

@router.post("/invite", response_model=InviteResponse)
async def invite_client(
    body: InviteRequest,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(require_user),
):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A user with this email already exists.")

    # Invalidate previous unused invites for this email from this makelaar
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

    invite_url = f"{settings.FRONTEND_URL}/dossier/join?token={token}"
    logger.info(f"[AUTH] Invite created by makelaar {user.id} for {body.email}")

    # Send invite email
    from services.email_service import email as email_service
    await email_service.send_invite(
        to=body.email,
        makelaar_name=user.full_name or user.email,
        invite_url=invite_url,
    )

    return InviteResponse(invite_url=invite_url, email=body.email, expires_at=expires_at)


# ─────────────────────────────────────────────────────────────
# VALIDATE INVITE TOKEN — called by the join page on load
# ─────────────────────────────────────────────────────────────

@router.get("/invite/{token}")
async def validate_invite(token: str, db: AsyncSession = Depends(get_db)):
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


# ─────────────────────────────────────────────────────────────
# JOIN — buyer sets password and activates their account
# ─────────────────────────────────────────────────────────────

@router.post("/join", response_model=TokenResponse)
async def join(body: JoinRequest, db: AsyncSession = Depends(get_db)):
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
    new_user  = User(email=invite["email"], hashed_password=hashed_pw,
                     full_name=body.full_name, subscription="free", is_active=True)
    db.add(new_user)
    await db.flush()

    await db.execute(text("UPDATE invites SET used = TRUE WHERE token = :token"), {"token": body.token})

    logger.info(f"[AUTH] Buyer joined via invite: {invite['email']}")
    return TokenResponse(access_token=_create_token(new_user.id),
                         user_id=new_user.id, email=new_user.email, full_name=new_user.full_name)


# ─────────────────────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────────────────────

def _create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire}, settings.SECRET_KEY, algorithm=ALGORITHM)