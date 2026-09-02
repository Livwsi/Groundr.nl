"""
Bring a database up to the current schema, from empty or from partial.

    python -m db.bootstrap

Three steps, all idempotent:
  1. SQLAlchemy models   → users, properties, market_listings, price_history,
                           amenities, data_source_logs, listing_submissions, bids
  2. db/schema.sql       → every table the routes reach through raw SQL
  3. demo accounts       → the six role accounts, development only

This replaces the ad-hoc scripts (add_invites_table.py, run_migration_007.py,
db/migrations/versions/*). It rebuilds a database from scratch; it is not a
migration tool, so a deployed database with real data still needs a considered
plan for schema changes.
"""

import asyncio
import logging
from pathlib import Path

from sqlalchemy import text

from config.settings import settings
from db.connection import engine, init_db

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("bootstrap")

SCHEMA_SQL = Path(__file__).parent / "schema.sql"

# bcrypt hashes of Adminsaas / Agentsaas / ... — local development only.
DEMO_ACCOUNTS = [
    ("admin@groundr.nl",     "$2b$12$Q82An0/ohI5t7AJxX2nwBOkT5kDy9lWQOdh4dvoFDaNgMwhrOFeLK", "Platform Admin", "enterprise", True,  ["admin", "agent", "appraiser"]),
    ("agent@groundr.nl",     "$2b$12$7tEAvQbaVCmGupHlSqIUP.XIy86m/U0ug7P2b/dUyc3wUgg2IgfMa", "Demo Agent",     "pro",        False, ["agent"]),
    ("appraiser@groundr.nl", "$2b$12$dd20ftlZCFeNZojH5LlDlOGskfHA6yAJnQLMeh4jXekUpdM7CdUiG", "Demo Appraiser", "pro",        False, ["appraiser"]),
    ("notary@groundr.nl",    "$2b$12$RK7xx1pwRKFrnOApyJinGuHLtnPQ5D3gAxaaerQOGMiFXGuyE.sZa", "Demo Notary",    "pro",        False, ["notary"]),
    ("buyer@groundr.nl",     "$2b$12$aX9kIBozLA1bgzv6MqUfsOlGoYqAaJA1WhVeiFTcG7OkQwFzRFji.", "Demo Buyer",     "free",       False, ["buyer"]),
    ("seller@groundr.nl",    "$2b$12$.enrxoXxQJTx5nflTmDKW.cQ6eN3Nfd2DyT/N4ArP3eaFooUahDUy", "Demo Seller",    "free",       False, ["seller"]),
]


def _split_statements(sql: str) -> list[str]:
    """schema.sql holds no functions or DO blocks, so splitting on ';' is safe."""
    return [s.strip() for s in sql.split(";") if s.strip()]


async def apply_schema() -> int:
    statements = _split_statements(SCHEMA_SQL.read_text(encoding="utf-8"))
    async with engine.begin() as conn:
        for statement in statements:
            await conn.execute(text(statement))
    return len(statements)


async def seed_demo_accounts() -> int:
    if not settings.is_development:
        logger.warning("APP_ENV=%s — skipping demo accounts.", settings.APP_ENV)
        return 0

    async with engine.begin() as conn:
        for email, pw_hash, name, plan, is_admin, roles in DEMO_ACCOUNTS:
            await conn.execute(text("""
                INSERT INTO users (email, hashed_password, full_name,
                                   is_active, is_admin, subscription)
                VALUES (:email, :pw, :name, TRUE, :is_admin, :plan)
                ON CONFLICT (email) DO NOTHING
            """), {"email": email, "pw": pw_hash, "name": name,
                   "is_admin": is_admin, "plan": plan})

            for role in roles:
                await conn.execute(text("""
                    INSERT INTO user_roles (user_id, role_id)
                    SELECT u.id, r.id FROM users u, roles r
                    WHERE u.email = :email AND r.name = :role
                    ON CONFLICT DO NOTHING
                """), {"email": email, "role": role})

    return len(DEMO_ACCOUNTS)


async def main() -> None:
    logger.info("Database: %s@%s:%s/%s",
                settings.DB_USER, settings.DB_HOST, settings.DB_PORT, settings.DB_NAME)

    await init_db()                       # PostGIS + models
    logger.info("Models applied.")

    count = await apply_schema()
    logger.info("schema.sql applied (%d statements).", count)

    seeded = await seed_demo_accounts()
    if seeded:
        logger.info("Demo accounts ensured (%d).", seeded)

    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name
        """))
        tables = [r[0] for r in result.fetchall()]

    logger.info("Done. %d tables: %s", len(tables), ", ".join(tables))
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
