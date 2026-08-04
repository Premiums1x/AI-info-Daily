from datetime import datetime

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator


def _clean_name(value: str) -> str:
    name = value.strip()
    if not name:
        raise ValueError("信源名称不能为空")
    return name


class SourceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    feed_url: AnyHttpUrl

    _normalize_name = field_validator("name")(_clean_name)


class SourceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    feed_url: AnyHttpUrl | None = None
    enabled: bool | None = None

    _normalize_name = field_validator("name")(_clean_name)


class SourceRead(BaseModel):
    code: str
    name: str
    feed_url: str
    enabled: bool
    last_fetched_at: datetime | None = None
    last_success_at: datetime | None = None
    last_item_count: int = 0
    last_error: str | None = None
    recent_article_count: int = 0


class SourceListResponse(BaseModel):
    items: list[SourceRead]
    since_hours: int
