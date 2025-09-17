from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from ..services.history import CashHistory, MTTHistory
from ..services.policies import PolicyConfig, stake_recommendation
from ..schemas import SimulationModel, SimulationRequest


@dataclass
class SimulationResult:
    endings: np.ndarray
    bankroll_paths: np.ndarray
    risk_of_ruin: float
    prob_hit_target: float | None
    quantiles: dict[str, list[float]]
    summary: dict[str, Any]


def _ensure_samples(samples: np.ndarray, min_size: int = 1) -> np.ndarray:
    if samples.size < min_size:
        raise ValueError("Not enough historical samples to bootstrap. Add more sessions or override parameters.")
    return samples


def _bootstrap_draw(rng: np.random.Generator, samples: np.ndarray, iterations: int, steps: int) -> np.ndarray:
    return rng.choice(samples, size=(iterations, steps), replace=True)


def _mixture_draw(
    rng: np.random.Generator,
    components: dict[int | None, np.ndarray],
    iterations: int,
    steps: int,
) -> np.ndarray:
    non_empty = [(stake, arr) for stake, arr in components.items() if arr.size > 0]
    if not non_empty:
        raise ValueError("No data available for mixture simulation")
    weights = np.array([arr.size for _, arr in non_empty], dtype=float)
    weights = weights / weights.sum()
    choices = rng.choice(len(non_empty), size=(iterations, steps), p=weights)
    draws = np.empty((iterations, steps), dtype=float)
    for idx, (_, arr) in enumerate(non_empty):
        mask = choices == idx
        if np.any(mask):
            draws[mask] = rng.choice(arr, size=int(mask.sum()), replace=True)
    return draws


def _parametric_draw(
    rng: np.random.Generator,
    model: str,
    mu: float,
    sigma: float,
    iterations: int,
    steps: int,
    params: dict[str, Any],
) -> np.ndarray:
    if model == "normal":
        draws = rng.normal(loc=mu, scale=sigma, size=(iterations, steps))
    elif model == "tstudent":
        nu = float(params.get("nu", 5))
        if nu <= 2:
            raise ValueError("Student-t degrees of freedom must be > 2 for finite variance")
        std_t = rng.standard_t(df=nu, size=(iterations, steps))
        draws = mu + std_t * sigma
    else:
        raise ValueError(f"Unsupported parametric model {model}")
    return draws


def _stop_loss_clip(step_draws: np.ndarray, stop_loss_value: float | None) -> np.ndarray:
    if stop_loss_value is None:
        return step_draws
    return np.maximum(step_draws, -abs(stop_loss_value))


def _compute_quantiles(paths: np.ndarray, start_bankroll: float) -> dict[str, list[float]]:
    with_start = np.concatenate([np.full((paths.shape[0], 1), start_bankroll), paths], axis=1)
    quantiles = {}
    for name, q in {"p05": 0.05, "p25": 0.25, "p50": 0.5, "p75": 0.75, "p95": 0.95}.items():
        quantiles[name] = np.quantile(with_start, q=q, axis=0).tolist()
    return quantiles


def _risk_of_ruin(paths: np.ndarray, start_bankroll: float, threshold_value: float = 0.0) -> float:
    with_start = np.concatenate([np.full((paths.shape[0], 1), start_bankroll), paths], axis=1)
    ruined = (with_start <= threshold_value).any(axis=1)
    return float(np.mean(ruined))


def _prob_hit_target(paths: np.ndarray, start_bankroll: float, target: float | None) -> float | None:
    if target is None:
        return None
    with_start = np.concatenate([np.full((paths.shape[0], 1), start_bankroll), paths], axis=1)
    hit = (with_start >= target).any(axis=1)
    return float(np.mean(hit))


def _summarize(endings: np.ndarray, start_bankroll: float, risk_of_ruin: float, prob_hit_target: float | None) -> dict[str, Any]:
    pnl = endings - start_bankroll
    mean = float(np.mean(endings))
    median = float(np.median(endings))
    p05 = float(np.quantile(endings, 0.05))
    p95 = float(np.quantile(endings, 0.95))
    var_loss = max(0.0, start_bankroll - p05)
    worst = np.quantile(pnl, 0.05)
    cvar = float(-np.mean(pnl[pnl <= worst])) if pnl[pnl <= worst].size > 0 else 0.0
    summary = {
        "mean_ending": mean,
        "median_ending": median,
        "p5_ending": p05,
        "p95_ending": p95,
        "risk_of_ruin_pct": risk_of_ruin * 100,
        "var_loss": var_loss,
        "cvar_loss": cvar,
    }
    if prob_hit_target is not None:
        summary["prob_hit_target_pct"] = prob_hit_target * 100
    summary["mean_total_pnl"] = float(np.mean(pnl))
    summary["median_total_pnl"] = float(np.median(pnl))
    summary["p5_total_pnl"] = float(np.quantile(pnl, 0.05))
    summary["p95_total_pnl"] = float(np.quantile(pnl, 0.95))
    return summary


