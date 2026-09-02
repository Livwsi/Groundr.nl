"""
@file        backend/db/migrations/versions/007_add_roles.py
@description Adds a proper role-based access control (RBAC) system to the
             Groundr platform. Replaces the single `is_admin` boolean on
             the users table with a many-to-many roles system, allowing
             users to hold multiple roles simultaneously.

             Creates:
               - roles table       — defines available platform roles
               - user_roles table  — junction table, user ↔ role mapping

             Migrates:
               - jan@groundr.nl    → agent role
               - test@test.com     → buyer role

             Seeds 6 test accounts:
               - admin@groundr.nl      / Adminsaas
               - agent@groundr.nl      / Agentsaas
               - appraiser@groundr.nl  / Appraisersaas
               - notary@groundr.nl     / Notarysaas
               - buyer@groundr.nl      / Buyersaas
               - seller@groundr.nl     / Sellersaas

@layer       Database → Migrations
@depends     users table (migration 001)
@used-by     backend/api/routes/auth.py, backend/db/models.py
@author      Groundr Engineering
@updated     2026-05-28
"""

from alembic import op
from sqlalchemy import text


def upgrade():

    # ── Step 1: Create roles table ────────────────────────────────────────
    op.execute(text("""
        CREATE TABLE IF NOT EXISTS roles (
            id          SERIAL PRIMARY KEY,
            name        VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        )
    """))

    # ── Step 2: Seed platform roles ───────────────────────────────────────
    op.execute(text("""
        INSERT INTO roles (name, description) VALUES
            ('admin',     'Full platform access — all agents, all data, all settings'),
            ('agent',     'Makelaar dashboard — listings, viewings, bids, dossiers, analytics'),
            ('appraiser', 'Taxatie module — comparables, NWWI reports, valuations'),
            ('notary',    'Document signing — transaction timeline, KYC, document management'),
            ('buyer',     'Client portal — own dossier, bids, viewings, documents'),
            ('seller',    'Seller portal — submit property, track submission status')
        ON CONFLICT (name) DO NOTHING
    """))

    # ── Step 3: Create user_roles junction table ──────────────────────────
    op.execute(text("""
        CREATE TABLE IF NOT EXISTS user_roles (
            id          SERIAL PRIMARY KEY,
            user_id     INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
            role_id     INTEGER NOT NULL REFERENCES roles(id)  ON DELETE CASCADE,
            assigned_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, role_id)
        )
    """))

    op.execute(text("CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)"))
    op.execute(text("CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id)"))

    # ── Step 4: Migrate existing users to role system ─────────────────────
    op.execute(text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id FROM users u, roles r
        WHERE u.email = 'jan@groundr.nl' AND r.name = 'agent'
        ON CONFLICT DO NOTHING
    """))

    op.execute(text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id FROM users u, roles r
        WHERE u.email = 'test@test.com' AND r.name = 'buyer'
        ON CONFLICT DO NOTHING
    """))

    # ── Step 5: Seed 6 test accounts ──────────────────────────────────────
    # Passwords: Role+saas (e.g. Agentsaas). Hashed with bcrypt rounds=12.
    op.execute(text("""
        INSERT INTO users (email, hashed_password, full_name, is_active, is_admin, subscription)
        VALUES
            ('admin@groundr.nl',     '$2b$12$Q82An0/ohI5t7AJxX2nwBOkT5kDy9lWQOdh4dvoFDaNgMwhrOFeLK', 'Platform Admin',  true, true,  'enterprise'),
            ('agent@groundr.nl',     '$2b$12$7tEAvQbaVCmGupHlSqIUP.XIy86m/U0ug7P2b/dUyc3wUgg2IgfMa', 'Demo Agent',      true, false, 'pro'),
            ('appraiser@groundr.nl', '$2b$12$dd20ftlZCFeNZojH5LlDlOGskfHA6yAJnQLMeh4jXekUpdM7CdUiG', 'Demo Appraiser',  true, false, 'pro'),
            ('notary@groundr.nl',    '$2b$12$RK7xx1pwRKFrnOApyJinGuHLtnPQ5D3gAxaaerQOGMiFXGuyE.sZa', 'Demo Notary',     true, false, 'pro'),
            ('buyer@groundr.nl',     '$2b$12$aX9kIBozLA1bgzv6MqUfsOlGoYqAaJA1WhVeiFTcG7OkQwFzRFji.', 'Demo Buyer',      true, false, 'free'),
            ('seller@groundr.nl',    '$2b$12$.enrxoXxQJTx5nflTmDKW.cQ6eN3Nfd2DyT/N4ArP3eaFooUahDUy', 'Demo Seller',     true, false, 'free')
        ON CONFLICT (email) DO NOTHING
    """))

    # ── Step 6: Assign roles to test accounts ─────────────────────────────
    # Admin gets agent + appraiser as well — sees the full platform
    assignments = [
        ('admin@groundr.nl',     ['admin', 'agent', 'appraiser']),
        ('agent@groundr.nl',     ['agent']),
        ('appraiser@groundr.nl', ['appraiser']),
        ('notary@groundr.nl',    ['notary']),
        ('buyer@groundr.nl',     ['buyer']),
        ('seller@groundr.nl',    ['seller']),
    ]

    for email, role_names in assignments:
        for role_name in role_names:
            op.execute(text("""
                INSERT INTO user_roles (user_id, role_id)
                SELECT u.id, r.id FROM users u, roles r
                WHERE u.email = :email AND r.name = :role
                ON CONFLICT DO NOTHING
            """).bindparams(email=email, role=role_name))


def downgrade():
    # Remove junction table first (has foreign keys)
    op.execute(text("DROP TABLE IF EXISTS user_roles"))
    op.execute(text("DROP TABLE IF EXISTS roles"))