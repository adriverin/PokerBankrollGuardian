from __future__ import annotations

from datetime import datetime, timedelta

from app import models
from app.services import analytics


def make_cash_session(start: datetime, profit: int, hours: float = 3.0, venue: str = "Casino A", game: str = "NLH"):
    session = models.CashSession(
        id=None,
        user_id=None,
        start_ts=start,
        end_ts=start + timedelta(hours=hours),
        venue=venue,
        game=game,
        stake_small_blind_cents=100,
        stake_big_blind_cents=300,
        buyin_cents=30000,
        cashout_cents=30000 + profit,
        tips_cents=0,
        rake_model=None,
        notes=None,
        tags=None,
        seat_hours=hours,
        hands_played=None,
    )
    return session


def make_mtt_session(start: datetime, profit: int, venue: str = "Casino A", fmt: str = "MTT"):
    session = models.MTTSession(
        id=None,
        user_id=None,
        start_ts=start,
        end_ts=start + timedelta(hours=6),
        venue=venue,
        format=fmt,
        buyin_cents=10000,
        fee_cents=1000,
        reentries=0,
        cash_cents=10000 + profit,
        position=None,
        field_size=None,
        bounties_cents=0,
        notes=None,
        tags=None,
    )
    return session


def test_summary_and_breakdown():
    base = datetime(2024, 1, 1)
    cash_sessions = [
        make_cash_session(base, 5000, venue="Casino A"),
        make_cash_session(base + timedelta(days=1), -2000, venue="Casino B"),
    ]
    mtt_sessions = [make_mtt_session(base + timedelta(days=2), 15000, venue="Casino A")]

    summary = analytics.summary(cash_sessions, mtt_sessions)
    assert summary["total_profit_cents"] == 5000 - 2000 + 15000
    assert summary["total_sessions"] == 2
    assert summary["total_tournaments"] == 1

    breakdown = analytics.breakdown(cash_sessions, mtt_sessions, "venue")
    venues = {item[0]: item[1] for item in breakdown}
    assert venues["Casino A"] > venues["Casino B"]


def test_histogram_bins():
    base = datetime(2024, 3, 1)
    sessions = [
        make_cash_session(base, 1000),
        make_cash_session(base + timedelta(days=7), 2000),
    ]
    hist = analytics.histogram(sessions, "week")
    assert len(hist) == 2
    assert hist[0][2] == 1


def test_bankroll_timeline():
    base = datetime(2024, 2, 1)
    cash_sessions = [make_cash_session(base, 1000)]
    mtt_sessions = [make_mtt_session(base + timedelta(days=1), -5000)]
    ledger = [models.LedgerEntry(id=None, user_id=None, ts=base - timedelta(days=1), amount_cents=20000, type="deposit", note=None)]

    timeline = analytics.bankroll_timeline(cash_sessions, mtt_sessions, ledger, starting_bankroll=100000)
    assert timeline[-1][1] == 100000 + 20000 + 1000 - 5000
