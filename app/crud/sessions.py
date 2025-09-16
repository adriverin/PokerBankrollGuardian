from __future__ import annotations

import uuid
from datetime import datetime
from typing import Iterable, Sequence

from sqlalchemy.orm import Session

from .. import models
from ..schemas import CashSessionCreate, MTTSessionCreate


def create_cash_session(db: Session, user_id: uuid.UUID, session_in: CashSessionCreate) -> models.CashSession:
    db_obj = models.CashSession(user_id=user_id, **session_in.model_dump(exclude_unset=True))
    db.add(db_obj)
    db.flush()
    return db_obj


def update_cash_session(db: Session, session: models.CashSession, session_in: CashSessionCreate) -> models.CashSession:
    for field, value in session_in.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    db.add(session)
    db.flush()
    return session


def delete_cash_session(db: Session, session: models.CashSession) -> None:
    db.delete(session)
    db.flush()


def create_mtt_session(db: Session, user_id: uuid.UUID, session_in: MTTSessionCreate) -> models.MTTSession:
    db_obj = models.MTTSession(user_id=user_id, **session_in.model_dump(exclude_unset=True))
    db.add(db_obj)
    db.flush()
    return db_obj


def update_mtt_session(db: Session, session: models.MTTSession, session_in: MTTSessionCreate) -> models.MTTSession:
    for field, value in session_in.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    db.add(session)
    db.flush()
    return session


def delete_mtt_session(db: Session, session: models.MTTSession) -> None:
    db.delete(session)
    db.flush()


def list_cash_sessions(
    db: Session,
    user_id: uuid.UUID,
    start: datetime | None = None,
    end: datetime | None = None,
    stake_big_blind_cents: int | None = None,
    venue: str | None = None,
    tags: Sequence[str] | None = None,
) -> list[models.CashSession]:
    query = db.query(models.CashSession).filter(models.CashSession.user_id == user_id)
    if start:
        query = query.filter(models.CashSession.start_ts >= start)
    if end:
        query = query.filter(models.CashSession.start_ts <= end)
    if stake_big_blind_cents:
        query = query.filter(models.CashSession.stake_big_blind_cents == stake_big_blind_cents)
    if venue:
        query = query.filter(models.CashSession.venue == venue)
    sessions = query.order_by(models.CashSession.start_ts).all()
    if tags:
        tag_set = {t.lower() for t in tags}
        sessions = [s for s in sessions if s.tags and tag_set.issubset({t.lower() for t in s.tags})]
    return sessions


def list_mtt_sessions(
    db: Session,
    user_id: uuid.UUID,
    start: datetime | None = None,
    end: datetime | None = None,
    venue: str | None = None,
    tags: Sequence[str] | None = None,
) -> list[models.MTTSession]:
    query = db.query(models.MTTSession).filter(models.MTTSession.user_id == user_id)
    if start:
        query = query.filter(models.MTTSession.start_ts >= start)
    if end:
        query = query.filter(models.MTTSession.start_ts <= end)
    if venue:
        query = query.filter(models.MTTSession.venue == venue)
    sessions = query.order_by(models.MTTSession.start_ts).all()
    if tags:
        tag_set = {t.lower() for t in tags}
        sessions = [s for s in sessions if s.tags and tag_set.issubset({t.lower() for t in s.tags})]
    return sessions


def get_cash_session(db: Session, user_id: uuid.UUID, session_id: uuid.UUID) -> models.CashSession | None:
    return (
        db.query(models.CashSession)
        .filter(models.CashSession.user_id == user_id, models.CashSession.id == session_id)
        .one_or_none()
    )


def get_mtt_session(db: Session, user_id: uuid.UUID, session_id: uuid.UUID) -> models.MTTSession | None:
    return (
        db.query(models.MTTSession)
        .filter(models.MTTSession.user_id == user_id, models.MTTSession.id == session_id)
        .one_or_none()
    )
