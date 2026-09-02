# ─────────────────────────────────────────────────────────
# backend/api/routes/listings.py
#
# PURPOSE:
#   API endpoints for makelaar listing management.
#   A makelaar can add, view, and delete their own listings.
#
# ENDPOINTS:
#   GET  /api/listings              → get my listings
#   POST /api/listings              → add a new listing
#   GET  /api/listings/public/{id}  → public listings by user
#   DELETE /api/listings/{id}       → delete a listing
# ─────────────────────────────────────────────────────────

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import require_user
from collectors.bag import geocode_address
from db.connection import get_db
from db.models import (
    EnergyLabel, ListingStatus, MarketListing,
    Property, PropertyType, User
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────
# REQUEST MODEL
# What the makelaar sends when adding a listing.
# ─────────────────────────────────────────────────────────

class CreateListingRequest(BaseModel):
    address:       str              # full address to geocode
    asking_price:  float            # asking price in euros
    area_m2:       Optional[float]  = None
    bedrooms:      Optional[int]    = None
    property_type: Optional[str]    = "house"
    energy_label:  Optional[str]    = "unknown"
    is_rental:     bool             = False
    description:   Optional[str]    = None


# ─────────────────────────────────────────────────────────
# ENDPOINT: GET MY LISTINGS
# Returns all listings created by the logged-in makelaar.
# ─────────────────────────────────────────────────────────

@router.get("/")
async def get_my_listings(
    user: User             = Depends(require_user),
    db:   AsyncSession     = Depends(get_db),
):
    """Get all listings for the logged-in makelaar."""

    result = await db.execute(
        select(MarketListing, Property)
        .join(Property, MarketListing.property_id == Property.id)
        .where(MarketListing.user_id == user.id)
        .order_by(MarketListing.id.desc())
    )
    rows = result.all()

    return {
        "count":    len(rows),
        "listings": [_format_listing(listing, prop) for listing, prop in rows],
    }


# ─────────────────────────────────────────────────────────
# ENDPOINT: GET PUBLIC LISTINGS BY USER ID
# Used by the agency microsite — no auth required.
# ─────────────────────────────────────────────────────────

@router.get("/public/{user_id}")
async def get_public_listings(
    user_id: int,
    db:      AsyncSession = Depends(get_db),
):
    """
    Get all active listings for a makelaar.
    Public endpoint — no login required.
    Used by the agency microsite.
    """

    result = await db.execute(
        select(MarketListing, Property)
        .join(Property, MarketListing.property_id == Property.id)
        .where(
            MarketListing.user_id == user_id,
            MarketListing.status  != ListingStatus.REMOVED,
        )
        .order_by(MarketListing.id.desc())
    )
    rows = result.all()

    # Also get the makelaar's name for display
    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    makelaar = user_result.scalar_one_or_none()

    return {
        "makelaar": {
            "id":        user_id,
            "full_name": makelaar.full_name if makelaar else "",
            "email":     makelaar.email     if makelaar else "",
        },
        "count":    len(rows),
        "listings": [_format_listing(listing, prop) for listing, prop in rows],
    }


# ─────────────────────────────────────────────────────────
# ENDPOINT: ADD A LISTING
# Makelaar enters an address + price + details.
# We geocode the address and create Property + Listing records.
# ─────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_listing(
    body: CreateListingRequest,
    user: User             = Depends(require_user),
    db:   AsyncSession     = Depends(get_db),
):
    """
    Add a new property listing.
    Geocodes the address, creates property record, saves listing.
    """

    logger.info(f"[LISTINGS] User {user.id} adding: {body.address}")

    # ── Step 1: Geocode the address ───────────────────────
    location = await geocode_address(body.address)
    if not location:
        raise HTTPException(
            status_code = 404,
            detail      = f"Adres niet gevonden: '{body.address}'",
        )

    # ── Step 2: Find or create the Property record ────────
    existing = await db.execute(
        select(Property).where(Property.bag_id == location.get("bag_id"))
    )
    prop = existing.scalar_one_or_none()

    if not prop:
        # Create a new property from the geocoded data
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
            property_type  = PropertyType(body.property_type)
                             if body.property_type in PropertyType.__members__.values()
                             else PropertyType.UNKNOWN,
            energy_label   = EnergyLabel(body.energy_label)
                             if body.energy_label in EnergyLabel.__members__.values()
                             else EnergyLabel.UNKNOWN,
            source         = "makelaar",
        )
        db.add(prop)
        await db.flush()   # get the new property's ID

    # ── Step 3: Create the listing ────────────────────────
    listing = MarketListing(
        property_id  = prop.id,
        user_id      = user.id,
        source       = "groundr",
        status       = ListingStatus.ACTIVE,
        asking_price = body.asking_price,
        price_per_m2 = body.asking_price / body.area_m2
                       if body.area_m2 else None,
        is_rental    = body.is_rental,
        listed_date  = datetime.utcnow(),
    )
    db.add(listing)
    await db.flush()

    logger.info(
        f"[LISTINGS] Created listing {listing.id} "
        f"for {prop.street} {prop.house_number}"
    )

    return {
        "message":    "Listing aangemaakt",
        "listing_id": listing.id,
        "property": {
            "street":       prop.street,
            "house_number": prop.house_number,
            "city":         prop.city,
            "latitude":     prop.latitude,
            "longitude":    prop.longitude,
        },
    }


# ─────────────────────────────────────────────────────────
# ENDPOINT: DELETE A LISTING
# Only the makelaar who created it can delete it.
# ─────────────────────────────────────────────────────────

