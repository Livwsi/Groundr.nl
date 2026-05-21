# ─────────────────────────────────────────────────────────────
# backend/collectors/base.py
#
# PURPOSE:
#   This is the parent class for ALL data collectors.
#   Every scraper (BAG, Funda, CBS, WOZ) inherits from this.
#
# WHAT IT PROVIDES FOR FREE:
#   - HTTP requests with automatic retries
#   - Random delays between requests (avoid getting blocked)
#   - Rotating user agents (look like a real browser)
#   - Logging every run to the database
#   - A standard structure: collect → parse → save
#
# HOW TO USE IT:
#   Create a new file (e.g. bag.py), inherit from BaseCollector,
#   and implement the three methods: collect(), parse(), save()
#
# EXAMPLE:
#   class BAGCollector(BaseCollector):
#       SOURCE_NAME = "bag"
#
#       async def collect(self): ...
#       def parse(self, raw): ...
#       async def save(self, records): ...
# ─────────────────────────────────────────────────────────────

import asyncio
import logging
import random
import time
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Optional

import aiohttp
from aiohttp import ClientSession, ClientTimeout

from config.settings import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# USER AGENTS
#
# When we make HTTP requests, we send a "User-Agent" header
# that identifies who is making the request.
# By rotating through real browser strings, we look less like
# a bot and more like a real person browsing the web.
# ─────────────────────────────────────────────────────────────

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",

    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) "
    "Gecko/20100101 Firefox/121.0",

    "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) "
    "Gecko/20100101 Firefox/121.0",
]


# ─────────────────────────────────────────────────────────────
# BASE COLLECTOR CLASS
#
# ABC = Abstract Base Class
# This means you cannot use BaseCollector directly —
# you must create a child class that implements the
# three abstract methods: collect(), parse(), save()
# ─────────────────────────────────────────────────────────────

