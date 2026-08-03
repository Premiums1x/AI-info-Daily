from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SourceSummary(BaseModel):
    code: str
    name: str


class CategorySummary(BaseModel):
    code: str
    name: str


class ArticleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    summary: str
    source: SourceSummary
    category: CategorySummary
    tags: list[str] = Field(default_factory=list)
    original_url: str
    published_at: datetime
    collected_at: datetime


class ArticleListResponse(BaseModel):
    items: list[ArticleRead]
    total: int
    limit: int
    offset: int
    has_more: bool

