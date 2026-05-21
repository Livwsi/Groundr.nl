# ─────────────────────────────────────────────────────────────
# backend/analytics/scoring.py
#
# PURPOSE:
#   Calculates the Groundr Investment Score (0–100) for a
#   property based on its neighborhood statistics.
#
# THE FORMULA:
#   score = (
#       rental_yield    * 0.30   +   # 30% weight
#       woz_delta       * 0.20   +   # 20% weight
#       price_trend     * 0.20   +   # 20% weight
#       neighborhood    * 0.15   +   # 15% weight
#       energy_label    * 0.10   +   # 10% weight
#       dom_score       * 0.05       #  5% weight
#   )
#
# WHAT EACH FACTOR MEANS:
#   rental_yield  → how much rent income vs purchase price
#                   higher yield = better investment
#   woz_delta     → asking price vs official tax value
#                   below WOZ = potential deal
#                   way above WOZ = overpriced
#   price_trend   → are prices going up in this area?
#                   positive trend = appreciating neighborhood
#   neighborhood  → quality of the area (amenities, income)
#                   more schools/stations/parks = better score
#   energy_label  → A++ is best, G is worst
#                   affects running costs and future regulations
#   dom_score     → days on market trend
#                   high DOM = buyer's market (better for buyers)
#
# WEIGHTS:
#   The weights (0.30, 0.20 etc.) add up to exactly 1.0.
#   They can be adjusted in config/settings.py later.
# ─────────────────────────────────────────────────────────────

import logging
from dataclasses import dataclass
from typing import Optional

from analytics.statistics import NeighborhoodStats
from db.models import EnergyLabel, Property

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# SCORE WEIGHTS
#
# These determine how much each factor contributes to the score.
# Must add up to 1.0.
# ─────────────────────────────────────────────────────────────

WEIGHTS = {
    "rental_yield":  0.30,
    "woz_delta":     0.20,
    "price_trend":   0.20,
    "neighborhood":  0.15,
    "energy_label":  0.10,
    "dom_score":     0.05,
}


# ─────────────────────────────────────────────────────────────
# DATA CLASS: SCORE RESULT
#
# Returned by compute_score().
# Contains the final score AND a breakdown of each factor.
# The breakdown is what we show in the UI as the bar chart.
# ─────────────────────────────────────────────────────────────

@dataclass
class ScoreResult:
    """
    The investment score for a property.

    score       → final score 0–100
    factors     → individual scores per factor (each 0–100)
    explanation → human-readable text for each factor
    """

    # The final investment score
    score: float = 0.0

    # Individual factor scores (each 0–100)
    # These are shown as bars in the UI
    factors: dict = None

    # Human-readable explanation of each factor
    # Shown in tooltips on the UI
    explanation: dict = None

    def __post_init__(self):
        if self.factors is None:
            self.factors = {}
        if self.explanation is None:
            self.explanation = {}


# ─────────────────────────────────────────────────────────────
# MAIN FUNCTION: COMPUTE SCORE
#
# Takes a property and its neighborhood stats,
# returns a ScoreResult with score + breakdown.
# ─────────────────────────────────────────────────────────────

