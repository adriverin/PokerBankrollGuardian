# Poker Bankroll Guardian

Poker Bankroll Guardian is a full-stack toolkit for tracking poker bankrolls, analysing historical performance, and projecting risk for future sessions. It combines a FastAPI backend for authenticated data management and analytics with a standalone Flask dashboard that visualises Monte Carlo simulations, bankroll guardrails, and real-time alerts.

## Key Capabilities
- Secure user authentication with JWT access and refresh tokens to guard bankroll data.【F:app/security.py†L16-L37】【F:app/api/endpoints/auth.py†L20-L66】
- CRUD APIs for cash-game and tournament sessions, bankroll ledger entries, custom policies, and CSV exports.【F:app/api/endpoints/sessions.py†L31-L148】【F:app/api/endpoints/ledger.py†L18-L38】【F:app/api/endpoints/policies.py†L16-L45】【F:app/api/endpoints/export.py†L21-L69】
- Built-in analytics for profit summaries, histograms, breakdowns, and bankroll timelines using SQLAlchemy models and NumPy helpers.【F:app/models.py†L24-L155】【F:app/services/analytics.py†L34-L178】
- Monte Carlo simulation engine with bootstrap, normal, Student-t, and mixture models plus bankroll policy recommendations and risk metrics.【F:app/api/endpoints/simulation.py†L19-L51】【F:app/services/simulation.py†L13-L219】
- Flask-based dashboard featuring simulator comparisons, stake recommendations, scenario analysis, and live alerts for session management.【F:web_python.py†L22-L466】【F:templates/index.html†L89-L513】

## Repository Layout
```
app/                # FastAPI application package (config, models, services, API routers)
static/, templates/ # Flask dashboard assets and Jinja templates
web_python.py       # Flask dashboard entry point
requirements.txt    # Python dependencies
tests/              # Pytest suites covering API, analytics, and simulation logic
```

## Backend Architecture
### Application setup
The FastAPI app is instantiated in `app/main.py`, which loads configuration, creates the SQLAlchemy schema, applies permissive CORS defaults, and registers versioned routers under `/api` (OpenAPI is served from `/api/openapi.json`).【F:app/main.py†L6-L35】 Configuration values—such as database URLs, JWT settings, and allowed origins—come from `Settings`, which reads environment variables (with `.env` support).【F:app/config.py†L6-L23】

### Persistence layer
A synchronous SQLAlchemy engine and `SessionLocal` factory back the request-scoped dependency `get_db`, while a `session_scope` context manager supports scripted work.【F:app/database.py†L1-L45】 The data model covers users, refresh tokens, ledger entries, cash sessions, MTT sessions, simulation runs, and bankroll policies, all linked to the owning user and indexed for performant queries.【F:app/models.py†L24-L155】

### Authentication & authorization
Passwords are hashed with bcrypt, and JWT access tokens encode the user ID with configurable expiry. Refresh tokens are persisted server-side to enable rotation and revocation. Token validation is enforced by the `get_current_user` dependency, which decodes the bearer token and loads the associated user from the database.【F:app/security.py†L16-L37】【F:app/api/endpoints/auth.py†L20-L66】【F:app/api/deps.py†L15-L33】

### Session tracking
The `/sessions` router manages both cash and MTT sessions. Filters allow querying by time range, stake, venue, and tag, while POST/PUT/DELETE endpoints let authenticated users maintain their session history.【F:app/api/endpoints/sessions.py†L31-L148】 Under the hood, the CRUD layer maps Pydantic schemas to SQLAlchemy models for inserts, updates, and tag filtering.【F:app/crud/sessions.py†L1-L96】

### Ledger management
Players can log bankroll adjustments (deposits, withdrawals, transfers, bonuses) through the `/ledger` endpoints, which accept optional time windows and pagination limits.【F:app/api/endpoints/ledger.py†L18-L38】 Entries are validated against a type check constraint to preserve ledger integrity.【F:app/models.py†L56-L70】

### Analytics services
The analytics router aggregates user data into profit summaries, histograms by day/week/month/year, venue/stake/game breakdowns, and bankroll timelines that merge session and ledger cash flows.【F:app/api/endpoints/analytics.py†L26-L85】 Calculations leverage helper functions for net results, effective hours, ROI, and bucketing across cash and tournament play.【F:app/services/analytics.py†L34-L178】

### Simulation engine
The `/sim/run` endpoint collects a user’s historical distributions, merges any policy overrides, and executes Monte Carlo simulations with configurable horizons, model families, and iteration counts, enforcing an upper bound to protect the service.【F:app/api/endpoints/simulation.py†L19-L51】 The simulation service supports bootstrap resampling, parametric normal/Student-t draws, and stake mixtures, applies optional stop-loss clipping, and returns bankroll paths, ruin probabilities, quantiles, VaR/CVaR, and policy-driven stake guidance.【F:app/services/history.py†L12-L68】【F:app/services/policies.py†L17-L107】【F:app/services/simulation.py†L23-L219】 Results are persisted to the `SimulationRun` table for auditing and replay.【F:app/models.py†L126-L143】【F:app/crud/simulations.py†L1-L26】

