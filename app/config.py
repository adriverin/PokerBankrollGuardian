from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    api_v1_prefix: str = "/api"
    database_url: str = Field("sqlite+aiosqlite:///./app.db", alias="DATABASE_URL")
    sync_database_url: str = Field("sqlite:///./app.db", alias="SYNC_DATABASE_URL")
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    jwt_secret_key: str = Field("change-me-please", min_length=10)
    jwt_algorithm: str = "HS256"
    allow_origins: list[str] = Field(default_factory=lambda: ["*"])

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
