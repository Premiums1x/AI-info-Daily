from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select

from app.assistant.intent import AssistantIntent
from app.models.article import Article


def search_articles_for_intent(session, intent: AssistantIntent) -> list[Article]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=intent.since_hours)
    query = select(Article).where(Article.published_at >= cutoff)

    if intent.category:
        query = query.where(Article.category_code == intent.category)

    terms = list(dict.fromkeys([*intent.topics, *intent.keywords]))
    if terms:
        query = query.where(
            or_(*(Article.search_text.ilike(f"%{term}%") for term in terms))
        )

    return list(
        session.scalars(
            query.order_by(Article.published_at.desc(), Article.id.desc()).limit(intent.limit)
        ).all()
    )


def build_reply(message: str, item_count: int) -> str:
    if item_count:
        return f'根据“{message}”，为你找到 {item_count} 篇相关资讯。'
    return f'暂时没有找到与“{message}”匹配的资讯，可以换个主题或扩大时间范围。'

