# ─────────────────────────────────────────────────────────────
# backend/api/main.py
#
# PURPOSE:
#   This is the entry point of the Groundr backend API.
#   It creates the FastAPI app, registers all routes,
#   and handles startup/shutdown.
#
# TO START THE SERVER:
#   cd C:\Users\ibaka\groundr\backend
#   uvicorn api.main:app --reload --port 8000
#
#   Then open: http://localhost:8000/docs
#   You will see the auto-generated API documentation.
#
# WHAT HAPPENS ON STARTUP:
#   1. FastAPI app is created
#   2. Database tables are verified (init_db)
#   3. All routes are registered
#   4. Server starts listening on port 8000
# ─────────────────────────────────────────────────────────────

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from db.connection import init_db
from api.routes import properties, analytics, auth, listings, submissions, viewings, meldingen, searches, documents, taxatie
# Set up logging so we can see what is happening
logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# LIFESPAN
#
# This runs code on startup and shutdown.
# "async with lifespan(app)" wraps the entire server lifetime.
#
# On startup:  initialise the database
# On shutdown: could close connections, flush caches, etc.
# ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):

    # ── STARTUP ───────────────────────────────────────────
    logger.info("Starting Groundr API...")
    await init_db()
    logger.info("Groundr API ready.")

    yield   # server runs here

    # ── SHUTDOWN ──────────────────────────────────────────
    logger.info("Shutting down Groundr API...")


# ─────────────────────────────────────────────────────────────
# CREATE THE FASTAPI APP
#
# title       → shown in the API docs
# description → shown in the API docs
# version     → shown in the API docs
# lifespan    → runs startup/shutdown code
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "Groundr API",
    description = "Dutch real estate intelligence platform",
    version     = "0.1.0",
    lifespan    = lifespan,
)


# ─────────────────────────────────────────────────────────────
# CORS MIDDLEWARE
#
# CORS = Cross-Origin Resource Sharing.
# This allows the React frontend (running on localhost:3000)
# to talk to this API (running on localhost:8000).
# Without this, the browser would block the requests.
#
# In production: replace "*" with your actual domain.
# ─────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],   # in production: ["https://groundr.nl"]
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ─────────────────────────────────────────────────────────────
# ROUTES
#
# Each router handles a group of related endpoints.
# We import and register them here.
# ─────────────────────────────────────────────────────────────

from api.routes import properties, analytics

app.include_router(
    auth.router,
    prefix = "/api/auth",
    tags   = ["Auth"],
)

app.include_router(
    properties.router,
    prefix = "/api/properties",
    tags   = ["Properties"],
)

app.include_router(
    analytics.router,
    prefix = "/api/analytics",
    tags   = ["Analytics"],
)

app.include_router(
    listings.router,
    prefix = "/api/listings",
    tags   = ["Listings"],
)

app.include_router(
    submissions.router,
    prefix = "/api/submissions",
    tags   = ["Submissions"],
)

app.include_router(
    viewings.router,
    prefix="/api/viewings",
    tags=["Viewings"],
)

app.include_router(
    meldingen.router,
    prefix="/api/meldingen",
    tags=["Meldingen"],
)


app.include_router(
    searches.router,
    prefix="/api/searches",
    tags=["Searches"],
)

app.include_router(
    documents.router,
    prefix="/api/documents",
    tags=["Documents"],
)



app.include_router(
    taxatie.router,
    prefix="/api/taxatie",
    tags=["Taxatie"],
)



# ─────────────────────────────────────────────────────────────
# HEALTH CHECK ENDPOINT
#
# A simple endpoint to verify the API is running.
# Used by monitoring tools and Docker health checks.
# Open http://localhost:8000/health to check.
# ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    """
    Returns the current status of the API.
    If this endpoint responds, the server is running.
    """
    return {
        "status":  "ok",
        "version": "0.1.0",
        "env":     settings.APP_ENV,
    }


# ─────────────────────────────────────────────────────────────
# ROOT ENDPOINT
# ─────────────────────────────────────────────────────────────

@app.get("/", tags=["System"])
async def root():
    """Welcome message at the root URL."""
    return {
        "message": "Welcome to the Groundr API",
        "docs":    "http://localhost:8000/docs",
    }