from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ... import models
from ...api.deps import get_current_user
from ...crud import ledger as ledger_crud
from ...database import get_db
from ...schemas import LedgerEntryCreate, LedgerEntryRead

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("", response_model=list[LedgerEntryRead])
def list_ledger_entries(
    start: datetime | None = None,
    end: datetime | None = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[LedgerEntryRead]:
    entries = ledger_crud.list_entries(db, current_user.id, start=start, end=end, limit=limit)
    return [LedgerEntryRead.model_validate(entry) for entry in entries]


@router.post("", response_model=LedgerEntryRead, status_code=status.HTTP_201_CREATED)
def create_ledger_entry(
    entry_in: LedgerEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> LedgerEntryRead:
    entry = ledger_crud.create_entry(db, current_user.id, entry_in)
    db.commit()
    return LedgerEntryRead.model_validate(entry)
