# ─────────────────────────────────────────────────────────────
# backend/api/routes/submissions.py
# ─────────────────────────────────────────────────────────────

import logging
from datetime import datetime
from typing import Optional
from sqlalchemy import text

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user, require_user
from collectors.bag import geocode_address
from config.settings import settings
from db.connection import get_db
from db.models import (
    Bid, ListingSubmission, Property, PropertyType,
    SubmissionStatus, UrgencyLevel, User
)
from services.email_service import email

logger = logging.getLogger(__name__)
router = APIRouter()


class SubmitListingRequest(BaseModel):
    makelaar_id:  int
    address:      str
    asking_price: Optional[float] = None
    show_price:   bool            = True
    urgency:      str             = "normal"
    bid_deadline: Optional[str]   = None
    description:  Optional[str]   = None
    area_m2:      Optional[float] = None
    property_type:str             = "house"
    energy_label: str             = "unknown"

class BidRequest(BaseModel):
    amount: float

class RejectRequest(BaseModel):
    note: Optional[str] = None


# ── STATIC ROUTES FIRST ───────────────────────────────────────

@router.get("/pending")
async def get_pending(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ListingSubmission, Property, User)
        .join(Property, ListingSubmission.property_id == Property.id)
        .join(User,     ListingSubmission.seller_id   == User.id)
        .where(
            ListingSubmission.makelaar_id == user.id,
            ListingSubmission.status      == SubmissionStatus.PENDING,
        )
        .order_by(ListingSubmission.created_at.desc())
    )
    rows = result.all()
    return {
        "count": len(rows),
        "submissions": [
            {
                "id":           s.id,
                "reference":    s.reference,
                "status":       s.status,
                "urgency":      s.urgency,
                "asking_price": s.asking_price,
                "show_price":   s.show_price,
                "description":  s.description,
                "bid_deadline": s.bid_deadline,
                "created_at":   s.created_at,
                "seller": {"id": u.id, "email": u.email, "full_name": u.full_name},
                "property": {
                    "id":           p.id,
                    "street":       p.street,
                    "house_number": p.house_number,
                    "city":         p.city,
                    "area_m2":      p.living_area_m2,
                },
            }
            for s, p, u in rows
        ],
    }


@router.get("/my-bids")
async def my_bids(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        SELECT b.amount, b.created_at as placed_at, ls.reference
        FROM bids b
        JOIN listing_submissions ls ON b.submission_id = ls.id
        WHERE b.bidder_id = :uid
        ORDER BY b.created_at DESC
    """), {"uid": user.id})
    rows = result.fetchall()
    return {
        "bids": [
            {"amount": float(r.amount), "placed_at": str(r.placed_at), "reference": r.reference}
            for r in rows
        ]
    }


@router.get("/my")
async def my_submissions(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        SELECT ls.id, ls.reference, ls.asking_price, ls.status, ls.created_at,
               p.street, p.house_number, p.city
        FROM listing_submissions ls
        JOIN properties p ON ls.property_id = p.id
        WHERE ls.seller_id = :uid
        ORDER BY ls.created_at DESC
    """), {"uid": user.id})
    rows = result.fetchall()
    return {
        "submissions": [
            {
                "id":           r.id,
                "reference":    r.reference,
                "asking_price": float(r.asking_price) if r.asking_price else None,
                "status":       r.status,
                "created_at":   str(r.created_at),
                "property": {
                    "street":       r.street,
                    "house_number": r.house_number,
                    "city":         r.city,
                },
            }
            for r in rows
        ]
    }


