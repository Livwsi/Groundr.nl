from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

# Absolute path to backend/.env — works regardless of where Python is launched from
ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):

    # ── App ───────────────────────────────────────────────────
    APP_ENV:    str  = "development"
    SECRET_KEY: str  = "changeme"
    DEBUG:      bool = True

    # Comma-separated list of origins allowed to call the API with credentials.
    # "*" is only honoured in development — see validate_for_boot().
    FRONTEND_ORIGINS: str = "http://localhost:3000"

    # ── Database ──────────────────────────────────────────────
    DB_USER:     str = "groundr"
    DB_PASSWORD: str = "groundr123"
    DB_NAME:     str = "groundr"
    DB_HOST:     str = "localhost"
    DB_PORT:     int = 5432

    # ── Redis ─────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── External APIs ─────────────────────────────────────────
    PDOK_BASE_URL:    str = "https://api.pdok.nl/bzk/locatieserver/search/v3_1"
    ALTUM_AI_API_KEY: str = ""
    KADASTER_API_KEY: str = ""
    # Used by /api/analytics/narrative. Empty disables that endpoint cleanly.
    ANTHROPIC_API_KEY: str = ""

    # ── Email (Resend) ────────────────────────────────────────
    RESEND_API_KEY: str = ""
    FROM_EMAIL:     str = "noreply@groundr.nl"
    FRONTEND_URL:   str = "http://localhost:3000"

    # ── Scraping ──────────────────────────────────────────────
    SCRAPER_DELAY_SECONDS: float = 3.0
    SCRAPER_MAX_RETRIES:   int   = 3

    # ── Scheduler ─────────────────────────────────────────────
    SCRAPE_CRON_HOUR:   int = 0
    SCRAPE_CRON_MINUTE: int = 0

    # ── Analytics ─────────────────────────────────────────────
    DEFAULT_RADIUS_KM: float = 2.0
    MIN_RADIUS_KM:     float = 0.5
    MAX_RADIUS_KM:     float = 10.0

    model_config = {"env_file": str(ENV_FILE), "env_file_encoding": "utf-8"}

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://"
            f"{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def is_development(self) -> bool:
        return self.APP_ENV.lower() in ("development", "dev", "local")

    @property
    def cors_origins(self) -> list[str]:
        """Explicit origin list. A wildcard with credentials is invalid per the
        CORS spec and browsers reject it, so outside development we never emit one."""
        origins = [o.strip() for o in self.FRONTEND_ORIGINS.split(",") if o.strip()]
        if "*" in origins and not self.is_development:
            raise RuntimeError(
                "FRONTEND_ORIGINS may not be '*' when APP_ENV is not development — "
                "credentialed requests from a wildcard origin are rejected by browsers. "
                "Set an explicit comma-separated origin list."
            )
        return origins or ["http://localhost:3000"]

    def validate_for_boot(self) -> None:
        """Refuse to start with development defaults in a deployed environment."""
        if self.is_development:
            return
        if self.SECRET_KEY == "changeme" or len(self.SECRET_KEY) < 32:
            raise RuntimeError(
                f"SECRET_KEY is unset or too weak while APP_ENV={self.APP_ENV!r}. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if self.DB_PASSWORD == "groundr123":
            raise RuntimeError(
                f"DB_PASSWORD is still the local default while APP_ENV={self.APP_ENV!r}."
            )
        self.cors_origins  # raises if a wildcard survived into a deployed env


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()