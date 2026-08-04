import json
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query, Request
from sqlalchemy import select

from app.ingestion.classifier import CATEGORY_NAMES
from app.models.article import Article
from app.schemas.topic import TopicCount, TopicsResponse


router = APIRouter(prefix="/topics", tags=["topics"])


def _topic_names(category_code: str, tags_json: str | None) -> list[str]:
    try:
        raw_tags = json.loads(tags_json or "[]")
    except json.JSONDecodeError:
        raw_tags = []

    tags = []
    if isinstance(raw_tags, list):
        for value in raw_tags:
            if not isinstance(value, str):
                continue
            name = value.strip()
            if name and name not in tags:
                tags.append(name)

    if tags:
        return tags

    category_name = CATEGORY_NAMES.get(category_code, "其他")
    return [] if category_name == "其他" else [category_name]


@router.get("", response_model=TopicsResponse)
def list_topics(
    request: Request,
    since_hours: int = Query(default=24, ge=1, le=720),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    with request.app.state.session_factory() as session:
        rows = session.execute(
            select(Article.category_code, Article.tags_json).where(
                Article.published_at >= cutoff
            )
        ).all()

    counts = Counter()
    for category_code, tags_json in rows:
        counts.update(_topic_names(category_code, tags_json))

    items = [
        TopicCount(code=name, name=name, count=count)
        for name, count in sorted(
            counts.items(),
            key=lambda item: (-item[1], item[0].casefold()),
        )
    ]
    return TopicsResponse(items=items, since_hours=since_hours)
