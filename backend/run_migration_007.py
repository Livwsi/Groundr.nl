"""
@file        run_migration_007.py
@description Standalone runner for migration 007 (roles + test accounts).
             Run this once from the backend directory.

             Usage:
               cd C:\\Users\\ibaka\\groundr\\backend
               python run_migration_007.py

@author      Groundr Engineering
@updated     2026-05-28
"""

import asyncio
from sqlalchemy import text
from db.connection import get_db_session


ROLES = [
    ('admin',     'Full platform access — all agents, all data, all settings'),
    ('agent',     'Makelaar dashboard — listings, viewings, bids, dossiers, analytics'),
    ('appraiser', 'Taxatie module — comparables, NWWI reports, valuations'),
    ('notary',    'Document signing — transaction timeline, KYC, document management'),
    ('buyer',     'Client portal — own dossier, bids, viewings, documents'),
    ('seller',    'Seller portal — submit property, track submission status'),
]

# Passwords: Role+saas — hashed with bcrypt rounds=12
TEST_ACCOUNTS = [
    ('admin@groundr.nl',     '$2b$12$Q82An0/ohI5t7AJxX2nwBOkT5kDy9lWQOdh4dvoFDaNgMwhrOFeLK', 'Platform Admin',  True,  'enterprise'),
    ('agent@groundr.nl',     '$2b$12$7tEAvQbaVCmGupHlSqIUP.XIy86m/U0ug7P2b/dUyc3wUgg2IgfMa', 'Demo Agent',      False, 'pro'),
    ('appraiser@groundr.nl', '$2b$12$dd20ftlZCFeNZojH5LlDlOGskfHA6yAJnQLMeh4jXekUpdM7CdUiG', 'Demo Appraiser',  False, 'pro'),
    ('notary@groundr.nl',    '$2b$12$RK7xx1pwRKFrnOApyJinGuHLtnPQ5D3gAxaaerQOGMiFXGuyE.sZa', 'Demo Notary',     False, 'pro'),
    ('buyer@groundr.nl',     '$2b$12$aX9kIBozLA1bgzv6MqUfsOlGoYqAaJA1WhVeiFTcG7OkQwFzRFji.', 'Demo Buyer',      False, 'free'),
    ('seller@groundr.nl',    '$2b$12$.enrxoXxQJTx5nflTmDKW.cQ6eN3Nfd2DyT/N4ArP3eaFooUahDUy', 'Demo Seller',     False, 'free'),
]

ROLE_ASSIGNMENTS = [
    ('admin@groundr.nl',     ['admin', 'agent', 'appraiser']),
    ('agent@groundr.nl',     ['agent']),
    ('appraiser@groundr.nl', ['appraiser']),
    ('notary@groundr.nl',    ['notary']),
    ('buyer@groundr.nl',     ['buyer']),
    ('seller@groundr.nl',    ['seller']),
    ('jan@groundr.nl',       ['agent']),
    ('test@test.com',        ['buyer']),
]


async def run():
    async with get_db_session() as db:

        # ── 1. roles table ────────────────────────────────────────────────
        print("Creating roles table...")
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS roles (
                id          SERIAL PRIMARY KEY,
                name        VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """))

        # ── 2. Seed roles ─────────────────────────────────────────────────
        print("Seeding platform roles...")
        for name, desc in ROLES:
            await db.execute(text(
                "INSERT INTO roles (name, description) VALUES (:name, :desc) ON CONFLICT (name) DO NOTHING"
            ).bindparams(name=name, desc=desc))

        # ── 3. user_roles junction table ──────────────────────────────────
        print("Creating user_roles table...")
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS user_roles (
                id          SERIAL PRIMARY KEY,
                user_id     INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
                role_id     INTEGER NOT NULL REFERENCES roles(id)  ON DELETE CASCADE,
                assigned_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, role_id)
            )
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)"))
        await db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id)"))

        # ── 4. Test accounts ──────────────────────────────────────────────
        print("Seeding test accounts...")
        for email, pw_hash, name, is_admin, sub in TEST_ACCOUNTS:
            await db.execute(text("""
                INSERT INTO users (email, hashed_password, full_name, is_active, is_admin, subscription)
                VALUES (:email, :pw, :name, true, :admin, :sub)
                ON CONFLICT (email) DO NOTHING
            """).bindparams(email=email, pw=pw_hash, name=name, admin=is_admin, sub=sub))

        # ── 5. Role assignments ───────────────────────────────────────────
        print("Assigning roles...")
        for email, role_names in ROLE_ASSIGNMENTS:
            for role_name in role_names:
                await db.execute(text("""
                    INSERT INTO user_roles (user_id, role_id)
                    SELECT u.id, r.id FROM users u, roles r
                    WHERE u.email = :email AND r.name = :role
                    ON CONFLICT DO NOTHING
                """).bindparams(email=email, role=role_name))

        await db.commit()

        # ── 6. Verify ─────────────────────────────────────────────────────
        result = await db.execute(text("""
            SELECT u.email, array_agg(r.name ORDER BY r.name) as roles
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            GROUP BY u.email
            ORDER BY u.email
        """))
        rows = result.fetchall()

        print("\n✓ Migration complete. Role assignments:\n")
        print(f"  {'Email':<30} {'Roles'}")
        print(f"  {'─'*30} {'─'*30}")
        for row in rows:
            print(f"  {row.email:<30} {', '.join(row.roles)}")


if __name__ == "__main__":
    asyncio.run(run())