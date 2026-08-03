from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", Path(".env")),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "AI Daily API"
    environment: str = "development"
    database_path: Path = PROJECT_ROOT / "data" / "news.db"
    rss_timeout_seconds: float = Field(default=20.0, gt=0)
    ingest_interval_minutes: int = Field(default=120, ge=1)
    ingest_on_startup: bool = True
    enable_scheduler: bool = True
    max_entries_per_feed: int = Field(default=50, ge=1, le=500)
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