def compute_score(
    prop:  Property,
    stats: NeighborhoodStats,
) -> ScoreResult:
    """
    Compute the investment score for a property.

    Example:
        nearby = await radius_query(51.44, 5.47, 2.0)
        stats  = calculate_neighborhood_stats(nearby)
        result = compute_score(my_property, stats)
        print(f"Score: {result.score}/100")
        print(f"Rental yield factor: {result.factors['rental_yield']}")
    """

    # ── Calculate each individual factor ──────────────────
    # Each returns a score from 0 to 100.
    # If we don't have enough data, we use a neutral score (50).

    rental_score  = _score_rental_yield(stats.estimated_rental_yield)
    woz_score     = _score_woz_delta(prop)
    trend_score   = _score_price_trend(stats.price_trend_6m)
    neighborhood  = _score_neighborhood(stats)
    energy_score  = _score_energy_label(prop.energy_label)
    dom_score     = _score_days_on_market(stats.avg_days_on_market)

    # ── Combine factors using weights ─────────────────────
    raw_score = (
        rental_score  * WEIGHTS["rental_yield"] +
        woz_score     * WEIGHTS["woz_delta"]    +
        trend_score   * WEIGHTS["price_trend"]  +
        neighborhood  * WEIGHTS["neighborhood"] +
        energy_score  * WEIGHTS["energy_label"] +
        dom_score     * WEIGHTS["dom_score"]
    )

    # ── Round to one decimal place ────────────────────────
    final_score = round(raw_score, 1)

    # ── Build the result ──────────────────────────────────
    result = ScoreResult(
        score   = final_score,
        factors = {
            "rental_yield": round(rental_score, 1),
            "woz_delta":    round(woz_score, 1),
            "price_trend":  round(trend_score, 1),
            "neighborhood": round(neighborhood, 1),
            "energy_label": round(energy_score, 1),
            "dom_score":    round(dom_score, 1),
        },
        explanation = {
            "rental_yield": _explain_rental(stats.estimated_rental_yield),
            "woz_delta":    _explain_woz(prop),
            "price_trend":  _explain_trend(stats.price_trend_6m),
            "neighborhood": _explain_neighborhood(stats),
            "energy_label": _explain_energy(prop.energy_label),
            "dom_score":    _explain_dom(stats.avg_days_on_market),
        }
    )

    logger.info(
        f"[SCORE] Property {prop.id} ({prop.street}): "
        f"score={final_score}/100"
    )

    return result


# ─────────────────────────────────────────────────────────────
# FACTOR SCORING FUNCTIONS
#
# Each returns a score from 0 to 100.
# 50 is used as "neutral/unknown" when we lack data.
# ─────────────────────────────────────────────────────────────

def _score_rental_yield(yield_pct: Optional[float]) -> float:
    """
    Score the rental yield.
    Dutch market reference:
      < 3%   = poor       → 0–20
      3–5%   = average    → 20–50
      5–7%   = good       → 50–75
      7–9%   = very good  → 75–90
      > 9%   = excellent  → 90–100
    """
    if yield_pct is None:
        return 50.0   # neutral — no data

    if yield_pct < 3:
        return max(0, yield_pct / 3 * 20)
    elif yield_pct < 5:
        return 20 + (yield_pct - 3) / 2 * 30
    elif yield_pct < 7:
        return 50 + (yield_pct - 5) / 2 * 25
    elif yield_pct < 9:
        return 75 + (yield_pct - 7) / 2 * 15
    else:
        return min(100, 90 + (yield_pct - 9) * 2)


def _score_woz_delta(prop: Property) -> float:
    """
    Score the asking price vs WOZ value.
    Below WOZ = potential deal = higher score.
    Way above WOZ = overpriced = lower score.

    delta = (asking_price - woz_value) / woz_value * 100
    e.g. delta = +10% means 10% above WOZ (slightly overpriced)
    """
    if not prop.woz_value or not prop.last_sold_price:
        return 50.0   # neutral — no data

    delta_pct = (
        (prop.last_sold_price - prop.woz_value)
        / prop.woz_value * 100
    )

    # Below WOZ by 10%+ → excellent deal → high score
    if delta_pct <= -10:
        return 90.0
    elif delta_pct <= 0:
        # Between -10% and 0% → good to fair
        return 90 + delta_pct * 4   # 90 down to 50
    elif delta_pct <= 10:
        # Between 0% and +10% → slightly overpriced
        return 50 - delta_pct * 2   # 50 down to 30
    elif delta_pct <= 25:
        # Between +10% and +25% → overpriced
        return 30 - (delta_pct - 10) * 1.5  # 30 down to ~7
    else:
        # More than 25% above WOZ → very overpriced
        return max(0, 5.0)


def _score_price_trend(trend_6m: Optional[float]) -> float:
    """
    Score the 6-month price trend.
    Rising prices = good for investors = higher score.

    trend_6m is a percentage change, e.g. +5.0 = 5% increase
    """
    if trend_6m is None:
        return 50.0   # neutral — no data

    # Strong growth → high score
    if trend_6m >= 10:
        return 95.0
    elif trend_6m >= 5:
        return 75 + (trend_6m - 5) * 4
    elif trend_6m >= 0:
        return 50 + trend_6m * 5
    elif trend_6m >= -5:
        return 50 + trend_6m * 4   # 50 down to 30
    else:
        return max(0, 30 + (trend_6m + 5) * 3)


