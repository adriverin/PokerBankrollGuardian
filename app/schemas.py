from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPair(Token):
    refresh_token: str


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class UserBase(BaseModel):
    email: str
    display_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserRead(UserBase):
    id: str
    currency: str
    timezone: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    currency: Optional[str] = Field(None, max_length=3)
    timezone: Optional[str] = None


class LedgerEntryBase(BaseModel):
    ts: datetime
    amount_cents: int
    type: Literal["deposit", "withdrawal", "transfer", "bonus"]
    note: Optional[str] = None


class LedgerEntryCreate(LedgerEntryBase):
    pass


class LedgerEntryRead(LedgerEntryBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class SessionType(str, Enum):
    cash = "cash"
    mtt = "mtt"


class CashSessionBase(BaseModel):
    start_ts: datetime
    end_ts: datetime
    venue: Optional[str] = None
    game: Optional[str] = None
    stake_small_blind_cents: Optional[int] = Field(None, ge=0)
    stake_big_blind_cents: Optional[int] = Field(None, ge=0)
    buyin_cents: int
    cashout_cents: int
    tips_cents: int = 0
    rake_model: Optional[dict[str, Any]] = None
    notes: Optional[str] = None
    tags: list[str] | None = None
    seat_hours: Optional[float] = Field(None, ge=0)
    hands_played: Optional[int] = Field(None, ge=0)

    @field_validator("tags", mode="before")
    @classmethod
    def _normalize_tags(cls, v: Any) -> list[str] | None:
        if v is None:
            return None
        if isinstance(v, str):
            return [t.strip() for t in v.split(",") if t.strip()]
        if isinstance(v, (list, tuple)):
            return [str(t).strip() for t in v if str(t).strip()]
        raise ValueError("Invalid tags format")


class CashSessionCreate(CashSessionBase):
    pass


class CashSessionRead(CashSessionBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class MTTSessionBase(BaseModel):
    start_ts: datetime
    end_ts: datetime
    venue: Optional[str] = None
    format: Optional[str] = None
    buyin_cents: int
    fee_cents: int = 0
    reentries: int = 0
    cash_cents: int = 0
    position: Optional[int] = Field(None, ge=1)
    field_size: Optional[int] = Field(None, ge=1)
    bounties_cents: int = 0
    notes: Optional[str] = None
    tags: list[str] | None = None

    @field_validator("tags", mode="before")
    @classmethod
    def _normalize_tags(cls, v: Any) -> list[str] | None:
        if v is None:
            return None
        if isinstance(v, str):
            return [t.strip() for t in v.split(",") if t.strip()]
        if isinstance(v, (list, tuple)):
            return [str(t).strip() for t in v if str(t).strip()]
        raise ValueError("Invalid tags format")


class MTTSessionCreate(MTTSessionBase):
    pass


class MTTSessionRead(MTTSessionBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class SimulationModel(str, Enum):
    bootstrap = "bootstrap"
    normal = "normal"
    tstudent = "tstudent"
    mixture = "mixture"


class SimulationStakeProfile(BaseModel):
    type: Literal["cash", "mtt"]
    bb_cents: Optional[int] = Field(None, ge=0)
    buyin_bb: Optional[float] = Field(None, ge=0)
    abi_cents: Optional[int] = Field(None, ge=0)
    stop_loss_bb: Optional[float] = Field(None, ge=0)


class SimulationRequest(BaseModel):
    horizon_hours: Optional[int] = Field(None, ge=1)
    horizon_sessions: Optional[int] = Field(None, ge=1)
    model: SimulationModel
    params: dict[str, Any]
    bankroll_start_cents: int
    stake_profile: SimulationStakeProfile
    iterations: int = Field(1000, ge=100)
    seed: Optional[int] = None
    policy: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9_-]+$")

    @model_validator(mode="after")
    def ensure_horizon(self):  # type: ignore[override]
        if self.horizon_hours is None and self.horizon_sessions is None:
            raise ValueError("Either horizon_hours or horizon_sessions must be provided")
        return self


class SimulationSummary(BaseModel):
    sim_id: str
    summary: dict[str, Any]


class PolicyBase(BaseModel):
    policy_name: str
    cash_buyins_required: int
    mtt_abis_required: int
    hysteresis_pct: float = 0.1


class PolicyCreate(PolicyBase):
    pass


class PolicyRead(PolicyBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class HistogramBin(str, Enum):
    day = "day"
    week = "week"
    month = "month"
    year = "year"


class AnalyticsSummary(BaseModel):
    total_profit_cents: int
    total_hours: float
    hourly_rate: float
    roi_percent: float
    total_sessions: int
    total_tournaments: int


class BankrollPoint(BaseModel):
    ts: datetime
    bankroll_cents: int


class BreakdownItem(BaseModel):
    key: str
    total_profit_cents: int
    hours: float
    sessions: int


class HistogramBucket(BaseModel):
    bin: str
    total_profit_cents: int
    sessions: int


class ExportScope(str, Enum):
    sessions = "sessions"
    ledger = "ledger"
    all = "all"
