# ─────────────────────────────────────────────────────────────
# backend/api/routes/viewings.py
#
# ENDPOINTS:
#   POST /api/viewings/availability        → makelaar sets slots
#   GET  /api/viewings/availability/{id}   → get makelaar's slots
#   POST /api/viewings/request             → buyer requests viewing
#   GET  /api/viewings/requests            → makelaar sees all requests
#   POST /api/viewings/{id}/confirm        → makelaar confirms
#   POST /api/viewings/{id}/reject         → makelaar rejects
#   GET  /api/viewings/my                  → buyer sees own requests
# ─────────────────────────────────────────────────────────────

import logging
from datetime import datetime, date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user, require_user
from db.connection import get_db
from db.models import User

logger = logging.getLogger(__name__)
router = APIRouter()

DAYS = ['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag']


# ── Request models ────────────────────────────────────────

class SlotRequest(BaseModel):
    day_of_week: int        # 0=Mon, 6=Sun
    start_time:  str        # "09:00"
    end_time:    str        # "17:00"

class ViewingRequest(BaseModel):
    makelaar_id:    int
    submission_id:  Optional[int] = None
    requested_date: str            # "2026-06-15"
    requested_time: str            # "14:00"
    buyer_name:     str
    buyer_phone:    str
    message:        Optional[str] = None

class RejectRequest(BaseModel):
    note: Optional[str] = None


# ── Availability ──────────────────────────────────────────

