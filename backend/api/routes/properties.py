# backend/api/routes/properties.py
# Sprint D additions:
#   - /search extended with 8 filters
#   - /{id}/similar — same type, nearby, similar price
#   - /{id}/walkability — walk/transit/bike score from OSM amenities

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, text

from analytics.spatial import radius_query
from collectors.bag import geocode_address
from db.connection import get_db_session
from db.models import Property

logger = logging.getLogger(__name__)
router = APIRouter()


# ── SEARCH — extended with filters ───────────────────────────────
@router.get("/search")
async def search_properties(
    q:              str            = Query(...,  description="Address string"),
    radius:         float          = Query(2.0,  description="Radius in km"),
    # Sprint D filters
    min_price:      Optional[int]  = Query(None, description="Min WOZ value €"),
    max_price:      Optional[int]  = Query(None, description="Max WOZ value €"),
    min_area:       Optional[int]  = Query(None, description="Min living area m²"),
    max_area:       Optional[int]  = Query(None, description="Max living area m²"),
    property_type:  Optional[str]  = Query(None, description="house,apartment,villa,..."),
    energy_label:   Optional[str]  = Query(None, description="A,B,C,D,E,F,G"),
    min_year:       Optional[int]  = Query(None, description="Min year built"),
    max_year:       Optional[int]  = Query(None, description="Max year built"),
):
    logger.info(f"[API] Search: q='{q}' radius={radius}km filters={property_type}/{energy_label}")

    location = await geocode_address(q)
    if not location:
        raise HTTPException(status_code=404, detail=f"Address not found: '{q}'")

    lat, lon = location["latitude"], location["longitude"]
    nearby   = await radius_query(lat, lon, radius_km=radius)

    results = []
    for r in nearby:
        p = r.property

        # Apply filters
        if min_price    and (p.woz_value    is None or p.woz_value    < min_price):  continue
        if max_price    and (p.woz_value    is None or p.woz_value    > max_price):  continue
        if min_area     and (p.living_area_m2 is None or p.living_area_m2 < min_area): continue
        if max_area     and (p.living_area_m2 is None or p.living_area_m2 > max_area): continue
        if property_type and p.property_type and property_type.lower() not in p.property_type.lower(): continue
        if energy_label  and p.energy_label  and p.energy_label.upper() != energy_label.upper(): continue
        if min_year     and (p.year_built is None or p.year_built < min_year): continue
        if max_year     and (p.year_built is None or p.year_built > max_year): continue

        results.append({
            "id":            p.id,
            "street":        p.street,
            "house_number":  p.house_number,
            "postal_code":   p.postal_code,
            "city":          p.city,
            "latitude":      p.latitude,
            "longitude":     p.longitude,
            "distance_m":    r.distance_m,
            "year_built":    p.year_built,
            "area_m2":       p.living_area_m2,
            "property_type": p.property_type,
            "energy_label":  p.energy_label,
            "woz_value":     p.woz_value,
        })

    return {
        "query": q, "location": {"lat": lat, "lon": lon},
        "radius_km": radius, "count": len(results), "results": results,
    }


# ── PRICE HISTORY — unchanged ─────────────────────────────────────
@router.get("/{property_id}/price-history")
async def get_price_history(property_id: int):
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
        "history": [{"year": r.snapshot_date.year, "price": int(r.price), "source": r.source} for r in rows]
    }


# ── SIMILAR HOMES ─────────────────────────────────────────────────
@router.get("/{property_id}/similar")
async def get_similar(property_id: int):
    """
    Returns up to 6 similar properties:
    - same property_type
    - within 3km
    - within ±30% WOZ value
    - not the same property
    """
    async with get_db_session() as db:
        res  = await db.execute(select(Property).where(Property.id == property_id))
        prop = res.scalar_one_or_none()
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")

        # PostGIS radius query: 3km
        similar_rows = await db.execute(text("""
            SELECT
                p.id, p.street, p.house_number, p.city,
                p.latitude, p.longitude,
                p.living_area_m2, p.property_type, p.energy_label,
                p.woz_value, p.year_built,
                ST_Distance(
                    ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                ) AS distance_m
            FROM properties p
            WHERE p.id != :pid
              AND p.property_type = :ptype
              AND p.latitude IS NOT NULL
              AND ST_DWithin(
                  ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
                  ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                  3000
              )
              AND (
                  :woz IS NULL
                  OR (p.woz_value IS NOT NULL
                      AND p.woz_value BETWEEN :woz * 0.7 AND :woz * 1.3)
              )
            ORDER BY distance_m ASC
            LIMIT 6
        """), {
            "pid":   property_id,
            "lat":   prop.latitude,
            "lon":   prop.longitude,
            "ptype": prop.property_type,
            "woz":   prop.woz_value,
        })
        rows = similar_rows.fetchall()

    return {
        "property_id": property_id,
        "similar": [
            {
                "id":            r.id,
                "street":        r.street,
                "house_number":  r.house_number,
                "city":          r.city,
                "latitude":      r.latitude,
                "longitude":     r.longitude,
                "area_m2":       r.living_area_m2,
                "property_type": r.property_type,
                "energy_label":  r.energy_label,
                "woz_value":     r.woz_value,
                "year_built":    r.year_built,
                "distance_m":    round(r.distance_m),
            }
            for r in rows
        ]
    }


