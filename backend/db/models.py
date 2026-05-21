# ─────────────────────────────────────────────────────────────
# backend/db/models.py
#
# PURPOSE:
#   Defines all database tables for Groundr.
#   Each class here becomes a table in PostgreSQL.
#   Each variable inside a class becomes a column in that table.
#
# TABLES:
#   - User          → platform users (makelaars, advisors, etc.)
#   - Property      → the master property registry
#   - MarketListing → active/sold listings from Funda etc.
#   - PriceHistory  → daily price snapshots per property
#   - Amenity       → nearby schools, gyms, stations (from OSM)
#   - DataSourceLog → audit trail for every scraping run
# ─────────────────────────────────────────────────────────────

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum,
    Float, ForeignKey, Index, Integer,
    String, Text, UniqueConstraint
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func


# ─────────────────────────────────────────────────────────────
# BASE
# All tables inherit from this.
# It gives them the SQLAlchemy ORM superpowers.
# ─────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ─────────────────────────────────────────────────────────────
# ENUMS
# These are fixed lists of allowed values for certain columns.
# Example: a property can only be "apartment", "house", etc.
# ─────────────────────────────────────────────────────────────

class PropertyType(str, enum.Enum):
    APARTMENT  = "apartment"
    HOUSE      = "house"
    VILLA      = "villa"
    TOWNHOUSE  = "townhouse"
    SEMI_DET   = "semi_detached"
    DETACHED   = "detached"
    STUDIO     = "studio"
    UNKNOWN    = "unknown"


class EnergyLabel(str, enum.Enum):
    A4      = "A++++"
    A3      = "A+++"
    A2      = "A++"
    A1      = "A+"
    A       = "A"
    B       = "B"
    C       = "C"
    D       = "D"
    E       = "E"
    F       = "F"
    G       = "G"
    UNKNOWN = "unknown"


class ListingStatus(str, enum.Enum):
    ACTIVE  = "active"    # currently for sale or rent
    SOLD    = "sold"      # transaction completed
    RENTED  = "rented"
    REMOVED = "removed"   # taken off the market


class AmenityType(str, enum.Enum):
    SCHOOL      = "school"
    HOSPITAL    = "hospital"
    SUPERMARKET = "supermarket"
    GYM         = "gym"
    PARK        = "park"
    STATION     = "train_station"
    BUS_STOP    = "bus_stop"
    PHARMACY    = "pharmacy"


# ─────────────────────────────────────────────────────────────
# TABLE: users
# People who log into the Groundr platform.
# Makelaars, hypotheekadviseurs, buyers, admins.
# ─────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id               = Column(Integer, primary_key=True)
    email            = Column(String(255), unique=True, nullable=False)
    hashed_password  = Column(String(255), nullable=False)  # never store plain text!
    full_name        = Column(String(255))
    is_active        = Column(Boolean, default=True)
    is_admin         = Column(Boolean, default=False)

    # subscription tier: free, starter, pro, office, enterprise
    subscription     = Column(String(50), default="free")

    created_at       = Column(DateTime, server_default=func.now())
    updated_at       = Column(DateTime, onupdate=func.now())


# ─────────────────────────────────────────────────────────────
# TABLE: properties
# The master registry of all Dutch properties.
# Data comes from BAG (official), enriched by other sources.
# ─────────────────────────────────────────────────────────────

