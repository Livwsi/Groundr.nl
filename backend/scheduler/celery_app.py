# ─────────────────────────────────────────────────────────────
# backend/scheduler/celery_app.py
#
# PURPOSE:
#   Creates the Celery instance that powers all background jobs.
#
# WHAT IS CELERY?
#   Celery is a task queue system.
#   Instead of running heavy jobs (like scraping 10,000 listings)
#   inside a web request, you put them in a queue.
#   A separate worker process picks them up and runs them.
#
# HOW IT WORKS IN GROUNDR:
#   1. Celery Beat  → the scheduler (like a cron job)
#                    fires tasks at midnight
#   2. Celery Worker → picks up the tasks from Redis
#                    and actually runs them
#   3. Redis         → the message broker between Beat and Worker
#                    (the queue where tasks wait)
#
# TO START THE WORKER (run this in a separate terminal):
#   cd C:\Users\ibaka\groundr\backend
#   celery -A scheduler.celery_app worker --loglevel=info
#
# TO START THE SCHEDULER (run this in another terminal):
#   cd C:\Users\ibaka\groundr\backend
#   celery -A scheduler.celery_app beat --loglevel=info
# ─────────────────────────────────────────────────────────────

from celery import Celery
from celery.schedules import crontab

from config.settings import settings


# ─────────────────────────────────────────────────────────────
# CREATE THE CELERY APP
#
# main      → the name of this module (used for task naming)
# broker    → where tasks are queued (Redis)
# backend   → where results are stored (also Redis)
# ─────────────────────────────────────────────────────────────

celery_app = Celery(
    main    = "groundr",
    broker  = settings.REDIS_URL,
    backend = settings.REDIS_URL,
)


# ─────────────────────────────────────────────────────────────
# CELERY CONFIGURATION
#
# task_serializer   → how tasks are encoded (JSON is readable)
# timezone          → we use Amsterdam time for scheduling
# task_track_started → log when a task starts (useful for debugging)
# ─────────────────────────────────────────────────────────────

celery_app.conf.update(
    task_serializer         = "json",
    accept_content          = ["json"],
    result_serializer       = "json",
    timezone                = "Europe/Amsterdam",
    enable_utc              = True,
    task_track_started      = True,

    # ── Retry settings ────────────────────────────────────
    # If a task fails, retry it up to 3 times
    # Wait 60 seconds between retries
    task_max_retries        = 3,
    task_default_retry_delay= 60,
)


# ─────────────────────────────────────────────────────────────
# SCHEDULED TASKS (BEAT SCHEDULE)
#
# This defines WHEN each task runs automatically.
# Think of it like a cron job but managed by Celery.
#
# crontab(hour=0, minute=0) = every day at midnight (00:00)
# crontab(hour=3, minute=0) = every day at 03:00
# crontab(day_of_week=0)    = every Sunday
# ─────────────────────────────────────────────────────────────

celery_app.conf.beat_schedule = {

    # ── Step 1: Collect fresh property data ───────────────
    # Runs at 00:00 — collect addresses from BAG
    "collect-bag-midnight": {
        "task":     "scheduler.tasks.run_bag_collector",
        "schedule": crontab(
            hour   = settings.SCRAPE_CRON_HOUR,
            minute = settings.SCRAPE_CRON_MINUTE,
        ),
    },

    # ── Step 2: Collect amenities ─────────────────────────
    # Runs at 00:30 — after BAG so new properties get amenities
    "collect-osm-nightly": {
        "task":     "scheduler.tasks.run_osm_collector",
        "schedule": crontab(hour=0, minute=30),
    },

    # ── Step 3: Collect CBS neighborhood stats ────────────
    # Runs at 01:00 — CBS data changes less frequently
    "collect-cbs-nightly": {
        "task":     "scheduler.tasks.run_cbs_collector",
        "schedule": crontab(hour=1, minute=0),
    },

    # ── Step 4: Collect WOZ valuations ────────────────────
    # Runs at 01:30 — needs BAG data to exist first
    "collect-woz-nightly": {
        "task":     "scheduler.tasks.run_woz_collector",
        "schedule": crontab(hour=1, minute=30),
    },

    # ── Step 5: Run all tests and health checks ───────────
    # Runs at 06:00 — morning summary before the day starts
    "health-check-morning": {
        "task":     "scheduler.tasks.run_health_check",
        "schedule": crontab(hour=6, minute=0),
    },
}