@router.delete("/{listing_id}")
async def delete_listing(
    listing_id: int,
    user:       User         = Depends(require_user),
    db:         AsyncSession = Depends(get_db),
):
    """Delete a listing. Only the owner can delete it."""

    result = await db.execute(
        select(MarketListing).where(MarketListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()

    if not listing:
        raise HTTPException(status_code=404, detail="Listing niet gevonden")

    # Security check — only owner can delete
    if listing.user_id != user.id:
        raise HTTPException(status_code=403, detail="Geen toegang")

    listing.status = ListingStatus.REMOVED
    logger.info(f"[LISTINGS] Listing {listing_id} removed by user {user.id}")

    return {"message": "Listing verwijderd"}

# ─────────────────────────────────────────────────────────
# ENDPOINT: MAKELAAR ANALYTICS
# Returns performance stats for all listings
# ─────────────────────────────────────────────────────────

@router.get("/analytics/summary")
async def get_analytics_summary(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Analytics summary for makelaar — bids, viewings, meldingen per listing."""
    from sqlalchemy import text

    # All submissions for this makelaar with bid + viewing counts
    result = await db.execute(text("""
        SELECT
            ls.id,
            ls.reference,
            ls.asking_price,
            ls.urgency,
            ls.status,
            ls.created_at,
            p.street,
            p.house_number,
            p.city,
            p.living_area_m2 as area_m2,
            COUNT(DISTINCT b.id)  as bid_count,
            MAX(b.amount)         as highest_bid,
            COUNT(DISTINCT vr.id) as viewing_count,
            COUNT(DISTINCT CASE WHEN vr.status = 'confirmed' THEN vr.id END) as confirmed_viewings,
            COUNT(DISTINCT m.id)  as melding_count
        FROM listing_submissions ls
        JOIN properties p ON ls.property_id = p.id
        -- bids has no status column; withdrawn bids are is_active = FALSE.
        -- Without this the counts here disagree with /api/submissions/{id}/bids.
        LEFT JOIN bids b ON b.submission_id = ls.id AND b.is_active
        LEFT JOIN viewing_requests vr ON vr.submission_id = ls.id
        LEFT JOIN meldingen m ON m.submission_id = ls.id
        WHERE ls.makelaar_id = :uid
        GROUP BY ls.id, p.street, p.house_number, p.city, p.living_area_m2
        ORDER BY ls.created_at DESC
    """), {"uid": user.id})
    rows = result.fetchall()

    # Also get market listings stats
    listings_result = await db.execute(text("""
        SELECT
            ml.id,
            ml.asking_price,
            ml.status,
            ml.listed_date,
            p.street,
            p.house_number,
            p.city,
            p.living_area_m2 as area_m2,
            EXTRACT(DAY FROM NOW() - ml.listed_date)::int as days_on_market
        FROM market_listings ml
        JOIN properties p ON ml.property_id = p.id
        WHERE ml.user_id = :uid
        ORDER BY ml.listed_date DESC
    """), {"uid": user.id})
    listing_rows = listings_result.fetchall()

    # Totals
    total_bids      = sum(r.bid_count for r in rows)
    total_viewings  = sum(r.viewing_count for r in rows)
    total_meldingen = sum(r.melding_count for r in rows)
    avg_dom         = round(sum(r.days_on_market or 0 for r in listing_rows) / len(listing_rows)) if listing_rows else 0

    return {
        "totals": {
            "listings":         len(listing_rows),
            "submissions":      len(rows),
            "total_bids":       total_bids,
            "total_viewings":   total_viewings,
            "total_meldingen":  total_meldingen,
            "avg_days_on_market": avg_dom,
        },
        "submissions": [
            {
                "id":                  r.id,
                "reference":           r.reference,
                "street":              r.street,
                "house_number":        r.house_number,
                "city":                r.city,
                "area_m2":             r.area_m2,
                "asking_price":        r.asking_price,
                "urgency":             r.urgency,
                "status":              r.status,
                "created_at":          str(r.created_at),
                "bid_count":           r.bid_count,
                "highest_bid":         float(r.highest_bid) if r.highest_bid else None,
                "viewing_count":       r.viewing_count,
                "confirmed_viewings":  r.confirmed_viewings,
                "melding_count":       r.melding_count,
                "conversion_rate":     round(r.confirmed_viewings / r.viewing_count * 100) if r.viewing_count > 0 else 0,
            }
            for r in rows
        ],
        "listings": [
            {
                "id":              r.id,
                "street":          r.street,
                "house_number":    r.house_number,
                "city":            r.city,
                "asking_price":    r.asking_price,
                "status":          r.status,
                "days_on_market":  r.days_on_market or 0,
            }
            for r in listing_rows
        ],
    }


# ─────────────────────────────────────────────────────────
# HELPER: FORMAT LISTING FOR API RESPONSE
# ─────────────────────────────────────────────────────────

def _format_listing(listing: MarketListing, prop: Property) -> dict:
    """Format a listing + property into a clean response dict."""
    return {
        "id":           listing.id,
        "status":       listing.status,
        "asking_price": listing.asking_price,
        "price_per_m2": listing.price_per_m2,
        "is_rental":    listing.is_rental,
        "listed_date":  listing.listed_date,
        "property": {
            "id":           prop.id,
            "street":       prop.street,
            "house_number": prop.house_number,
            "postal_code":  prop.postal_code,
            "city":         prop.city,
            "latitude":     prop.latitude,
            "longitude":    prop.longitude,
            "area_m2":      prop.living_area_m2,
            "property_type":prop.property_type,
            "energy_label": prop.energy_label,
        },
    }