class BaseCollector(ABC):

    # Each child class must set this to their source name
    # e.g. "bag", "funda", "cbs", "woz"
    SOURCE_NAME: str = "unknown"

    def __init__(self):
        # The HTTP session — opened when we start, closed when done
        self.session: Optional[ClientSession] = None

        # Track how many records we added/updated in this run
        self._records_added   = 0
        self._records_updated = 0

        # Track when the run started (for measuring duration)
        self._run_start: float = 0


    # ─────────────────────────────────────────────────────────
    # LIFECYCLE — open and close the HTTP session
    #
    # Using "async with BAGCollector() as c:" will:
    #   1. Call __aenter__ → opens the HTTP session
    #   2. Run your code
    #   3. Call __aexit__  → closes the HTTP session cleanly
    # ─────────────────────────────────────────────────────────

    async def __aenter__(self):
        await self._open_session()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._close_session()

    async def _open_session(self):
        """Opens an aiohttp HTTP session with a 30 second timeout."""
        timeout = ClientTimeout(total=30, connect=10)
        self.session = ClientSession(
            timeout=timeout,
            headers={
                "User-Agent": self._random_user_agent(),
                "Accept":     "*/*",              # ← add this line
            },

        )

    async def _close_session(self):
        """Closes the HTTP session if it is open."""
        if self.session and not self.session.closed:
            await self.session.close()


    # ─────────────────────────────────────────────────────────
    # ABSTRACT METHODS
    #
    # These MUST be implemented by every child class.
    # If you forget one, Python will raise an error immediately.
    # ─────────────────────────────────────────────────────────

    @abstractmethod
    async def collect(self, **kwargs) -> list[dict]:
        """
        Fetch raw data from the source (API or website).
        Returns a list of raw records (dictionaries).
        """
        ...

    @abstractmethod
    def parse(self, raw: dict) -> Optional[dict]:
        """
        Clean and normalise one raw record.
        Returns a dictionary ready to save, or None to skip.
        """
        ...

    @abstractmethod
    async def save(self, parsed_records: list[dict]) -> tuple[int, int]:
        """
        Save the parsed records to the database.
        Returns (records_added, records_updated).
        """
        ...


    # ─────────────────────────────────────────────────────────
    # RUN
    #
    # This is the main method you call to run a collector.
    # It orchestrates the full pipeline:
    #   collect() → parse() → save() → log result
    #
    # You don't need to override this in child classes.
    # ─────────────────────────────────────────────────────────

    async def run(self, **kwargs) -> dict:
        """
        Run the full collection pipeline.
        Returns a summary dict with status, counts, and duration.
        """
        self._run_start = time.time()
        status          = "success"
        error_message   = None

        try:
            # Step 1: Fetch raw data from the source
            logger.info(f"[{self.SOURCE_NAME}] Starting collection...")
            raw_records = await self.collect(**kwargs)
            logger.info(f"[{self.SOURCE_NAME}] Fetched {len(raw_records)} raw records")

            # Step 2: Parse each raw record into our format
            # Records where parse() returns None are skipped
            parsed = [
                result
                for raw in raw_records
                if (result := self.parse(raw)) is not None
            ]
            logger.info(f"[{self.SOURCE_NAME}] Parsed {len(parsed)} valid records")

            # Step 3: Save to database
            self._records_added, self._records_updated = await self.save(parsed)
            logger.info(
                f"[{self.SOURCE_NAME}] "
                f"Added: {self._records_added} | "
                f"Updated: {self._records_updated}"
            )

        except Exception as e:
            status        = "failed"
            error_message = str(e)
            logger.error(f"[{self.SOURCE_NAME}] Failed: {e}", exc_info=True)

        # Calculate how long the run took
        duration = round(time.time() - self._run_start, 2)

        # Build the result summary
        result = {
            "source":          self.SOURCE_NAME,
            "status":          status,
            "records_added":   self._records_added,
            "records_updated": self._records_updated,
            "error_message":   error_message,
            "duration_s":      duration,
        }

        # Log this run to the database
        await self._log_run(result)

        return result


    # ─────────────────────────────────────────────────────────
    # HTTP HELPERS
    #
    # These make it easy to send HTTP requests with:
    #   - Automatic retries on failure
    #   - Exponential backoff (wait longer after each failure)
    #   - Rate limiting (pause between requests)
    # ─────────────────────────────────────────────────────────

    async def get(
        self,
        url: str,
        params: dict = None,
        retries: int = None,
    ) -> Optional[Any]:
        """
        Send a GET request and return the JSON response.
        Automatically retries on failure with exponential backoff.
        Returns None if all retries fail.
        """
        max_retries = retries or settings.SCRAPER_MAX_RETRIES

        for attempt in range(1, max_retries + 1):
            try:
                # Rotate user agent on each retry
                self.session.headers.update({
                    "User-Agent": self._random_user_agent()
                })

                async with self.session.get(url, params=params) as response:

                    # Success
                    if response.status == 200:
                        await self._rate_limit()
                        return await response.json(content_type=None)

                    # Rate limited — wait much longer before retrying
                    elif response.status == 429:
                        wait_seconds = (2 ** attempt) * 5
                        logger.warning(
                            f"[{self.SOURCE_NAME}] Rate limited. "
                            f"Waiting {wait_seconds}s..."
                        )
                        await asyncio.sleep(wait_seconds)

                    # Forbidden — we are blocked
                    elif response.status == 403:
                        logger.warning(
                            f"[{self.SOURCE_NAME}] Blocked (403): {url}"
                        )
                        return None

                    else:
                        logger.warning(
                            f"[{self.SOURCE_NAME}] "
                            f"HTTP {response.status}: {url}"
                        )

            except aiohttp.ClientError as e:
                logger.warning(
                    f"[{self.SOURCE_NAME}] "
                    f"Attempt {attempt}/{max_retries} failed: {e}"
                )
                if attempt < max_retries:
                    # Wait longer after each failure (exponential backoff)
                    await asyncio.sleep(2 ** attempt)

        logger.error(
            f"[{self.SOURCE_NAME}] All {max_retries} retries failed for: {url}"
        )
        return None

    async def get_html(self, url: str, params: dict = None) -> Optional[str]:
        """
        Send a GET request and return the raw HTML as a string.
        Used for scraping pages that don't have a JSON API.
        """
        try:
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    await self._rate_limit()
                    return await response.text()
                logger.warning(
                    f"[{self.SOURCE_NAME}] HTTP {response.status}: {url}"
                )
                return None
        except aiohttp.ClientError as e:
            logger.error(f"[{self.SOURCE_NAME}] Request failed: {e}")
            return None


    # ─────────────────────────────────────────────────────────
    # UTILITIES
    # ─────────────────────────────────────────────────────────

    async def _rate_limit(self):
        """
        Wait between requests to avoid getting blocked.
        Adds a small random extra delay so we don't look like a bot.
        e.g. if SCRAPER_DELAY_SECONDS=3, we wait 3.0 to 4.5 seconds.
        """
        delay = settings.SCRAPER_DELAY_SECONDS + random.uniform(0, 1.5)
        await asyncio.sleep(delay)

    @staticmethod
    def _random_user_agent() -> str:
        """Pick a random browser string from our list."""
        return random.choice(USER_AGENTS)

    async def _log_run(self, result: dict):
        """
        Save a record of this run to the data_source_logs table.
        This gives us an audit trail of every collection job.
        """
        try:
            from db.connection import get_db_session
            from db.models import DataSourceLog

            async with get_db_session() as db:
                log_entry = DataSourceLog(
                    source          = result["source"],
                    status          = result["status"],
                    records_added   = result["records_added"],
                    records_updated = result["records_updated"],
                    error_message   = result.get("error_message"),
                    duration_s      = result["duration_s"],
                    run_at          = datetime.utcnow(),
                )
                db.add(log_entry)

        except Exception as e:
            # Don't crash the whole run just because logging failed
            logger.error(f"Failed to write run log: {e}")