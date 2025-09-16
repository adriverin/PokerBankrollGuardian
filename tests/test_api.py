from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ["SYNC_DATABASE_URL"] = "sqlite:///./test_api.db"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_api.db"

from app.config import get_settings
from app.database import Base, engine
from app.main import app


@pytest.fixture(scope="module")
def client():
    db_path = Path("test_api.db")
    if db_path.exists():
        db_path.unlink()
    get_settings.cache_clear()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


def auth_headers(client: TestClient) -> dict[str, str]:
    register_resp = client.post(
        "/auth/register",
        json={"email": "test@example.com", "password": "StrongPass123", "display_name": "Tester"},
    )
    assert register_resp.status_code == 201

    login_resp = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "StrongPass123"},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_session_flow_and_analytics(client: TestClient):
    headers = auth_headers(client)

    session_resp = client.post(
        "/sessions/cash",
        json={
            "start_ts": "2024-01-01T12:00:00Z",
            "end_ts": "2024-01-01T16:00:00Z",
            "venue": "Casino A",
            "game": "NLH",
            "stake_small_blind_cents": 100,
            "stake_big_blind_cents": 300,
            "buyin_cents": 30000,
            "cashout_cents": 36000,
            "tips_cents": 0,
            "seat_hours": 4,
        },
        headers=headers,
    )
    assert session_resp.status_code == 201

    ledger_resp = client.post(
        "/ledger",
        json={"ts": "2024-01-01T00:00:00Z", "amount_cents": 100000, "type": "deposit"},
        headers=headers,
    )
    assert ledger_resp.status_code == 201

    summary = client.get("/analytics/summary", headers=headers)
    assert summary.status_code == 200
    data = summary.json()
    assert data["total_profit_cents"] == 6000

    sim_resp = client.post(
        "/sim/run",
        json={
            "horizon_sessions": 10,
            "model": "normal",
            "params": {"mu_per_session": 600.0, "sigma_per_session": 1200.0, "target_bankroll_cents": 160000},
            "bankroll_start_cents": 150000,
            "stake_profile": {"type": "cash", "bb_cents": 300, "buyin_bb": 100, "stop_loss_bb": 200},
            "iterations": 500,
            "seed": 42,
            "policy": "medium",
        },
        headers=headers,
    )
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert "sim_id" in sim_data
    assert "summary" in sim_data
    assert sim_data["summary"]["risk_of_ruin_pct"] >= 0
