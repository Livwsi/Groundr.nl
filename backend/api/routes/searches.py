# ─────────────────────────────────────────────────────────────
# backend/api/routes/searches.py
#
# ENDPOINTS:
#   POST /api/searches/          → buyer saves a search
#   GET  /api/searches/          → buyer gets their searches
#   DELETE /api/searches/{id}    → buyer deletes a search
# ─────────────────────────────────────────────────────────────

import logging
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


class SavedSearchRequest(BaseModel):
    city:          Optional[str]   = None
    min_price:     Optional[float] = None
    max_price:     Optional[float] = None
    min_area_m2:   Optional[float] = None
    max_area_m2:   Optional[float] = None
    property_type: Optional[str]   = None
    email_alerts:  bool            = True


@router.post("/", status_code=201)
async def save_search(
    body: SavedSearchRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        INSERT INTO saved_searches
            (buyer_id, city, min_price, max_price, min_area_m2, max_area_m2, property_type, email_alerts)
        VALUES
            (:uid, :city, :min_price, :max_price, :min_area, :max_area, :ptype, :alerts)
        RETURNING id
    """), {
        "uid":       user.id,
        "city":      body.city,
        "min_price": body.min_price,
        "max_price": body.max_price,
        "min_area":  body.min_area_m2,
        "max_area":  body.max_area_m2,
        "ptype":     body.property_type,
        "alerts":    body.email_alerts,
    })
    row = result.fetchone()
    logger.info(f"[SEARCHES] User {user.id} saved search {row.id}")
    return {"message": "Zoekopdracht opgeslagen.", "search_id": row.id}


@router.get("/")
async def get_searches(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        SELECT id, city, min_price, max_price, min_area_m2, max_area_m2,
               property_type, email_alerts, created_at
        FROM saved_searches
        WHERE buyer_id = :uid
        ORDER BY created_at DESC
    """), {"uid": user.id})
    rows = result.fetchall()
    return {
        "searches": [
            {
                "id":            r.id,
                "city":          r.city,
                "min_price":     r.min_price,
                "max_price":     r.max_price,
                "min_area_m2":   r.min_area_m2,
                "max_area_m2":   r.max_area_m2,
                "property_type": r.property_type,
                "email_alerts":  r.email_alerts,
                "created_at":    str(r.created_at),
            }
            for r in rows
        ]
    }


@router.delete("/{search_id}")
async def delete_search(
    search_id: int,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        DELETE FROM saved_searches
        WHERE id = :sid AND buyer_id = :uid
        RETURNING id
    """), {"sid": search_id, "uid": user.id})
    if not result.fetchone():
        raise HTTPException(404, "Zoekopdracht niet gevonden.")
    return {"message": "Zoekopdracht verwijderd."}