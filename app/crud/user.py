from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from .. import models
from ..schemas import UserCreate, UserUpdate
from ..security import get_password_hash


def get_user(db: Session, user_id: uuid.UUID) -> models.User | None:
    return db.get(models.User, user_id)


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).one_or_none()


def create_user(db: Session, user_in: UserCreate) -> models.User:
    user = models.User(
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        display_name=user_in.display_name,
    )
    db.add(user)
    db.flush()
    return user


def update_user(db: Session, user: models.User, user_in: UserUpdate) -> models.User:
    if user_in.display_name is not None:
        user.display_name = user_in.display_name
    if user_in.currency is not None:
        user.currency = user_in.currency
    if user_in.timezone is not None:
        user.timezone = user_in.timezone
    db.add(user)
    db.flush()
    return user


def create_refresh_token(db: Session, user: models.User, token: str, expires_at: datetime) -> models.RefreshToken:
    refresh = models.RefreshToken(token=token, expires_at=expires_at, user=user)
    db.add(refresh)
    db.flush()
    return refresh


def get_valid_refresh_token(db: Session, token: str) -> models.RefreshToken | None:
    now = datetime.now(timezone.utc)
    return (
        db.query(models.RefreshToken)
        .filter(
            models.RefreshToken.token == token,
            models.RefreshToken.revoked.is_(False),
            models.RefreshToken.expires_at > now,
        )
        .one_or_none()
    )


def revoke_refresh_token(db: Session, refresh: models.RefreshToken) -> None:
    refresh.revoked = True
    db.add(refresh)
    db.flush()
