from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional

from .. import models


@dataclass
class PolicyConfig:
    name: str
    cash_buyins_required: int
    mtt_abis_required: int
    hysteresis_pct: float


DEFAULT_POLICIES: dict[str, PolicyConfig] = {
    "aggressive": PolicyConfig("aggressive", cash_buyins_required=25, mtt_abis_required=100, hysteresis_pct=0.1),
    "medium": PolicyConfig("medium", cash_buyins_required=50, mtt_abis_required=200, hysteresis_pct=0.1),
    "cautious": PolicyConfig("cautious", cash_buyins_required=100, mtt_abis_required=400, hysteresis_pct=0.1),
}


def merge_policy_overrides(name: str, policies: Iterable[models.Policy]) -> PolicyConfig:
    base = DEFAULT_POLICIES.get(name, PolicyConfig(name, 50, 200, 0.1))
    for policy in policies:
        if policy.policy_name == name:
            return PolicyConfig(
                name=policy.policy_name,
                cash_buyins_required=policy.cash_buyins_required,
                mtt_abis_required=policy.mtt_abis_required,
                hysteresis_pct=float(policy.hysteresis_pct or base.hysteresis_pct),
            )
    return base


def stake_recommendation(
    bankroll_cents: float,
    stake_profile: dict,
    policy: PolicyConfig,
) -> dict[str, str | float]:
    if stake_profile.get("type") == "cash":
        bb_cents = stake_profile.get("bb_cents") or 0
        buyin_bb = stake_profile.get("buyin_bb") or 100
        buyin_value = bb_cents * buyin_bb
        if buyin_value <= 0:
            return {
                "action": "hold",
                "reason": "Insufficient stake metadata for recommendation.",
            }
        required = policy.cash_buyins_required * buyin_value
        lower = required * (1 - policy.hysteresis_pct)
        upper = required * (1 + policy.hysteresis_pct)
        bankroll_buyins = bankroll_cents / buyin_value if buyin_value else 0
        if bankroll_cents < lower:
            action = "downgrade"
            reason = (
                f"Bankroll {bankroll_buyins:.1f} buy-ins < {(policy.cash_buyins_required * (1 - policy.hysteresis_pct)):.1f}"
            )
        elif bankroll_cents > upper:
            action = "upgrade"
            reason = (
                f"Bankroll {bankroll_buyins:.1f} buy-ins > {(policy.cash_buyins_required * (1 + policy.hysteresis_pct)):.1f}"
            )
        else:
            action = "hold"
            reason = f"Bankroll {bankroll_buyins:.1f} buy-ins within policy band"
        return {
            "action": action,
            "reason": reason,
            "current_buyins": bankroll_buyins,
            "required_buyins": policy.cash_buyins_required,
        }
    elif stake_profile.get("type") == "mtt":
        abi_cents = stake_profile.get("abi_cents") or 0
        if abi_cents <= 0:
            return {
                "action": "hold",
                "reason": "Insufficient stake metadata for recommendation.",
            }
        required = policy.mtt_abis_required * abi_cents
        lower = required * (1 - policy.hysteresis_pct)
        upper = required * (1 + policy.hysteresis_pct)
        bankroll_abis = bankroll_cents / abi_cents
        if bankroll_cents < lower:
            action = "downgrade"
            reason = (
                f"Bankroll {bankroll_abis:.1f} ABI < {(policy.mtt_abis_required * (1 - policy.hysteresis_pct)):.1f}"
            )
        elif bankroll_cents > upper:
            action = "upgrade"
            reason = (
                f"Bankroll {bankroll_abis:.1f} ABI > {(policy.mtt_abis_required * (1 + policy.hysteresis_pct)):.1f}"
            )
        else:
            action = "hold"
            reason = f"Bankroll {bankroll_abis:.1f} ABI within policy band"
        return {
            "action": action,
            "reason": reason,
            "current_buyins": bankroll_abis,
            "required_buyins": policy.mtt_abis_required,
        }
    return {
        "action": "hold",
        "reason": "Unknown stake profile type",
    }
