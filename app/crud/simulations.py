from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from .. import models


def create_simulation_run(
    db: Session,
    user_id: uuid.UUID,
    *,
    request_payload: dict,
    outputs: dict,
) -> models.SimulationRun:
    sim = models.SimulationRun(
        user_id=user_id,
        horizon_hours=request_payload.get("horizon_hours"),
        horizon_sessions=request_payload.get("horizon_sessions"),
        model=request_payload.get("model"),
        params=request_payload.get("params"),
        bankroll_start_cents=request_payload.get("bankroll_start_cents"),
        stake_profile=request_payload.get("stake_profile"),
        iterations=request_payload.get("iterations"),
        seed=request_payload.get("seed"),
        outputs=outputs,
    )
    db.add(sim)
    db.flush()
    return sim
