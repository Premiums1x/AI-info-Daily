from datetime import datetime, timedelta, timezone
from hashlib import sha256

from fastapi import APIRouter, Query, Request
from sqlalchemy import select

from app.api.v1.articles import article_to_schema
from app.models.article import Article
from app.schemas.daily_draw import DailyDrawRedrawRequest, DailyDrawResponse


router = APIRouter(prefix="/daily-draw", tags=["daily-draw"])


def select_daily_draw(articles: list[Article], draw_key: str) -> Article | None:
    if not articles:
        return None

    digest = sha256(draw_key.encode("utf-8")).digest()
    index = int.from_bytes(digest[:8], byteorder="big") % len(articles)
    return articles[index]


def select_redraw(articles: list[Article], current_id: int | None) -> Article | None:
    if not articles:
        return None

    current_index = next((index for index, article in enumerate(articles) if article.id == current_id), -1)
    return articles[(current_index + 1) % len(articles)]


@router.post("/redraw", response_model=DailyDrawResponse)
def redraw_daily_draw(
    request: Request,
    payload: DailyDrawRedrawRequest,
    since_hours: int = Query(default=24, ge=1, le=720),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    drawn_at = datetime.now(timezone.utc).date().isoformat()
    with request.app.state.session_factory() as session:
        articles = session.scalars(
            select(Article)
            .where(Article.published_at >= cutoff)
            .order_by(Article.published_at.desc(), Article.id.desc())
        ).all()
        article = select_redraw(articles, payload.current_id)
        article_schema = article_to_schema(article) if article else None

    return DailyDrawResponse(drawn_at=drawn_at, article=article_schema)


@router.get("", response_model=DailyDrawResponse)
def daily_draw(
    request: Request,
    since_hours: int = Query(default=24, ge=1, le=720),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    drawn_at = datetime.now(timezone.utc).date().isoformat()
    with request.app.state.session_factory() as session:
        articles = session.scalars(
            select(Article)
            .where(Article.published_at >= cutoff)
            .order_by(Article.published_at.desc(), Article.id.desc())
        ).all()
        article = select_daily_draw(articles, drawn_at)
        article_schema = article_to_schema(article) if article else None

    return DailyDrawResponse(drawn_at=drawn_at, article=article_schema)
