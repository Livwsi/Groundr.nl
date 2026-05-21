# ─────────────────────────────────────────────────────────────
# backend/analytics/statistics.py
#
# PURPOSE:
#   Calculates neighborhood statistics from a list of
#   nearby properties.
#
# WHAT IT CALCULATES:
#   - Average price per m²
#   - Property type distribution (% apartments vs houses)
#   - Average days on market
#   - Rental yield estimate
#   - Price trend (how much prices changed over time)
#
# HOW IT CONNECTS TO THE REST:
#   1. spatial.py finds nearby properties (radius query)
#   2. THIS FILE calculates stats from those properties
#   3. scoring.py uses those stats to compute the score
#
# NOTE:
#   Some statistics (price trends, rental yield) need more
#   data than we currently have (24 properties, no sold prices
#   yet). We calculate what we can and return sensible defaults
#   for the rest. As the database grows, accuracy improves.
# ─────────────────────────────────────────────────────────────

import logging
from dataclasses import dataclass, field
from typing import Optional

from analytics.spatial import PropertyWithDistance
from db.models import PropertyType

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# DATA CLASS: NEIGHBORHOOD STATS
#
# This is the result of running statistics on a set of
# nearby properties. Every field is Optional because we
# may not have enough data to calculate everything.
# ─────────────────────────────────────────────────────────────

@dataclass
class NeighborhoodStats:
    """
    Statistics calculated from properties within a radius.
    Used by scoring.py to compute the investment score.
    """

    # ── How many properties were analysed ─────────────────
    total_properties:    int   = 0
    radius_km:           float = 2.0

    # ── Price statistics ──────────────────────────────────
    avg_price:           Optional[float] = None   # average asking price (€)
    avg_price_per_m2:    Optional[float] = None   # average price per m² (€)
    median_price:        Optional[float] = None

    # ── Property type mix ─────────────────────────────────
    # Percentage of each type in the neighborhood (0–100)
    pct_apartments:      float = 0.0
    pct_houses:          float = 0.0
    pct_other:           float = 0.0

    # ── Market dynamics ───────────────────────────────────
    avg_days_on_market:  Optional[float] = None
    active_listings:     int = 0

    # ── Rental ────────────────────────────────────────────
    # Estimated gross rental yield (%)
    # Formula: (annual rent / property price) * 100
    estimated_rental_yield: Optional[float] = None

    # ── Price trend ───────────────────────────────────────
    # % price change over the last 6 months
    # Positive = prices going up (good for investors)
    price_trend_6m:      Optional[float] = None


# ─────────────────────────────────────────────────────────────
# MAIN FUNCTION: CALCULATE STATS
#
# Takes a list of nearby properties (from spatial.py)
# and returns a NeighborhoodStats object.
# ─────────────────────────────────────────────────────────────

def calculate_neighborhood_stats(
    nearby_properties: list[PropertyWithDistance],
    radius_km:         float = 2.0,
) -> NeighborhoodStats:
    """
    Calculate statistics from a list of nearby properties.

    Example:
        nearby = await radius_query(51.44, 5.47, 2.0)
        stats  = calculate_neighborhood_stats(nearby)
        print(f"Avg price/m²: €{stats.avg_price_per_m2:.0f}")
    """

    stats = NeighborhoodStats(
        total_properties = len(nearby_properties),
        radius_km        = radius_km,
    )

    if not nearby_properties:
        logger.warning("[STATS] No properties to calculate stats from")
        return stats

    # Extract just the Property objects (without distance)
    properties = [p.property for p in nearby_properties]

    # ── Calculate each statistic ──────────────────────────
    stats.avg_price_per_m2  = _avg_price_per_m2(properties)
    stats.avg_price         = _avg_price(properties)
    stats.median_price      = _median_price(properties)
    stats.pct_apartments,\
    stats.pct_houses,\
    stats.pct_other         = _property_type_split(properties)
    stats.active_listings   = len(properties)
    stats.estimated_rental_yield = _estimate_rental_yield(
                                        stats.avg_price_per_m2
                                    )

    logger.info(
        f"[STATS] Calculated stats for {len(properties)} properties: "
        f"avg €/m²={stats.avg_price_per_m2 or 'N/A'}, "
        f"apartments={stats.pct_apartments:.0f}%"
    )

    return stats


