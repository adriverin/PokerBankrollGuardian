from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ... import models
from ...api.deps import get_current_user
from ...database import get_db
from ...schemas import UserRead


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> UserRead:
    return UserRead.model_validate(current_user)


