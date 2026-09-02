# ─────────────────────────────────────────────────────────────
# backend/api/routes/taxatie.py
#
# ENDPOINTS:
#   POST /api/taxatie/              → create draft report
#   GET  /api/taxatie/              → list my reports
#   GET  /api/taxatie/{id}          → get single report
#   PUT  /api/taxatie/{id}          → update report (any step)
#   POST /api/taxatie/{id}/finalize → lock report + set marktwaarde
#   GET  /api/taxatie/{id}/comparables → auto-suggest comparables
#   POST /api/taxatie/{id}/comparables → add comparable
#   DELETE /api/taxatie/{id}/comparables/{comp_id} → remove comparable
# ─────────────────────────────────────────────────────────────

import json
import logging
import random
import string
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import require_user
from db.connection import get_db
from db.models import User

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────

class CreateReportRequest(BaseModel):
    address:        str
    property_type:  str             = 'house'
    year_built:     Optional[int]   = None
    living_area_m2: Optional[float] = None
    plot_area_m2:   Optional[float] = None
    energy_label:   Optional[str]   = None

class UpdateReportRequest(BaseModel):
    property_type:  Optional[str]   = None
    year_built:     Optional[int]   = None
    living_area_m2: Optional[float] = None
    plot_area_m2:   Optional[float] = None
    energy_label:   Optional[str]   = None
    condition_score:Optional[int]   = None
    condition_note: Optional[str]   = None
    marktwaarde:    Optional[float] = None
    data:           Optional[dict]  = None

# Columns update_report() is allowed to write. Anything not listed here is
# dropped before it can reach the SET clause.
UPDATABLE_REPORT_COLUMNS = frozenset({
    "property_type", "year_built", "living_area_m2", "plot_area_m2",
    "energy_label", "condition_score", "condition_note", "marktwaarde", "data",
})

class FinalizeRequest(BaseModel):
    marktwaarde: float

class AddComparableRequest(BaseModel):
    address:        str
    sale_price:     float
    sale_date:      str            # YYYY-MM-DD
    living_area_m2: Optional[float] = None
    corrections:    Optional[dict]  = None


# ─────────────────────────────────────────────────────────────
# STATIC ROUTES FIRST
# ─────────────────────────────────────────────────────────────

@router.get("/")
async def list_reports(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        SELECT id, address, status, property_type, living_area_m2,
               marktwaarde, nwwi_number, created_at, finalized_at
        FROM taxatie_reports
        WHERE user_id = :uid
        ORDER BY created_at DESC
    """), {"uid": user.id})
    rows = result.fetchall()
    return {
        "reports": [
            {
                "id":            r.id,
                "address":       r.address,
                "status":        r.status,
                "property_type": r.property_type,
                "living_area_m2":r.living_area_m2,
                "marktwaarde":   r.marktwaarde,
                "nwwi_number":   r.nwwi_number,
                "created_at":    str(r.created_at),
                "finalized_at":  str(r.finalized_at) if r.finalized_at else None,
            }
            for r in rows
        ]
    }


@router.post("/", status_code=201)
async def create_report(
    body: CreateReportRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    # Try to auto-fill from BAG
    from collectors.bag import geocode_address
    location = await geocode_address(body.address)

    result = await db.execute(text("""
        INSERT INTO taxatie_reports
            (user_id, address, bag_id, property_type, year_built,
             living_area_m2, plot_area_m2, energy_label, status)
        VALUES
            (:uid, :address, :bag_id, :ptype, :year,
             :area, :plot, :energy, 'draft')
        RETURNING id
    """), {
        "uid":     user.id,
        "address": body.address,
        "bag_id":  location.get("bag_id") if location else None,
        "ptype":   body.property_type,
        "year":    body.year_built or (location.get("year_built") if location else None),
        "area":    body.living_area_m2 or (location.get("living_area_m2") if location else None),
        "plot":    body.plot_area_m2,
        "energy":  body.energy_label,
    })
    row    = result.fetchone()
    logger.info(f"[TAXATIE] User {user.id} created report {row.id} for {body.address}")
    return {"report_id": row.id, "address": body.address, "bag_filled": location is not None}


# ─────────────────────────────────────────────────────────────
# PARAMETERIZED ROUTES LAST
# ─────────────────────────────────────────────────────────────

@router.get("/{report_id}")
async def get_report(
    report_id: int,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        SELECT * FROM taxatie_reports
        WHERE id = :rid AND user_id = :uid
    """), {"rid": report_id, "uid": user.id})
    r = result.mappings().one_or_none()
    if not r:
        raise HTTPException(404, "Rapport niet gevonden.")

    # Load comparables
    comp_result = await db.execute(text("""
        SELECT * FROM taxatie_comparables WHERE report_id = :rid ORDER BY id
    """), {"rid": report_id})
    comps = comp_result.mappings().fetchall()

    return {
        **dict(r),
        "created_at":   str(r["created_at"]),
        "updated_at":   str(r["updated_at"]) if r["updated_at"] else None,
        "finalized_at": str(r["finalized_at"]) if r["finalized_at"] else None,
        "comparables":  [dict(c) for c in comps],
    }


