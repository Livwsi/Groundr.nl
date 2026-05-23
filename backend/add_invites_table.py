import asyncio
from sqlalchemy import text
from db.connection import get_db_session

async def migrate():
    async with get_db_session() as db:
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS invites (
                id           SERIAL PRIMARY KEY,
                token        VARCHAR(64)  UNIQUE NOT NULL,
                makelaar_id  INTEGER      NOT NULL REFERENCES users(id),
                email        VARCHAR(255) NOT NULL,
                used         BOOLEAN      DEFAULT FALSE,
                created_at   TIMESTAMP    DEFAULT NOW(),
                expires_at   TIMESTAMP    NOT NULL
            )
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_invite_token ON invites (token)
        """))
        print("✅ invites table created")

if __name__ == "__main__":
    asyncio.run(migrate())