def _score_neighborhood(stats: NeighborhoodStats) -> float:
    """
    Score the neighborhood quality.
    Based on property density and type mix.
    More properties in the area = more active market = better.
    """

    score = 50.0   # start neutral

    # More properties nearby = more active market
    if stats.total_properties >= 20:
        score += 20
    elif stats.total_properties >= 10:
        score += 10
    elif stats.total_properties >= 5:
        score += 5

    # Good mix of apartments and houses = healthy neighborhood
    if 30 <= stats.pct_apartments <= 70:
        score += 10   # balanced mix
    elif stats.pct_apartments > 70:
        score += 5    # mostly apartments (urban)

    return min(100, score)


def _score_energy_label(label: Optional[EnergyLabel]) -> float:
    """
    Score the energy label.
    Better label = lower running costs = higher score.
    Also: from 2030, poorly labelled homes will be harder to sell.
    """
    label_scores = {
        EnergyLabel.A4:      100,
        EnergyLabel.A3:      95,
        EnergyLabel.A2:      90,
        EnergyLabel.A1:      85,
        EnergyLabel.A:       80,
        EnergyLabel.B:       65,
        EnergyLabel.C:       50,
        EnergyLabel.D:       35,
        EnergyLabel.E:       20,
        EnergyLabel.F:       10,
        EnergyLabel.G:       0,
        EnergyLabel.UNKNOWN: 50,   # neutral when unknown
    }
    return label_scores.get(label, 50.0)


def _score_days_on_market(dom: Optional[float]) -> float:
    """
    Score based on days on market trend.
    High DOM = properties sitting unsold = buyer's market.
    For a buyer/investor, this means more negotiating power.

    Note: this is intentionally a small weight (5%)
    because it's a market signal, not a property quality indicator.
    """
    if dom is None:
        return 50.0

    # Fewer days on market = hot market
    # For investors: hot market (low DOM) = good investment area
    if dom <= 14:
        return 85.0   # very fast sales
    elif dom <= 30:
        return 70.0   # normal market
    elif dom <= 60:
        return 50.0   # slower market
    elif dom <= 90:
        return 35.0   # buyer's market
    else:
        return 20.0   # very slow market


# ─────────────────────────────────────────────────────────────
# EXPLANATION FUNCTIONS
#
# Each returns a short human-readable string explaining
# the score for that factor.
# Shown in tooltips in the UI.
# ─────────────────────────────────────────────────────────────

def _explain_rental(yield_pct: Optional[float]) -> str:
    if yield_pct is None:
        return "Geen huurdata beschikbaar"
    return f"Geschat bruto huurrendement: {yield_pct:.1f}%"

def _explain_woz(prop: Property) -> str:
    if not prop.woz_value or not prop.last_sold_price:
        return "Geen WOZ-waarde beschikbaar"
    delta = (prop.last_sold_price - prop.woz_value) / prop.woz_value * 100
    if delta < 0:
        return f"Vraagprijs ligt {abs(delta):.1f}% onder WOZ-waarde"
    return f"Vraagprijs ligt {delta:.1f}% boven WOZ-waarde"

def _explain_trend(trend: Optional[float]) -> str:
    if trend is None:
        return "Geen prijstrend data beschikbaar"
    direction = "gestegen" if trend > 0 else "gedaald"
    return f"Prijzen zijn {abs(trend):.1f}% {direction} afgelopen 6 maanden"

def _explain_neighborhood(stats: NeighborhoodStats) -> str:
    return (
        f"{stats.total_properties} woningen in {stats.radius_km}km radius. "
        f"{stats.pct_apartments:.0f}% appartementen, "
        f"{stats.pct_houses:.0f}% woningen."
    )

def _explain_energy(label: Optional[EnergyLabel]) -> str:
    if not label or label == EnergyLabel.UNKNOWN:
        return "Geen energielabel bekend"
    return f"Energielabel: {label.value}"

def _explain_dom(dom: Optional[float]) -> str:
    if dom is None:
        return "Geen verkooptijd data beschikbaar"
    return f"Gemiddelde verkooptijd in buurt: {dom:.0f} dagen"