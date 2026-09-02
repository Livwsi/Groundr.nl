import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from db.connection import init_db
from api.routes import properties, analytics, auth, listings, submissions, viewings, meldingen, searches, documents, taxatie
from api.routes.market  import router as market_router
from api.routes.reviews import router as reviews_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Groundr API...")
    settings.validate_for_boot()   # refuses dev defaults outside development
    await init_db()
    logger.info("Groundr API ready (env=%s, origins=%s).", settings.APP_ENV, settings.cors_origins)
    yield
    logger.info("Shutting down Groundr API...")


app = FastAPI(
    title       = "Groundr API",
    description = "Dutch real estate intelligence platform",
    version     = "0.1.0",
    lifespan    = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = settings.cors_origins,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Routes ────────────────────────────────────────────────────
app.include_router(auth.router,        prefix="/api/auth",        tags=["Auth"])
app.include_router(properties.router,  prefix="/api/properties",  tags=["Properties"])
app.include_router(analytics.router,   prefix="/api/analytics",   tags=["Analytics"])
app.include_router(listings.router,    prefix="/api/listings",    tags=["Listings"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["Submissions"])
app.include_router(viewings.router,    prefix="/api/viewings",    tags=["Viewings"])
app.include_router(meldingen.router,   prefix="/api/meldingen",   tags=["Meldingen"])
app.include_router(searches.router,    prefix="/api/searches",    tags=["Searches"])
app.include_router(documents.router,   prefix="/api/documents",   tags=["Documents"])
app.include_router(taxatie.router,     prefix="/api/taxatie",     tags=["Taxatie"])
app.include_router(market_router,      prefix="/api/market",      tags=["Market"])
app.include_router(reviews_router,     prefix="/api/reviews",     tags=["Reviews"])


@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "version": "0.1.0", "env": settings.APP_ENV}


@app.get("/", tags=["System"])
async def root():
    return {"message": "Welcome to the Groundr API", "docs": "http://localhost:8000/docs"}