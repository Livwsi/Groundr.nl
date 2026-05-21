# ─────────────────────────────────────────────────────────────
# backend/scheduler/tasks.py
#
# PURPOSE:
#   Defines all background tasks that run automatically.
#   Each function here is one scheduled job.
#
# HOW IT CONNECTS TO celery_app.py:
#   celery_app.py says WHEN to run each task (the schedule).
#   This file says WHAT to do when the task runs (the code).
#
# EACH TASK FOLLOWS THE SAME PATTERN:
#   1. Log that it started
#   2. Create the collector
#   3. Run it
#   4. Log the result
#   5. Return a summary
#
# HOW TO RUN A TASK MANUALLY (without waiting for midnight):
#   from scheduler.tasks import run_bag_collector
#   run_bag_collector.delay()    ← sends to queue
#   run_bag_collector()          ← runs directly (for testing)
# ─────────────────────────────────────────────────────────────

import asyncio
import logging

from scheduler.celery_app import celery_app

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# HELPER
#
# Our collectors are async (they use "await").
# Celery tasks are regular (sync) functions.
# This helper lets us run async collectors inside sync tasks.
# ─────────────────────────────────────────────────────────────

def run_async(coroutine):
    """
    Run an async function from inside a sync Celery task.
    Creates a new event loop, runs the coroutine, closes it.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coroutine)
    finally:
        loop.close()


# ─────────────────────────────────────────────────────────────
# TASK 1: BAG COLLECTOR
# Runs at midnight — collects fresh addresses from PDOK/BAG.
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    name    = "scheduler.tasks.run_bag_collector",
    bind    = True,         # gives access to self (for retries)
    max_retries = 3,
)
def run_bag_collector(self):
    """
    Collect Dutch address data from the BAG/PDOK API.
    Runs every night at midnight.
    """
    logger.info("[TASK] Starting BAG collector...")

    try:
        from collectors.bag import BAGCollector

        async def _run():
            async with BAGCollector() as collector:
                return await collector.run(
                    cities       = ["Eindhoven", "Veldhoven", "Helmond"],
                    max_per_city = 500,
                )

        result = run_async(_run())
        logger.info(f"[TASK] BAG done: {result}")
        return result

    except Exception as e:
        logger.error(f"[TASK] BAG failed: {e}")
        # Retry the task if it fails
        raise self.retry(exc=e, countdown=60)


# ─────────────────────────────────────────────────────────────
# TASK 2: OSM COLLECTOR
# Runs at 00:30 — fetches amenities for new properties.
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    name    = "scheduler.tasks.run_osm_collector",
    bind    = True,
    max_retries = 3,
)
def run_osm_collector(self):
    """
    Collect nearby amenities from OpenStreetMap.
    Runs 30 minutes after BAG so new properties get amenities too.
    """
    logger.info("[TASK] Starting OSM collector...")

    try:
        from collectors.osm import OSMCollector

        async def _run():
            async with OSMCollector() as collector:
                return await collector.run(
                    city  = "Eindhoven",
                    limit = 100,        # process 100 properties per night
                )

        result = run_async(_run())
        logger.info(f"[TASK] OSM done: {result}")
        return result

    except Exception as e:
        logger.error(f"[TASK] OSM failed: {e}")
        raise self.retry(exc=e, countdown=60)


# ─────────────────────────────────────────────────────────────
# TASK 3: CBS COLLECTOR
# Runs at 01:00 — fetches neighborhood statistics.
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    name    = "scheduler.tasks.run_cbs_collector",
    bind    = True,
    max_retries = 3,
)
def run_cbs_collector(self):
    """
    Collect neighborhood statistics from CBS Open Data.
    Runs at 01:00 — CBS data updates less frequently than listings.
    """
    logger.info("[TASK] Starting CBS collector...")

    try:
        from collectors.cbs import CBSCollector

        async def _run():
            async with CBSCollector() as collector:
                return await collector.run(
                    municipalities = ["Eindhoven", "Veldhoven", "Helmond"],
                )

        result = run_async(_run())
        logger.info(f"[TASK] CBS done: {result}")
        return result

    except Exception as e:
        logger.error(f"[TASK] CBS failed: {e}")
        raise self.retry(exc=e, countdown=60)


# ─────────────────────────────────────────────────────────────
# TASK 4: WOZ COLLECTOR
# Runs at 01:30 — fetches tax valuations.
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    name    = "scheduler.tasks.run_woz_collector",
    bind    = True,
    max_retries = 3,
)
def run_woz_collector(self):
    """
    Collect WOZ tax valuations.
    Placeholder until API key is configured.
    """
    logger.info("[TASK] Starting WOZ collector...")

    try:
        from collectors.woz import WOZCollector

        async def _run():
            async with WOZCollector() as collector:
                return await collector.run()

        result = run_async(_run())
        logger.info(f"[TASK] WOZ done: {result}")
        return result

    except Exception as e:
        logger.error(f"[TASK] WOZ failed: {e}")
        raise self.retry(exc=e, countdown=60)


# ─────────────────────────────────────────────────────────────
# TASK 5: HEALTH CHECK
# Runs at 06:00 — checks that everything is working.
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    name = "scheduler.tasks.run_health_check",
)
def run_health_check():
    """
    Morning health check — verifies database and collectors.
    Logs a summary of how many properties and amenities we have.
    """
    logger.info("[TASK] Running morning health check...")

    try:
        async def _run():
            from sqlalchemy import func, select
            from db.connection import get_db_session
            from db.models import Property, Amenity, DataSourceLog

            async with get_db_session() as db:

                # Count properties
                prop_count = await db.scalar(
                    select(func.count(Property.id))
                )

                # Count amenities
                amenity_count = await db.scalar(
                    select(func.count(Amenity.id))
                )

                # Get last 5 collector runs
                logs = await db.execute(
                    select(DataSourceLog)
                    .order_by(DataSourceLog.run_at.desc())
                    .limit(5)
                )
                recent_logs = logs.scalars().all()

            summary = {
                "properties":  prop_count,
                "amenities":   amenity_count,
                "recent_runs": [
                    {
                        "source":   log.source,
                        "status":   log.status,
                        "added":    log.records_added,
                        "duration": log.duration_s,
                    }
                    for log in recent_logs
                ],
            }

            logger.info(f"[HEALTH] {summary}")
            return summary

        return run_async(_run())

    except Exception as e:
        logger.error(f"[TASK] Health check failed: {e}")
        return {"status": "failed", "error": str(e)}