class Property(Base):
    __tablename__ = "properties"

    id             = Column(Integer, primary_key=True)

    # ── Official identifier ────────────────────────────────
    # bag_id is the official Dutch building ID from the BAG registry
    bag_id         = Column(String(50), unique=True)

    # ── Address ───────────────────────────────────────────
    street         = Column(String(255), nullable=False)
    house_number   = Column(String(20))
    postal_code    = Column(String(10))
    city           = Column(String(100))
    municipality   = Column(String(100))
    neighborhood   = Column(String(100))   # e.g. "Stratum"

    # ── Location coordinates ──────────────────────────────
    # Stored as plain floats for now.
    # PostGIS spatial index is added below for fast radius queries.
    latitude       = Column(Float, nullable=False)
    longitude      = Column(Float, nullable=False)

    # ── Building attributes (from BAG) ────────────────────
    year_built     = Column(Integer)
    living_area_m2 = Column(Float)        # living area in square meters
    plot_area_m2   = Column(Float)        # plot/land size
    num_rooms      = Column(Integer)
    num_bedrooms   = Column(Integer)
    property_type  = Column(Enum(PropertyType), default=PropertyType.UNKNOWN)
    energy_label   = Column(Enum(EnergyLabel),  default=EnergyLabel.UNKNOWN)

    # ── Valuations ────────────────────────────────────────
    woz_value      = Column(Float)        # official Dutch tax value (€)
    woz_year       = Column(Integer)      # which year the WOZ is for
    last_sold_price= Column(Float)        # last known sold price (€)
    last_sold_date = Column(DateTime)

    # ── Where this data came from ─────────────────────────
    source         = Column(String(50))   # "bag", "funda", "manual"

    created_at     = Column(DateTime, server_default=func.now())
    updated_at     = Column(DateTime, onupdate=func.now())

    # ── Relationships (links to other tables) ─────────────
    listings       = relationship("MarketListing", back_populates="property")
    price_history  = relationship("PriceHistory",  back_populates="property")
    amenities      = relationship("Amenity",        back_populates="property")

    # ── Database indexes for fast queries ─────────────────
    # These make lookups by location/city much faster
    __table_args__ = (
        Index("idx_property_coords",   "latitude", "longitude"),
        Index("idx_property_postal",   "postal_code"),
        Index("idx_property_city",     "city"),
        Index("idx_property_bag_id",   "bag_id"),
    )


# ─────────────────────────────────────────────────────────────
# TABLE: market_listings
# Active and historical listings from Funda, Pararius, etc.
# One property can have multiple listings over time.
# ─────────────────────────────────────────────────────────────

class MarketListing(Base):
    __tablename__ = "market_listings"

    id             = Column(Integer, primary_key=True)

    # Which property this listing is for
    property_id    = Column(Integer, ForeignKey("properties.id"), nullable=False)

    # ── Source information ────────────────────────────────
    source         = Column(String(50))        # "funda", "pararius", "jaap"
    source_url     = Column(Text, unique=True) # the original listing URL
    source_id      = Column(String(100))       # the listing ID on that platform

    # ── Listing details ───────────────────────────────────
    status         = Column(Enum(ListingStatus), default=ListingStatus.ACTIVE)
    asking_price   = Column(Float)             # asking price in €
    price_per_m2   = Column(Float)             # calculated: price / area
    is_rental      = Column(Boolean, default=False)
    rent_per_month = Column(Float)             # if it's a rental

    # ── Market timing ─────────────────────────────────────
    listed_date    = Column(DateTime)
    sold_date      = Column(DateTime)
    days_on_market = Column(Integer)           # how long it took to sell
    # Which makelaar created this listing
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    scraped_at     = Column(DateTime, server_default=func.now())

    # Link back to the Property table
    property       = relationship("Property", back_populates="listings")

    __table_args__ = (
        Index("idx_listing_status",  "status"),
        Index("idx_listing_source",  "source"),
    )


# ─────────────────────────────────────────────────────────────
# TABLE: price_history
# A daily snapshot of the price of each property.
# This is how we calculate price trends over time.
# ─────────────────────────────────────────────────────────────

class PriceHistory(Base):
    __tablename__ = "price_history"

    id            = Column(Integer, primary_key=True)
    property_id   = Column(Integer, ForeignKey("properties.id"), nullable=False)

    snapshot_date = Column(DateTime, nullable=False)  # when we recorded this
    price         = Column(Float, nullable=False)      # price in €
    price_per_m2  = Column(Float)
    source        = Column(String(50))                 # where we got this price
    is_asking     = Column(Boolean, default=True)      # asking=True, sold=False

    property      = relationship("Property", back_populates="price_history")

    # Prevent duplicate snapshots for same property + date + source
    __table_args__ = (
        UniqueConstraint(
            "property_id", "snapshot_date", "source",
            name="uq_price_snapshot"
        ),
    )


