from pydantic import BaseModel

from app.schemas.article import ArticleRead


class DailyDrawRedrawRequest(BaseModel):
    current_id: int | None = None


class DailyDrawResponse(BaseModel):
    drawn_at: str
    article: ArticleRead | None = None
