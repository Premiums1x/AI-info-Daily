import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone

from app.core.config import Settings
from app.core.database import SessionFactory
from app.ingestion.classifier import build_search_text, classify_article, extract_tags
from app.ingestion.fetcher import FeedFetcher
from app.ingestion.parser import parse_feed
from app.ingestion.registry import load_enabled_source_definitions
from app.ingestion.sources import SourceDefinition
from app.models.article import Article
from app.models.source import Source


@dataclass
class IngestionResult:
    successful_sources: int = 0
    failed_sources: int = 0
    inserted_articles: int = 0
    updated_articles: int = 0
    duplicate_articles: int = 0
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_source(session, definition: SourceDefinition) -> Source:
    source = session.get(Source, definition.code)
    if source is None:
        source = Source(
            code=definition.code,
            name=definition.name,
            feed_url=definition.feed_url,
            enabled=definition.enabled,
        )
        session.add(source)
    else:
        source.name = definition.name
        source.feed_url = definition.feed_url
        source.enabled = definition.enabled
    return source


async def run_ingestion(
    session_factory: SessionFactory,
    sources: list[SourceDefinition] | None = None,
    fetcher=None,
    settings: Settings | None = None,
) -> IngestionResult:
    settings = settings or Settings()
    if sources is None:
        with session_factory() as session:
            definitions = load_enabled_source_definitions(session)
            session.commit()
    else:
        definitions = [source for source in sources if source.enabled]
    fetcher = fetcher or FeedFetcher(settings.rss_timeout_seconds)
    result = IngestionResult()

    for definition in definitions:
        fetched_at = utc_now()
        with session_factory() as session:
            source = _ensure_source(session, definition)
            source.last_fetched_at = fetched_at
            session.commit()

        try:
            content = await fetcher.fetch(definition.feed_url)
            candidates = parse_feed(
                content,
                source_code=definition.code,
                source_name=definition.name,
                max_entries=settings.max_entries_per_feed,
            )
            with session_factory() as session:
                source = _ensure_source(session, definition)
                for candidate in candidates:
                    tags = extract_tags(candidate.title, candidate.summary)
                    category_code = classify_article(candidate.title, candidate.summary)
                    existing = session.query(Article).filter_by(
                        canonical_url=candidate.canonical_url
                    ).one_or_none()
                    if existing is not None:
                        existing.title = candidate.title
                        existing.summary = candidate.summary
                        existing.original_url = candidate.original_url
                        existing.published_at = candidate.published_at
                        existing.category_code = category_code
                        existing.tags_json = json.dumps(tags, ensure_ascii=False)
                        existing.search_text = build_search_text(
                            candidate.title,
                            candidate.summary,
                            definition.name,
                            tags,
                        )
                        result.duplicate_articles += 1
                        result.updated_articles += 1
                        continue

                    session.add(
                        Article(
                            source_code=definition.code,
                            title=candidate.title,
                            summary=candidate.summary,
                            original_url=candidate.original_url,
                            canonical_url=candidate.canonical_url,
                            published_at=candidate.published_at,
                            collected_at=utc_now(),
                            category_code=category_code,
                            tags_json=json.dumps(tags, ensure_ascii=False),
                            search_text=build_search_text(
                                candidate.title,
                                candidate.summary,
                                definition.name,
                                tags,
                            ),
                        )
                    )
                    result.inserted_articles += 1

                source.last_success_at = utc_now()
                source.last_error = None
                source.last_item_count = len(candidates)
                session.commit()
            result.successful_sources += 1
        except Exception as exc:  # one broken feed must not stop the whole run
            message = f"{definition.code}: {exc}"
            result.errors.append(message)
            result.failed_sources += 1
            with session_factory() as session:
                source = _ensure_source(session, definition)
                source.last_error = str(exc)[:2000]
                source.last_item_count = 0
                session.commit()

    return result
