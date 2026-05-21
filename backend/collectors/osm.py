# ─────────────────────────────────────────────────────────────
# backend/collectors/osm.py
#
# PURPOSE:
#   Fetches nearby amenities for each property using
#   OpenStreetMap data via the Overpass API.
#
# WHAT IS AN AMENITY?
#   A nearby place that affects property value:
#     - Train stations    (good → higher score)
#     - Schools           (good for families)
#     - Supermarkets      (convenience)
#     - Gyms, parks       (lifestyle)
#     - Hospitals         (safety)
#
# WHY OPENSTREETMAP?
#   - Completely free, no API key needed
#   - Updated by volunteers worldwide
#   - The most complete map dataset available
#   - Powers many major apps (Uber, Airbnb, etc.)
#
# HOW IT WORKS:
#   For each property in our database, we ask OpenStreetMap:
#   "What amenities exist within 1km of these coordinates?"
#   Then we save each result as an Amenity record linked
#   to that property.
#
# HOW TO RUN MANUALLY:
#   cd C:\Users\ibaka\groundr\backend
#   python -m collectors.osm
# ─────────────────────────────────────────────────────────────
import aiohttp
import asyncio
import logging
import math
from typing import Optional

from sqlalchemy import select, delete

from collectors.base import BaseCollector
from db.connection import get_db_session
from db.models import Amenity, AmenityType, Property

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# OVERPASS API
#
# Overpass is the query API for OpenStreetMap data.
# We send it a query like:
#   "Find all schools within 1km of point X"
# And it returns matching places as JSON.
#
# Public endpoint — free, no auth needed.
# ─────────────────────────────────────────────────────────────

OVERPASS_URL    = "https://overpass-api.de/api/interpreter"
SEARCH_RADIUS_M = 1000   # search within 1km of each property


# ─────────────────────────────────────────────────────────────
# AMENITY MAPPING
#
# OpenStreetMap uses its own tags to classify places.
# We map those tags to our AmenityType enum.
#
# Format: "osm_key=osm_value" → AmenityType
# ─────────────────────────────────────────────────────────────

OSM_AMENITY_MAP = {
    # Transport
    "railway=station":          AmenityType.STATION,
    "highway=bus_stop":         AmenityType.BUS_STOP,
    "amenity=bus_station":      AmenityType.BUS_STOP,

    # Education
    "amenity=school":           AmenityType.SCHOOL,
    "amenity=university":       AmenityType.SCHOOL,
    "amenity=college":          AmenityType.SCHOOL,

    # Health
    "amenity=hospital":         AmenityType.HOSPITAL,
    "amenity=pharmacy":         AmenityType.PHARMACY,
    "amenity=doctors":          AmenityType.HOSPITAL,

    # Shopping
    "shop=supermarket":         AmenityType.SUPERMARKET,
    "shop=grocery":             AmenityType.SUPERMARKET,

    # Sport & leisure
    "leisure=fitness_centre":   AmenityType.GYM,
    "leisure=sports_centre":    AmenityType.GYM,
    "leisure=park":             AmenityType.PARK,
    "leisure=garden":           AmenityType.PARK,
}


