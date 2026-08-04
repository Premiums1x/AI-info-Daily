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
    assistant_enabled: bool = False
    llm_api_url: str = ""
    llm_api_key: str = ""
    llm_model: str = ""
    llm_timeout_seconds: float = Field(default=30.0, gt=0)
    assistant_default_since_hours: int = Field(default=168, ge=1, le=720)
    assistant_max_results: int = Field(default=5, ge=1, le=20)
    llm_max_tokens: int = Field(default=300, ge=64, le=1000)
    assistant_min_interval_seconds: float = Field(default=2.0, ge=0, le=60)
    assistant_max_concurrency: int = Field(default=1, ge=1, le=5)
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

