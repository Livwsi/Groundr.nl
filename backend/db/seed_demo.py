"""
Populate the demo accounts with a coherent, presentable dataset.

    python -m db.seed_demo          # add demo data
    python -m db.seed_demo --reset  # remove it first, then re-add

Without this, logging in as agent@groundr.nl shows an entirely empty platform:
the data already in the database belongs to older accounts whose passwords are
no longer known.

Everything created here is tagged with source='demo-seed' (properties) or a
GR-DEMO-* reference (submissions), so --reset can remove exactly what it added
and nothing else. Development only — refuses to run when APP_ENV is not
development.

The story it tells:
  agent@groundr.nl      six listings, four approved and two awaiting approval,
                        with bids, viewings and reported issues against them
  buyer@groundr.nl      has bid on three homes, has viewings booked, and has a
                        saved search with alerts on
  appraiser@groundr.nl  one finalised valuation with comparables, one draft
  seller@groundr.nl     the seller behind every submission
"""

import argparse
import asyncio
import logging
from datetime import date, datetime, timedelta

from sqlalchemy import text

from config.settings import settings
from db.connection import engine

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("seed_demo")

SEED_SOURCE = "demo-seed"
REF_PREFIX = "GR-DEMO"

# Real Eindhoven streets, plausible figures. bag_id is synthetic but formatted
# like a real one so the UI renders it correctly.
PROPERTIES = [
    # street, nr, postcode, neighbourhood, lat, lon, year, m2, plot, rooms, beds, type, label, woz
    ("Hastelweg",       "142", "5652 CJ", "Strijp",        51.4416, 5.4520, 1968, 118.0, 210.0, 5, 3, "HOUSE",     "C",  392000),
    ("Kleine Berg",      "38", "5611 JV", "Centrum",       51.4364, 5.4740, 1931,  84.0,   0.0, 3, 2, "APARTMENT", "D",  345000),
    ("Tongelresestraat","217", "5613 DG", "Tongelre",      51.4408, 5.4991, 1954, 132.0, 245.0, 6, 4, "HOUSE",     "B",  438000),
    ("Sint Bonifaciuslaan","9","5643 NA", "Stratum",       51.4223, 5.4855, 1978, 165.0, 380.0, 7, 4, "DETACHED",  "A",  685000),
    ("Geldropseweg",    "104", "5611 SJ", "Stratum",       51.4288, 5.4869, 2002,  96.0,   0.0, 4, 2, "APARTMENT", "A",  368000),
    ("Boschdijk",       "451", "5621 JG", "Woensel",       51.4595, 5.4680, 1962, 108.0, 168.0, 5, 3, "TOWNHOUSE", "C",  325000),
]

# index into PROPERTIES, asking price, status, urgency, days ago, description
SUBMISSIONS = [
    (0, 425000, "APPROVED", "NORMAL", 34, "Ruime jaren-60 woning met diepe tuin op het zuiden. Volledig geïsoleerd in 2019."),
    (1, 359000, "APPROVED", "URGENT", 21, "Karakteristiek appartement aan de Kleine Berg, midden in het centrum."),
    (2, 465000, "APPROVED", "NORMAL", 17, "Gerenoveerde hoekwoning met aanbouw en vrijstaande garage."),
    (3, 749000, "APPROVED", "ASAP",   9,  "Vrijstaande villa op 380 m² eigen grond. Energielabel A, warmtepomp."),
    (4, 379000, "PENDING",  "NORMAL", 4,  "Modern appartement met balkon op het zuidwesten en eigen parkeerplaats."),
    (5, 339000, "PENDING",  "NORMAL", 1,  "Tussenwoning nabij Woensel-Noord, ideaal voor starters."),
]

# submission index, amount, days ago, is_active
BIDS = [
    (0, 418000, 12, True),
    (0, 431000,  6, True),
    (1, 352000,  9, True),
    (1, 358500,  3, True),
    (3, 735000,  5, True),
    (2, 449000, 14, False),   # withdrawn — bids has no status column, use is_active
]

