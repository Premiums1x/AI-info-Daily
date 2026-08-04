import hashlib
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import func, select

from app.ingestion.registry import ensure_default_sources
from app.models.article import Article
from app.models.source import Source
from app.schemas.source import (
    SourceCreate,
    SourceListResponse,
    SourceRead,
    SourceUpdate,
)


router = APIRouter(prefix="/sources", tags=["sources"])


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")


def _new_source_code(session, name: str, feed_url: str) -> str:
    hostname = urlparse(feed_url).hostname or "source"
    base = _slug(name) or _slug(hostname) or "source"
    suffix = hashlib.sha1(feed_url.encode("utf-8")).hexdigest()[:6]
    candidate = f"{base}-{suffix}"
    existing = set(session.scalars(select(Source.code)).all())
    if candidate not in existing:
        return candidate

    index = 2
    while f"{candidate}-{index}" in existing:
        index += 1
    return f"{candidate}-{index}"


def _recent_counts(session, since_hours: int) -> dict[str, int]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    rows = session.execute(
        select(Article.source_code, func.count(Article.id))
        .where(Article.published_at >= cutoff)
        .group_by(Article.source_code)
    ).all()
    return {source_code: count for source_code, count in rows}


def _to_schema(source: Source, recent_count: int = 0) -> SourceRead:
    return SourceRead(
        code=source.code,
        name=source.name,
        feed_url=source.feed_url,
        enabled=source.enabled,
        last_fetched_at=_as_utc(source.last_fetched_at),
        last_success_at=_as_utc(source.last_success_at),
        last_item_count=source.last_item_count,
        last_error=source.last_error,
        recent_article_count=recent_count,
    )


def _get_source_or_404(session, source_code: str) -> Source:
    source = session.get(Source, source_code)
    if source is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "SOURCE_NOT_FOUND", "message": "信源不存在"},
        )
    return source


@router.get("", response_model=SourceListResponse)
def list_sources(
    request: Request,
    since_hours: int = Query(default=24, ge=1, le=720),
):
    with request.app.state.session_factory() as session:
        ensure_default_sources(session)
        session.commit()
        counts = _recent_counts(session, since_hours)
        sources = session.scalars(
            select(Source).order_by(Source.enabled.desc(), Source.name.asc())
        ).all()
        items = [_to_schema(source, counts.get(source.code, 0)) for source in sources]
    return SourceListResponse(items=items, since_hours=since_hours)


@router.post("", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
def create_source(payload: SourceCreate, request: Request):
    feed_url = str(payload.feed_url)
    with request.app.state.session_factory() as session:
        ensure_default_sources(session)
        duplicate = session.scalar(select(Source).where(Source.feed_url == feed_url))
        if duplicate is not None:
            raise HTTPException(
                status_code=409,
                detail={"code": "SOURCE_EXISTS", "message": "这个 RSS 地址已经接入"},
            )

        source = Source(
            code=_new_source_code(session, payload.name, feed_url),
            name=payload.name,
            feed_url=feed_url,
            enabled=True,
        )
        session.add(source)
        session.commit()
        session.refresh(source)
        return _to_schema(source)


@router.patch("/{source_code}", response_model=SourceRead)
def update_source(source_code: str, payload: SourceUpdate, request: Request):
    with request.app.state.session_factory() as session:
        source = _get_source_or_404(session, source_code)
        fields = payload.model_fields_set
        if "name" in fields:
            source.name = payload.name
        if "feed_url" in fields and payload.feed_url is not None:
            feed_url = str(payload.feed_url)
            duplicate = session.scalar(
                select(Source).where(
                    Source.feed_url == feed_url,
                    Source.code != source_code,
                )
            )
            if duplicate is not None:
                raise HTTPException(
                    status_code=409,
                    detail={"code": "SOURCE_EXISTS", "message": "这个 RSS 地址已经接入"},
                )
            source.feed_url = feed_url
        if "enabled" in fields and payload.enabled is not None:
            source.enabled = payload.enabled
        session.commit()
        session.refresh(source)
        return _to_schema(source)
