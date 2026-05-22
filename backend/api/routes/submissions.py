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
from db.connection import get_db
from db.models import (
    Bid, ListingSubmission, Property, PropertyType,
    SubmissionStatus, UrgencyLevel, User
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request models ────────────────────────────────────────────

class SubmitListingRequest(BaseModel):
    makelaar_id:  int
    address:      str
    asking_price: Optional[float] = None
    show_price:   bool            = True
    urgency:      str             = "normal"
    bid_deadline: Optional[str]  = None
    description:  Optional[str]  = None
    area_m2:      Optional[float] = None
    property_type:str             = "house"
    energy_label: str             = "unknown"


class BidRequest(BaseModel):
    amount: float


class RejectRequest(BaseModel):
    note: Optional[str] = None


# ── STATIC ROUTES FIRST (must come before /{id} routes) ──────

@router.get("/pending")
async def get_pending(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Get all pending submissions for the logged-in makelaar."""
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
                "id":          s.id,
                "reference":   s.reference,
                "status":      s.status,
                "urgency":     s.urgency,
                "asking_price":s.asking_price,
                "show_price":  s.show_price,
                "description": s.description,
                "bid_deadline":s.bid_deadline,
                "created_at":  s.created_at,
                "seller": {
                    "id":        u.id,
                    "email":     u.email,
                    "full_name": u.full_name,
                },
                "property": {
                    "id":          p.id,
                    "street":      p.street,
                    "house_number":p.house_number,
                    "city":        p.city,
                    "area_m2":     p.living_area_m2,
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
    """Buyer sees their own bids."""
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
            {
                "amount":    float(r.amount),
                "placed_at": str(r.placed_at),
                "reference": r.reference,
            }
            for r in rows
        ]
    }


@router.get("/my")
async def my_submissions(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Buyer/seller sees their own submissions."""
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
                "id":          r.id,
                "reference":   r.reference,
                "asking_price":float(r.asking_price) if r.asking_price else None,
                "status":      r.status,
                "created_at":  str(r.created_at),
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
async def get_public_listings(
    makelaar_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all approved listings for a makelaar — public."""
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
            select(func.count(Bid.id)).where(
                Bid.submission_id == s.id,
                Bid.is_active     == True,
            )
        )
        highest = await db.scalar(
            select(func.max(Bid.amount)).where(
                Bid.submission_id == s.id,
                Bid.is_active     == True,
            )
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


# ── POST: submit a listing ────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_listing(
    body: SubmitListingRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Seller submits a property to a makelaar's microsite."""
    location = await geocode_address(body.address)
    if not location:
        raise HTTPException(status_code=404, detail=f"Adres niet gevonden: '{body.address}'")

    existing = await db.execute(
        select(Property).where(Property.bag_id == location.get("bag_id"))
    )
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


# ── PARAMETERIZED ROUTES (must come after static routes) ─────

@router.post("/{submission_id}/approve")
async def approve_submission(
    submission_id: int,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ListingSubmission).where(ListingSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Aanmelding niet gevonden")
    if submission.makelaar_id != user.id:
        raise HTTPException(status_code=403, detail="Geen toegang")

    submission.status     = SubmissionStatus.APPROVED
    submission.updated_at = datetime.utcnow()
    logger.info(f"[SUBMISSIONS] Makelaar {user.id} approved submission {submission_id}")
    return {"message": "Aanmelding goedgekeurd. Woning staat nu live."}


@router.post("/{submission_id}/reject")
async def reject_submission(
    submission_id: int,
    body: RejectRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ListingSubmission).where(ListingSubmission.id == submission_id)
    )
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
    result = await db.execute(
        select(ListingSubmission).where(ListingSubmission.id == submission_id)
    )
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
        bid = Bid(
            submission_id = submission_id,
            bidder_id     = user.id,
            amount        = body.amount,
            is_active     = True,
        )
        db.add(bid)
        message = f"Bod geplaatst: {_format_price(body.amount)}"
        logger.info(f"[BIDS] User {user.id} placed bid on {submission_id}: €{body.amount}")

    await db.flush()

    bid_count = await db.scalar(
        select(func.count(Bid.id)).where(
            Bid.submission_id == submission_id,
            Bid.is_active     == True,
        )
    )
    highest = await db.scalar(
        select(func.max(Bid.amount)).where(
            Bid.submission_id == submission_id,
            Bid.is_active     == True,
        )
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
    result = await db.execute(
        select(ListingSubmission).where(ListingSubmission.id == submission_id)
    )
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
                {
                    "amount":     b.amount,
                    "placed_at":  b.created_at,
                    "updated_at": b.updated_at,
                }
                for b in bids
            ],
        }
    else:
        return {
            "count":       len(bids),
            "highest_bid": bids[0].amount if bids else None,
        }


def _format_price(amount: float) -> str:
    return f"€{amount:,.0f}".replace(",", ".")