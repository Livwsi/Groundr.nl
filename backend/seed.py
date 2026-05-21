"""
seed.py — Groundr demo data seed script

Run this after setting up the database:
    python seed.py

Creates:
  - 2 demo users (makelaar + buyer)
  - DB tables (if not exist)
  - Runs BAG collector for Eindhoven (26 real properties)
  - Runs OSM collector (amenities)
  - Creates 2 sample listings
  - Creates 1 sample submission with bids
"""

import asyncio
import sys
from pathlib import Path

# Make sure we can import from backend
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from db.connection import engine, init_db
from config.settings import settings
import bcrypt


# ── Demo users ────────────────────────────────────────────────
USERS = [
    {
        "email":     "jan@groundr.nl",
        "password":  "groundr123",
        "full_name": "Jan de Makelaar",
        "role":      "makelaar",
    },
    {
        "email":     "test@test.com",
        "password":  "test1234",
        "full_name": "Test Koper",
        "role":      "buyer",
    },
]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


async def create_users(conn):
    print("Creating demo users...")
    for user in USERS:
        # Check if user already exists
        result = await conn.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": user["email"]}
        )
        if result.fetchone():
            print(f"  ✓ {user['email']} already exists")
            continue

        await conn.execute(text("""
            INSERT INTO users (email, hashed_password, full_name, role, is_active)
            VALUES (:email, :pw, :name, :role, true)
        """), {
            "email": user["email"],
            "pw":    hash_password(user["password"]),
            "name":  user["full_name"],
            "role":  user["role"],
        })
        print(f"  ✓ Created {user['email']} ({user['role']})")


async def run_collectors():
    print("\nRunning data collectors...")

    try:
        from collectors.bag import BAGCollector
        collector = BAGCollector()
        count = await collector.collect_eindhoven()
        print(f"  ✓ BAG: {count} properties collected")
    except Exception as e:
        print(f"  ✗ BAG collector failed: {e}")

    try:
        from collectors.osm import OSMCollector
        collector = OSMCollector()
        count = await collector.collect_amenities_eindhoven()
        print(f"  ✓ OSM: {count} amenities collected")
    except Exception as e:
        print(f"  ✗ OSM collector failed: {e}")


async def create_sample_listings(conn):
    print("\nCreating sample listings...")

    # Get makelaar user id
    result = await conn.execute(
        text("SELECT id FROM users WHERE email = 'jan@groundr.nl'")
    )
    makelaar = result.fetchone()
    if not makelaar:
        print("  ✗ Makelaar user not found — run user creation first")
        return

    makelaar_id = makelaar.id

    # Get first two properties
    result = await conn.execute(
        text("SELECT id FROM properties LIMIT 2")
    )
    properties = result.fetchall()
    if not properties:
        print("  ✗ No properties found — run BAG collector first")
        return

    for i, prop in enumerate(properties):
        # Check if listing exists
        existing = await conn.execute(
            text("SELECT id FROM market_listings WHERE property_id = :pid"),
            {"pid": prop.id}
        )
        if existing.fetchone():
            print(f"  ✓ Listing for property {prop.id} already exists")
            continue

        await conn.execute(text("""
            INSERT INTO market_listings
                (property_id, makelaar_id, asking_price, status, listing_type)
            VALUES (:pid, :mid, :price, 'active', 'sale')
        """), {
            "pid":   prop.id,
            "mid":   makelaar_id,
            "price": 450000 + (i * 50000),
        })
        print(f"  ✓ Created listing for property {prop.id}")


async def create_sample_submission(conn):
    print("\nCreating sample submission...")

    # Get users
    makelaar = (await conn.execute(
        text("SELECT id FROM users WHERE email = 'jan@groundr.nl'")
    )).fetchone()

    buyer = (await conn.execute(
        text("SELECT id FROM users WHERE email = 'test@test.com'")
    )).fetchone()

    if not makelaar or not buyer:
        print("  ✗ Users not found")
        return

    # Get a property
    prop = (await conn.execute(
        text("SELECT id FROM properties LIMIT 1 OFFSET 2")
    )).fetchone()
    if not prop:
        print("  ✗ No properties found")
        return

    # Check if submission exists
    existing = (await conn.execute(
        text("SELECT id FROM listing_submissions WHERE property_id = :pid"),
        {"pid": prop.id}
    )).fetchone()

    if existing:
        print(f"  ✓ Submission already exists")
        return

    # Create submission
    result = await conn.execute(text("""
        INSERT INTO listing_submissions
            (property_id, makelaar_id, seller_id, asking_price,
             show_price, urgency, status, reference)
        VALUES (:pid, :mid, :sid, 485000, true, 'normal', 'approved',
                'GR-2026-00001')
        RETURNING id
    """), {
        "pid": prop.id,
        "mid": makelaar.id,
        "sid": buyer.id,
    })
    sub_id = result.fetchone().id
    print(f"  ✓ Created submission GR-2026-00001 (id={sub_id})")

    # Add a sample bid
    await conn.execute(text("""
        INSERT INTO bids (submission_id, bidder_id, amount, status)
        VALUES (:sid, :uid, 475000, 'active')
    """), {"sid": sub_id, "uid": buyer.id})
    print(f"  ✓ Added sample bid €475,000")

    # Add sample availability slots for makelaar
    for day, start, end in [(1, '09:00', '17:00'), (3, '09:00', '17:00'), (5, '10:00', '15:00')]:
        existing_slot = (await conn.execute(
            text("SELECT id FROM availability_slots WHERE makelaar_id = :mid AND day_of_week = :dow"),
            {"mid": makelaar.id, "dow": day}
        )).fetchone()
        if not existing_slot:
            await conn.execute(text("""
                INSERT INTO availability_slots (makelaar_id, day_of_week, start_time, end_time)
                VALUES (:mid, :dow, :st, :et)
            """), {"mid": makelaar.id, "dow": day, "st": start, "et": end})
    print(f"  ✓ Added availability slots for makelaar (Tue, Thu, Sat)")


async def main():
    print("=" * 50)
    print("Groundr — Demo Seed Script")
    print("=" * 50)

    # Initialize DB tables
    print("\nInitializing database tables...")
    await init_db()
    print("  ✓ Tables ready")

    async with engine.begin() as conn:
        await create_users(conn)
        await create_sample_listings(conn)
        await create_sample_submission(conn)

    # Run collectors (outside transaction — they manage their own)
    await run_collectors()

    print("\n" + "=" * 50)
    print("✓ Seed complete!")
    print()
    print("Demo accounts:")
    print("  Makelaar: jan@groundr.nl / groundr123")
    print("  Buyer:    test@test.com  / test1234")
    print()
    print("URLs:")
    print("  Dashboard:  http://localhost:3000/dashboard")
    print("  Microsite:  http://localhost:3000/microsite/stadsmakelaars")
    print("  Dossier:    http://localhost:3000/dossier/login")
    print("  API docs:   http://localhost:8000/docs")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())