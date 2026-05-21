# Groundr — Dutch Real Estate Intelligence

> Transparent bidding · ML-powered investment scores · Digital transaction platform

Groundr is a B2B SaaS platform for the Dutch real estate market. It gives makelaars, taxateurs, buyers, and sellers the tools they need to make smarter decisions — with data that was previously hidden or scattered across government APIs.

---

## What it does

| Feature | Description |
|---|---|
| **Investment score (0–100)** | ML score from 6 factors: rental yield, WOZ delta, price trend, energy label, neighborhood, DOM |
| **Agency microsite** | Branded portal per makelaar — listings, map, bidding |
| **Transparent bidding** | Anonymous real-time bids. Everyone sees count + highest bid. |
| **Viewing scheduler** | Calendly-like booking system built into the platform |
| **Client dossier** | Transaction timeline, documents, makelaar contact for buyers/sellers |
| **Meldingen** | Issue reporting from dossier → makelaar dashboard |
| **Taxatie pre-fill** | BAG + OSM + CBS auto-fill for taxatie reports (in progress) |

---

## Tech stack

```
Frontend   Next.js 16 + TypeScript + Tailwind CSS v4
Backend    Python 3.12 + FastAPI (async)
Database   PostgreSQL 15 + PostGIS
Cache      Redis
Queue      Celery
Maps       Mapbox GL JS
Data       BAG/PDOK + OpenStreetMap + CBS Statistics NL
```

---

## Quick start

### Prerequisites
- Docker Desktop
- Node.js 18+
- Python 3.12+

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/groundr.git
cd groundr
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your values
```

### 3. Start the database
```bash
docker-compose up -d
```

### 4. Install backend dependencies
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r backend/requirements.txt
```

### 5. Run database migrations + seed demo data
```bash
cd backend
python seed.py
```

### 6. Start the backend
```bash
cd backend
uvicorn api.main:app --reload --port 8000
```

### 7. Install and start the frontend
```bash
cd frontend
npm install
npm run dev
```

### 8. Open the app
| URL | Description |
|---|---|
| http://localhost:3000/dashboard | Makelaar dashboard (login required) |
| http://localhost:3000/microsite/stadsmakelaars | Public agency microsite |
| http://localhost:3000/dossier/login | Buyer/seller dossier login |
| http://localhost:8000/docs | FastAPI OpenAPI docs |
| http://localhost:5050 | pgAdmin (DB admin) |

---

## Demo accounts

After running `python seed.py`:

| Email | Password | Role |
|---|---|---|
| jan@groundr.nl | groundr123 | Makelaar |
| test@test.com | test1234 | Buyer/Seller |

---

## Project structure

```
groundr/
├── backend/
│   ├── api/
│   │   ├── main.py              # FastAPI app + routes
│   │   ├── dependencies.py      # Auth dependencies
│   │   └── routes/              # auth, properties, analytics,
│   │                            # listings, submissions, viewings, meldingen
│   ├── analytics/
│   │   ├── scoring.py           # Investment score engine
│   │   ├── spatial.py           # PostGIS queries
│   │   └── statistics.py        # Neighborhood stats
│   ├── collectors/
│   │   ├── bag.py               # BAG/PDOK Dutch property data
│   │   ├── osm.py               # OpenStreetMap amenities
│   │   ├── cbs.py               # CBS statistics
│   │   └── woz.py               # WOZ valuation data
│   ├── db/
│   │   ├── models.py            # SQLAlchemy models
│   │   └── connection.py        # Async DB connection
│   ├── scheduler/
│   │   ├── celery_app.py        # Celery config
│   │   └── tasks.py             # Scheduled data refresh
│   ├── seed.py                  # Demo data seed script
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── (auth)/              # login, register
│   │   ├── (dashboard)/         # makelaar dashboard pages
│   │   ├── dossier/             # buyer/seller portal
│   │   ├── microsite/[slug]/    # public agency microsite
│   │   └── submit/[makelaarId]/ # seller submission form
│   ├── components/
│   │   ├── bidding/             # BidModal
│   │   ├── map/                 # PropertyMap (Mapbox)
│   │   ├── meldingen/           # MeldingModal
│   │   ├── report/              # PropertyReport (PDF)
│   │   └── viewings/            # ViewingModal
│   └── public/
│       └── logo.svg
├── docker-compose.yml
└── README.md
```

---

## Investment score formula

```
score = 0.30 × rental_yield
      + 0.20 × woz_delta
      + 0.20 × price_trend_6m
      + 0.15 × neighborhood
      + 0.10 × energy_label
      + 0.05 × dom_trend
      → normalized 0–100
```

---

## Data sources

| Source | Data | Cost |
|---|---|---|
| BAG/PDOK | Dutch property register, geocoding | Free |
| OpenStreetMap | Amenities (schools, transit, shops) | Free |
| CBS OData | Neighborhood statistics, demographics | Free |
| Mapbox | Maps and geocoding | Free up to 50k loads/mo |

---

## Roadmap

- [ ] Taxatie module (NWWI-ready PDF reports)
- [ ] Stripe billing (Starter €99 / Pro €299 / Business €499)
- [ ] Email notifications (Resend)
- [ ] Digital signing (eIDAS via Connective)
- [ ] WhatsApp Business notifications
- [ ] English/expat mode (Eindhoven ASML market)
- [ ] Full NL coverage (beyond Eindhoven)
- [ ] Groundr public API (€0.05/query)

---

## License

Private — all rights reserved. Contact ismail@groundr.nl for licensing inquiries.