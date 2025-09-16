from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    Boolean,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")

    ledger_entries: Mapped[list["LedgerEntry"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    cash_sessions: Mapped[list["CashSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    mtt_sessions: Mapped[list["MTTSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    simulation_runs: Mapped[list["SimulationRun"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    policies: Mapped[list["Policy"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    token: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user: Mapped[User] = relationship(back_populates="refresh_tokens")


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    amount_cents: Mapped[int] = mapped_column(nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text)

    user: Mapped[User] = relationship(back_populates="ledger_entries")

    __table_args__ = (
        CheckConstraint("type IN ('deposit','withdrawal','transfer','bonus')", name="ledger_type_check"),
    )


class CashSession(Base):
    __tablename__ = "cash_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    start_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    venue: Mapped[Optional[str]] = mapped_column(String(255))
    game: Mapped[Optional[str]] = mapped_column(String(64))
    stake_small_blind_cents: Mapped[Optional[int]] = mapped_column(Integer)
    stake_big_blind_cents: Mapped[Optional[int]] = mapped_column(Integer)
    buyin_cents: Mapped[int] = mapped_column(nullable=False)
    cashout_cents: Mapped[int] = mapped_column(nullable=False)
    tips_cents: Mapped[int] = mapped_column(default=0)
    rake_model: Mapped[Optional[dict]] = mapped_column(JSON)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[Optional[list[str]]] = mapped_column(JSON)
    seat_hours: Mapped[Optional[float]] = mapped_column(Numeric(8, 2))
    hands_played: Mapped[Optional[int]] = mapped_column(Integer)

    user: Mapped[User] = relationship(back_populates="cash_sessions")

    __table_args__ = (
        Index("idx_cash_sessions_user_start", "user_id", "start_ts"),
    )


class MTTSession(Base):
    __tablename__ = "mtt_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    start_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    venue: Mapped[Optional[str]] = mapped_column(String(255))
    format: Mapped[Optional[str]] = mapped_column(String(64))
    buyin_cents: Mapped[int] = mapped_column(nullable=False)
    fee_cents: Mapped[int] = mapped_column(default=0)
    reentries: Mapped[int] = mapped_column(default=0)
    cash_cents: Mapped[int] = mapped_column(default=0)
    position: Mapped[Optional[int]] = mapped_column(Integer)
    field_size: Mapped[Optional[int]] = mapped_column(Integer)
    bounties_cents: Mapped[int] = mapped_column(default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[Optional[list[str]]] = mapped_column(JSON)

    user: Mapped[User] = relationship(back_populates="mtt_sessions")

    __table_args__ = (
        Index("idx_mtt_sessions_user_start", "user_id", "start_ts"),
    )


class SimulationRun(Base):
    __tablename__ = "sim_runs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    horizon_hours: Mapped[Optional[int]] = mapped_column(Integer)
    horizon_sessions: Mapped[Optional[int]] = mapped_column(Integer)
    model: Mapped[str] = mapped_column(String(32))
    params: Mapped[dict] = mapped_column(JSON)
    bankroll_start_cents: Mapped[int] = mapped_column(nullable=False)
    stake_profile: Mapped[dict] = mapped_column(JSON)
    iterations: Mapped[int] = mapped_column(Integer, default=1000)
    seed: Mapped[Optional[int]] = mapped_column(Integer)
    outputs: Mapped[dict] = mapped_column(JSON)

    user: Mapped[User] = relationship(back_populates="simulation_runs")


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    policy_name: Mapped[str] = mapped_column(String(32))
    cash_buyins_required: Mapped[int] = mapped_column(Integer)
    mtt_abis_required: Mapped[int] = mapped_column(Integer)
    hysteresis_pct: Mapped[float] = mapped_column(Numeric(5, 4), default=0.1)

    user: Mapped[User] = relationship(back_populates="policies")
