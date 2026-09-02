"""
Shared pytest fixtures.

These tests deliberately do not need a running database. Routes get a stub
session through FastAPI's dependency_overrides, so the suite runs in CI, on a
fresh clone, and before `docker-compose up`.
"""

import os
import sys
from pathlib import Path

import pytest

# The app is imported as `api.main`, `config.settings`, ... so `backend/` must
# be on sys.path regardless of where pytest is invoked from.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("APP_ENV", "development")


class StubResult:
    """Mimics the slice of SQLAlchemy's Result that the routes actually use."""

    def __init__(self, rows=None, scalar=None):
        self._rows = rows or []
        self._scalar = scalar

    def scalar_one_or_none(self):
        return self._scalar

    def fetchall(self):
        return self._rows

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def mappings(self):
        return self

    def first(self):
        return self._rows[0] if self._rows else None


class StubSession:
    """An AsyncSession stand-in that returns empty results for every query."""

    def __init__(self):
        self.executed = []

    async def execute(self, statement, params=None):
        self.executed.append((str(statement), params))
        return StubResult()

    async def flush(self):
        return None

    async def commit(self):
        return None

    async def rollback(self):
        return None

    def add(self, _obj):
        return None


@pytest.fixture
def stub_session():
    return StubSession()


@pytest.fixture
def client(stub_session):
    """TestClient with the database dependency replaced by a stub."""
    from fastapi.testclient import TestClient

    from api.main import app
    from db.connection import get_db

    async def _get_db_override():
        yield stub_session

    app.dependency_overrides[get_db] = _get_db_override
    # Not used as a context manager on purpose: that would run the lifespan,
    # and init_db() would try to reach a real database.
    yield TestClient(app)
    app.dependency_overrides.clear()
