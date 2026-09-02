"""Auth: token contents, and the rejection paths that protect every other route."""

from datetime import datetime, timedelta

import pytest
from jose import jwt

from api.dependencies import ALGORITHM
from api.routes.auth import ACCESS_TOKEN_EXPIRE_MINUTES, _create_token
from config.settings import settings


# ── token shape ──────────────────────────────────────────────────────────────

def test_token_carries_user_id_and_roles():
    """The frontend gates modules on the roles in the token, so they have to be
    in there and they have to survive a round trip."""
    token   = _create_token(7, ["agent", "appraiser"])
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])

    assert payload["sub"] == "7"
    assert payload["roles"] == ["agent", "appraiser"]


def test_token_expiry_matches_the_configured_window():
    token   = _create_token(1, [])
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])

    expected = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    actual   = datetime.utcfromtimestamp(payload["exp"])
    assert abs((actual - expected).total_seconds()) < 60


def test_token_signed_with_another_key_is_rejected():
    token = jwt.encode({"sub": "1", "roles": ["admin"]}, "not-the-real-key",
                       algorithm=ALGORITHM)
    with pytest.raises(Exception):
        jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


# ── protected routes ─────────────────────────────────────────────────────────

@pytest.mark.parametrize("path", [
    "/api/auth/me",
    "/api/taxatie/",
    "/api/documents/",
    "/api/searches/",
])
def test_protected_routes_reject_anonymous_requests(client, path):
    assert client.get(path).status_code == 401


def test_protected_route_rejects_a_forged_token(client):
    forged = jwt.encode({"sub": "1", "roles": ["admin"]}, "not-the-real-key",
                        algorithm=ALGORITHM)
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert r.status_code == 401


def test_login_with_unknown_email_is_401(client):
    """The stub session returns no user, which is the wrong-credentials path."""
    r = client.post("/api/auth/login",
                    json={"email": "nobody@example.com", "password": "whatever"})
    assert r.status_code == 401
    assert "password" in r.json()["detail"].lower()


def test_login_rejects_a_malformed_body(client):
    assert client.post("/api/auth/login", json={"email": "not-an-email"}).status_code == 422
