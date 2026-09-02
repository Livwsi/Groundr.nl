"""App wiring: health, and that every router is actually mounted.

A router that silently fails to register is invisible until a page 404s in a
demo, so the prefixes are asserted rather than assumed."""

EXPECTED_PREFIXES = [
    "/api/auth",
    "/api/properties",
    "/api/analytics",
    "/api/listings",
    "/api/submissions",
    "/api/viewings",
    "/api/meldingen",
    "/api/searches",
    "/api/documents",
    "/api/taxatie",
    "/api/market",
    "/api/reviews",
]


def test_health_reports_ok(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert "env" in body


def test_root_responds(client):
    assert client.get("/").status_code == 200


def test_every_router_is_mounted(client):
    from api.main import app

    paths = {r.path for r in app.routes}
    for prefix in EXPECTED_PREFIXES:
        assert any(p.startswith(prefix) for p in paths), f"no routes under {prefix}"


def test_openapi_schema_builds(client):
    """A duplicate operation id or a bad response model breaks /docs, which is
    usually noticed at the worst possible moment."""
    schema = client.get("/openapi.json")
    assert schema.status_code == 200
    assert schema.json()["info"]["title"] == "Groundr API"


def test_cors_allows_the_configured_frontend_origin(client):
    r = client.options(
        "/api/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert r.status_code in (200, 204)
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"
