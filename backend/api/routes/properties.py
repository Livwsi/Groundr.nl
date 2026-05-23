# ─────────────────────────────────────────────────────────────
# backend/api/routes/properties.py
#
# PURPOSE:
#   API endpoints for searching and retrieving properties.
#
# ENDPOINTS:
#   GET /api/properties/search?q=Eindhoven&radius=2.0
#       → search by address, returns nearby properties
#
#   GET /api/properties/{id}
#       → get one property by its database ID
#
# HOW TO TEST:
#   Start the server, then open:
#   http://localhost:8000/docs
# ─────────────────────────────────────────────────────────────



import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy import select

from analytics.spatial import radius_query
from collectors.bag import geocode_address
from db.connection import get_db_session
from db.models import Property

logger    = logging.getLogger(__name__)
router    = APIRouter()


# ─────────────────────────────────────────────────────────────
# ENDPOINT: SEARCH PROPERTIES
#
# The main search endpoint.
# Takes an address string, geocodes it (gets coordinates),
# then finds all properties within the given radius.
# ─────────────────────────────────────────────────────────────

@router.get("/search")
async def search_properties(
    q:      str   = Query(..., description="Address to search, e.g. 'Stratumsedijk 23 Eindhoven'"),
    radius: float = Query(2.0,  description="Search radius in km (0.5 to 10.0)"),
):
    """
    Search for properties near a given address.
    Returns all properties within the radius, sorted by distance.
    """

    logger.info(f"[API] Search: q='{q}' radius={radius}km")

    # ── Step 1: Geocode the address ───────────────────────
    # Convert address text to GPS coordinates using PDOK
    location = await geocode_address(q)

    if not location:
        raise HTTPException(
            status_code = 404,
            detail      = f"Address not found: '{q}'",
        )

    lat = location["latitude"]
    lon = location["longitude"]

    # ── Step 2: Find nearby properties ───────────────────
    nearby = await radius_query(lat, lon, radius_km=radius)

    # ── Step 3: Format the response ──────────────────────
    return {
        "query":    q,
        "location": {"lat": lat, "lon": lon},
        "radius_km": radius,
        "count":    len(nearby),
        "results":  [
            {
                "id":           r.property.id,
                "street":       r.property.street,
                "house_number": r.property.house_number,
                "postal_code":  r.property.postal_code,
                "city":         r.property.city,
                "latitude":     r.property.latitude,
                "longitude":    r.property.longitude,
                "distance_m":   r.distance_m,
                "year_built":   r.property.year_built,
                "area_m2":      r.property.living_area_m2,
                "property_type":r.property.property_type,
                "energy_label": r.property.energy_label,
                "woz_value":    r.property.woz_value,
            }
            for r in nearby
        ],
    }


# ─────────────────────────────────────────────────────────────
# ENDPOINT: GET ONE PROPERTY
#
# Returns the full details of one property by its ID.
# ─────────────────────────────────────────────────────────────

@router.get("/{property_id}/price-history")
async def get_price_history(property_id: int):
    """Get WOZ price history for a property."""
    from sqlalchemy import text
    async with get_db_session() as db:
        result = await db.execute(text("""
            SELECT snapshot_date, price, source
            FROM price_history
            WHERE property_id = :pid
            ORDER BY snapshot_date ASC
        """), {"pid": property_id})
        rows = result.fetchall()
    return {
        "property_id": property_id,
        "history": [
            {
                "year":   r.snapshot_date.year,
                "price":  int(r.price),
                "source": r.source,
            }
            for r in rows
        ]
    }


@router.get("/{property_id}")
async def get_property(property_id: int):
    """
    Get full details of one property by its database ID.
    """

    async with get_db_session() as db:
        result = await db.execute(
            select(Property).where(Property.id == property_id)
        )
        prop = result.scalar_one_or_none()

    if not prop:
        raise HTTPException(
            status_code = 404,
            detail      = f"Property {property_id} not found",
        )

    return {
        "id":            prop.id,
        "bag_id":        prop.bag_id,
        "street":        prop.street,
        "house_number":  prop.house_number,
        "postal_code":   prop.postal_code,
        "city":          prop.city,
        "municipality":  prop.municipality,
        "neighborhood":  prop.neighborhood,
        "latitude":      prop.latitude,
        "longitude":     prop.longitude,
        "year_built":    prop.year_built,
        "area_m2":       prop.living_area_m2,
        "property_type": prop.property_type,
        "energy_label":  prop.energy_label,
        "woz_value":     prop.woz_value,
        "woz_year":      prop.woz_year,
        "source":        prop.source,
        "created_at":    prop.created_at,
    }