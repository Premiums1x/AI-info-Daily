from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query, Request
from sqlalchemy import func, select

from app.ingestion.classifier import CATEGORY_NAMES
from app.models.article import Article
from app.schemas.category import CategoriesResponse, CategoryCount


router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=CategoriesResponse)
def list_categories(
    request: Request,
    since_hours: int = Query(default=24, ge=1, le=720),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    with request.app.state.session_factory() as session:
        rows = session.execute(
            select(Article.category_code, func.count(Article.id))
            .where(Article.published_at >= cutoff)
            .group_by(Article.category_code)
        ).all()
    counts = {code: count for code, count in rows}
    items = [
        CategoryCount(code=code, name=name, count=counts.get(code, 0))
        for code, name in CATEGORY_NAMES.items()
    ]
    return CategoriesResponse(items=items, since_hours=since_hours)

