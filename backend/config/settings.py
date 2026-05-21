# ─────────────────────────────────────────────────────────────
# backend/config/settings.py
#
# PURPOSE:
#   This is the single source of truth for all configuration.
#   Every other file imports settings from here.
#   Values are read from the .env file automatically.
#
# HOW TO USE IN OTHER FILES:
#   from config.settings import settings
#   print(settings.DB_HOST)
# ─────────────────────────────────────────────────────────────

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    All configuration lives here.
    Pydantic reads each value from the .env file automatically.
    If a value is missing from .env, Python will raise an error
    immediately — so you know what's missing right away.
    """

    # ── App ───────────────────────────────────────────────────
    APP_ENV: str = "development"   # development or production
    SECRET_KEY: str = "changeme"   # used for JWT token signing
    DEBUG: bool = True             # show extra logs when True

    # ── Database ──────────────────────────────────────────────
    DB_USER: str = "groundr"
    DB_PASSWORD: str = "groundr123"
    DB_NAME: str = "groundr"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432

    # ── Redis ─────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── External APIs ─────────────────────────────────────────
    PDOK_BASE_URL: str = "https://api.pdok.nl/bzk/locatieserver/search/v3_1"
    ALTUM_AI_API_KEY: str = ""
    KADASTER_API_KEY: str = ""

    # ── Scraping ──────────────────────────────────────────────
    SCRAPER_DELAY_SECONDS: float = 3.0   # wait between requests
    SCRAPER_MAX_RETRIES: int = 3         # retry failed requests

    # ── Scheduler ─────────────────────────────────────────────
    SCRAPE_CRON_HOUR: int = 0     # midnight
    SCRAPE_CRON_MINUTE: int = 0

    # ── Analytics constants ───────────────────────────────────
    DEFAULT_RADIUS_KM: float = 2.0   # default search radius
    MIN_RADIUS_KM: float = 0.5
    MAX_RADIUS_KM: float = 10.0

    # ── This tells Pydantic where to find the .env file ───────
    class Config:
        env_file = "backend/.env"
        env_file_encoding = "utf-8"

    # ── Build the database URL from the parts above ───────────
    # asyncpg is the async PostgreSQL driver we use
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://"
            f"{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


# ─────────────────────────────────────────────────────────────
# Create ONE instance of Settings and reuse it everywhere.
# lru_cache means it only reads the .env file once,
# not every time a file imports it.
# ─────────────────────────────────────────────────────────────

@lru_cache()
def get_settings() -> Settings:
    return Settings()


# This is what other files import:
#   from config.settings import settings
settings = get_settings()