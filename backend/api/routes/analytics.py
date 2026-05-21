# ─────────────────────────────────────────────────────────────
# backend/api/routes/analytics.py
#
# PURPOSE:
#   API endpoints for neighborhood analytics and scores.
#
# ENDPOINTS:
#   GET /api/analytics/score?lat=51.44&lon=5.47&radius=2.0
#       → returns investment score + neighborhood stats
# ─────────────────────────────────────────────────────────────

import logging

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from analytics.spatial import radius_query, get_amenities
from analytics.statistics import calculate_neighborhood_stats
from analytics.scoring import compute_score
from collectors.bag import geocode_address
from db.connection import get_db_session
from db.models import Property

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────────
# ENDPOINT: GET INVESTMENT SCORE
#
# The main analytics endpoint.
# Takes an address, finds nearby properties,
# calculates stats, and returns the investment score.
# ─────────────────────────────────────────────────────────────

@router.get("/score")
async def get_score(
    address: str   = Query(..., description="Address to analyse"),
    radius:  float = Query(2.0,  description="Radius in km"),
):
    """
    Calculate the investment score for a given address.
    Returns the score, factor breakdown, and neighborhood stats.
    """

    logger.info(f"[API] Score request: address='{address}'")

    # ── Geocode the address ───────────────────────────────
    location = await geocode_address(address)
    if not location:
        raise HTTPException(
            status_code = 404,
            detail      = f"Address not found: '{address}'",
        )

    lat = location["latitude"]
    lon = location["longitude"]

    # ── Find nearby properties ────────────────────────────
    nearby = await radius_query(lat, lon, radius_km=radius)

    if not nearby:
        raise HTTPException(
            status_code = 404,
            detail      = "No properties found in this area",
        )

    # ── Calculate neighborhood stats ─────────────────────
    stats = calculate_neighborhood_stats(nearby, radius_km=radius)

    # ── Score the closest property ────────────────────────
    closest_prop = nearby[0].property
    score_result = compute_score(closest_prop, stats)

    # ── Get amenities for the closest property ────────────
    amenities = await get_amenities(closest_prop.id)

    return {
        "address":  address,
        "location": {"lat": lat, "lon": lon},
        "radius_km": radius,

        # The investment score
        "score":    score_result.score,
        "factors":  score_result.factors,
        "explanation": score_result.explanation,

        # Neighborhood statistics
        "neighborhood": {
            "total_properties":       stats.total_properties,
            "avg_price_per_m2":       stats.avg_price_per_m2,
            "avg_price":              stats.avg_price,
            "pct_apartments":         stats.pct_apartments,
            "pct_houses":             stats.pct_houses,
            "estimated_rental_yield": stats.estimated_rental_yield,
            "price_trend_6m":         stats.price_trend_6m,
        },

        # Closest property details
        "property": {
            "id":           closest_prop.id,
            "street":       closest_prop.street,
            "house_number": closest_prop.house_number,
            "city":         closest_prop.city,
            "distance_m":   nearby[0].distance_m,
        },

        # Nearby amenities
        "amenities": [
            {
                "name":         a.name,
                "type":         a.amenity_type,
                "distance_m":   a.distance_m,
            }
            for a in amenities[:10]  # return top 10
        ],
    }
    
from pydantic import BaseModel

class NarrativeRequest(BaseModel):
    prompt: str

@router.post("/narrative")
async def generate_narrative(body: NarrativeRequest):
    """Proxy to Anthropic API for PDF report narrative generation."""
    import aiohttp

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key":         settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type":      "application/json",
            },
            json={
                "model":      "claude-haiku-4-5-20251001",
                "max_tokens": 1000,
                "messages":   [{"role": "user", "content": body.prompt}],
            },
        ) as res:
            data = await res.json(content_type=None)
            return {"text": data.get("content", [{}])[0].get("text", "")}