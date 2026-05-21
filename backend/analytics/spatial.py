# ─────────────────────────────────────────────────────────────
# backend/analytics/spatial.py
#
# PURPOSE:
#   Handles all location-based queries.
#   The most important one: "find all properties within X km
#   of a given coordinate."
#
# WHY THIS IS IMPORTANT:
#   Everything in Groundr is based on a neighborhood radius.
#   When you search an address, we find all nearby properties
#   and calculate statistics from them:
#     - Average price per m²
#     - Property type distribution
#     - Price trends
#     - Rental yield
#   All of this requires finding "nearby properties" first.
#
# HOW THE DISTANCE CALCULATION WORKS:
#   We use the Haversine formula — the same one used in osm.py.
#   It calculates straight-line distance between two GPS points.
#   Accurate enough for distances under 50km.
#
# NOTE ON POSTGIS:
#   In a future version, we will replace the Python distance
#   calculation with a PostgreSQL/PostGIS query:
#     SELECT * FROM properties
#     WHERE ST_DWithin(geometry, point, radius)
#   This is much faster for large datasets (100K+ properties).
#   For now, with 24 properties, Python is fine.
# ─────────────────────────────────────────────────────────────

import logging
import math
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import select

from config.settings import settings
from db.connection import get_db_session
from db.models import Amenity, AmenityType, Property

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# DATA CLASSES
#
# These are simple containers for structured data.
# Like a dictionary but with named fields and type hints.
# ─────────────────────────────────────────────────────────────

@dataclass
class PropertyWithDistance:
    """
    A property together with its distance from a search point.
    Returned by radius_query().
    """
    property:   Property    # the full property record
    distance_m: float       # distance in metres from search point


@dataclass
class NearbyAmenity:
    """
    An amenity (school, station, etc.) near a property.
    """
    name:         str
    amenity_type: AmenityType
    distance_m:   float


# ─────────────────────────────────────────────────────────────
# MAIN FUNCTION: RADIUS QUERY
#
# Given a coordinate (lat, lon) and a radius in km,
# return all properties within that radius.
# ─────────────────────────────────────────────────────────────

async def radius_query(
    lat:       float,
    lon:       float,
    radius_km: float = None,
) -> list[PropertyWithDistance]:
    """
    Find all properties within radius_km of the given coordinate.

    Returns a list of PropertyWithDistance objects,
    sorted by distance (closest first).

    Example:
        results = await radius_query(51.44, 5.47, radius_km=2.0)
        for r in results:
            print(r.property.street, r.distance_m)
    """

    # Use the default radius from settings if none given
    radius_km = radius_km or settings.DEFAULT_RADIUS_KM

    # Validate the radius is within allowed bounds
    radius_km = max(settings.MIN_RADIUS_KM, radius_km)
    radius_km = min(settings.MAX_RADIUS_KM, radius_km)

    radius_m = radius_km * 1000   # convert to metres

    logger.info(
        f"[SPATIAL] Radius query: lat={lat}, lon={lon}, "
        f"radius={radius_km}km"
    )

    # ── Load all properties from the database ─────────────
    # In future: replace with PostGIS ST_DWithin() query
    async with get_db_session() as db:
        result = await db.execute(select(Property))
        all_properties = result.scalars().all()

    # ── Calculate distance for each property ──────────────
    nearby = []

    for prop in all_properties:

        # Skip properties without coordinates
        if prop.latitude is None or prop.longitude is None:
            continue

        # Calculate straight-line distance
        distance_m = haversine_distance(
            lat1 = lat,
            lon1 = lon,
            lat2 = prop.latitude,
            lon2 = prop.longitude,
        )

        # Only keep properties within the radius
        if distance_m <= radius_m:
            nearby.append(
                PropertyWithDistance(
                    property   = prop,
                    distance_m = round(distance_m, 1),
                )
            )

    # ── Sort by distance (closest first) ──────────────────
    nearby.sort(key=lambda x: x.distance_m)

    logger.info(
        f"[SPATIAL] Found {len(nearby)} properties "
        f"within {radius_km}km"
    )

    return nearby


# ─────────────────────────────────────────────────────────────
# GET AMENITIES FOR A PROPERTY
#
# Returns all amenities linked to a property,
# sorted by distance.
# ─────────────────────────────────────────────────────────────

async def get_amenities(
    property_id: int,
) -> list[NearbyAmenity]:
    """
    Get all amenities near a specific property.
    Returns them sorted by distance (closest first).
    """

    async with get_db_session() as db:
        result = await db.execute(
            select(Amenity)
            .where(Amenity.property_id == property_id)
            .order_by(Amenity.distance_m)
        )
        amenities = result.scalars().all()

    return [
        NearbyAmenity(
            name         = a.name,
            amenity_type = a.amenity_type,
            distance_m   = a.distance_m,
        )
        for a in amenities
    ]


# ─────────────────────────────────────────────────────────────
# GET NEAREST AMENITY BY TYPE
#
# Example: "what is the nearest train station?"
# ─────────────────────────────────────────────────────────────

async def get_nearest_amenity(
    property_id:  int,
    amenity_type: AmenityType,
) -> Optional[NearbyAmenity]:
    """
    Get the closest amenity of a specific type near a property.
    Returns None if no amenity of that type exists.

    Example:
        station = await get_nearest_amenity(1, AmenityType.STATION)
        if station:
            print(f"Nearest station: {station.name} ({station.distance_m}m)")
    """

    async with get_db_session() as db:
        result = await db.execute(
            select(Amenity)
            .where(
                Amenity.property_id  == property_id,
                Amenity.amenity_type == amenity_type,
            )
            .order_by(Amenity.distance_m)
            .limit(1)
        )
        amenity = result.scalar_one_or_none()

    if not amenity:
        return None

    return NearbyAmenity(
        name         = amenity.name,
        amenity_type = amenity.amenity_type,
        distance_m   = amenity.distance_m,
    )


# ─────────────────────────────────────────────────────────────
# HAVERSINE DISTANCE FORMULA
#
# Calculates the straight-line distance between two GPS points.
# Returns the distance in metres.
#
# This is the standard formula used in navigation and mapping.
# It accounts for the curvature of the Earth.
# ─────────────────────────────────────────────────────────────

def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculate distance between two GPS coordinates in metres.

    Example:
        dist = haversine_distance(51.44, 5.47, 51.45, 5.48)
        print(f"{dist:.0f} metres")
    """

    R = 6371000  # Earth radius in metres

    # Convert degrees to radians
    phi1    = math.radians(lat1)
    phi2    = math.radians(lat2)
    dphi    = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2)
        * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c