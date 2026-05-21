# ─────────────────────────────────────────────────────────────
# backend/api/routes/meldingen.py
#
# ENDPOINTS:
#   POST /api/meldingen/              → report an issue
#   GET  /api/meldingen/              → makelaar sees all
#   GET  /api/meldingen/my            → reporter sees own
#   POST /api/meldingen/{id}/resolve  → makelaar resolves
#   POST /api/meldingen/{id}/close    → makelaar closes
# ─────────────────────────────────────────────────────────────

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import require_user
from db.connection import get_db
from db.models import User

logger = logging.getLogger(__name__)
router = APIRouter()

CATEGORIES = ['general', 'structural', 'electrical', 'plumbing', 'heating', 'other']
PRIORITIES  = ['low', 'normal', 'high', 'urgent']


class MeldingRequest(BaseModel):
    makelaar_id:   int
    property_id:   Optional[int] = None
    submission_id: Optional[int] = None
    title:         str
    description:   str
    category:      str = 'general'
    priority:      str = 'normal'


class ResolveRequest(BaseModel):
    note: Optional[str] = None


@router.post("/", status_code=201)
async def create_melding(
    body: MeldingRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        INSERT INTO meldingen
            (property_id, submission_id, reporter_id, makelaar_id,
             title, description, category, priority, status)
        VALUES
            (:pid, :sid, :rid, :mid, :title, :desc, :cat, :pri, 'open')
        RETURNING id
    """), {
        "pid":   body.property_id,
        "sid":   body.submission_id,
        "rid":   user.id,
        "mid":   body.makelaar_id,
        "title": body.title,
        "desc":  body.description,
        "cat":   body.category if body.category in CATEGORIES else 'general',
        "pri":   body.priority if body.priority in PRIORITIES else 'normal',
    })
    row = result.fetchone()
    logger.info(f"[MELDINGEN] User {user.id} created melding {row.id}")
    return {"message": "Melding ingediend.", "melding_id": row.id}


@router.get("/")
async def get_meldingen(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Makelaar sees all meldingen assigned to them."""
    result = await db.execute(text("""
        SELECT
            m.id, m.title, m.description, m.category,
            m.priority, m.status, m.resolution_note,
            m.created_at, m.updated_at,
            p.street, p.house_number, p.city,
            u.email as reporter_email, u.full_name as reporter_name
        FROM meldingen m
        LEFT JOIN properties p  ON m.property_id  = p.id
        LEFT JOIN users u       ON m.reporter_id  = u.id
        WHERE m.makelaar_id = :mid
        ORDER BY
            CASE m.priority
                WHEN 'urgent' THEN 1 WHEN 'high' THEN 2
                WHEN 'normal' THEN 3 WHEN 'low'  THEN 4
            END,
            m.created_at DESC
    """), {"mid": user.id})
    rows = result.fetchall()

    return {
        "count": len(rows),
        "meldingen": [_format(r) for r in rows],
    }


@router.get("/my")
async def my_meldingen(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Reporter sees their own meldingen."""
    result = await db.execute(text("""
        SELECT
            m.id, m.title, m.description, m.category,
            m.priority, m.status, m.resolution_note,
            m.created_at, m.updated_at,
            p.street, p.house_number, p.city
        FROM meldingen m
        LEFT JOIN properties p ON m.property_id = p.id
        WHERE m.reporter_id = :uid
        ORDER BY m.created_at DESC
    """), {"uid": user.id})
    rows = result.fetchall()
    return {"count": len(rows), "meldingen": [_format(r) for r in rows]}


@router.post("/{melding_id}/resolve")
async def resolve_melding(
    melding_id: int,
    body: ResolveRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        UPDATE meldingen
        SET status = 'resolved', resolution_note = :note, updated_at = NOW()
        WHERE id = :mid AND makelaar_id = :uid
        RETURNING id
    """), {"mid": melding_id, "uid": user.id, "note": body.note})

    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Melding niet gevonden")
    return {"message": "Melding opgelost"}


@router.post("/{melding_id}/close")
async def close_melding(
    melding_id: int,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        UPDATE meldingen SET status = 'closed', updated_at = NOW()
        WHERE id = :mid AND makelaar_id = :uid
        RETURNING id
    """), {"mid": melding_id, "uid": user.id})

    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Melding niet gevonden")
    return {"message": "Melding gesloten"}


def _format(r) -> dict:
    return {
        "id":              r.id,
        "title":           r.title,
        "description":     r.description,
        "category":        r.category,
        "priority":        r.priority,
        "status":          r.status,
        "resolution_note": r.resolution_note,
        "created_at":      str(r.created_at),
        "updated_at":      str(r.updated_at) if r.updated_at else None,
        "property": {
            "street":       r.street,
            "house_number": r.house_number,
            "city":         r.city,
        } if r.street else None,
        "reporter": {
            "email": getattr(r, 'reporter_email', None),
            "name":  getattr(r, 'reporter_name', None),
        },
    }