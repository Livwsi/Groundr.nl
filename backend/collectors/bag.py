# ─────────────────────────────────────────────────────────────
# backend/collectors/bag.py
#
# PURPOSE:
#   Collects real Dutch address and building data from the
#   official BAG (Basisregistratie Adressen en Gebouwen) via
#   the PDOK Locatieserver API.
#
# WHY THIS FIRST:
#   - Completely free, no API key needed
#   - Official Dutch government data — reliable
#   - No scraping risk (it's a proper REST API)
#   - Gives us real addresses + coordinates to build on
#
# WHAT IT COLLECTS:
#   - Street address + postal code + city
#   - GPS coordinates (latitude + longitude)
#   - BAG ID (official building identifier)
#   - Year built, living area, property type
#
# HOW TO RUN MANUALLY (for testing):
#   cd C:\Users\ibaka\groundr\backend
#   python -m collectors.bag
# ─────────────────────────────────────────────────────────────

import asyncio
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select

from collectors.base import BaseCollector
from config.settings import settings
from db.connection import get_db_session
from db.models import Property, PropertyType

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# PDOK API URL
#
# This is the official Dutch geocoding API.
# Documentation: https://api.pdok.nl/bzk/locatieserver/search/v3_1/ui/
# ─────────────────────────────────────────────────────────────

PDOK_FREE_URL = f"{settings.PDOK_BASE_URL}/free"


# ─────────────────────────────────────────────────────────────
# DEFAULT CITIES TO COLLECT
#
# These are the cities we collect addresses for.
# Start small (Eindhoven area) and expand later.
# ─────────────────────────────────────────────────────────────

DEFAULT_CITIES = [
    "Eindhoven",
    "Veldhoven",
    "Helmond",
]


class BAGCollector(BaseCollector):
    """
    Collects Dutch address data from the PDOK/BAG API.
    Inherits all HTTP, retry, and logging from BaseCollector.
    """

    SOURCE_NAME = "bag"


    # ─────────────────────────────────────────────────────────
    # STEP 1: COLLECT
    # Fetch raw address records from the PDOK API.
    # ─────────────────────────────────────────────────────────

    async def collect(
        self,
        cities: list[str] = None,
        max_per_city: int = 100,
    ) -> list[dict]:
        """
        Fetch raw address records for each city.
        Returns a flat list of raw API response documents.
        """
        cities      = cities or DEFAULT_CITIES
        all_records = []

        for city in cities:
            logger.info(f"[BAG] Fetching addresses for: {city}")

            city_records = await self._fetch_city(city, max_per_city)
            all_records.extend(city_records)

            logger.info(f"[BAG] Got {len(city_records)} records for {city}")

        return all_records


    # ─────────────────────────────────────────────────────────
    # STEP 2: PARSE
    # Clean one raw API record into our Property format.
    # ─────────────────────────────────────────────────────────

    def parse(self, raw: dict) -> Optional[dict]:
        """
        Normalise one raw PDOK document into our Property schema.
        Returns None if the record is missing required fields.
        """

        # The PDOK API wraps results in a "response.docs" list
        docs = raw.get("response", {}).get("docs", [])
        if not docs:
            return None

        doc = docs[0]

        # ── Required: BAG ID ──────────────────────────────
        # Every Dutch building has a unique BAG identifier
        bag_id = doc.get("id") or doc.get("identificatie")
        if not bag_id:
            return None

        # ── Required: Coordinates ─────────────────────────
        # PDOK returns coordinates as "POINT(longitude latitude)"
        centroide    = doc.get("centroide_ll", "")
        lat, lon     = self._parse_coordinates(centroide)
        if lat is None or lon is None:
            return None

        # ── Required: Address ─────────────────────────────
        street = doc.get("straatnaam", "")
        city   = doc.get("woonplaatsnaam", "")
        if not street or not city:
            return None

        # ── Optional: Building attributes ─────────────────
        house_number = str(doc.get("huisnummer", ""))
        postal_code  = doc.get("postcode", "")
        municipality = doc.get("gemeentenaam", "")
        year_built   = self._to_int(doc.get("bouwjaar"))
        area_m2      = self._to_float(doc.get("oppervlakte"))
        prop_type    = self._map_type(doc.get("typeadrescode", ""))

        # Return a clean dictionary matching our Property model
        return {
            "bag_id":          bag_id,
            "street":          street,
            "house_number":    house_number,
            "postal_code":     postal_code,
            "city":            city,
            "municipality":    municipality,
            "latitude":        lat,
            "longitude":       lon,
            "year_built":      year_built,
            "living_area_m2":  area_m2,
            "property_type":   prop_type,
            "source":          "bag",
        }


    # ─────────────────────────────────────────────────────────
    # STEP 3: SAVE
    # Write parsed records to the properties table.
    # ─────────────────────────────────────────────────────────

    async def save(self, parsed_records: list[dict]) -> tuple[int, int]:
        """
        Upsert records into the properties table.
        - If the bag_id already exists → update it
        - If it's new → insert it
        Returns (added, updated) counts.
        """
        if not parsed_records:
            return 0, 0

        added   = 0
        updated = 0

        async with get_db_session() as db:
            for record in parsed_records:
                try:
                    # Check if this property already exists
                    result   = await db.execute(
                        select(Property).where(
                            Property.bag_id == record["bag_id"]
                        )
                    )
                    existing = result.scalar_one_or_none()

                    if existing:
                        # Update the existing record with fresh data
                        for field, value in record.items():
                            if hasattr(existing, field) and value is not None:
                                setattr(existing, field, value)
                        existing.updated_at = datetime.utcnow()
                        updated += 1

                    else:
                        # Insert a new property record
                        new_property = Property(**record)
                        db.add(new_property)
                        added += 1

                except Exception as e:
                    logger.warning(
                        f"[BAG] Could not save {record.get('bag_id')}: {e}"
                    )
                    continue

        return added, updated


    # ─────────────────────────────────────────────────────────
    # PRIVATE HELPERS
    # Internal methods used only inside this class.
    # ─────────────────────────────────────────────────────────

    async def _fetch_city(self, city: str, max_results: int) -> list[dict]:
        """
        Fetch all address records for one city.
        Paginates through results (100 per page max).
        """
        results   = []
        start     = 0
        page_size = 100

        while start < max_results:
            # How many records to request in this page
            rows_to_fetch = min(page_size, max_results - start)

            params = {
                "q":     city,                    # search query
                "fq":    f"woonplaatsnaam:{city}", # filter by city name
                "fl":    "*",                      # return all fields
                "rows":  rows_to_fetch,
                "start": start,
            }

            response = await self.get(PDOK_FREE_URL, params=params)
            if not response:
                break

            docs = response.get("response", {}).get("docs", [])
            if not docs:
                break

            # Wrap each document so parse() can handle it
            for doc in docs:
                results.append({"response": {"docs": [doc]}})

            start += len(docs)

            # If we got fewer than requested, there are no more pages
            if len(docs) < page_size:
                break

        return results

    @staticmethod
    def _parse_coordinates(centroide: str) -> tuple[Optional[float], Optional[float]]:
        """
        Parse PDOK coordinate format into (latitude, longitude).

        PDOK returns: "POINT(5.47761 51.44083)"
        We need:      latitude=51.44083, longitude=5.47761

        Also validates the coordinates are inside the Netherlands.
        Netherlands bounding box: lon 3.0-7.5, lat 50.5-53.7
        """
        try:
            # Remove "POINT(" and ")" then split into lon and lat
            clean  = centroide.replace("POINT(", "").replace(")", "")
            parts  = clean.split()
            lon    = float(parts[0])
            lat    = float(parts[1])

            # Check coordinates are inside the Netherlands
            if 3.0 <= lon <= 7.5 and 50.5 <= lat <= 53.7:
                return lat, lon

        except (ValueError, IndexError, AttributeError):
            pass

        return None, None

    @staticmethod
    def _map_type(type_code: str) -> PropertyType:
        """
        Map PDOK type codes to our PropertyType enum.
        Defaults to UNKNOWN if we don't recognise the code.
        """
        mapping = {
            "verblijfsobject": PropertyType.APARTMENT,
            "woonhuis":        PropertyType.HOUSE,
            "appartement":     PropertyType.APARTMENT,
            "vrijstaand":      PropertyType.DETACHED,
            "hoekwoning":      PropertyType.SEMI_DET,
            "tussenwoning":    PropertyType.TOWNHOUSE,
        }
        return mapping.get(type_code.lower(), PropertyType.UNKNOWN)

    @staticmethod
    def _to_int(value) -> Optional[int]:
        """Safely convert a value to int, returns None if it fails."""
        try:
            return int(value) if value is not None else None
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _to_float(value) -> Optional[float]:
        """Safely convert a value to float, returns None if it fails."""
        try:
            return float(value) if value is not None else None
        except (ValueError, TypeError):
            return None


