from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query, Request
from sqlalchemy import select

from app.api.v1.articles import article_to_schema
from app.models.article import Article
from app.schemas.category import FeaturedResponse


router = APIRouter(prefix="/featured", tags=["featured"])

def select_daily_hand(articles: list[Article], limit: int) -> list[Article]:
    safe_limit = max(0, limit)
    if safe_limit == 0:
        return []

    selected: list[Article] = []
    selected_ids: set[int] = set()
    seen_sources: set[str] = set()

    for article in articles:
        if article.source_code in seen_sources:
            continue
        selected.append(article)
        selected_ids.add(article.id)
        seen_sources.add(article.source_code)
        if len(selected) == safe_limit:
            return selected

    seen_categories = {article.category_code for article in selected}
    for article in articles:
        if article.id in selected_ids or article.category_code in seen_categories:
            continue
        selected.append(article)
        selected_ids.add(article.id)
        seen_categories.add(article.category_code)
        if len(selected) == safe_limit:
            return selected

    for article in articles:
        if article.id in selected_ids:
            continue
        selected.append(article)
        selected_ids.add(article.id)
        if len(selected) == safe_limit:
            break

    return selected

@router.get("", response_model=FeaturedResponse)
def featured_articles(
    request: Request,
    since_hours: int = Query(default=24, ge=1, le=720),
    limit: int = Query(default=7, ge=1, le=20),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    with request.app.state.session_factory() as session:
        articles = session.scalars(
            select(Article)
            .where(Article.published_at >= cutoff)
            .order_by(Article.published_at.desc(), Article.id.desc())
        ).all()
        articles = select_daily_hand(articles, limit)
        total_new = session.scalar(
            select(Article.id).where(Article.published_at >= cutoff).limit(1)
        )
        total_new_count = session.query(Article).filter(Article.published_at >= cutoff).count()
        items = [article_to_schema(article) for article in articles]
    return FeaturedResponse(
        generated_at=datetime.now(timezone.utc).isoformat(),
        total_new=total_new_count if total_new is not None else 0,
        items=items,
    )