# ─────────────────────────────────────────────────────────────
# TABLE: amenities
# Nearby places for each property — schools, gyms, stations.
# Data comes from OpenStreetMap (free).
# ─────────────────────────────────────────────────────────────

class Amenity(Base):
    __tablename__ = "amenities"

    id           = Column(Integer, primary_key=True)
    property_id  = Column(Integer, ForeignKey("properties.id"), nullable=False)

    name         = Column(String(255))           # e.g. "Albert Heijn XL"
    amenity_type = Column(Enum(AmenityType))     # e.g. SUPERMARKET
    distance_m   = Column(Float)                 # distance in meters from property
    latitude     = Column(Float)
    longitude    = Column(Float)
    osm_id       = Column(String(50))            # OpenStreetMap ID

    property     = relationship("Property", back_populates="amenities")

    __table_args__ = (
        Index("idx_amenity_property_type", "property_id", "amenity_type"),
    )


# ─────────────────────────────────────────────────────────────
# TABLE: data_source_logs
# Every time we run a data collection job, we log it here.
# This tells us: did it succeed? how many records? how long?
# ─────────────────────────────────────────────────────────────

class DataSourceLog(Base):
    __tablename__ = "data_source_logs"

    id              = Column(Integer, primary_key=True)
    source          = Column(String(50))      # "bag", "funda", "cbs"
    run_at          = Column(DateTime, server_default=func.now())
    status          = Column(String(20))      # "success", "failed", "partial"
    records_added   = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    error_message   = Column(Text)            # if it failed, why?
    duration_s      = Column(Float)           # how long the job took (seconds)

# ─────────────────────────────────────────────────────────────
# TABLE: listing_submissions
# When a seller submits a property to a makelaar's microsite.
# Must be approved by the makelaar before going live.
# ─────────────────────────────────────────────────────────────

class SubmissionStatus(str, enum.Enum):
    PENDING  = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class UrgencyLevel(str, enum.Enum):
    NORMAL  = "normal"
    URGENT  = "urgent"
    ASAP    = "asap"      # must sell immediately

class ListingSubmission(Base):
    __tablename__ = "listing_submissions"

    id              = Column(Integer, primary_key=True)
    makelaar_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    seller_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    property_id     = Column(Integer, ForeignKey("properties.id"), nullable=False)
    # Human readable reference — GR-YYYY-XXXXX
    reference       = Column(String(20), unique=True, nullable=True)

    # Pricing
    asking_price    = Column(Float, nullable=True)    # None = open bidding
    show_price      = Column(Boolean, default=True)   # False = "op aanvraag"

    # Urgency + deadline
    urgency         = Column(Enum(UrgencyLevel), default=UrgencyLevel.NORMAL)
    bid_deadline    = Column(DateTime, nullable=True)

    # Status
    status          = Column(Enum(SubmissionStatus), default=SubmissionStatus.PENDING)
    rejection_note  = Column(Text, nullable=True)

    # Description from seller
    description     = Column(Text, nullable=True)

    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, onupdate=func.now())

    __table_args__ = (
        Index("idx_submission_makelaar", "makelaar_id"),
        Index("idx_submission_status",   "status"),
    )


# ─────────────────────────────────────────────────────────────
# TABLE: bids
# Anonymous bids placed by buyers on approved listings.
# One active bid per buyer per listing.
# ─────────────────────────────────────────────────────────────

class Bid(Base):
    __tablename__ = "bids"

    id            = Column(Integer, primary_key=True)
    submission_id = Column(Integer, ForeignKey("listing_submissions.id"), nullable=False)
    bidder_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount        = Column(Float, nullable=False)
    is_active     = Column(Boolean, default=True)  # False = withdrawn or outbid
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, onupdate=func.now())

    __table_args__ = (
        Index("idx_bid_submission", "submission_id"),
        Index("idx_bid_bidder",     "bidder_id"),
    )