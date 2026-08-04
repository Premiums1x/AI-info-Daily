from sqlalchemy import select

from app.ingestion.sources import SOURCE_DEFINITIONS, SourceDefinition
from app.models.source import Source


def ensure_default_sources(session) -> None:
    """Insert built-in sources without overwriting user-managed settings."""
    for definition in SOURCE_DEFINITIONS:
        if session.get(Source, definition.code) is None:
            session.add(
                Source(
                    code=definition.code,
                    name=definition.name,
                    feed_url=definition.feed_url,
                    enabled=definition.enabled,
                )
            )
    session.flush()


def load_enabled_source_definitions(session) -> list[SourceDefinition]:
    ensure_default_sources(session)
    sources = session.scalars(
        select(Source)
        .where(Source.enabled.is_(True))
        .order_by(Source.code.asc())
    ).all()
    return [
        SourceDefinition(
            code=source.code,
            name=source.name,
            feed_url=source.feed_url,
            enabled=source.enabled,
        )
        for source in sources
    ]
