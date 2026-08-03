import asyncio

from app.core.config import Settings
from app.core.database import create_engine_for_settings, create_session_factory, init_db
from app.ingestion.pipeline import run_ingestion
from app.ingestion.sources import SourceDefinition
from app.models.article import Article
from app.models.source import Source


RSS_TEMPLATE = """
<rss version="2.0"><channel><item>
<title>{title}</title>
<link>https://example.com/shared</link>
<description>{summary}</description>
<pubDate>Mon, 03 Aug 2026 09:00:00 GMT</pubDate>
</item></channel></rss>
"""


class FakeFetcher:
    def __init__(self, responses):
        self.responses = responses

    async def fetch(self, feed_url: str) -> str:
        response = self.responses[feed_url]
        if isinstance(response, Exception):
            raise response
        return response


def make_session_factory():
    settings = Settings(
        database_path=":memory:",
        enable_scheduler=False,
        ingest_on_startup=False,
    )
    engine = create_engine_for_settings(settings)
    init_db(engine)
    return settings, create_session_factory(engine)


def test_ingestion_deduplicates_same_canonical_url_and_continues_after_source_failure():
    settings, session_factory = make_session_factory()
    sources = [
        SourceDefinition(
            code="source-one",
            name="Source One",
            feed_url="https://source-one.test/rss",
        ),
        SourceDefinition(
            code="source-two",
            name="Source Two",
            feed_url="https://source-two.test/rss",
        ),
        SourceDefinition(
            code="broken",
            name="Broken Source",
            feed_url="https://broken.test/rss",
        ),
    ]
    fetcher = FakeFetcher(
        {
            "https://source-one.test/rss": RSS_TEMPLATE.format(
                title="第一条资讯", summary="第一条摘要"
            ),
            "https://source-two.test/rss": RSS_TEMPLATE.format(
                title="重复资讯", summary="重复摘要"
            ),
            "https://broken.test/rss": RuntimeError("feed unavailable"),
        }
    )

    result = asyncio.run(
        run_ingestion(
            session_factory,
            sources=sources,
            fetcher=fetcher,
            settings=settings,
        )
    )

    assert result.successful_sources == 2
    assert result.failed_sources == 1
    assert result.inserted_articles == 1
    assert result.duplicate_articles == 1

    with session_factory() as session:
        assert session.query(Article).count() == 1
        assert session.query(Source).filter_by(code="broken").one().last_error

