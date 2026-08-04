from pydantic import BaseModel, Field

from app.schemas.article import ArticleRead


class AssistantQueryRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)


class AssistantQueryResponse(BaseModel):
    reply: str
    items: list[ArticleRead]

