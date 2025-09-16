from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from .. import models
from ..schemas import PolicyCreate


def upsert_policy(db: Session, user_id: uuid.UUID, policy_in: PolicyCreate) -> models.Policy:
    policy = (
        db.query(models.Policy)
        .filter(models.Policy.user_id == user_id, models.Policy.policy_name == policy_in.policy_name)
        .one_or_none()
    )
    if policy is None:
        policy = models.Policy(user_id=user_id, **policy_in.model_dump(exclude_unset=True))
    else:
        for field, value in policy_in.model_dump(exclude_unset=True).items():
            setattr(policy, field, value)
    db.add(policy)
    db.flush()
    return policy


def list_policies(db: Session, user_id: uuid.UUID) -> list[models.Policy]:
    return (
        db.query(models.Policy)
        .filter(models.Policy.user_id == user_id)
        .order_by(models.Policy.policy_name)
        .all()
    )