### Bankroll policies
Default “aggressive”, “medium”, and “cautious” policies define required cash buy-ins or MTT ABIs with hysteresis to avoid churn. Users can override these via the `/policies` router, and the merged configuration feeds stake recommendations in simulation results.【F:app/services/policies.py†L17-L107】【F:app/api/endpoints/policies.py†L16-L45】

### Data export
The `/export/csv` endpoint streams session and ledger data (or both) as CSV, combining cash-game stakes, tournament formats, and ledger transactions in a single download.【F:app/api/endpoints/export.py†L21-L69】

### Health check
A lightweight `/healthz` route returns `{ "status": "ok" }` for infrastructure monitoring.【F:app/main.py†L33-L35】

## Simulation Details
- **Historical features:** Cash and tournament histories capture per-session profit, hours, and stake metadata for bootstrap sampling and mixture weighting.【F:app/services/history.py†L12-L68】
- **Model families:** Users can choose bootstrap, normal, Student-t (with degrees-of-freedom guard), or stake mixtures for cash games; tournaments support bootstrap and parametric draws.【F:app/services/simulation.py†L29-L198】
- **Risk metrics:** Outputs include bankroll quantiles, risk-of-ruin, probability of hitting a target bankroll, and loss metrics (VaR/CVaR). A policy-aware recommendation summarises whether to hold, upgrade, or downgrade stakes.【F:app/services/simulation.py†L81-L219】

## Front-End Dashboard
`web_python.py` hosts a Flask app that renders the modern `templates/index.html` interface. The dashboard reads comma-separated session histories, renders cumulative plots, and supports four interactive panels: Monte Carlo simulators (normal vs Student-t vs bootstrap), the Bankroll Guardian stake search, Scenario Lab adjustments, and Alerts & Notifications with stop-loss and RoR checks.【F:web_python.py†L22-L466】【F:templates/index.html†L89-L478】 Static charts are generated with Matplotlib and cached in the `static/` folder for display in the template.【F:web_python.py†L175-L345】【F:templates/index.html†L126-L176】

## Getting Started
### Prerequisites
- Python 3.11+
- Virtual environment tooling (recommended)

Install dependencies from `requirements.txt`, which covers FastAPI, SQLAlchemy, numpy/pandas/scipy, Matplotlib, pytest, and supporting libraries.【F:requirements.txt†L1-L15】

### Setup
```bash
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```
Create a `.env` file or export environment variables to customise database URLs, JWT secrets, token lifetimes, or CORS origins as defined in `Settings` (e.g., `DATABASE_URL`, `JWT_SECRET_KEY`).【F:app/config.py†L6-L23】 By default, the app uses a local SQLite database `app.db`.

### Run the FastAPI backend
Start the API with Uvicorn using either `uvicorn app.main:app --host 0.0.0.0 --port 8000` or `python -m app`, which invokes the bundled `uvicorn.run` entrypoint.【F:app/__main__.py†L1-L9】 The OpenAPI schema is available at `http://localhost:8000/api/openapi.json`, and FastAPI’s interactive docs can be served via the usual `docs`/`redoc` routes.

### Run the Flask dashboard
Launch the dashboard with `python web_python.py`. The app writes plots to `static/` and serves the responsive UI at `http://localhost:5000/` (Flask’s default).【F:web_python.py†L155-L466】 Because it is independent of the API, you can run it alongside the FastAPI backend or as a standalone exploratory tool.

### Run the test suite
Execute all automated checks with `pytest`. The suite provisions an isolated SQLite database, validates the auth/session/analytics/simulation flow, and unit-tests analytics and simulation helpers.【F:tests/test_api.py†L17-L97】【F:tests/test_analytics.py†L52-L88】【F:tests/test_simulation.py†L11-L59】

## Example API Workflow
1. `POST /auth/register` and `POST /auth/login` to create a user and retrieve JWT tokens.【F:app/api/endpoints/auth.py†L20-L41】
2. Use the bearer token to add cash sessions (`POST /sessions/cash`) and ledger events (`POST /ledger`).【F:app/api/endpoints/sessions.py†L53-L61】【F:app/api/endpoints/ledger.py†L30-L38】
3. Call `/analytics/summary`, `/analytics/breakdown`, or `/analytics/bankroll_timeline` to understand performance trends.【F:app/api/endpoints/analytics.py†L26-L85】
4. Run `/sim/run` with desired model parameters to stress-test bankroll plans and review recommended stakes.【F:app/api/endpoints/simulation.py†L19-L51】
5. Export data via `/export/csv` or manage stake policies through `/policies` as needed.【F:app/api/endpoints/export.py†L21-L69】【F:app/api/endpoints/policies.py†L16-L45】

## Configuration Reference
Key environment variables (see `Settings` for defaults):
- `DATABASE_URL` / `SYNC_DATABASE_URL` – async/sync SQLAlchemy URLs (SQLite by default).
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` – auth tuning knobs.
- `API_V1_PREFIX` – API root, default `/api`.
- `ALLOW_ORIGINS` – list of CORS origins (default `*`).【F:app/config.py†L6-L23】

## Credits & Licensing
This project blends Python data tooling (NumPy, pandas, Matplotlib) with FastAPI and Flask to create a comprehensive bankroll guardian. Refer to the source files and tests for further extension patterns and contribute via pull requests.