class OSMCollector(BaseCollector):
    """
    Fetches nearby amenities for each property using OpenStreetMap.
    """

    SOURCE_NAME = "osm"


    # ─────────────────────────────────────────────────────────
    # STEP 1: COLLECT
    # For each property in the database, fetch nearby amenities.
    # ─────────────────────────────────────────────────────────

    async def collect(
        self,
        city: str = "Eindhoven",
        limit: int = 10,
    ) -> list[dict]:
        """
        Fetch amenities for each property in the given city.
        Returns a flat list where each item contains:
          - property_id: which property these amenities belong to
          - amenities:   list of nearby places from OSM
        """
        all_results = []

        # Load properties from our database for this city
        async with get_db_session() as db:
            result = await db.execute(
                select(Property)
                .where(Property.city == city)
                .limit(limit)
            )
            properties = result.scalars().all()

        if not properties:
            logger.warning(f"[OSM] No properties found for city: {city}")
            return []

        logger.info(
            f"[OSM] Fetching amenities for "
            f"{len(properties)} properties in {city}"
        )

        # Fetch amenities for each property one by one
        for prop in properties:
            logger.info(
                f"[OSM] Querying around: "
                f"{prop.street} {prop.house_number}"
            )

            amenities = await self._fetch_amenities(
                lat=prop.latitude,
                lon=prop.longitude,
                radius_m=SEARCH_RADIUS_M,
            )

            # Package results with the property ID
            all_results.append({
                "property_id": prop.id,
                "amenities":   amenities,
            })

            # Be polite to the Overpass API — small delay
            await asyncio.sleep(2)

        return all_results


    # ─────────────────────────────────────────────────────────
    # STEP 2: PARSE
    # The collect() method already returns structured data,
    # so parse() here just passes it through unchanged.
    # ─────────────────────────────────────────────────────────

    def parse(self, raw: dict) -> Optional[dict]:
        """Pass through — data is already structured in collect()."""
        if not raw.get("property_id") or not raw.get("amenities"):
            return None
        return raw


    # ─────────────────────────────────────────────────────────
    # STEP 3: SAVE
    # Delete old amenities for each property and insert fresh ones.
    # ─────────────────────────────────────────────────────────

    async def save(self, parsed_records: list[dict]) -> tuple[int, int]:
        """
        Save amenities to the database.
        Deletes existing amenities for each property first,
        then inserts the fresh ones.
        This way we always have up-to-date data.
        """
        if not parsed_records:
            return 0, 0

        total_added = 0

        async with get_db_session() as db:
            for record in parsed_records:
                property_id = record["property_id"]
                amenities   = record["amenities"]

                # Delete old amenities for this property
                await db.execute(
                    delete(Amenity).where(
                        Amenity.property_id == property_id
                    )
                )

                # Insert fresh amenities
                for a in amenities:
                    amenity = Amenity(
                        property_id  = property_id,
                        name         = a["name"],
                        amenity_type = a["amenity_type"],
                        distance_m   = a["distance_m"],
                        latitude     = a["lat"],
                        longitude    = a["lon"],
                        osm_id       = str(a["osm_id"]),
                    )
                    db.add(amenity)
                    total_added += 1

        return total_added, 0


    # ─────────────────────────────────────────────────────────
    # PRIVATE HELPERS
    # ─────────────────────────────────────────────────────────

    async def _fetch_amenities(
            self,
            lat: float,
            lon: float,
            radius_m: int,
        ) -> list[dict]:
            """
            Query the Overpass API for amenities near a coordinate.
            Uses a clean session to avoid header conflicts.
            """
            query = self._build_overpass_query(lat, lon, radius_m)

            # Use a completely fresh session for Overpass
            # Our main session headers cause 406 errors with this API
            try:
                async with aiohttp.ClientSession() as fresh_session:
                    async with fresh_session.post(
                        OVERPASS_URL,
                        data={"data": query},
                    ) as response:
                        if response.status != 200:
                            logger.warning(f"[OSM] HTTP {response.status}")
                            return []
                        result = await response.json(content_type=None)

            except Exception as e:
                logger.warning(f"[OSM] Request failed: {e}")
                return []

            elements = result.get("elements", [])

            return [
                parsed
                for element in elements
                if (parsed := self._parse_osm_element(element, lat, lon))
            ]

    def _build_overpass_query(
        self,
        lat: float,
        lon: float,
        radius_m: int,
    ) -> str:
        """
        Build an Overpass QL query string.

        Overpass QL is the query language for OpenStreetMap.
        This query says:
          "Find all nodes/ways within {radius}m of {lat},{lon}
           that match any of our amenity types"

        [out:json]  → return JSON format
        [timeout:10] → give up after 10 seconds
        """

        # Build one query line per amenity type we care about
        query_parts = []

        for osm_tag in OSM_AMENITY_MAP.keys():
            key, value = osm_tag.split("=")

            # node  = a single point (e.g. a bus stop)
            # way   = a polygon (e.g. a park, a school building)
            for element_type in ["node", "way"]:
                query_parts.append(
                    f'{element_type}["{key}"="{value}"]'
                    f"(around:{radius_m},{lat},{lon});"
                )

        # Combine into a full Overpass query
        query = f"""
        [out:json][timeout:10];
        (
          {''.join(query_parts)}
        );
        out center;
        """

        return query

    def _parse_osm_element(
        self,
        element: dict,
        prop_lat: float,
        prop_lon: float,
    ) -> Optional[dict]:
        """
        Parse one OSM element into our amenity format.
        Returns None if we can't determine the type or location.
        """
        tags = element.get("tags", {})

        # Determine the coordinates
        # "node" elements have lat/lon directly
        # "way" elements have a "center" with lat/lon
        if element.get("type") == "node":
            lat = element.get("lat")
            lon = element.get("lon")
        else:
            center = element.get("center", {})
            lat    = center.get("lat")
            lon    = center.get("lon")

        if lat is None or lon is None:
            return None

        # Determine the amenity type from OSM tags
        amenity_type = self._classify_element(tags)
        if amenity_type is None:
            return None

        # Get the name (use type as fallback if no name)
        name = (
            tags.get("name")
            or tags.get("name:nl")
            or amenity_type.value.replace("_", " ").title()
        )

        # Calculate distance from the property
        distance_m = self._haversine_distance(prop_lat, prop_lon, lat, lon)

        return {
            "osm_id":       element.get("id"),
            "name":         name,
            "amenity_type": amenity_type,
            "lat":          lat,
            "lon":          lon,
            "distance_m":   round(distance_m, 1),
        }

    @staticmethod
    def _classify_element(tags: dict) -> Optional[AmenityType]:
        """
        Match OSM tags against our mapping to get an AmenityType.
        Returns None if the element doesn't match any type we care about.
        """
        for tag_string, amenity_type in OSM_AMENITY_MAP.items():
            key, value = tag_string.split("=")
            if tags.get(key) == value:
                return amenity_type
        return None

    @staticmethod
    def _haversine_distance(
        lat1: float, lon1: float,
        lat2: float, lon2: float,
    ) -> float:
        """
        Calculate the straight-line distance between two GPS coordinates
        using the Haversine formula. Returns distance in metres.

        This is accurate enough for distances under 50km.
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
            + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c


# ─────────────────────────────────────────────────────────────
# MANUAL TEST
#
# Run this file directly to test:
#   cd C:\Users\ibaka\groundr\backend
#   python -m collectors.osm
# ─────────────────────────────────────────────────────────────

async def _test():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    print("\n Starting OSM collector test...\n")

    async with OSMCollector() as collector:
        result = await collector.run(
            city="Eindhoven",
            limit=3,            # only 3 properties for testing
        )

    print("\n── Result ──────────────────────────────")
    print(f"  Status:   {result['status']}")
    print(f"  Added:    {result['records_added']} amenities")
    print(f"  Duration: {result['duration_s']} seconds")
    if result.get("error_message"):
        print(f"  Error:    {result['error_message']}")
    print("────────────────────────────────────────\n")


if __name__ == "__main__":
    asyncio.run(_test())