# ── WALKABILITY SCORE ─────────────────────────────────────────────
@router.get("/{property_id}/walkability")
async def get_walkability(property_id: int):
    """
    Computes walk/transit/bike scores from OSM amenities in DB.

    Scoring logic:
      Walk score  — shops, restaurants, schools within 500m
      Transit score — bus/tram/train stops within 800m
      Bike score  — cycling infrastructure + flat terrain (proxy: Eindhoven is flat)

    Each score 0–100, based on count + distance weighting.
    """
    async with get_db_session() as db:
        res  = await db.execute(select(Property).where(Property.id == property_id))
        prop = res.scalar_one_or_none()
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")

        # All amenities within 1km
        amenity_rows = await db.execute(text("""
            SELECT
                a.name, a.amenity_type,
                ST_Distance(
                    ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                ) AS distance_m
            FROM amenities a
            WHERE ST_DWithin(
                ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                1000
            )
            ORDER BY distance_m ASC
        """), {"lat": prop.latitude, "lon": prop.longitude})
        amenities = amenity_rows.fetchall()

    # ── Walk score ────────────────────────────────────────
    WALK_TYPES = {'supermarket', 'convenience', 'bakery', 'restaurant', 'cafe',
                  'pharmacy', 'school', 'kindergarten', 'doctor', 'bank', 'post_office'}
    walk_items = [a for a in amenities if a.amenity_type in WALK_TYPES and a.distance_m <= 500]
    # Weight by distance: closer = more score
    walk_raw = sum(max(0, 1 - a.distance_m / 500) for a in walk_items)
    walk_score = min(100, int(walk_raw * 18))

    # ── Transit score ─────────────────────────────────────
    TRANSIT_TYPES = {'bus_stop', 'tram_stop', 'train_station', 'subway_entrance', 'ferry_terminal'}
    transit_items = [a for a in amenities if a.amenity_type in TRANSIT_TYPES and a.distance_m <= 800]
    transit_raw   = sum(max(0, 1 - a.distance_m / 800) for a in transit_items)
    # Train station counts more
    train_bonus   = sum(15 for a in transit_items if a.amenity_type == 'train_station')
    transit_score = min(100, int(transit_raw * 25 + train_bonus))

    # ── Bike score ────────────────────────────────────────
    # Eindhoven is very flat and has excellent cycling infra → base 60
    # Adjust by proximity to bike shops, parks
    BIKE_BOOST = {'bicycle_rental', 'bicycle_repair_station', 'park', 'sports_centre'}
    bike_items = [a for a in amenities if a.amenity_type in BIKE_BOOST and a.distance_m <= 800]
    bike_score = min(100, 60 + len(bike_items) * 5)

    # ── Nearest of each type ──────────────────────────────
    nearest_transit = next((a for a in amenities if a.amenity_type in TRANSIT_TYPES), None)
    nearest_super   = next((a for a in amenities if a.amenity_type == 'supermarket'), None)
    nearest_school  = next((a for a in amenities if a.amenity_type in {'school','kindergarten'}), None)
    nearest_park    = next((a for a in amenities if a.amenity_type == 'park'), None)

    def fmt_dist(d: float) -> str:
        return f"{int(d)}m" if d < 1000 else f"{d/1000:.1f}km"

    return {
        "property_id":   property_id,
        "walk_score":    walk_score,
        "transit_score": transit_score,
        "bike_score":    bike_score,
        "labels": {
            "walk":    label_for(walk_score),
            "transit": label_for(transit_score),
            "bike":    label_for(bike_score),
        },
        "nearest": {
            "transit": {"name": nearest_transit.name, "distance": fmt_dist(nearest_transit.distance_m)} if nearest_transit else None,
            "supermarket": {"name": nearest_super.name, "distance": fmt_dist(nearest_super.distance_m)} if nearest_super else None,
            "school":  {"name": nearest_school.name,  "distance": fmt_dist(nearest_school.distance_m)}  if nearest_school  else None,
            "park":    {"name": nearest_park.name,    "distance": fmt_dist(nearest_park.distance_m)}    if nearest_park    else None,
        },
        "amenity_count": {
            "walkable": len(walk_items),
            "transit":  len(transit_items),
            "bike":     len(bike_items),
        }
    }


def label_for(score: int) -> str:
    if score >= 90: return "Walker's Paradise"
    if score >= 70: return "Very Walkable"
    if score >= 50: return "Walkable"
    if score >= 25: return "Some Errands on Foot"
    return "Car-Dependent"


# ── GET ONE PROPERTY — unchanged ──────────────────────────────────
@router.get("/{property_id}")
async def get_property(property_id: int):
    async with get_db_session() as db:
        result = await db.execute(select(Property).where(Property.id == property_id))
        prop   = result.scalar_one_or_none()

    if not prop:
        raise HTTPException(status_code=404, detail=f"Property {property_id} not found")

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