# submission index, days from now, time, status, name, phone, message
VIEWINGS = [
    (0, 2,  "10:30", "confirmed", "Sanne de Vries", "+31 6 21445980", "Graag in de ochtend."),
    (1, 3,  "14:00", "pending",   "Mark Jansen",    "+31 6 18820394", "Kan ook doordeweeks 's avonds."),
    (3, 1,  "16:15", "confirmed", "Sanne de Vries", "+31 6 21445980", None),
    (2, 5,  "11:00", "pending",   "Youssef Amrani", "+31 6 44029183", "Ik neem een bouwkundige mee."),
]

# submission index, title, description, category, priority, status, days ago, resolution
MELDINGEN = [
    (0, "Lekkage in de meterkast", "Bij hevige regen komt er water binnen langs de kabeldoorvoer.",
     "plumbing", "urgent", "open", 3, None),
    (2, "CV-ketel maakt geluid",   "Ketel slaat luid aan, ongeveer elk half uur.",
     "heating", "normal", "open", 8, None),
    (1, "Voordeur sluit niet goed", "Het slot klemt sinds de laatste bezichtiging.",
     "general", "high", "resolved", 15, "Slot afgesteld door leverancier op 21 augustus."),
]


async def _fetch_user_ids(conn) -> dict[str, int]:
    rows = (await conn.execute(text(
        "SELECT email, id FROM users WHERE email = ANY(:emails)"
    ), {"emails": [
        "agent@groundr.nl", "buyer@groundr.nl",
        "seller@groundr.nl", "appraiser@groundr.nl",
    ]})).fetchall()
    return {email: uid for email, uid in rows}


async def reset(conn) -> None:
    """Remove only what this script created."""
    await conn.execute(text(f"""
        DELETE FROM bids WHERE submission_id IN (
            SELECT id FROM listing_submissions WHERE reference LIKE '{REF_PREFIX}-%')
    """))
    await conn.execute(text(f"""
        DELETE FROM viewing_requests WHERE submission_id IN (
            SELECT id FROM listing_submissions WHERE reference LIKE '{REF_PREFIX}-%')
    """))
    await conn.execute(text(f"""
        DELETE FROM meldingen WHERE submission_id IN (
            SELECT id FROM listing_submissions WHERE reference LIKE '{REF_PREFIX}-%')
    """))
    await conn.execute(text(
        f"DELETE FROM listing_submissions WHERE reference LIKE '{REF_PREFIX}-%'"))
    await conn.execute(text("""
        DELETE FROM taxatie_comparables WHERE report_id IN (
            SELECT id FROM taxatie_reports WHERE bag_id LIKE 'DEMO-%')
    """))
    await conn.execute(text("DELETE FROM taxatie_reports WHERE bag_id LIKE 'DEMO-%'"))

    # These two hang off the demo users rather than a seeded row, so they are
    # matched by owner. Without this, re-seeding duplicated them.
    await conn.execute(text("""
        DELETE FROM saved_searches WHERE buyer_id IN (
            SELECT id FROM users WHERE email = 'buyer@groundr.nl')
    """))
    await conn.execute(text("""
        DELETE FROM availability_slots WHERE makelaar_id IN (
            SELECT id FROM users WHERE email = 'agent@groundr.nl')
    """))

    await conn.execute(text(
        "DELETE FROM properties WHERE source = :src"), {"src": SEED_SOURCE})
    logger.info("Removed previous demo data.")


