# backend/api/routes/market.py

from fastapi import APIRouter
from db.connection import get_db_session
from sqlalchemy import text

router = APIRouter()

@router.get("/eindhoven")
async def eindhoven_market():
    async with get_db_session() as db:

        rows = await db.execute(text("""
            SELECT
                EXTRACT(YEAR FROM snapshot_date)::int AS year,
                ROUND(AVG(price))::int                AS avg_price,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price))::int AS median_price,
                COUNT(*)                              AS count
            FROM price_history
            WHERE source = 'cbs'
            GROUP BY 1
            ORDER BY 1
        """))
        history = [
            {"year": r.year, "avg_price": r.avg_price, "median_price": r.median_price, "count": r.count}
            for r in rows.fetchall()
        ]

        type_rows = await db.execute(text("""
            SELECT property_type, COUNT(*) as count
            FROM properties
            WHERE city ILIKE '%eindhoven%'
              AND property_type IS NOT NULL
              AND property_type != 'UNKNOWN'
            GROUP BY property_type
            ORDER BY count DESC
            LIMIT 8
        """))
        types = [{"type": r.property_type.title(), "count": r.count} for r in type_rows.fetchall()]

        # Cast to text in subquery, filter known-good labels only
        energy_rows = await db.execute(text("""
            SELECT lbl, COUNT(*) AS count
            FROM (
                SELECT UPPER(energy_label::text) AS lbl
                FROM properties
                WHERE city ILIKE '%eindhoven%'
                  AND energy_label IS NOT NULL
            ) sub
            WHERE lbl IN ('A++','A+','A','B','C','D','E','F','G')
            GROUP BY lbl
            ORDER BY ARRAY_POSITION(ARRAY['A++','A+','A','B','C','D','E','F','G'], lbl)
        """))
        energy = [{"label": r.lbl, "count": r.count} for r in energy_rows.fetchall()]

        total = await db.execute(text(
            "SELECT COUNT(*) FROM properties WHERE city ILIKE '%eindhoven%'"
        ))
        total_count = total.scalar()

    if len(history) >= 2:
        start      = history[0]["avg_price"]
        end        = history[-1]["avg_price"]
        pct_change = round((end - start) / start * 100, 1)
        yoy        = round((history[-1]["avg_price"] - history[-2]["avg_price"]) / history[-2]["avg_price"] * 100, 1)
    else:
        pct_change = 0
        yoy        = 0

    return {
        "city":             "Eindhoven",
        "total_properties": total_count,
        "history":          history,
        "property_types":   types,
        "energy_labels":    energy,
        "stats": {
            "current_avg":      history[-1]["avg_price"]    if history else None,
            "current_median":   history[-1]["median_price"] if history else None,
            "pct_change_total": pct_change,
            "yoy_change":       yoy,
            "data_from":        history[0]["year"]          if history else None,
            "data_to":          history[-1]["year"]         if history else None,
        }
    }