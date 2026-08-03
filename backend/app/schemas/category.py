from pydantic import BaseModel

from app.schemas.article import ArticleRead


class CategoryCount(BaseModel):
    code: str
    name: str
    count: int


class CategoriesResponse(BaseModel):
    items: list[CategoryCount]
    since_hours: int


class FeaturedResponse(BaseModel):
    generated_at: str
    total_new: int
    items: list[ArticleRead]

