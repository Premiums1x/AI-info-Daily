import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, or_, select

from app.ingestion.classifier import CATEGORY_NAMES
from app.models.article import Article
from app.models.source import Source
from app.schemas.article import (
    ArticleListResponse,
    ArticleRead,
    CategorySummary,
    SourceSummary,
)


router = APIRouter(prefix="/articles", tags=["articles"])


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def article_to_schema(article: Article) -> ArticleRead:
    try:
        tags = json.loads(article.tags_json or "[]")
    except json.JSONDecodeError:
        tags = []
    return ArticleRead(
        id=article.id,
        title=article.title,
        summary=article.summary,
        source=SourceSummary(code=article.source.code, name=article.source.name),
        category=CategorySummary(
            code=article.category_code,
            name=CATEGORY_NAMES.get(article.category_code, "其他"),
        ),
        tags=tags if isinstance(tags, list) else [],
        original_url=article.original_url,
        published_at=_as_utc(article.published_at),
        collected_at=_as_utc(article.collected_at),
    )


def _article_filters(
    query,
    q: str | None,
    category: str | None,
    tag: str | None,
    since_hours: int,
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    query = query.where(Article.published_at >= cutoff)
    if category:
        query = query.where(Article.category_code == category)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.where(Article.search_text.ilike(pattern))
    if tag:
        query = query.where(Article.search_text.ilike(f"%{tag.strip()}%"))
    return query


@router.get("", response_model=ArticleListResponse)
def list_articles(
    request: Request,
    q: str | None = Query(default=None),
    category: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    since_hours: int = Query(default=24, ge=1, le=720),
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    sort: str = Query(default="latest", pattern="^(latest|oldest)$"),
):
    session_factory = request.app.state.session_factory
    with session_factory() as session:
        base_query = _article_filters(select(Article), q, category, tag, since_hours)
        total = session.scalar(select(func.count()).select_from(base_query.subquery())) or 0
        order = Article.published_at.desc() if sort == "latest" else Article.published_at.asc()
        articles = session.scalars(
            base_query.join(Source).order_by(order, Article.id.desc()).offset(offset).limit(limit)
        ).all()
        items = [article_to_schema(article) for article in articles]
    return ArticleListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(items) < total,
    )


@router.get("/{article_id}", response_model=ArticleRead)
def get_article(article_id: int, request: Request):
    with request.app.state.session_factory() as session:
        article = session.get(Article, article_id)
        if article is None:
            raise HTTPException(
                status_code=404,
                detail={"code": "ARTICLE_NOT_FOUND", "message": "文章不存在"},
            )
        return article_to_schema(article)

