from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from ... import models
from ...api.deps import get_current_user
from ...crud import sessions as sessions_crud
from ...database import get_db
from ...schemas import (
    CashSessionCreate,
    CashSessionRead,
    MTTSessionCreate,
    MTTSessionRead,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _parse_tags(tag_param: Optional[str]) -> list[str] | None:
    if tag_param is None:
        return None
    tags = [t.strip() for t in tag_param.split(",") if t.strip()]
    return tags or None


@router.get("/cash", response_model=list[CashSessionRead])
def list_cash_sessions(
    start: datetime | None = Query(None, alias="from"),
    end: datetime | None = Query(None, alias="to"),
    stake: Optional[int] = None,
    venue: Optional[str] = None,
    tags: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[CashSessionRead]:
    sessions = sessions_crud.list_cash_sessions(
        db,
        user_id=current_user.id,
        start=start,
        end=end,
        stake_big_blind_cents=stake,
        venue=venue,
        tags=_parse_tags(tags),
    )
    return [CashSessionRead.model_validate(s) for s in sessions]


@router.post("/cash", response_model=CashSessionRead, status_code=status.HTTP_201_CREATED)
def create_cash_session(
    session_in: CashSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> CashSessionRead:
    session = sessions_crud.create_cash_session(db, current_user.id, session_in)
    db.commit()
    return CashSessionRead.model_validate(session)


@router.put("/cash/{session_id}", response_model=CashSessionRead)
def update_cash_session(
    session_id: uuid.UUID,
    session_in: CashSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> CashSessionRead:
    session = sessions_crud.get_cash_session(db, current_user.id, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    session = sessions_crud.update_cash_session(db, session, session_in)
    db.commit()
    return CashSessionRead.model_validate(session)


@router.delete("/cash/{session_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_cash_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Response:
    session = sessions_crud.get_cash_session(db, current_user.id, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    sessions_crud.delete_cash_session(db, session)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/mtt", response_model=list[MTTSessionRead])
def list_mtt_sessions(
    start: datetime | None = Query(None, alias="from"),
    end: datetime | None = Query(None, alias="to"),
    venue: Optional[str] = None,
    tags: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[MTTSessionRead]:
    sessions = sessions_crud.list_mtt_sessions(
        db,
        user_id=current_user.id,
        start=start,
        end=end,
        venue=venue,
        tags=_parse_tags(tags),
    )
    return [MTTSessionRead.model_validate(s) for s in sessions]


@router.post("/mtt", response_model=MTTSessionRead, status_code=status.HTTP_201_CREATED)
def create_mtt_session(
    session_in: MTTSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> MTTSessionRead:
    session = sessions_crud.create_mtt_session(db, current_user.id, session_in)
    db.commit()
    return MTTSessionRead.model_validate(session)


@router.put("/mtt/{session_id}", response_model=MTTSessionRead)
def update_mtt_session(
    session_id: uuid.UUID,
    session_in: MTTSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> MTTSessionRead:
    session = sessions_crud.get_mtt_session(db, current_user.id, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    session = sessions_crud.update_mtt_session(db, session, session_in)
    db.commit()
    return MTTSessionRead.model_validate(session)


@router.delete("/mtt/{session_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_mtt_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Response:
    session = sessions_crud.get_mtt_session(db, current_user.id, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    sessions_crud.delete_mtt_session(db, session)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
