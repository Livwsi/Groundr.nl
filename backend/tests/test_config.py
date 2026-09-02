"""Boot guards and CORS origin handling — the checks that stop a misconfigured
deploy from serving traffic with a known signing key."""

import pytest

from config.settings import Settings


def _settings(**overrides) -> Settings:
    base = dict(
        APP_ENV="production",
        SECRET_KEY="a" * 64,
        DB_PASSWORD="a-real-password",
        FRONTEND_ORIGINS="https://groundr.nl",
    )
    base.update(overrides)
    return Settings(**base)


# ── validate_for_boot ────────────────────────────────────────────────────────

def test_development_boots_with_defaults():
    """Local development must stay frictionless."""
    _settings(APP_ENV="development", SECRET_KEY="changeme",
              DB_PASSWORD="groundr123").validate_for_boot()


def test_production_refuses_default_secret_key():
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        _settings(SECRET_KEY="changeme").validate_for_boot()


def test_production_refuses_short_secret_key():
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        _settings(SECRET_KEY="tooshort").validate_for_boot()


def test_production_refuses_default_db_password():
    with pytest.raises(RuntimeError, match="DB_PASSWORD"):
        _settings(DB_PASSWORD="groundr123").validate_for_boot()


def test_production_accepts_a_real_configuration():
    _settings().validate_for_boot()   # must not raise


# ── cors_origins ─────────────────────────────────────────────────────────────

def test_wildcard_origin_refused_outside_development():
    """allow_origins=['*'] with allow_credentials=True is invalid per the CORS
    spec and browsers reject it, so it must never reach the middleware."""
    with pytest.raises(RuntimeError, match="FRONTEND_ORIGINS"):
        _settings(FRONTEND_ORIGINS="*").cors_origins


def test_wildcard_origin_allowed_in_development():
    assert _settings(APP_ENV="development", FRONTEND_ORIGINS="*").cors_origins == ["*"]


def test_origins_are_split_and_trimmed():
    s = _settings(FRONTEND_ORIGINS="https://groundr.nl, https://www.groundr.nl ,")
    assert s.cors_origins == ["https://groundr.nl", "https://www.groundr.nl"]


def test_empty_origins_fall_back_to_localhost():
    assert _settings(FRONTEND_ORIGINS="   ").cors_origins == ["http://localhost:3000"]


def test_is_development_recognises_aliases():
    for env in ("development", "dev", "local", "DEV"):
        assert _settings(APP_ENV=env).is_development, env
    for env in ("production", "staging"):
        assert not _settings(APP_ENV=env).is_development, env
