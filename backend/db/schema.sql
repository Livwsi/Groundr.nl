-- ─────────────────────────────────────────────────────────────────────────────
-- Groundr — tables not defined in db/models.py
--
-- models.py owns: users, properties, market_listings, price_history, amenities,
-- data_source_logs, listing_submissions, bids. Those are created by
-- Base.metadata.create_all().
--
-- Everything below is queried through raw SQL in api/routes/*, so it has no
-- SQLAlchemy model and previously existed only in whoever's local database
-- happened to have it. This file is the source of truth for those tables.
--
-- Apply with:  python -m db.bootstrap
-- Every statement is idempotent; re-running is safe.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Roles (RBAC) ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
    ('admin',     'Full platform access — all agents, all data, all settings'),
    ('agent',     'Makelaar dashboard — listings, viewings, bids, dossiers, analytics'),
    ('appraiser', 'Taxatie module — comparables, NWWI reports, valuations'),
    ('notary',    'Document signing — transaction timeline, KYC, document management'),
    ('buyer',     'Client portal — own dossier, bids, viewings, documents'),
    ('seller',    'Seller portal — submit property, track submission status')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_roles (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles (role_id);


-- ── Client invites ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invites (
    id          SERIAL PRIMARY KEY,
    token       VARCHAR(64)  UNIQUE NOT NULL,
    makelaar_id INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL,
    used        BOOLEAN      DEFAULT FALSE,
    created_at  TIMESTAMP    DEFAULT NOW(),
    expires_at  TIMESTAMP    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invite_token ON invites (token);


-- ── Agent reviews ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
    id          SERIAL PRIMARY KEY,
    makelaar_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_tokens (
    id          SERIAL PRIMARY KEY,
    token       UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    makelaar_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_makelaar     ON reviews (makelaar_id);
CREATE INDEX IF NOT EXISTS idx_review_tokens_token  ON review_tokens (token);


-- ── Viewings ─────────────────────────────────────────────────────────────────
-- start_time/end_time are stored as "HH:MM" strings; the API passes them
-- through to the UI verbatim rather than formatting a TIME.

CREATE TABLE IF NOT EXISTS availability_slots (
    id          SERIAL PRIMARY KEY,
    makelaar_id INTEGER    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time  VARCHAR(5) NOT NULL,
    end_time    VARCHAR(5) NOT NULL,
    is_active   BOOLEAN    DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_makelaar ON availability_slots (makelaar_id);

CREATE TABLE IF NOT EXISTS viewing_requests (
    id             SERIAL PRIMARY KEY,
    submission_id  INTEGER      REFERENCES listing_submissions(id) ON DELETE CASCADE,
    makelaar_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_date DATE         NOT NULL,
    requested_time VARCHAR(5)   NOT NULL,
    buyer_name     VARCHAR(255),
    buyer_phone    VARCHAR(50),
    message        TEXT,
    status         VARCHAR(20)  NOT NULL DEFAULT 'pending',
    rejection_note TEXT,
    created_at     TIMESTAMPTZ  DEFAULT NOW(),
    updated_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_viewings_makelaar ON viewing_requests (makelaar_id);
CREATE INDEX IF NOT EXISTS idx_viewings_buyer    ON viewing_requests (buyer_id);


-- ── Meldingen (issue reports) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meldingen (
    id              SERIAL PRIMARY KEY,
    property_id     INTEGER     REFERENCES properties(id) ON DELETE SET NULL,
    submission_id   INTEGER     REFERENCES listing_submissions(id) ON DELETE CASCADE,
    reporter_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    makelaar_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(50)  NOT NULL DEFAULT 'general',
    priority        VARCHAR(20)  NOT NULL DEFAULT 'normal',
    status          VARCHAR(20)  NOT NULL DEFAULT 'open',
    resolution_note TEXT,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_meldingen_makelaar ON meldingen (makelaar_id);
CREATE INDEX IF NOT EXISTS idx_meldingen_reporter ON meldingen (reporter_id);


-- ── Dossier documents ────────────────────────────────────────────────────────
-- Files are written to backend/uploads/ and referenced by `filename`.
-- Moving to object storage means adding storage_key/bucket here.

CREATE TABLE IF NOT EXISTS dossier_documents (
    id            SERIAL PRIMARY KEY,
    buyer_id      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_id INTEGER      REFERENCES listing_submissions(id) ON DELETE CASCADE,
    filename      VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type     VARCHAR(100),
    file_size     BIGINT,
    uploaded_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_buyer ON dossier_documents (buyer_id);


-- ── Saved searches / buyer alerts ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_searches (
    id            SERIAL PRIMARY KEY,
    buyer_id      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    city          VARCHAR(100),
    min_price     NUMERIC(12, 2),
    max_price     NUMERIC(12, 2),
    min_area_m2   NUMERIC(8, 2),
    max_area_m2   NUMERIC(8, 2),
    property_type VARCHAR(50),
    email_alerts  BOOLEAN      DEFAULT TRUE,
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_searches_buyer ON saved_searches (buyer_id);


-- ── Taxatie (valuation reports) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS taxatie_reports (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address         VARCHAR(255) NOT NULL,
    bag_id          VARCHAR(64),
    property_type   VARCHAR(50),
    year_built      INTEGER,
    living_area_m2  NUMERIC(8, 2),
    plot_area_m2    NUMERIC(8, 2),
    energy_label    VARCHAR(5),
    condition_score INTEGER,
    condition_note  TEXT,
    marktwaarde     NUMERIC(12, 2),
    data            JSONB,
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft',
    nwwi_number     VARCHAR(50),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    finalized_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_taxatie_user ON taxatie_reports (user_id);

CREATE TABLE IF NOT EXISTS taxatie_comparables (
    id             SERIAL PRIMARY KEY,
    report_id      INTEGER      NOT NULL REFERENCES taxatie_reports(id) ON DELETE CASCADE,
    address        VARCHAR(255) NOT NULL,
    sale_price     NUMERIC(12, 2) NOT NULL,
    sale_date      DATE,
    living_area_m2 NUMERIC(8, 2),
    corrections    JSONB,
    adjusted_price NUMERIC(12, 2),
    created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comparables_report ON taxatie_comparables (report_id);
