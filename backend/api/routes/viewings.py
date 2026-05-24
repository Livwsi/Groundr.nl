# ─────────────────────────────────────────────────────────────
# backend/api/routes/viewings.py
# ─────────────────────────────────────────────────────────────

import logging
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import require_user
from db.connection import get_db
from db.models import User
from services.email_service import email

logger = logging.getLogger(__name__)
router = APIRouter()

DAYS = ['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag']


class SlotRequest(BaseModel):
    day_of_week: int
    start_time:  str
    end_time:    str

class ViewingRequest(BaseModel):
    makelaar_id:    int
    submission_id:  Optional[int] = None
    requested_date: str
    requested_time: str
    buyer_name:     str
    buyer_phone:    str
    message:        Optional[str] = None

class RejectRequest(BaseModel):
    note: Optional[str] = None


# ── STATIC ROUTES FIRST ───────────────────────────────────────

@router.post("/availability", status_code=201)
async def set_availability(
    body: SlotRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    await db.execute(text("""
        INSERT INTO availability_slots (makelaar_id, day_of_week, start_time, end_time)
        VALUES (:mid, :dow, :st, :et)
    """), {"mid": user.id, "dow": body.day_of_week, "st": body.start_time, "et": body.end_time})
    return {"message": "Beschikbaarheid opgeslagen"}


@router.get("/availability/{makelaar_id}")
async def get_availability(makelaar_id: int, db: AsyncSession = Depends(get_db)):
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


@router.post("/request", status_code=201)
async def request_viewing(
    body: ViewingRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    try:
        req_date = datetime.strptime(body.requested_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Ongeldige datum format. Gebruik YYYY-MM-DD.")

    if req_date < date.today():
        raise HTTPException(status_code=400, detail="Datum ligt in het verleden.")

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
        "date":  req_date,
        "time":  body.requested_time,
        "name":  body.buyer_name,
        "phone": body.buyer_phone,
        "msg":   body.message,
    })
    row = result.fetchone()
    logger.info(f"[VIEWINGS] User {user.id} requested viewing on {body.requested_date}")
    return {
        "message":    "Bezichtigingsverzoek ingediend. De makelaar neemt contact met u op.",
        "request_id": row.id,
    }


@router.get("/requests")
async def get_requests(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
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


@router.get("/my")
async def my_viewings(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
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


# ── PARAMETERIZED ROUTES LAST ─────────────────────────────────

@router.post("/{request_id}/confirm")
async def confirm_viewing(
    request_id: int,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        UPDATE viewing_requests
        SET status = 'confirmed', updated_at = NOW()
        WHERE id = :rid AND makelaar_id = :mid
        RETURNING id, buyer_name, requested_date, requested_time, buyer_id
    """), {"rid": request_id, "mid": user.id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Verzoek niet gevonden")

    # Get property address + buyer email for notification
    details = await db.execute(text("""
        SELECT p.street, p.house_number, p.city, u.email as buyer_email
        FROM viewing_requests vr
        LEFT JOIN listing_submissions ls ON vr.submission_id = ls.id
        LEFT JOIN properties p ON ls.property_id = p.id
        LEFT JOIN users u ON vr.buyer_id = u.id
        WHERE vr.id = :rid
    """), {"rid": request_id})
    d = details.fetchone()

    if d and d.buyer_email:
        address = f"{d.street} {d.house_number}, {d.city}" if d.street else "uw woning"
        await email.send_viewing_confirmed(
            to=d.buyer_email,
            buyer_name=row.buyer_name,
            address=address,
            date=str(row.requested_date),
            time=row.requested_time,
        )

    logger.info(f"[VIEWINGS] Makelaar {user.id} confirmed request {request_id}")
    return {"message": "Bezichtiging bevestigd"}


@router.post("/{request_id}/reject")
async def reject_viewing(
    request_id: int,
    body: RejectRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        UPDATE viewing_requests
        SET status = 'rejected', rejection_note = :note, updated_at = NOW()
        WHERE id = :rid AND makelaar_id = :mid
        RETURNING id, buyer_name, buyer_id
    """), {"rid": request_id, "mid": user.id, "note": body.note})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Verzoek niet gevonden")

    # Get buyer email + address for notification
    details = await db.execute(text("""
        SELECT p.street, p.house_number, p.city, u.email as buyer_email
        FROM viewing_requests vr
        LEFT JOIN listing_submissions ls ON vr.submission_id = ls.id
        LEFT JOIN properties p ON ls.property_id = p.id
        LEFT JOIN users u ON vr.buyer_id = u.id
        WHERE vr.id = :rid
    """), {"rid": request_id})
    d = details.fetchone()

    if d and d.buyer_email:
        address = f"{d.street} {d.house_number}, {d.city}" if d.street else "uw woning"
        await email.send_viewing_rejected(
            to=d.buyer_email,
            buyer_name=row.buyer_name,
            address=address,
        )

    return {"message": "Bezichtiging afgewezen"}