-- ─────────────────────────────────────────────────────────────────────────────
-- Groundr — tables not defined in db/models.py
--
-- models.py owns: users, properties, market_listings, price_history, amenities,
-- data_source_logs, listing_submissions, bids. Those are created by
-- Base.metadata.create_all().
--
-- Everything below is queried through raw SQL in api/routes/*, so it has no
-- SQLAlchemy model. These definitions were dumped from the working development
-- database (pg_dump --schema-only) and match it exactly — before this file, they
-- existed nowhere in the repo.
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
    makelaar_id INTEGER      NOT NULL REFERENCES users(id),
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
    rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
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

CREATE INDEX IF NOT EXISTS idx_reviews_makelaar    ON reviews (makelaar_id);
CREATE INDEX IF NOT EXISTS idx_review_tokens_token ON review_tokens (token);


-- ── Viewings ─────────────────────────────────────────────────────────────────
-- start_time/end_time hold "HH:MM" strings; the API passes them to the UI
-- verbatim rather than formatting a TIME.

CREATE TABLE IF NOT EXISTS availability_slots (
    id          SERIAL PRIMARY KEY,
    makelaar_id INTEGER   NOT NULL REFERENCES users(id),
    day_of_week INTEGER   NOT NULL,
    start_time  VARCHAR   NOT NULL,
    end_time    VARCHAR   NOT NULL,
    is_active   BOOLEAN   DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS viewing_requests (
    id             SERIAL PRIMARY KEY,
    submission_id  INTEGER   REFERENCES listing_submissions(id),
    makelaar_id    INTEGER   NOT NULL REFERENCES users(id),
    buyer_id       INTEGER   NOT NULL REFERENCES users(id),
    requested_date DATE      NOT NULL,
    requested_time VARCHAR   NOT NULL,
    status         VARCHAR   DEFAULT 'pending',
    buyer_name     VARCHAR,
    buyer_phone    VARCHAR,
    message        TEXT,
    rejection_note TEXT,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP
);


-- ── Meldingen (issue reports) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meldingen (
    id              SERIAL PRIMARY KEY,
    property_id     INTEGER   REFERENCES properties(id),
    submission_id   INTEGER   REFERENCES listing_submissions(id),
    reporter_id     INTEGER   NOT NULL REFERENCES users(id),
    makelaar_id     INTEGER   NOT NULL REFERENCES users(id),
    title           VARCHAR   NOT NULL,
    description     TEXT      NOT NULL,
    category        VARCHAR   DEFAULT 'general',
    priority        VARCHAR   DEFAULT 'normal',
    status          VARCHAR   DEFAULT 'open',
    resolution_note TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP
);


-- ── Dossier documents ────────────────────────────────────────────────────────
-- Files are written to backend/uploads/ and referenced by `filename`.
-- Moving to object storage means adding storage_key/bucket here.

CREATE TABLE IF NOT EXISTS dossier_documents (
    id            SERIAL PRIMARY KEY,
    buyer_id      INTEGER   NOT NULL REFERENCES users(id),
    submission_id INTEGER   REFERENCES listing_submissions(id),
    filename      VARCHAR   NOT NULL,
    original_name VARCHAR   NOT NULL,
    file_type     VARCHAR,
    file_size     INTEGER,
    uploaded_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_buyer ON dossier_documents (buyer_id);


-- ── Saved searches / buyer alerts ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_searches (
    id            SERIAL PRIMARY KEY,
    buyer_id      INTEGER          NOT NULL REFERENCES users(id),
    city          VARCHAR,
    min_price     DOUBLE PRECISION,
    max_price     DOUBLE PRECISION,
    min_area_m2   DOUBLE PRECISION,
    max_area_m2   DOUBLE PRECISION,
    property_type VARCHAR,
    email_alerts  BOOLEAN          DEFAULT TRUE,
    created_at    TIMESTAMP        DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_search_buyer ON saved_searches (buyer_id);


-- ── Taxatie (valuation reports) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS taxatie_reports (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER          NOT NULL REFERENCES users(id),
    property_id     INTEGER          REFERENCES properties(id),
    status          VARCHAR          DEFAULT 'draft',
    address         VARCHAR,
    bag_id          VARCHAR,
    property_type   VARCHAR,
    year_built      INTEGER,
    living_area_m2  DOUBLE PRECISION,
    plot_area_m2    DOUBLE PRECISION,
    energy_label    VARCHAR,
    condition_score INTEGER,
    condition_note  TEXT,
    marktwaarde     DOUBLE PRECISION,
    data            JSONB            DEFAULT '{}'::jsonb,
    nwwi_number     VARCHAR,
    finalized_at    TIMESTAMP,
    created_at      TIMESTAMP        DEFAULT NOW(),
    updated_at      TIMESTAMP        DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taxatie_user ON taxatie_reports (user_id);

CREATE TABLE IF NOT EXISTS taxatie_comparables (
    id             SERIAL PRIMARY KEY,
    report_id      INTEGER          NOT NULL REFERENCES taxatie_reports(id),
    property_id    INTEGER          REFERENCES properties(id),
    address        VARCHAR,
    sale_price     DOUBLE PRECISION,
    sale_date      DATE,
    living_area_m2 DOUBLE PRECISION,
    corrections    JSONB            DEFAULT '{}'::jsonb,
    adjusted_price DOUBLE PRECISION,
    created_at     TIMESTAMP        DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taxatie_comp_report ON taxatie_comparables (report_id);
