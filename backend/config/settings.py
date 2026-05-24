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


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()