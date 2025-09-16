from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from .. import models
from ..schemas import LedgerEntryCreate


def create_entry(db: Session, user_id: uuid.UUID, entry_in: LedgerEntryCreate) -> models.LedgerEntry:
    entry = models.LedgerEntry(user_id=user_id, **entry_in.model_dump(exclude_unset=True))
    db.add(entry)
    db.flush()
    return entry


def list_entries(
    db: Session,
    user_id: uuid.UUID,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int | None = None,
) -> list[models.LedgerEntry]:
    query = db.query(models.LedgerEntry).filter(models.LedgerEntry.user_id == user_id)
    if start:
        query = query.filter(models.LedgerEntry.ts >= start)
    if end:
        query = query.filter(models.LedgerEntry.ts <= end)
    query = query.order_by(models.LedgerEntry.ts)
    if limit:
        query = query.limit(limit)
    return query.all()