@router.post("/availability", status_code=201)
async def set_availability(
    body: SlotRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Makelaar adds an availability slot."""
    await db.execute(text("""
        INSERT INTO availability_slots (makelaar_id, day_of_week, start_time, end_time)
        VALUES (:mid, :dow, :st, :et)
    """), {"mid": user.id, "dow": body.day_of_week, "st": body.start_time, "et": body.end_time})

    return {"message": "Beschikbaarheid opgeslagen"}


@router.get("/availability/{makelaar_id}")
async def get_availability(
    makelaar_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all active availability slots for a makelaar — public."""
    result = await db.execute(text("""
        SELECT id, day_of_week, start_time, end_time
        FROM availability_slots
        WHERE makelaar_id = :mid AND is_active = TRUE
        ORDER BY day_of_week, start_time
    """), {"mid": makelaar_id})
    rows = result.fetchall()

    return {
        "slots": [
            {
                "id":          r.id,
                "day_of_week": r.day_of_week,
                "day_name":    DAYS[r.day_of_week],
                "start_time":  r.start_time,
                "end_time":    r.end_time,
            }
            for r in rows
        ]
    }


@router.delete("/availability/{slot_id}")
async def delete_slot(
    slot_id: int,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    await db.execute(text("""
        UPDATE availability_slots SET is_active = FALSE
        WHERE id = :sid AND makelaar_id = :mid
    """), {"sid": slot_id, "mid": user.id})
    return {"message": "Slot verwijderd"}


# ── Viewing requests ──────────────────────────────────────

@router.post("/request", status_code=201)
async def request_viewing(
    body: ViewingRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Buyer requests a viewing on a specific date/time."""

    # Parse date
    try:
        req_date = datetime.strptime(body.requested_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Ongeldige datum format. Gebruik YYYY-MM-DD.")

    if req_date < date.today():
        raise HTTPException(status_code=400, detail="Datum ligt in het verleden.")

    # Insert request
    result = await db.execute(text("""
        INSERT INTO viewing_requests
            (submission_id, makelaar_id, buyer_id, requested_date,
             requested_time, buyer_name, buyer_phone, message, status)
        VALUES
            (:sid, :mid, :bid, :date, :time, :name, :phone, :msg, 'pending')
        RETURNING id
    """), {
        "sid":   body.submission_id,
        "mid":   body.makelaar_id,
        "bid":   user.id,
        "date":  body.requested_date,
        "time":  body.requested_time,
        "name":  body.buyer_name,
        "phone": body.buyer_phone,
        "msg":   body.message,
    })
    row = result.fetchone()

    logger.info(f"[VIEWINGS] User {user.id} requested viewing on {body.requested_date} at {body.requested_time}")

    return {
        "message":    "Bezichtigingsverzoek ingediend. De makelaar neemt contact met u op.",
        "request_id": row.id,
    }


@router.get("/requests")
async def get_requests(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Makelaar sees all viewing requests."""
    result = await db.execute(text("""
        SELECT
            vr.id, vr.requested_date, vr.requested_time,
            vr.status, vr.buyer_name, vr.buyer_phone,
            vr.message, vr.rejection_note, vr.created_at,
            vr.submission_id,
            ls.reference as listing_ref,
            p.street, p.house_number, p.city
        FROM viewing_requests vr
        LEFT JOIN listing_submissions ls ON vr.submission_id = ls.id
        LEFT JOIN properties p ON ls.property_id = p.id
        WHERE vr.makelaar_id = :mid
        ORDER BY vr.requested_date ASC, vr.requested_time ASC
    """), {"mid": user.id})
    rows = result.fetchall()

    return {
        "count": len(rows),
        "requests": [
            {
                "id":             r.id,
                "date":           str(r.requested_date),
                "time":           r.requested_time,
                "status":         r.status,
                "buyer_name":     r.buyer_name,
                "buyer_phone":    r.buyer_phone,
                "message":        r.message,
                "rejection_note": r.rejection_note,
                "created_at":     str(r.created_at),
                "listing_ref":    r.listing_ref,
                "property": {
                    "street":       r.street,
                    "house_number": r.house_number,
                    "city":         r.city,
                } if r.street else None,
            }
            for r in rows
        ],
    }


@router.post("/{request_id}/confirm")
async def confirm_viewing(
    request_id: int,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Makelaar confirms a viewing request."""
    result = await db.execute(text("""
        UPDATE viewing_requests
        SET status = 'confirmed', updated_at = NOW()
        WHERE id = :rid AND makelaar_id = :mid
        RETURNING id
    """), {"rid": request_id, "mid": user.id})

    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Verzoek niet gevonden")

    logger.info(f"[VIEWINGS] Makelaar {user.id} confirmed request {request_id}")
    return {"message": "Bezichtiging bevestigd"}


@router.post("/{request_id}/reject")
async def reject_viewing(
    request_id: int,
    body: RejectRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Makelaar rejects a viewing request with optional note."""
    result = await db.execute(text("""
        UPDATE viewing_requests
        SET status = 'rejected', rejection_note = :note, updated_at = NOW()
        WHERE id = :rid AND makelaar_id = :mid
        RETURNING id
    """), {"rid": request_id, "mid": user.id, "note": body.note})

    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Verzoek niet gevonden")

    return {"message": "Bezichtiging afgewezen"}


@router.get("/my")
async def my_viewings(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Buyer sees their own viewing requests."""
    result = await db.execute(text("""
        SELECT
            vr.id, vr.requested_date, vr.requested_time,
            vr.status, vr.rejection_note, vr.created_at,
            p.street, p.house_number, p.city
        FROM viewing_requests vr
        LEFT JOIN listing_submissions ls ON vr.submission_id = ls.id
        LEFT JOIN properties p ON ls.property_id = p.id
        WHERE vr.buyer_id = :uid
        ORDER BY vr.requested_date DESC
    """), {"uid": user.id})
    rows = result.fetchall()

    return {
        "count": len(rows),
        "viewings": [
            {
                "id":             r.id,
                "date":           str(r.requested_date),
                "time":           r.requested_time,
                "status":         r.status,
                "rejection_note": r.rejection_note,
                "created_at":     str(r.created_at),
                "property": {
                    "street":       r.street,
                    "house_number": r.house_number,
                    "city":         r.city,
                } if r.street else None,
            }
            for r in rows
        ],
    }