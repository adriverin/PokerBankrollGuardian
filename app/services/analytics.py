from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Iterable

import numpy as np

from .. import models


def _cash_net(session: models.CashSession) -> float:
    return float(session.cashout_cents - session.buyin_cents - session.tips_cents)


def _cash_hours(session: models.CashSession) -> float:
    if session.seat_hours is not None and session.seat_hours > 0:
        return float(session.seat_hours)
    delta = session.end_ts - session.start_ts
    return max(delta.total_seconds() / 3600.0, 0.01)


def _mtt_net(session: models.MTTSession) -> float:
    total_buyin = float(session.buyin_cents + session.fee_cents)
    total_buyin *= max(1, session.reentries + 1)
    return float(session.cash_cents + session.bounties_cents - total_buyin)


def _mtt_hours(session: models.MTTSession) -> float:
    delta = session.end_ts - session.start_ts
    return max(delta.total_seconds() / 3600.0, 0.01)


def summary(
    cash_sessions: Iterable[models.CashSession],
    mtt_sessions: Iterable[models.MTTSession],
) -> dict[str, float]:
    cash_sessions = list(cash_sessions)
    mtt_sessions = list(mtt_sessions)
    cash_profit = sum(_cash_net(s) for s in cash_sessions)
    cash_hours = sum(_cash_hours(s) for s in cash_sessions)
    mtt_profit = sum(_mtt_net(s) for s in mtt_sessions)
    mtt_hours = sum(_mtt_hours(s) for s in mtt_sessions)
    total_buyins = sum((s.buyin_cents + s.fee_cents) * max(1, s.reentries + 1) for s in mtt_sessions)

    total_profit = cash_profit + mtt_profit
    total_hours = cash_hours + mtt_hours
    hourly_rate = total_profit / total_hours if total_hours > 0 else 0.0
    roi_percent = (mtt_profit / total_buyins * 100) if total_buyins else 0.0
    return {
        "total_profit_cents": total_profit,
        "total_hours": total_hours,
        "hourly_rate": hourly_rate,
        "roi_percent": roi_percent,
        "total_sessions": len(cash_sessions),
        "total_tournaments": len(mtt_sessions),
    }


def bankroll_timeline(
    cash_sessions: Iterable[models.CashSession],
    mtt_sessions: Iterable[models.MTTSession],
    ledger_entries: Iterable[models.LedgerEntry],
    starting_bankroll: float = 0.0,
) -> list[tuple[datetime, float]]:
    events: list[tuple[datetime, float]] = []
    for entry in ledger_entries:
        events.append((entry.ts, float(entry.amount_cents)))
    for session in cash_sessions:
        events.append((session.end_ts, _cash_net(session)))
    for session in mtt_sessions:
        events.append((session.end_ts, _mtt_net(session)))
    events.sort(key=lambda x: x[0])
    bankroll = starting_bankroll
    timeline = []
    for ts, delta in events:
        bankroll += delta
        timeline.append((ts, bankroll))
    return timeline


def _format_bin(ts: datetime, bin_size: str) -> str:
    if bin_size == "day":
        return ts.strftime("%Y-%m-%d")
    if bin_size == "week":
        year, week, _ = ts.isocalendar()
        return f"{year}-W{week:02d}"
    if bin_size == "month":
        return ts.strftime("%Y-%m")
    if bin_size == "year":
        return ts.strftime("%Y")
    raise ValueError("Invalid histogram bin")


def histogram(
    sessions: Iterable[models.CashSession | models.MTTSession],
    bin_size: str,
) -> list[tuple[str, float, int]]:
    buckets: dict[str, list[float]] = defaultdict(list)
    counts: dict[str, int] = defaultdict(int)
    for session in sessions:
        if isinstance(session, models.CashSession):
            net = _cash_net(session)
        else:
            net = _mtt_net(session)
        key = _format_bin(session.start_ts, bin_size)
        buckets[key].append(net)
        counts[key] += 1
    output = []
    for key in sorted(buckets.keys()):
        output.append((key, sum(buckets[key]), counts[key]))
    return output


def breakdown(
    cash_sessions: Iterable[models.CashSession],
    mtt_sessions: Iterable[models.MTTSession],
    dimension: str,
) -> list[tuple[str, float, float, int]]:
    buckets: dict[str, dict[str, float]] = defaultdict(lambda: {"profit": 0.0, "hours": 0.0, "count": 0})

    def add_bucket(key: str, profit: float, hours: float):
        bucket = buckets[key]
        bucket["profit"] += profit
        bucket["hours"] += hours
        bucket["count"] += 1

    for session in cash_sessions:
        if dimension == "venue":
            key = session.venue or "Unknown"
        elif dimension == "stake":
            key = f"{(session.stake_small_blind_cents or 0)//100}/{(session.stake_big_blind_cents or 0)//100}"
        elif dimension == "game":
            key = session.game or "Unknown"
        elif dimension == "dow":
            key = session.start_ts.strftime("%A")
        elif dimension == "tod":
            hour = session.start_ts.hour
            if hour < 6:
                key = "Overnight"
            elif hour < 12:
                key = "Morning"
            elif hour < 18:
                key = "Afternoon"
            else:
                key = "Evening"
        else:
            key = "Other"
        add_bucket(key, _cash_net(session), _cash_hours(session))

    for session in mtt_sessions:
        if dimension == "venue":
            key = session.venue or "Unknown"
        elif dimension == "stake":
            key = f"ABI {(session.buyin_cents + session.fee_cents)/100:.2f}"
        elif dimension == "game":
            key = session.format or "Unknown"
        elif dimension == "dow":
            key = session.start_ts.strftime("%A")
        elif dimension == "tod":
            hour = session.start_ts.hour
            if hour < 6:
                key = "Overnight"
            elif hour < 12:
                key = "Morning"
            elif hour < 18:
                key = "Afternoon"
            else:
                key = "Evening"
        else:
            key = "Other"
        add_bucket(key, _mtt_net(session), _mtt_hours(session))

    output = []
    for key, values in buckets.items():
        output.append((key, values["profit"], values["hours"], int(values["count"])) )
    output.sort(key=lambda x: x[1], reverse=True)
    return output
