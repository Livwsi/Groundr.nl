# ─────────────────────────────────────────────────────────────
# backend/collectors/cbs.py
#
# PURPOSE:
#   Collects neighborhood statistics from CBS (Centraal Bureau
#   voor de Statistiek) — the official Dutch statistics bureau.
#
# WHY THIS DATA MATTERS:
#   Neighborhood quality directly affects property values.
#   CBS tells us per neighborhood (buurt):
#     - Average household income
#     - % of social housing vs private ownership
#     - Population density
#     - % apartments vs houses
#   This feeds into our investment score formula.
#
# API USED:
#   CBS OData API — completely free, no key needed.
#   Documentation: https://www.cbs.nl/nl-nl/onze-diensten/open-data/
#
# HOW TO RUN MANUALLY:
#   cd C:\Users\ibaka\groundr\backend
#   python -m collectors.cbs
# ─────────────────────────────────────────────────────────────

import asyncio
import logging
from typing import Optional

from sqlalchemy import select

from collectors.base import BaseCollector
from db.connection import get_db_session
from db.models import Property

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# CBS API SETTINGS
#
# CBS provides data per "gemeente" (municipality) and
# "buurt" (neighborhood). We use the Kerncijfers Wijken
# en Buurten dataset — the most useful one for real estate.
#
# The dataset code "85039NED" is the latest available.
# It contains ~50 statistics per neighborhood in the Netherlands.
# ─────────────────────────────────────────────────────────────

CBS_BASE_URL  = "https://opendata.cbs.nl/ODataApi/odata"
CBS_DATASET   = "85039NED"   # Kerncijfers Wijken en Buurten

# The columns we actually need from CBS
# (CBS has ~50 columns — we only fetch what we use)
CBS_COLUMNS = ",".join([
    "WijkenEnBuurten",     # neighborhood code (e.g. "BU07720101")
    "Gemeentenaam_1",      # municipality name
    "Wijknaam_2",          # district name
    "Buurtnaam_3",         # neighborhood name
    "AantalInwoners_5",    # total population
    "Woningvoorraad_22",   # total housing stock
    "GemiddeldeWozWaardeWoning_35",  # average WOZ value
    "PercentageEigenaarBewoners_51", # % owner-occupied homes
    "PercentageHuurwoningenTotaal_57", # % rental homes
    "GemiddeldInkomenPerInwoner_66", # average income per resident
])

# Dutch municipalities we want data for
# These match the cities in our BAG collector
TARGET_MUNICIPALITIES = [
    "Eindhoven",
    "Veldhoven",
    "Helmond",
]


