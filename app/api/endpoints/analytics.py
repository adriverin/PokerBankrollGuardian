from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ... import models
from ...api.deps import get_current_user
from ...crud import ledger as ledger_crud
from ...crud import sessions as sessions_crud
from ...database import get_db
from ...schemas import (
    AnalyticsSummary,
    BankrollPoint,
    BreakdownItem,
    HistogramBin,
    HistogramBucket,
)
from ...services import analytics as analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
def analytics_summary(
    start: datetime | None = Query(None, alias="from"),
    end: datetime | None = Query(None, alias="to"),
    type: str = "all",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> AnalyticsSummary:
    include_cash = type in {"all", "cash"}
    include_mtt = type in {"all", "mtt"}
    cash_sessions = sessions_crud.list_cash_sessions(db, current_user.id, start=start, end=end) if include_cash else []
    mtt_sessions = sessions_crud.list_mtt_sessions(db, current_user.id, start=start, end=end) if include_mtt else []
    summary = analytics_service.summary(cash_sessions, mtt_sessions)
    return AnalyticsSummary(**summary)


@router.get("/histogram", response_model=list[HistogramBucket])
def analytics_histogram(
    bin: HistogramBin,
    start: datetime | None = Query(None, alias="from"),
    end: datetime | None = Query(None, alias="to"),
    type: str = "all",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[HistogramBucket]:
    sessions: list[models.CashSession | models.MTTSession] = []
    if type in {"all", "cash"}:
        sessions.extend(sessions_crud.list_cash_sessions(db, current_user.id, start=start, end=end))
    if type in {"all", "mtt"}:
        sessions.extend(sessions_crud.list_mtt_sessions(db, current_user.id, start=start, end=end))
    buckets = analytics_service.histogram(sessions, bin.value)
    return [HistogramBucket(bin=key, total_profit_cents=profit, sessions=count) for key, profit, count in buckets]


@router.get("/breakdown", response_model=list[BreakdownItem])
def analytics_breakdown(
    dimension: str,
    start: datetime | None = Query(None, alias="from"),
    end: datetime | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[BreakdownItem]:
    cash_sessions = sessions_crud.list_cash_sessions(db, current_user.id, start=start, end=end)
    mtt_sessions = sessions_crud.list_mtt_sessions(db, current_user.id, start=start, end=end)
    items = analytics_service.breakdown(cash_sessions, mtt_sessions, dimension)
    return [BreakdownItem(key=key, total_profit_cents=profit, hours=hours, sessions=count) for key, profit, hours, count in items]


@router.get("/bankroll_timeline", response_model=list[BankrollPoint])
def bankroll_timeline(
    start: datetime | None = Query(None, alias="from"),
    end: datetime | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[BankrollPoint]:
    cash_sessions = sessions_crud.list_cash_sessions(db, current_user.id, start=start, end=end)
    mtt_sessions = sessions_crud.list_mtt_sessions(db, current_user.id, start=start, end=end)
    ledger_entries = ledger_crud.list_entries(db, current_user.id, start=start, end=end)
    points = analytics_service.bankroll_timeline(cash_sessions, mtt_sessions, ledger_entries)
    return [BankrollPoint(ts=ts, bankroll_cents=bankroll) for ts, bankroll in points]
