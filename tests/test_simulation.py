from __future__ import annotations

import numpy as np

from app.schemas import SimulationRequest, SimulationStakeProfile, SimulationModel
from app.services.history import CashHistory, MTTHistory
from app.services.policies import PolicyConfig
from app.services.simulation import run_simulation


def make_request(**kwargs):
    payload = {
        "horizon_sessions": 50,
        "model": SimulationModel.normal,
        "params": {"mu_per_session": 150.0, "sigma_per_session": 400.0, "target_bankroll_cents": 200000},
        "bankroll_start_cents": 150000,
        "stake_profile": SimulationStakeProfile(type="cash", bb_cents=300, buyin_bb=100),
        "iterations": 500,
        "seed": 123,
    }
    payload.update(kwargs)
    return SimulationRequest(**payload)


def test_simulation_deterministic():
    cash_history = CashHistory(
        per_session=np.array([200, -150, 400, -300, 250], dtype=float),
        per_hour=np.array([80, -60, 100, -50, 90], dtype=float),
        hours_per_session=np.array([3, 2, 4, 3, 2], dtype=float),
        stake_to_samples={300: np.array([200, -150, 400, -300, 250], dtype=float)},
    )
    mtt_history = MTTHistory(per_tournament=np.array([], dtype=float), roi=np.array([], dtype=float))
    policy = PolicyConfig("medium", cash_buyins_required=50, mtt_abis_required=200, hysteresis_pct=0.1)

    request = make_request()
    result1 = run_simulation(request, cash_history, mtt_history, policy)
    result2 = run_simulation(request, cash_history, mtt_history, policy)

    assert np.allclose(result1.endings, result2.endings)
    assert result1.summary["risk_of_ruin_pct"] >= 0


def test_risk_of_ruin_decreases_with_bankroll():
    cash_history = CashHistory(
        per_session=np.array([100, -200, 150, -100], dtype=float),
        per_hour=np.array([50, -80, 60, -40], dtype=float),
        hours_per_session=np.array([2, 3, 2.5, 2], dtype=float),
        stake_to_samples={300: np.array([100, -200, 150, -100], dtype=float)},
    )
    mtt_history = MTTHistory(per_tournament=np.array([], dtype=float), roi=np.array([], dtype=float))
    policy = PolicyConfig("medium", cash_buyins_required=50, mtt_abis_required=200, hysteresis_pct=0.1)

    low_bankroll = make_request(bankroll_start_cents=50000, iterations=300)
    high_bankroll = make_request(bankroll_start_cents=150000, iterations=300)

    low_result = run_simulation(low_bankroll, cash_history, mtt_history, policy)
    high_result = run_simulation(high_bankroll, cash_history, mtt_history, policy)

    assert high_result.risk_of_ruin < low_result.risk_of_ruin
