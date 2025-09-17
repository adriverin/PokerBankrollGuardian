from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ...config import get_settings
from ...crud import user as user_crud
from ...database import get_db
from ...schemas import TokenPair, TokenRefreshRequest, UserCreate, UserRead
from ...security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    existing = user_crud.get_user_by_email(db, user_in.email.lower())
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = user_crud.create_user(db, user_in)
    db.commit()
    return UserRead.model_validate(user)


@router.post("/login", response_model=TokenPair)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenPair:
    user = user_crud.get_user_by_email(db, form_data.username.lower())
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")

    access_token = create_access_token(str(user.id))
    refresh_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    user_crud.create_refresh_token(db, user, refresh_token, expires_at)
    db.commit()
    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenPair)
def refresh_token(payload: TokenRefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    stored = user_crud.get_valid_refresh_token(db, payload.refresh_token)
    if stored is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = stored.user
    access_token = create_access_token(str(user.id))
    new_refresh = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    stored.revoked = True
    user_crud.create_refresh_token(db, user, new_refresh, expires_at)
    db.commit()
    return TokenPair(access_token=access_token, refresh_token=new_refresh)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def logout(payload: TokenRefreshRequest, db: Session = Depends(get_db)) -> Response:
    stored = user_crud.get_valid_refresh_token(db, payload.refresh_token)
    if stored is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    stored.revoked = True
    db.add(stored)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
