from __future__ import annotations

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from ... import models
from ...api.deps import get_current_user
from ...crud import ledger as ledger_crud
from ...crud import sessions as sessions_crud
from ...database import get_db
from ...schemas import ExportScope
from ...services.analytics import _cash_net, _mtt_net

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/csv")
def export_csv(
    scope: ExportScope = ExportScope.all,
    start: datetime | None = None,
    end: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Response:
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    if scope in {ExportScope.all, ExportScope.sessions}:
        writer.writerow(["type", "id", "start_ts", "end_ts", "venue", "stake", "profit_cents"])
        for session in sessions_crud.list_cash_sessions(db, current_user.id, start=start, end=end):
            stake = f"{session.stake_small_blind_cents}/{session.stake_big_blind_cents}"
            writer.writerow([
                "cash",
                session.id,
                session.start_ts.isoformat(),
                session.end_ts.isoformat(),
                session.venue or "",
                stake,
                int(_cash_net(session)),
            ])
        for session in sessions_crud.list_mtt_sessions(db, current_user.id, start=start, end=end):
            writer.writerow([
                "mtt",
                session.id,
                session.start_ts.isoformat(),
                session.end_ts.isoformat(),
                session.venue or "",
                session.format or "",
                int(_mtt_net(session)),
            ])

    if scope in {ExportScope.all, ExportScope.ledger}:
        writer.writerow([])
        writer.writerow(["ledger_id", "ts", "amount_cents", "type", "note"])
        for entry in ledger_crud.list_entries(db, current_user.id, start=start, end=end):
            writer.writerow([
                entry.id,
                entry.ts.isoformat(),
                entry.amount_cents,
                entry.type,
                entry.note or "",
            ])

    buffer.seek(0)
    return Response(content=buffer.getvalue(), media_type="text/csv")