@router.put("/{report_id}")
async def update_report(
    report_id: int,
    body: UpdateReportRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    # Build dynamic SET clause from non-None fields.
    # Column names are interpolated into SQL, so they are checked against an
    # explicit whitelist rather than trusted to come from the schema — a future
    # `extra="allow"` on the model would otherwise turn this into an injection.
    fields = {
        k: v for k, v in body.model_dump().items()
        if v is not None and k in UPDATABLE_REPORT_COLUMNS
    }
    if not fields:
        raise HTTPException(400, "Geen velden om bij te werken.")

    # `data` is a JSONB column; asyncpg needs a JSON string, not a dict.
    if isinstance(fields.get("data"), dict):
        fields["data"] = json.dumps(fields["data"])

    set_clause = ", ".join(f"{k} = :{k}" for k in fields)
    fields["report_id"] = report_id
    fields["uid"]       = user.id
    fields["now"]       = datetime.utcnow()

    result = await db.execute(text(f"""
        UPDATE taxatie_reports
        SET {set_clause}, updated_at = :now
        WHERE id = :report_id AND user_id = :uid AND status = 'draft'
        RETURNING id
    """), fields)

    if not result.fetchone():
        raise HTTPException(404, "Rapport niet gevonden of al gefinaliseerd.")
    return {"message": "Rapport bijgewerkt."}


@router.post("/{report_id}/finalize")
async def finalize_report(
    report_id: int,
    body: FinalizeRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    # Check report exists and has at least 1 comparable
    comp_count = await db.execute(text("""
        SELECT COUNT(*) FROM taxatie_comparables WHERE report_id = :rid
    """), {"rid": report_id})
    if comp_count.scalar() < 1:
        raise HTTPException(400, "Voeg minimaal 1 referentiepand toe voor finalisatie.")

    # Generate NWWI-style number: NW-YYYY-XXXXX
    nwwi = f"NW-{datetime.utcnow().year}-{''.join(random.choices(string.digits, k=5))}"

    result = await db.execute(text("""
        UPDATE taxatie_reports
        SET status = 'final', marktwaarde = :val,
            nwwi_number = :nwwi, finalized_at = NOW(), updated_at = NOW()
        WHERE id = :rid AND user_id = :uid AND status = 'draft'
        RETURNING id
    """), {"val": body.marktwaarde, "nwwi": nwwi, "rid": report_id, "uid": user.id})

    if not result.fetchone():
        raise HTTPException(404, "Rapport niet gevonden of al gefinaliseerd.")

    logger.info(f"[TAXATIE] Report {report_id} finalized by user {user.id}, marktwaarde €{body.marktwaarde:,.0f}")
    return {"message": "Rapport gefinaliseerd.", "nwwi_number": nwwi, "marktwaarde": body.marktwaarde}


@router.get("/{report_id}/comparables")
async def suggest_comparables(
    report_id: int,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    """Auto-suggest comparables from price_history within ~2km of the report property."""
    report = await db.execute(text("""
        SELECT address, bag_id FROM taxatie_reports
        WHERE id = :rid AND user_id = :uid
    """), {"rid": report_id, "uid": user.id})
    r = report.mappings().one_or_none()
    if not r:
        raise HTTPException(404, "Rapport niet gevonden.")

    # Find recent sold properties nearby via price_history
    suggestions = await db.execute(text("""
        SELECT DISTINCT ON (p.id)
            p.id, p.street, p.house_number, p.city, p.postal_code,
            p.living_area_m2, p.year_built, p.property_type,
            ph.price as sale_price, ph.snapshot_date as sale_date
        FROM properties p
        JOIN price_history ph ON ph.property_id = p.id
        WHERE ph.is_asking = FALSE
          AND ph.snapshot_date >= NOW() - INTERVAL '3 years'
          AND p.city = (
              SELECT city FROM properties WHERE bag_id = :bag_id LIMIT 1
          )
        ORDER BY p.id, ph.snapshot_date DESC
        LIMIT 10
    """), {"bag_id": r["bag_id"]})
    rows = suggestions.fetchall()

    return {
        "suggestions": [
            {
                "property_id":   row.id,
                "address":       f"{row.street} {row.house_number}, {row.city}",
                "sale_price":    row.sale_price,
                "sale_date":     str(row.sale_date),
                "living_area_m2":row.living_area_m2,
                "price_per_m2":  round(row.sale_price / row.living_area_m2, 0) if row.living_area_m2 else None,
            }
            for row in rows
        ]
    }


@router.post("/{report_id}/comparables", status_code=201)
async def add_comparable(
    report_id: int,
    body: AddComparableRequest,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    # Verify report ownership
    check = await db.execute(text("""
        SELECT id FROM taxatie_reports
        WHERE id = :rid AND user_id = :uid AND status = 'draft'
    """), {"rid": report_id, "uid": user.id})
    if not check.fetchone():
        raise HTTPException(404, "Rapport niet gevonden of al gefinaliseerd.")

    # Max 5 comparables
    count = await db.execute(text("""
        SELECT COUNT(*) FROM taxatie_comparables WHERE report_id = :rid
    """), {"rid": report_id})
    if count.scalar() >= 5:
        raise HTTPException(400, "Maximum 5 referentiepanden per rapport.")

    import json
    sale_date   = datetime.strptime(body.sale_date, "%Y-%m-%d").date()
    corrections = body.corrections or {}

    # Calculate adjusted price
    correction_total = sum(corrections.values()) if corrections else 0
    adjusted_price   = body.sale_price + correction_total

    result = await db.execute(text("""
        INSERT INTO taxatie_comparables
            (report_id, address, sale_price, sale_date,
             living_area_m2, corrections, adjusted_price)
        VALUES
            (:rid, :address, :price, :date, :area, :corrections, :adj)
        RETURNING id
    """), {
        "rid":         report_id,
        "address":     body.address,
        "price":       body.sale_price,
        "date":        sale_date,
        "area":        body.living_area_m2,
        "corrections": json.dumps(corrections),
        "adj":         adjusted_price,
    })
    row = result.fetchone()
    return {"comparable_id": row.id, "adjusted_price": adjusted_price}


@router.delete("/{report_id}/comparables/{comp_id}")
async def delete_comparable(
    report_id: int,
    comp_id:   int,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    # Verify ownership via report
    result = await db.execute(text("""
        DELETE FROM taxatie_comparables
        WHERE id = :cid AND report_id = :rid
          AND report_id IN (
              SELECT id FROM taxatie_reports WHERE user_id = :uid AND status = 'draft'
          )
        RETURNING id
    """), {"cid": comp_id, "rid": report_id, "uid": user.id})
    if not result.fetchone():
        raise HTTPException(404, "Referentiepand niet gevonden.")
    return {"message": "Referentiepand verwijderd."}