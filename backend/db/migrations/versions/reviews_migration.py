# backend/db/migrations/versions/006_add_reviews.py
"""Add reviews and review_tokens tables

Revision ID: 006
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id          SERIAL PRIMARY KEY,
            makelaar_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment     TEXT,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS review_tokens (
            id          SERIAL PRIMARY KEY,
            token       UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
            makelaar_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            used        BOOLEAN DEFAULT FALSE,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_reviews_makelaar ON reviews(makelaar_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_review_tokens_token ON review_tokens(token)")

def downgrade():
    op.execute("DROP TABLE IF EXISTS review_tokens")
    op.execute("DROP TABLE IF EXISTS reviews")