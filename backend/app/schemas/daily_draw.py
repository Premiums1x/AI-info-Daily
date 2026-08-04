from pydantic import BaseModel

from app.schemas.article import ArticleRead


class DailyDrawResponse(BaseModel):
    drawn_at: str
    article: ArticleRead | None = None
