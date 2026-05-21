# ─────────────────────────────────────────────────────────────
# backend/db/connection.py
#
# PURPOSE:
#   Connects Python to the PostgreSQL database.
#   Creates all tables on startup.
#   Provides a safe way to open/close database sessions.
#
# KEY CONCEPTS:
#   - Engine   → the actual connection to PostgreSQL
#   - Session  → one "conversation" with the database
#                (open it, do your queries, close it)
#   - async    → non-blocking, so the app stays fast
#                while waiting for database responses
# ─────────────────────────────────────────────────────────────

import logging
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy import text

from config.settings import settings
from db.models import Base

# Set up logging so we can see what's happening
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# ENGINE
#
# The engine is the actual connection pool to PostgreSQL.
# We create ONE engine and reuse it for the entire app lifetime.
#
# pool_size=10    → keep 10 connections open and ready
# max_overflow=20 → allow 20 extra connections if needed
# pool_pre_ping   → test connections before using them
#                   (handles dropped connections gracefully)
# echo=True       → print all SQL queries to the console
#                   (useful in development, turn off in production)
# ─────────────────────────────────────────────────────────────

engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)


# ─────────────────────────────────────────────────────────────
# SESSION FACTORY
#
# A session is one "conversation" with the database.
# This factory creates new sessions when we need them.
#
# expire_on_commit=False → keep data accessible after saving
# autoflush=False        → we control when to send queries
# ─────────────────────────────────────────────────────────────

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ─────────────────────────────────────────────────────────────
# INIT DATABASE
#
# Called once when the app starts.
# Does two things:
#   1. Enables PostGIS (for map/location queries)
#   2. Creates all tables defined in models.py
#
# "CREATE EXTENSION IF NOT EXISTS" is safe to run multiple
# times — it only creates the extension if it doesn't exist.
# ─────────────────────────────────────────────────────────────

async def init_db() -> None:
    logger.info("Initialising database...")

    async with engine.begin() as conn:

        # Enable PostGIS — this adds location/map superpowers to PostgreSQL
        # Needed for "find all properties within 2km" queries
        logger.info("Enabling PostGIS extension...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))

        # Create all tables from models.py
        # If a table already exists, it is NOT recreated (safe to run again)
        logger.info("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database ready.")


# ─────────────────────────────────────────────────────────────
# GET DB SESSION
#
# This is used in two places:
#
# 1. FastAPI routes (via Depends):
#      async def my_route(db: AsyncSession = Depends(get_db)):
#
# 2. Background jobs / collectors:
#      async with get_db_session() as db:
#          db.add(something)
#
# The "try/except/finally" block makes sure:
#   - If everything works → commit (save to database)
#   - If something fails  → rollback (undo everything)
#   - Always             → close the session when done
# ─────────────────────────────────────────────────────────────

async def get_db() -> AsyncSession:
    """
    For use in FastAPI routes via Depends(get_db).
    Opens a session, yields it, then commits or rolls back.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_session() -> AsyncSession:
    """
    For use in collectors and background jobs (outside FastAPI).
    Same commit/rollback logic as get_db() above.

    Example usage:
        async with get_db_session() as db:
            db.add(new_property)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()