@router.get("/public/{makelaar_id}")
async def get_public_listings(makelaar_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ListingSubmission, Property)
        .join(Property, ListingSubmission.property_id == Property.id)
        .where(
            ListingSubmission.makelaar_id == makelaar_id,
            ListingSubmission.status      == SubmissionStatus.APPROVED,
        )
        .order_by(ListingSubmission.created_at.desc())
    )
    rows = result.all()
    listings = []
    for s, p in rows:
        bid_count = await db.scalar(
            select(func.count(Bid.id)).where(Bid.submission_id == s.id, Bid.is_active == True)
        )
        highest = await db.scalar(
            select(func.max(Bid.amount)).where(Bid.submission_id == s.id, Bid.is_active == True)
        )
        listings.append({
            "id":           s.id,
            "reference":    s.reference,
            "urgency":      s.urgency,
            "asking_price": s.asking_price if s.show_price else None,
            "show_price":   s.show_price,
            "bid_deadline": s.bid_deadline,
            "description":  s.description,
            "bid_count":    bid_count or 0,
            "highest_bid":  highest,
            "property": {
                "id":           p.id,
                "street":       p.street,
                "house_number": p.house_number,
                "postal_code":  p.postal_code,
                "city":         p.city,
                "area_m2":      p.living_area_m2,
                "property_type":p.property_type,
                "energy_label": p.energy_label,
                "latitude":     p.latitude,
                "longitude":    p.longitude,
            },
        })
    return {"count": len(listings), "listings": listings}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_listing(
    body: SubmitListingRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    location = await geocode_address(body.address)
    if not location:
        raise HTTPException(status_code=404, detail=f"Adres niet gevonden: '{body.address}'")

    existing = await db.execute(select(Property).where(Property.bag_id == location.get("bag_id")))
    prop = existing.scalar_one_or_none()

    if not prop:
        prop = Property(
            bag_id         = location.get("bag_id"),
            street         = location.get("street", ""),
            house_number   = location.get("house_number", ""),
            postal_code    = location.get("postal_code", ""),
            city           = location.get("city", ""),
            municipality   = location.get("municipality", ""),
            latitude       = location["latitude"],
            longitude      = location["longitude"],
            living_area_m2 = body.area_m2,
            property_type  = PropertyType.HOUSE,
            source         = "seller",
        )
        db.add(prop)
        await db.flush()

    deadline = None
    if body.bid_deadline:
        try:
            deadline = datetime.fromisoformat(body.bid_deadline)
        except ValueError:
            pass

    import random
    year      = datetime.utcnow().year
    random_id = random.randint(10000, 99999)

    submission = ListingSubmission(
        makelaar_id  = body.makelaar_id,
        seller_id    = user.id,
        property_id  = prop.id,
        asking_price = body.asking_price,
        show_price   = body.show_price,
        urgency      = UrgencyLevel(body.urgency) if body.urgency in [e.value for e in UrgencyLevel] else UrgencyLevel.NORMAL,
        bid_deadline = deadline,
        description  = body.description,
        status       = SubmissionStatus.PENDING,
        reference    = f"GR-{year}-{random_id}",
    )
    db.add(submission)
    await db.flush()

    logger.info(f"[SUBMISSIONS] User {user.id} submitted {prop.street} to makelaar {body.makelaar_id}")
    return {
        "message":       "Aanmelding ingediend. De makelaar zal uw woning beoordelen.",
        "submission_id": submission.id,
        "reference":     submission.reference,
        "property": {
            "street":       prop.street,
            "house_number": prop.house_number,
            "city":         prop.city,
        },
    }


# ── PARAMETERIZED ROUTES LAST ─────────────────────────────────

@router.post("/{submission_id}/approve")
async def approve_submission(
    submission_id: int,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ListingSubmission).where(ListingSubmission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Aanmelding niet gevonden")
    if submission.makelaar_id != user.id:
        raise HTTPException(status_code=403, detail="Geen toegang")

    submission.status     = SubmissionStatus.APPROVED
    submission.updated_at = datetime.utcnow()
    await db.flush()

    # Notify seller
    seller_data = await db.execute(text("""
        SELECT u.email, u.full_name, p.street, p.house_number, p.city
        FROM listing_submissions ls
        JOIN users u ON ls.seller_id = u.id
        JOIN properties p ON ls.property_id = p.id
        WHERE ls.id = :sid
    """), {"sid": submission_id})
    s = seller_data.fetchone()
    if s and s.email:
        address = f"{s.street} {s.house_number}, {s.city}"
        await email.send_submission_approved(
            to=s.email,
            seller_name=s.full_name or "Verkoper",
            address=address,
        )

    logger.info(f"[SUBMISSIONS] Makelaar {user.id} approved submission {submission_id}")

    # Trigger buyer alerts for matching saved searches
    await _trigger_buyer_alerts(db, submission_id)

    return {"message": "Aanmelding goedgekeurd. Woning staat nu live."}


@router.post("/{submission_id}/reject")
async def reject_submission(
    submission_id: int,
    body: RejectRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ListingSubmission).where(ListingSubmission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Aanmelding niet gevonden")
    if submission.makelaar_id != user.id:
        raise HTTPException(status_code=403, detail="Geen toegang")

    submission.status         = SubmissionStatus.REJECTED
    submission.rejection_note = body.note
    submission.updated_at     = datetime.utcnow()
    return {"message": "Aanmelding afgewezen."}


@router.post("/{submission_id}/bid")
async def place_bid(
    submission_id: int,
    body: BidRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ListingSubmission).where(ListingSubmission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Aanmelding niet gevonden")
    if submission.status != SubmissionStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Deze woning accepteert geen biedingen")
    if submission.bid_deadline and datetime.utcnow() > submission.bid_deadline:
        raise HTTPException(status_code=400, detail="De biedingstermijn is verlopen")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Bod moet groter zijn dan €0")

    existing_bid = await db.execute(
        select(Bid).where(
            Bid.submission_id == submission_id,
            Bid.bidder_id     == user.id,
            Bid.is_active     == True,
        )
    )
    bid = existing_bid.scalar_one_or_none()

    if bid:
        old_amount     = bid.amount
        bid.amount     = body.amount
        bid.updated_at = datetime.utcnow()
        message = f"Bod bijgewerkt naar {_format_price(body.amount)}"
        logger.info(f"[BIDS] User {user.id} updated bid on {submission_id}: €{old_amount} → €{body.amount}")
    else:
        bid = Bid(submission_id=submission_id, bidder_id=user.id, amount=body.amount, is_active=True)
        db.add(bid)
        message = f"Bod geplaatst: {_format_price(body.amount)}"
        logger.info(f"[BIDS] User {user.id} placed bid on {submission_id}: €{body.amount}")

    await db.flush()

    # Notify makelaar of new bid
    makelaar_data = await db.execute(text("""
        SELECT u.email, u.full_name, p.street, p.house_number, p.city
        FROM listing_submissions ls
        JOIN users u ON ls.makelaar_id = u.id
        JOIN properties p ON ls.property_id = p.id
        WHERE ls.id = :sid
    """), {"sid": submission_id})
    m = makelaar_data.fetchone()
    if m and m.email:
        address = f"{m.street} {m.house_number}, {m.city}"
        dashboard_url = f"{settings.FRONTEND_URL}/bids"
        await email.send_bid_placed(
            to=m.email,
            makelaar_name=m.full_name or "Makelaar",
            address=address,
            amount=body.amount,
            dashboard_url=dashboard_url,
        )

    bid_count = await db.scalar(
        select(func.count(Bid.id)).where(Bid.submission_id == submission_id, Bid.is_active == True)
    )
    highest = await db.scalar(
        select(func.max(Bid.amount)).where(Bid.submission_id == submission_id, Bid.is_active == True)
    )

    return {
        "message":     message,
        "your_bid":    body.amount,
        "bid_count":   bid_count,
        "highest_bid": highest,
        "is_highest":  body.amount >= (highest or 0),
    }


@router.get("/{submission_id}/bids")
async def get_bids(
    submission_id: int,
    user: Optional[User] = Depends(get_current_user),
    db:   AsyncSession   = Depends(get_db),
):
    result = await db.execute(select(ListingSubmission).where(ListingSubmission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Aanmelding niet gevonden")

    bids_result = await db.execute(
        select(Bid)
        .where(Bid.submission_id == submission_id, Bid.is_active == True)
        .order_by(Bid.amount.desc())
    )
    bids = bids_result.scalars().all()
    is_makelaar = user and user.id == submission.makelaar_id

    if is_makelaar:
        return {
            "count":       len(bids),
            "highest_bid": bids[0].amount if bids else None,
            "bids": [
                {"amount": b.amount, "placed_at": b.created_at, "updated_at": b.updated_at}
                for b in bids
            ],
        }
    return {"count": len(bids), "highest_bid": bids[0].amount if bids else None}


def _format_price(amount: float) -> str:
    return f"€{amount:,.0f}".replace(",", ".")


# ─────────────────────────────────────────────────────────────
# HELPER: trigger buyer alerts for a newly approved listing
# Called from approve_submission
# ─────────────────────────────────────────────────────────────

async def _trigger_buyer_alerts(db: AsyncSession, submission_id: int):
    """Find saved searches that match this listing and email buyers."""
    # Get listing details
    listing = await db.execute(text("""
        SELECT p.city, p.living_area_m2, p.property_type,
               ls.asking_price, ls.id as sub_id
        FROM listing_submissions ls
        JOIN properties p ON ls.property_id = p.id
        WHERE ls.id = :sid
    """), {"sid": submission_id})
    l = listing.fetchone()
    if not l:
        return

    # Find matching saved searches with email alerts enabled
    matches = await db.execute(text("""
        SELECT ss.id, ss.buyer_id, u.email, u.full_name,
               p.street, p.house_number
        FROM saved_searches ss
        JOIN users u ON ss.buyer_id = u.id
        JOIN listing_submissions ls ON ls.id = :sid
        JOIN properties p ON ls.property_id = p.id
        WHERE ss.email_alerts = TRUE
          AND (ss.city IS NULL OR LOWER(ss.city) = LOWER(:city))
          AND (ss.min_price IS NULL OR :price >= ss.min_price OR :price IS NULL)
          AND (ss.max_price IS NULL OR :price <= ss.max_price OR :price IS NULL)
          AND (ss.min_area_m2 IS NULL OR :area >= ss.min_area_m2 OR :area IS NULL)
          AND (ss.property_type IS NULL OR ss.property_type = :ptype)
    """), {
        "sid":   submission_id,
        "city":  l.city,
        "price": l.asking_price,
        "area":  l.living_area_m2,
        "ptype": str(l.property_type).split(".")[-1].lower() if l.property_type else None,
    })
    buyers = matches.fetchall()

    for buyer in buyers:
        address     = f"{buyer.street} {buyer.house_number}, {l.city}"
        listing_url = f"{settings.FRONTEND_URL}/dossier/dashboard"
        await email.send_buyer_alert(
            to=buyer.email,
            buyer_name=buyer.full_name or "Koper",
            address=address,
            price=l.asking_price or 0,
            listing_url=listing_url,
        )
        logger.info(f"[ALERTS] Sent buyer alert to {buyer.email} for submission {submission_id}")