async def seed(conn) -> None:
    users = await _fetch_user_ids(conn)
    missing = {"agent@groundr.nl", "buyer@groundr.nl",
               "seller@groundr.nl", "appraiser@groundr.nl"} - users.keys()
    if missing:
        raise SystemExit(
            f"Missing demo accounts: {', '.join(sorted(missing))}. "
            "Run `python -m db.bootstrap` first."
        )

    agent = users["agent@groundr.nl"]
    buyer = users["buyer@groundr.nl"]
    seller = users["seller@groundr.nl"]
    appraiser = users["appraiser@groundr.nl"]

    # ── Properties ───────────────────────────────────────────────────────────
    property_ids: list[int] = []
    for i, (street, nr, postcode, hood, lat, lon, year,
            m2, plot, rooms, beds, ptype, label, woz) in enumerate(PROPERTIES):
        row = (await conn.execute(text("""
            INSERT INTO properties
                (bag_id, street, house_number, postal_code, city, municipality,
                 neighborhood, latitude, longitude, year_built, living_area_m2,
                 plot_area_m2, num_rooms, num_bedrooms, property_type,
                 energy_label, woz_value, woz_year, source)
            VALUES
                (:bag, :street, :nr, :pc, 'Eindhoven', 'Eindhoven',
                 :hood, :lat, :lon, :year, :m2,
                 :plot, :rooms, :beds, CAST(:ptype AS propertytype),
                 CAST(:label AS energylabel), :woz, 2026, :src)
            RETURNING id
        """), {
            "bag": f"DEMO-0772010000{i:06d}", "street": street, "nr": nr,
            "pc": postcode, "hood": hood, "lat": lat, "lon": lon, "year": year,
            "m2": m2, "plot": plot or None, "rooms": rooms, "beds": beds,
            "ptype": ptype, "label": label, "woz": woz, "src": SEED_SOURCE,
        })).fetchone()
        property_ids.append(row[0])
    logger.info("Created %d properties.", len(property_ids))

    # ── Listing submissions ──────────────────────────────────────────────────
    now = datetime.utcnow()
    submission_ids: list[int] = []
    for n, (p_idx, price, status, urgency, days_ago, desc) in enumerate(SUBMISSIONS, start=1):
        created = now - timedelta(days=days_ago)
        row = (await conn.execute(text("""
            INSERT INTO listing_submissions
                (makelaar_id, seller_id, property_id, asking_price, show_price,
                 urgency, bid_deadline, status, description, reference, created_at)
            VALUES
                (:agent, :seller, :pid, :price, TRUE,
                 CAST(:urgency AS urgencylevel), :deadline,
                 CAST(:status AS submissionstatus), :desc, :ref, :created)
            RETURNING id
        """), {
            "agent": agent, "seller": seller, "pid": property_ids[p_idx],
            "price": price, "urgency": urgency,
            "deadline": created + timedelta(days=28), "status": status,
            "desc": desc, "ref": f"{REF_PREFIX}-{n:03d}", "created": created,
        })).fetchone()
        submission_ids.append(row[0])
    logger.info("Created %d listing submissions.", len(submission_ids))

    # ── Bids ─────────────────────────────────────────────────────────────────
    for s_idx, amount, days_ago, active in BIDS:
        await conn.execute(text("""
            INSERT INTO bids (submission_id, bidder_id, amount, is_active, created_at)
            VALUES (:sid, :bidder, :amount, :active, :created)
        """), {
            "sid": submission_ids[s_idx], "bidder": buyer, "amount": amount,
            "active": active, "created": now - timedelta(days=days_ago),
        })
    logger.info("Created %d bids.", len(BIDS))

    # ── Viewings ─────────────────────────────────────────────────────────────
    for s_idx, days_ahead, at, status, name, phone, message in VIEWINGS:
        await conn.execute(text("""
            INSERT INTO viewing_requests
                (submission_id, makelaar_id, buyer_id, requested_date,
                 requested_time, status, buyer_name, buyer_phone, message)
            VALUES (:sid, :agent, :buyer, :d, :t, :status, :name, :phone, :msg)
        """), {
            "sid": submission_ids[s_idx], "agent": agent, "buyer": buyer,
            # asyncpg needs a real date object for a DATE column, never a string
            "d": (now + timedelta(days=days_ahead)).date(),
            "t": at, "status": status, "name": name,
            "phone": phone, "msg": message,
        })
    logger.info("Created %d viewing requests.", len(VIEWINGS))

    # ── Availability ─────────────────────────────────────────────────────────
    for dow, start, end in [(1, "09:00", "12:30"), (2, "13:00", "17:00"),
                            (3, "09:00", "12:30"), (4, "13:00", "17:00")]:
        await conn.execute(text("""
            INSERT INTO availability_slots (makelaar_id, day_of_week, start_time, end_time)
            VALUES (:agent, :dow, :start, :end)
        """), {"agent": agent, "dow": dow, "start": start, "end": end})

    # ── Meldingen ────────────────────────────────────────────────────────────
    for s_idx, title, desc, cat, prio, status, days_ago, resolution in MELDINGEN:
        await conn.execute(text("""
            INSERT INTO meldingen
                (property_id, submission_id, reporter_id, makelaar_id, title,
                 description, category, priority, status, resolution_note, created_at)
            SELECT ls.property_id, ls.id, :buyer, :agent, :title,
                   :desc, :cat, :prio, :status, :resolution, :created
            FROM listing_submissions ls WHERE ls.id = :sid
        """), {
            "sid": submission_ids[s_idx], "buyer": buyer, "agent": agent,
            "title": title, "desc": desc, "cat": cat, "prio": prio,
            "status": status, "resolution": resolution,
            "created": now - timedelta(days=days_ago),
        })
    logger.info("Created %d meldingen.", len(MELDINGEN))

    # ── Taxatie ──────────────────────────────────────────────────────────────
    final_id = (await conn.execute(text("""
        INSERT INTO taxatie_reports
            (user_id, property_id, status, address, bag_id, property_type,
             year_built, living_area_m2, plot_area_m2, energy_label,
             condition_score, condition_note, marktwaarde, nwwi_number,
             finalized_at, created_at)
        VALUES
            (:uid, :pid, 'final', 'Hastelweg 142, 5652 CJ Eindhoven',
             'DEMO-TAX-0001', 'HOUSE', 1968, 118, 210, 'C',
             4, 'Goed onderhouden, keuken en badkamer vernieuwd in 2019.',
             428000, 'NWWI-2026-004182', :fin, :created)
        RETURNING id
    """), {
        "uid": agent, "pid": property_ids[0],
        "fin": now - timedelta(days=6), "created": now - timedelta(days=11),
    })).fetchone()[0]

    for address, price, sale_date, m2, adjusted in [
        ("Hastelweg 118, Eindhoven",       412000, date(2026, 4, 18), 112.0, 425000),
        ("Zeelsterstraat 64, Eindhoven",   436000, date(2026, 3,  6), 124.0, 421000),
        ("Hurksestraat 29, Eindhoven",     399000, date(2026, 5, 22), 106.0, 434000),
    ]:
        await conn.execute(text("""
            INSERT INTO taxatie_comparables
                (report_id, address, sale_price, sale_date, living_area_m2, adjusted_price)
            VALUES (:rid, :addr, :price, :sdate, :m2, :adj)
        """), {"rid": final_id, "addr": address, "price": price,
               "sdate": sale_date, "m2": m2, "adj": adjusted})

    # A draft for the agent and one for the appraiser, so neither persona
    # opens an empty Appraisals page.
    for owner, addr, bag, ptype, year, m2, label in [
        (agent,     'Geldropseweg 104, 5611 SJ Eindhoven', 'DEMO-TAX-0002', 'APARTMENT', 2002, 96,  'A'),
        (appraiser, 'Boschdijk 451, 5621 JG Eindhoven',    'DEMO-TAX-0003', 'TOWNHOUSE', 1962, 108, 'C'),
    ]:
        await conn.execute(text("""
            INSERT INTO taxatie_reports
                (user_id, property_id, status, address, bag_id, property_type,
                 year_built, living_area_m2, energy_label, created_at)
            VALUES
                (:uid, :pid, 'draft', :addr, :bag, :ptype, :year, :m2, :label, :created)
        """), {"uid": owner, "pid": property_ids[4], "addr": addr, "bag": bag,
               "ptype": ptype, "year": year, "m2": m2, "label": label,
               "created": now - timedelta(days=2)})
    logger.info("Created 3 taxatie reports with 3 comparables.")

    # ── Saved search ─────────────────────────────────────────────────────────
    await conn.execute(text("""
        INSERT INTO saved_searches
            (buyer_id, city, min_price, max_price, min_area_m2, property_type, email_alerts)
        VALUES (:buyer, 'Eindhoven', 300000, 500000, 90, 'HOUSE', TRUE)
    """), {"buyer": buyer})


async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo data.")
    parser.add_argument("--reset", action="store_true",
                        help="remove previously seeded demo data first")
    args = parser.parse_args()

    if not settings.is_development:
        raise SystemExit(f"Refusing to seed demo data with APP_ENV={settings.APP_ENV!r}.")

    async with engine.begin() as conn:
        if args.reset:
            await reset(conn)
        existing = (await conn.execute(text(
            "SELECT count(*) FROM properties WHERE source = :src"), {"src": SEED_SOURCE}
        )).scalar_one()
        if existing:
            logger.info("Demo data already present (%d properties). "
                        "Use --reset to rebuild it.", existing)
            await engine.dispose()
            return
        await seed(conn)

    logger.info("Demo data ready. Log in as agent@groundr.nl / Agentsaas.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