# ─────────────────────────────────────────────────────────────
# MANUAL TEST
#
# Run this file directly to test the collector:
#   cd C:\Users\ibaka\groundr\backend
#   python -m collectors.bag
# ─────────────────────────────────────────────────────────────

async def _test():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    print("\n Starting BAG collector test...\n")

    async with BAGCollector() as collector:
        result = await collector.run(
            cities=["Eindhoven"],
            max_per_city=25,        # small number for testing
        )

    print("\n── Result ──────────────────────────────")
    print(f"  Status:   {result['status']}")
    print(f"  Added:    {result['records_added']} new properties")
    print(f"  Updated:  {result['records_updated']} existing properties")
    print(f"  Duration: {result['duration_s']} seconds")
    if result.get("error_message"):
        print(f"  Error:    {result['error_message']}")
    print("────────────────────────────────────────\n")
# ─────────────────────────────────────────────────────────────
# GEOCODE A SINGLE ADDRESS
#
# Converts a text address into GPS coordinates.
# Used by the API routes to locate a searched address.
#
# Example:
#   result = await geocode_address("Stratumsedijk 23 Eindhoven")
#   print(result["latitude"], result["longitude"])
# ─────────────────────────────────────────────────────────────

async def geocode_address(address: str) -> Optional[dict]:
    """
    Convert a text address into coordinates using PDOK.
    Returns a dict with latitude, longitude, and address details.
    Returns None if the address is not found.
    """
    async with BAGCollector() as collector:
        params = {
            "q":    address,
            "fl":   "*",
            "rows": 1,
        }

        response = await collector.get(PDOK_FREE_URL, params=params)
        if not response:
            return None

        docs = response.get("response", {}).get("docs", [])
        if not docs:
            return None

        # Parse the first result
        parsed = collector.parse({"response": {"docs": [docs[0]]}})
        return parsed    


if __name__ == "__main__":
    asyncio.run(_test())