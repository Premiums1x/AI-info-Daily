from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query, Request
from sqlalchemy import select

from app.api.v1.articles import article_to_schema
from app.models.article import Article
from app.schemas.category import FeaturedResponse


router = APIRouter(prefix="/featured", tags=["featured"])


@router.get("", response_model=FeaturedResponse)
def featured_articles(
    request: Request,
    since_hours: int = Query(default=24, ge=1, le=720),
    limit: int = Query(default=5, ge=1, le=20),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    with request.app.state.session_factory() as session:
        articles = session.scalars(
            select(Article)
            .where(Article.published_at >= cutoff)
            .order_by(Article.published_at.desc(), Article.id.desc())
            .limit(limit)
        ).all()
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

