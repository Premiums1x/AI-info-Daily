from pydantic import BaseModel, Field


class TopicCount(BaseModel):
    code: str
    name: str
    count: int = Field(ge=0)


class TopicsResponse(BaseModel):
    items: list[TopicCount]
    since_hours: int
