from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ... import models
from ...api.deps import get_current_user
from ...crud import policies as policies_crud
from ...database import get_db
from ...schemas import PolicyCreate, PolicyRead
from ...services.policies import DEFAULT_POLICIES

router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("", response_model=list[PolicyRead])
def get_policies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[PolicyRead]:
    policies = policies_crud.list_policies(db, current_user.id)
    if not policies:
        # return defaults for convenience
        return [
            PolicyRead(
                id="default",
                policy_name=config.name,
                cash_buyins_required=config.cash_buyins_required,
                mtt_abis_required=config.mtt_abis_required,
                hysteresis_pct=config.hysteresis_pct,
            )
            for config in DEFAULT_POLICIES.values()
        ]
    return [PolicyRead.model_validate(policy) for policy in policies]


@router.post("", response_model=PolicyRead, status_code=status.HTTP_201_CREATED)
def upsert_policy(
    policy_in: PolicyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> PolicyRead:
    policy = policies_crud.upsert_policy(db, current_user.id, policy_in)
    db.commit()
    return PolicyRead.model_validate(policy)
