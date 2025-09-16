from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable

import numpy as np

from .. import models


@dataclass
class CashHistory:
    per_session: np.ndarray
    per_hour: np.ndarray
    hours_per_session: np.ndarray
    stake_to_samples: dict[int | None, np.ndarray]


@dataclass
class MTTHistory:
    per_tournament: np.ndarray
    roi: np.ndarray


def _session_hours(session: models.CashSession) -> float:
    if session.seat_hours is not None and session.seat_hours > 0:
        return float(session.seat_hours)
    delta = session.end_ts - session.start_ts
    hours = max(delta.total_seconds() / 3600.0, 0.01)
    return hours


def build_cash_history(sessions: Iterable[models.CashSession]) -> CashHistory:
    session_nets = []
    hourly_rates = []
    hours_list = []
    stake_map: dict[int | None, list[float]] = {}
    for session in sessions:
        net = float(session.cashout_cents - session.buyin_cents - session.tips_cents)
        hours = _session_hours(session)
        hourly = net / hours
        session_nets.append(net)
        hourly_rates.append(hourly)
        hours_list.append(hours)
        stake_map.setdefault(session.stake_big_blind_cents, []).append(net)
    return CashHistory(
        per_session=np.array(session_nets, dtype=float) if session_nets else np.array([], dtype=float),
        per_hour=np.array(hourly_rates, dtype=float) if hourly_rates else np.array([], dtype=float),
        hours_per_session=np.array(hours_list, dtype=float) if hours_list else np.array([], dtype=float),
        stake_to_samples={k: np.array(v, dtype=float) for k, v in stake_map.items()},
    )


def build_mtt_history(sessions: Iterable[models.MTTSession]) -> MTTHistory:
    per_tournament = []
    rois = []
    for session in sessions:
        total_buyin = float(session.buyin_cents + session.fee_cents)
        total_buyin *= max(1, session.reentries + 1)
        net = float(session.cash_cents + session.bounties_cents - total_buyin)
        per_tournament.append(net)
        if total_buyin > 0:
            rois.append(net / total_buyin)
    return MTTHistory(
        per_tournament=np.array(per_tournament, dtype=float) if per_tournament else np.array([], dtype=float),
        roi=np.array(rois, dtype=float) if rois else np.array([], dtype=float),
    )
