from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine
from .api.endpoints import auth, sessions, ledger, analytics, simulation, policies, export


settings = get_settings()

app = FastAPI(title="Poker Bankroll Guardian API", openapi_url=f"{settings.api_v1_prefix}/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(ledger.router)
app.include_router(analytics.router)
app.include_router(simulation.router)
app.include_router(policies.router)
app.include_router(export.router)


@app.get("/healthz")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
def _create_tables_on_startup() -> None:
    # Ensure tables exist at startup without doing DDL at import time (better for tests)
    Base.metadata.create_all(bind=engine)