# ─────────────────────────────────────────────────────────────
# PRIVATE CALCULATION FUNCTIONS
#
# Each function calculates one specific statistic.
# They all return None if there is not enough data.
# ─────────────────────────────────────────────────────────────

def _avg_price_per_m2(properties) -> Optional[float]:
    """
    Calculate average price per square metre.
    Only uses properties that have both a price and area.
    """
    valid = [
        p for p in properties
        if p.last_sold_price and p.living_area_m2
        and p.living_area_m2 > 0
    ]

    if not valid:
        # Fallback: use WOZ value if no sold prices available
        valid = [
            p for p in properties
            if p.woz_value and p.living_area_m2
            and p.living_area_m2 > 0
        ]
        if valid:
            values = [p.woz_value / p.living_area_m2 for p in valid]
            return round(sum(values) / len(values), 2)
        return None

    values = [p.last_sold_price / p.living_area_m2 for p in valid]
    return round(sum(values) / len(values), 2)


def _avg_price(properties) -> Optional[float]:
    """
    Calculate average property price.
    Uses last sold price, falls back to WOZ value.
    """
    # Try sold prices first
    prices = [p.last_sold_price for p in properties if p.last_sold_price]

    # Fall back to WOZ values
    if not prices:
        prices = [p.woz_value for p in properties if p.woz_value]

    if not prices:
        return None

    return round(sum(prices) / len(prices), 2)


def _median_price(properties) -> Optional[float]:
    """
    Calculate the median property price.
    Median is more reliable than average because it ignores
    extreme outliers (one very expensive villa won't skew it).
    """
    prices = sorted([
        p.last_sold_price or p.woz_value
        for p in properties
        if p.last_sold_price or p.woz_value
    ])

    if not prices:
        return None

    mid = len(prices) // 2

    # If even number of prices, average the two middle values
    if len(prices) % 2 == 0:
        return round((prices[mid - 1] + prices[mid]) / 2, 2)
    else:
        return round(prices[mid], 2)


def _property_type_split(properties) -> tuple[float, float, float]:
    """
    Calculate what % of properties are apartments, houses, other.
    Returns (pct_apartments, pct_houses, pct_other).

    Example: (65.0, 25.0, 10.0) means:
      65% apartments, 25% houses, 10% other types
    """
    total = len(properties)
    if total == 0:
        return 0.0, 0.0, 0.0

    # Count each type
    apartment_types = {PropertyType.APARTMENT, PropertyType.STUDIO}
    house_types     = {
        PropertyType.HOUSE,
        PropertyType.VILLA,
        PropertyType.TOWNHOUSE,
        PropertyType.SEMI_DET,
        PropertyType.DETACHED,
    }

    apartments = sum(1 for p in properties if p.property_type in apartment_types)
    houses     = sum(1 for p in properties if p.property_type in house_types)
    other      = total - apartments - houses

    return (
        round(apartments / total * 100, 1),
        round(houses     / total * 100, 1),
        round(other      / total * 100, 1),
    )


def _estimate_rental_yield(avg_price_per_m2: Optional[float]) -> Optional[float]:
    """
    Estimate gross rental yield for the neighborhood.

    Formula:
        yield = (annual rent / property price) * 100

    Since we don't have rental price data yet, we use a
    rule of thumb based on Dutch market data:
        rental price per m² ≈ price per m² * 0.004 per month
        (this is approximately correct for Eindhoven 2024)

    Example:
        avg price per m² = €3,400
        estimated rent/m²/month = €3,400 * 0.004 = €13.60
        for 80m² apartment: €1,088/month = €13,056/year
        yield = €13,056 / (€3,400 * 80) = 4.8%

    This will be replaced with real rental data from Pararius
    once the Pararius collector is built.
    """
    if not avg_price_per_m2:
        return None

    # Dutch market rule of thumb: monthly rent ≈ 0.4% of value
    monthly_rent_per_m2 = avg_price_per_m2 * 0.004
    annual_rent_per_m2  = monthly_rent_per_m2 * 12

    # Yield = annual rent / purchase price
    yield_pct = (annual_rent_per_m2 / avg_price_per_m2) * 100

    return round(yield_pct, 2)