from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ... import models
from ...api.deps import get_current_user
from ...crud import sessions as sessions_crud
from ...crud import simulations as simulations_crud
from ...database import get_db
from ...schemas import SimulationRequest, SimulationSummary
from ...services.history import build_cash_history, build_mtt_history
from ...services.policies import merge_policy_overrides
from ...services.simulation import run_simulation

router = APIRouter(prefix="/sim", tags=["simulation"])


@router.post("/run", response_model=SimulationSummary)
def run_sim(
    request: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> SimulationSummary:
    if request.iterations > 100_000:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Iterations too large; max 100,000")

    cash_sessions = sessions_crud.list_cash_sessions(db, current_user.id)
    mtt_sessions = sessions_crud.list_mtt_sessions(db, current_user.id)
    cash_history = build_cash_history(cash_sessions)
    mtt_history = build_mtt_history(mtt_sessions)

    policy_name = request.policy or "medium"
    overrides = current_user.policies
    policy_config = merge_policy_overrides(policy_name, overrides)

    result = run_simulation(request, cash_history, mtt_history, policy_config)

    outputs = {
        "summary": result.summary,
        "quantiles": result.quantiles,
    }
    sim_record = simulations_crud.create_simulation_run(
        db,
        current_user.id,
        request_payload=request.model_dump(),
        outputs=outputs,
    )
    db.commit()

    return SimulationSummary(sim_id=str(sim_record.id), summary=result.summary)
