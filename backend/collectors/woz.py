# ─────────────────────────────────────────────────────────────
# backend/collectors/woz.py
#
# PURPOSE:
#   Collects WOZ (Waardering Onroerende Zaken) tax valuations
#   for each property in our database.
#
# WHAT IS WOZ?
#   Every year, Dutch municipalities officially value every
#   property in the Netherlands. This value (WOZ-waarde) is
#   used to calculate property taxes.
#   For us, it's crucial because:
#     - We compare asking price vs WOZ → is it overpriced?
#     - We show WOZ history → price trend over years
#     - It feeds directly into our investment score
#
# WHY A PLACEHOLDER?
#   There is no free official WOZ API (Dutch law requires
#   a law change to make it fully open — still pending).
#   Options when ready:
#     - woz-api.nl       → pay per request
#     - altum.ai         → monthly subscription
#   When you have a key, fill in API_URL and API_KEY below.
#   The rest of the code stays exactly the same.
#
# HOW TO ACTIVATE:
#   1. Get an API key from woz-api.nl or altum.ai
#   2. Add to backend/.env:
#        WOZ_API_KEY=your-key-here
#        WOZ_API_URL=https://api.woz-api.nl/v1/woz
#   3. Remove the "NOT CONFIGURED" check in collect()
#
# HOW TO RUN MANUALLY (once configured):
#   cd C:\Users\ibaka\groundr\backend
#   python -m collectors.woz
# ─────────────────────────────────────────────────────────────

import asyncio
import logging
from typing import Optional
from datetime import datetime

from sqlalchemy import select

from collectors.base import BaseCollector
from config.settings import settings
from db.connection import get_db_session
from db.models import Property

logger = logging.getLogger(__name__)


class WOZCollector(BaseCollector):
    """
    Collects WOZ tax valuations and saves them to each property.
    Currently a placeholder — activate by adding API credentials.
    """

    SOURCE_NAME = "woz"


    # ─────────────────────────────────────────────────────────
    # STEP 1: COLLECT
    # Fetch WOZ values for all properties in our database.
    # ─────────────────────────────────────────────────────────

    async def collect(self, **kwargs) -> list[dict]:
        """
        Fetch WOZ valuations for each property.
        Returns empty list until API is configured.
        """

        # ── Check if API is configured ────────────────────
        # This check prevents errors when no key is set.
        # Remove this block once you have an API key.
        if not settings.ALTUM_AI_API_KEY:
            logger.warning(
                "[WOZ] No API key configured. "
                "Add ALTUM_AI_API_KEY to your .env file. "
                "Skipping WOZ collection."
            )
            return []

        # ── Load properties from our database ─────────────
        # We only fetch WOZ for properties that don't have
        # a value yet, or where the value is more than a
        # year old (WOZ updates yearly in January).
        async with get_db_session() as db:
            result = await db.execute(
                select(Property).where(
                    Property.woz_value == None
                ).limit(100)
            )
            properties = result.scalars().all()

        if not properties:
            logger.info("[WOZ] All properties already have WOZ values.")
            return []

        logger.info(f"[WOZ] Fetching WOZ for {len(properties)} properties")

        # ── Fetch WOZ for each property ───────────────────
        results = []
        for prop in properties:
            woz_data = await self._fetch_woz(prop)
            if woz_data:
                results.append(woz_data)

        return results


    # ─────────────────────────────────────────────────────────
    # STEP 2: PARSE
    # Clean one raw API response into our format.
    # ─────────────────────────────────────────────────────────

    def parse(self, raw: dict) -> Optional[dict]:
        """
        Normalise one WOZ API response.
        Returns None if required fields are missing.
        """

        property_id = raw.get("property_id")
        woz_value   = raw.get("woz_value")

        # Both are required
        if not property_id or not woz_value:
            return None

        return {
            "property_id": property_id,
            "woz_value":   float(woz_value),
            "woz_year":    raw.get("woz_year", datetime.now().year - 1),
        }


    # ─────────────────────────────────────────────────────────
    # STEP 3: SAVE
    # Update each property with its WOZ value.
    # ─────────────────────────────────────────────────────────

    async def save(self, parsed_records: list[dict]) -> tuple[int, int]:
        """
        Update the woz_value and woz_year on each property.
        """
        if not parsed_records:
            return 0, 0

        updated = 0

        async with get_db_session() as db:
            for record in parsed_records:
                result = await db.execute(
                    select(Property).where(
                        Property.id == record["property_id"]
                    )
                )
                prop = result.scalar_one_or_none()

                if prop:
                    prop.woz_value  = record["woz_value"]
                    prop.woz_year   = record["woz_year"]
                    prop.updated_at = datetime.utcnow()
                    updated += 1

        return 0, updated


    # ─────────────────────────────────────────────────────────
    # PRIVATE HELPERS
    # ─────────────────────────────────────────────────────────

    async def _fetch_woz(self, prop: Property) -> Optional[dict]:
        """
        Fetch WOZ value for one property from the API.

        The API call will look like this (woz-api.nl example):
          GET https://api.woz-api.nl/v1/woz
          Headers: { "x-api-key": "your-key" }
          Params:  { "postcode": "5611NC", "huisnummer": "23" }

        Response example:
          {
            "Woz": [{ "Peildatum": "2024-01-01", "VastgesteldeWaarde": 447000 }],
            "Bag": { "AdresseerbaarobjectId": "0772010000091004" }
          }
        """

        # ── This is where the real API call goes ──────────
        # Uncomment and adjust when you have an API key:
        #
        # params = {
        #     "postcode":    prop.postal_code.replace(" ", ""),
        #     "huisnummer":  prop.house_number,
        # }
        # headers = { "x-api-key": settings.ALTUM_AI_API_KEY }
        # response = await self.get(API_URL, params=params)
        # if response:
        #     woz_entries = response.get("Woz", [])
        #     if woz_entries:
        #         latest = woz_entries[0]
        #         return {
        #             "property_id": prop.id,
        #             "woz_value":   latest["VastgesteldeWaarde"],
        #             "woz_year":    int(latest["Peildatum"][:4]),
        #         }

        return None


# ─────────────────────────────────────────────────────────────
# MANUAL TEST
#
# Run this file directly to test:
#   cd C:\Users\ibaka\groundr\backend
#   python -m collectors.woz
# ─────────────────────────────────────────────────────────────

async def _test():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    print("\n Starting WOZ collector test...\n")

    async with WOZCollector() as collector:
        result = await collector.run()

    print("\n── Result ──────────────────────────────")
    print(f"  Status:   {result['status']}")
    print(f"  Updated:  {result['records_updated']} properties")
    print(f"  Duration: {result['duration_s']} seconds")
    if result.get("error_message"):
        print(f"  Error:    {result['error_message']}")
    print("────────────────────────────────────────\n")


if __name__ == "__main__":
    asyncio.run(_test())