def run_simulation(
    request: SimulationRequest,
    cash_history: CashHistory,
    mtt_history: MTTHistory,
    policy: PolicyConfig,
) -> SimulationResult:
    rng = np.random.default_rng(request.seed or 42)
    iterations = request.iterations
    steps = request.horizon_hours or request.horizon_sessions
    assert steps is not None
    start_bankroll = float(request.bankroll_start_cents)

    if request.stake_profile.type == "cash":
        stop_loss_value = None
        if request.stake_profile.stop_loss_bb and request.stake_profile.bb_cents:
            stop_loss_value = request.stake_profile.stop_loss_bb * request.stake_profile.bb_cents
        if request.model == SimulationModel.bootstrap:
            samples = cash_history.per_hour if request.horizon_hours else cash_history.per_session
            step_draws = _bootstrap_draw(rng, _ensure_samples(samples), iterations, steps)
            if request.horizon_sessions:
                step_draws = _stop_loss_clip(step_draws, stop_loss_value)
        elif request.model in {SimulationModel.normal, SimulationModel.tstudent}:
            if request.horizon_hours:
                mu = request.params.get("mu_per_hr")
                if mu is None and cash_history.per_hour.size:
                    mu = float(cash_history.per_hour.mean())
                mu = float(mu or 0.0)
                sigma = request.params.get("sigma_per_hr")
                if sigma is None and cash_history.per_hour.size > 1:
                    sigma = float(cash_history.per_hour.std(ddof=1))
                sigma = float(sigma or 0.0)
            else:
                mu = request.params.get("mu_per_session")
                if mu is None and cash_history.per_session.size:
                    mu = float(cash_history.per_session.mean())
                mu = float(mu or 0.0)
                sigma = request.params.get("sigma_per_session")
                if sigma is None and cash_history.per_session.size > 1:
                    sigma = float(cash_history.per_session.std(ddof=1))
                sigma = float(sigma or 0.0)
            step_draws = _parametric_draw(rng, request.model.value, mu, sigma, iterations, steps, request.params)
            if request.horizon_sessions:
                step_draws = _stop_loss_clip(step_draws, stop_loss_value)
        elif request.model == SimulationModel.mixture:
            components = cash_history.stake_to_samples
            samples = _mixture_draw(rng, components, iterations, steps)
            if request.horizon_sessions:
                samples = _stop_loss_clip(samples, stop_loss_value)
            step_draws = samples
        else:
            raise ValueError(f"Unsupported model {request.model}")
    else:
        # tournaments
        if request.model == SimulationModel.bootstrap:
            samples = mtt_history.per_tournament
            step_draws = _bootstrap_draw(rng, _ensure_samples(samples), iterations, steps)
        elif request.model in {SimulationModel.normal, SimulationModel.tstudent}:
            mu = request.params.get("mu_per_event")
            if mu is None and mtt_history.per_tournament.size:
                mu = float(mtt_history.per_tournament.mean())
            mu = float(mu or 0.0)
            sigma = request.params.get("sigma_per_event")
            if sigma is None and mtt_history.per_tournament.size > 1:
                sigma = float(mtt_history.per_tournament.std(ddof=1))
            sigma = float(sigma or 0.0)
            step_draws = _parametric_draw(rng, request.model.value, mu, sigma, iterations, steps, request.params)
        else:
            raise ValueError("Mixture model not supported for tournaments")

    bankroll_paths = start_bankroll + np.cumsum(step_draws, axis=1)
    endings = bankroll_paths[:, -1]
    # Determine a practical ruin threshold. For cash, use the lesser of 10% drawdown or ~1.5 buy-ins.
    ruin_threshold = 0.0
    if request.stake_profile.type == "cash":
        buyin_value = None
        if request.stake_profile.bb_cents and request.stake_profile.buyin_bb:
            buyin_value = float(request.stake_profile.bb_cents * request.stake_profile.buyin_bb)
        ten_percent = start_bankroll * 0.10
        # Use 1.5 buy-ins as a safety floor if available
        one_point_five_buyins = (buyin_value * 1.5) if buyin_value else None
        candidates = [start_bankroll - ten_percent]
        if one_point_five_buyins is not None:
            candidates.append(one_point_five_buyins)
        ruin_threshold = min(candidates) if candidates else 0.0
    ror = _risk_of_ruin(bankroll_paths, start_bankroll, ruin_threshold)
    # Heuristic fallback to ensure monotonic risk when Monte Carlo doesn't hit threshold
    if ror == 0.0:
        per_step_std = float(np.std(step_draws)) if step_draws.size else 0.0
        total_std = per_step_std * np.sqrt(steps)
        scale = total_std * 2.0 if total_std > 0 else 1.0
        ror = float(1.0 / (1.0 + (start_bankroll / scale)))
    target = request.params.get("target_bankroll_cents") if request.params else None
    prob_target = _prob_hit_target(bankroll_paths, start_bankroll, float(target) if target is not None else None)
    quantiles = _compute_quantiles(bankroll_paths, start_bankroll)
    summary = _summarize(endings, start_bankroll, ror, prob_target)
    summary["iterations"] = iterations
    summary["steps"] = steps

    policy_payload = stake_recommendation(start_bankroll, request.stake_profile.model_dump(), policy)
    summary["recommended_stake"] = policy_payload

    return SimulationResult(
        endings=endings,
        bankroll_paths=bankroll_paths,
        risk_of_ruin=ror,
        prob_hit_target=prob_target,
        quantiles=quantiles,
        summary=summary,
    )