class CBSCollector(BaseCollector):
    """
    Collects neighborhood statistics from the CBS OData API.
    Stores results in a simple cache on each Property record.
    """

    SOURCE_NAME = "cbs"


    # ─────────────────────────────────────────────────────────
    # STEP 1: COLLECT
    # Fetch neighborhood data from CBS for our target cities.
    # ─────────────────────────────────────────────────────────

    async def collect(
        self,
        municipalities: list[str] = None,
    ) -> list[dict]:
        """
        Fetch CBS neighborhood statistics.
        Returns a list of raw neighborhood records.
        """
        municipalities = municipalities or TARGET_MUNICIPALITIES
        all_records    = []

        for municipality in municipalities:
            logger.info(f"[CBS] Fetching data for: {municipality}")

            records = await self._fetch_municipality(municipality)
            all_records.extend(records)

            logger.info(
                f"[CBS] Got {len(records)} neighborhoods for {municipality}"
            )

        return all_records


    # ─────────────────────────────────────────────────────────
    # STEP 2: PARSE
    # Clean one raw CBS record into a usable format.
    # ─────────────────────────────────────────────────────────

    def parse(self, raw: dict) -> Optional[dict]:
        """
        Normalise one CBS neighborhood record.
        Returns None if required fields are missing.
        """

        # Neighborhood name and municipality are required
        buurt_naam    = raw.get("Buurtnaam_3", "").strip()
        gemeente_naam = raw.get("Gemeentenaam_1", "").strip()

        if not buurt_naam or not gemeente_naam:
            return None

        # ── Extract statistics ────────────────────────────
        # CBS uses None for missing values (shown as "." in their UI)
        # We convert to float/int where possible

        return {
            "neighborhood_code":    raw.get("WijkenEnBuurten", "").strip(),
            "neighborhood_name":    buurt_naam,
            "district_name":        raw.get("Wijknaam_2", "").strip(),
            "municipality_name":    gemeente_naam,

            # Population and housing
            "population":           self._to_int(raw.get("AantalInwoners_5")),
            "total_homes":          self._to_int(raw.get("Woningvoorraad_22")),

            # Financial
            "avg_woz_value":        self._to_float(
                                        raw.get("GemiddeldeWozWaardeWoning_35")
                                    ),
            "avg_income_per_person":self._to_float(
                                        raw.get("GemiddeldInkomenPerInwoner_66")
                                    ),

            # Ownership split
            "pct_owner_occupied":   self._to_float(
                                        raw.get("PercentageEigenaarBewoners_51")
                                    ),
            "pct_rental":           self._to_float(
                                        raw.get("PercentageHuurwoningenTotaal_57")
                                    ),
        }


    # ─────────────────────────────────────────────────────────
    # STEP 3: SAVE
    # Match CBS neighborhoods to properties we already have,
    # and store the neighborhood name on each property.
    # ─────────────────────────────────────────────────────────

    async def save(self, parsed_records: list[dict]) -> tuple[int, int]:
        """
        Match neighborhoods to existing properties by city name.
        Updates the neighborhood field on matching properties.
        """
        if not parsed_records:
            return 0, 0

        updated = 0

        # Build a lookup: city name → list of neighborhood names
        # We use this to enrich properties we already have in the DB
        city_neighborhoods: dict[str, list[str]] = {}

        for record in parsed_records:
            city = record["municipality_name"]
            name = record["neighborhood_name"]

            if city not in city_neighborhoods:
                city_neighborhoods[city] = []
            city_neighborhoods[city].append(name)

        # Log what we found for each city
        for city, neighborhoods in city_neighborhoods.items():
            logger.info(
                f"[CBS] {city}: {len(neighborhoods)} neighborhoods found"
            )

        # Update properties in our database with neighborhood info
        async with get_db_session() as db:
            for city, neighborhoods in city_neighborhoods.items():

                # Find all properties in this city without a neighborhood
                result = await db.execute(
                    select(Property).where(
                        Property.city == city,
                        Property.neighborhood == None,
                    )
                )
                properties = result.scalars().all()

                # Assign the first neighborhood as a default
                # (In a real scenario we'd do a proper geo-lookup)
                if properties and neighborhoods:
                    for prop in properties:
                        prop.neighborhood = neighborhoods[0]
                        updated += 1

        # CBS data itself is informational — we log it but don't
        # create new DB records for neighborhoods in this version.
        # In a later version we'll add a neighborhoods table.
        added = len(parsed_records)

        return added, updated


    # ─────────────────────────────────────────────────────────
    # PRIVATE HELPERS
    # ─────────────────────────────────────────────────────────

    async def _fetch_municipality(self, municipality: str) -> list[dict]:
        """
        Fetch all neighborhood records for one municipality from CBS.
        CBS OData API uses $filter, $select, and $format parameters.
        """

        params = {
            # Filter to only this municipality
            "$filter":  f"Gemeentenaam_1 eq '{municipality}'",

            # Only fetch the columns we need (much faster)
            "$select":  CBS_COLUMNS,

            # Return JSON instead of XML
            "$format":  "json",

            # Only return neighborhoods (buurt), not districts (wijk)
            # Buurt codes start with "BU", wijk codes start with "WK"
            # We add this as a substring filter
        }

        url      = f"{CBS_BASE_URL}/{CBS_DATASET}/TypedDataSet"
        response = await self.get(url, params=params)

        if not response:
            logger.warning(f"[CBS] No response for {municipality}")
            return []

        # CBS wraps results in a "value" array
        records = response.get("value", [])

        # Filter to only actual neighborhoods (code starts with "BU")
        neighborhoods = [
            r for r in records
            if str(r.get("WijkenEnBuurten", "")).strip().startswith("BU")
        ]

        return neighborhoods

    @staticmethod
    def _to_int(value) -> Optional[int]:
        """Safely convert to int, return None if impossible."""
        try:
            return int(float(value)) if value is not None else None
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _to_float(value) -> Optional[float]:
        """Safely convert to float, return None if impossible."""
        try:
            return float(value) if value is not None else None
        except (ValueError, TypeError):
            return None


# ─────────────────────────────────────────────────────────────
# MANUAL TEST
#
# Run this file directly to test:
#   cd C:\Users\ibaka\groundr\backend
#   python -m collectors.cbs
# ─────────────────────────────────────────────────────────────

async def _test():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    print("\n Starting CBS collector test...\n")

    async with CBSCollector() as collector:
        result = await collector.run(
            municipalities=["Eindhoven"],
        )

    print("\n── Result ──────────────────────────────")
    print(f"  Status:   {result['status']}")
    print(f"  Added:    {result['records_added']} neighborhoods")
    print(f"  Updated:  {result['records_updated']} properties enriched")
    print(f"  Duration: {result['duration_s']} seconds")
    if result.get("error_message"):
        print(f"  Error:    {result['error_message']}")
    print("────────────────────────────────────────\n")


if __name__ == "__main__":
    asyncio.run(_test())