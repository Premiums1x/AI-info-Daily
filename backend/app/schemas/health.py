from typing import Any

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    database: str
    scheduler: dict[str, Any]
    assistant: dict[str, bool]
    sources: dict[str, int]

