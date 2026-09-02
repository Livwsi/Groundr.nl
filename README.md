# Groundr

Dutch real-estate intelligence platform. Agents (makelaars) run listings, viewings,
bids, valuations and client dossiers in one place; buyers and sellers get a portal
into their own transaction.

Stack: **FastAPI + PostgreSQL/PostGIS + Redis** on the backend, **Next.js 16 + React 19 +
TypeScript + Tailwind v4** on the frontend.

---

## Quick start

Prerequisites: Docker Desktop, Python 3.12+, Node 20+.

```bash
# 1. Infrastructure (Postgres+PostGIS, Redis, pgAdmin)
docker-compose up -d

# 2. Backend
python -m venv venv
venv\Scripts\activate                # Windows;  source venv/bin/activate on macOS/Linux
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env  # then edit it — see "Configuration"
cd backend
python -m db.bootstrap                # creates every table (safe to re-run)
uvicorn api.main:app --reload --port 8000

# 3. Frontend
cd frontend
npm install
npm run dev
```

| Service | URL |
| --- | --- |
| App | http://localhost:3000 |
| API docs | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |
| pgAdmin | http://localhost:5050 (`admin@groundr.com` / `admin123`) |

### Demo accounts

Seeded by `python -m db.bootstrap`. Local development only — these passwords are
public and must never exist in a deployed environment.

| Account | Password | Roles |
| --- | --- | --- |
| `admin@groundr.nl` | `Adminsaas` | admin + agent + appraiser |
| `agent@groundr.nl` | `Agentsaas` | agent |
| `appraiser@groundr.nl` | `Appraisersaas` | appraiser |
| `notary@groundr.nl` | `Notarysaas` | notary |
| `buyer@groundr.nl` | `Buyersaas` | buyer |
| `seller@groundr.nl` | `Sellersaas` | seller |

An account with more than one role gets a role-selector screen after login.

---

## Configuration

All backend settings live in `backend/.env`, loaded by `backend/config/settings.py`.
Copy `backend/.env.example` and fill it in. The variables that matter:

| Variable | Default | Notes |
| --- | --- | --- |
| `APP_ENV` | `development` | Anything other than `development` turns on the boot guards below. |
| `SECRET_KEY` | `changeme` | JWT signing key. Must be ≥32 chars outside development. |
| `FRONTEND_ORIGINS` | `http://localhost:3000` | Comma-separated CORS allowlist. A wildcard is refused outside development. |
| `DB_*` | matches `docker-compose.yml` | Host, port, name, user, password. |
| `RESEND_API_KEY` | empty | Without it, invite and alert emails are skipped rather than failing. |
| `MAPBOX_TOKEN` | empty | Property maps degrade to a static placeholder without it. |

**Boot guards.** When `APP_ENV` is not `development`, the API refuses to start if
`SECRET_KEY` is still the default or shorter than 32 characters, if `DB_PASSWORD` is
still the local default, or if `FRONTEND_ORIGINS` contains `*`. This is deliberate —
a misconfigured deploy should fail loudly at startup, not serve traffic with a known
signing key.

Generate a key with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Project layout

```
backend/
  api/
    main.py            FastAPI app, CORS, router registration
    routes/            12 routers — auth, properties, listings, submissions,
                       viewings, meldingen, searches, documents, taxatie,
                       analytics, market, reviews
    dependencies.py    require_user, JWT decode
  db/
    models.py          SQLAlchemy models
    schema.sql         Full DDL — the single source of truth for the schema
    bootstrap.py       Applies schema.sql + seeds roles and demo accounts
  analytics/           Spatial queries, scoring, statistics
  collectors/          PDOK/BAG geocoding, WOZ, OpenStreetMap amenities
  services/            Email (Resend)
  tests/               pytest + httpx smoke tests
frontend/
  app/
    (auth)/            Login, register
    (platform)/        Agent platform + client portal (current)
    (dashboard)/       Older agent dashboard (see "Known issues")
    dossier/           Older buyer portal (see "Known issues")
    market/, markt/    Public city market pages (EN / NL)
    microsite/[slug]/  Public agent microsites
    mijnwoning/        Homeowner entry point
    submit/            Public listing submission
  lib/services/        ApiService / AuthService — typed HTTP layer
  store/auth.tsx       Global auth context, multi-role aware
  components/ui/       Shared primitives
```

## Database

`backend/db/schema.sql` is the full DDL and the only thing that defines the schema.
`python -m db.bootstrap` applies it idempotently (`CREATE TABLE IF NOT EXISTS`) and
seeds the roles and demo accounts, so a fresh clone reaches a working database in one
command.

To add or change a table, edit `schema.sql` and re-run bootstrap. Migrations against
an existing deployed database are not yet automated — see "Known issues".

## Tests

```bash
venv\Scripts\activate
cd backend
python -m pytest tests -v
```

The suite covers auth (register, login, roles, `/me`, rejection paths), the boot
guards, the taxatie column whitelist, and health. It uses FastAPI's dependency
overrides, so it does not need a running database.

## Known issues

Tracked honestly rather than hidden:

- **Two agent UIs coexist.** `app/(platform)/` is the current one; `app/(dashboard)/`
  is its predecessor and still works. Until one is retired, changes may need to land
  in both. Same for `client-portal/` vs `dossier/`.
- **Two auth token keys.** Everything reads `groundr_token` except the `dossier/`
  tree, which still uses `dossier_token`.
- **JWT lives in localStorage**, not an httpOnly cookie. Fine for the pilot, not for
  handling money.
- **No schema migrations.** `schema.sql` rebuilds from scratch; there is no ordered
  migration history for evolving a database that already has data.
- **No rate limiting** on auth or public endpoints.
- **No CI and no deployment target** yet.
