from typing import Any

from pydantic import BaseModel, ConfigDict, Field


def _clean_values(value: Any) -> list[str]:
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []

    cleaned = []
    for item in value:
        if not isinstance(item, str):
            continue
        item = item.strip()
        if item and item not in cleaned:
            cleaned.append(item)
    return cleaned


def _bounded_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default
    return max(minimum, min(number, maximum))


class AssistantIntent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    topics: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    category: str | None = None
    since_hours: int = Field(default=168, ge=1, le=720)
    limit: int = Field(default=5, ge=1, le=20)

    @classmethod
    def from_payload(
        cls,
        payload: Any,
        *,
        default_since_hours: int,
        default_limit: int,
    ) -> "AssistantIntent":
        if not isinstance(payload, dict):
            raise ValueError("LLM intent must be a JSON object")

        raw_category = payload.get("category")
        category = raw_category.strip() if isinstance(raw_category, str) else None
        return cls(
            topics=_clean_values(payload.get("topics")),
            keywords=_clean_values(payload.get("keywords")),
            category=category or None,
            since_hours=_bounded_int(payload.get("since_hours"), default_since_hours, 1, 720),
            limit=_bounded_int(payload.get("limit"), default_limit, 1, 20),
        )

