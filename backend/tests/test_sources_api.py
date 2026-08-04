import asyncio

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.database import create_engine_for_settings, create_session_factory, init_db
from app.ingestion.pipeline import run_ingestion
from app.ingestion.sources import GOOGLE_NEWS_AI_URL, SOURCE_DEFINITIONS
from app.main import create_app
from app.models.source import Source


RSS_TEMPLATE = """
<rss version="2.0"><channel><item>
<title>{title}</title>
<link>https://example.com/{slug}</link>
<description>{summary}</description>
<pubDate>Mon, 03 Aug 2026 09:00:00 GMT</pubDate>
</item></channel></rss>
"""


def make_client():
    app = create_app(
        Settings(
            database_path=":memory:",
            enable_scheduler=False,
            ingest_on_startup=False,
        )
    )
    return app, TestClient(app)


def test_sources_list_contains_default_sources_even_before_first_ingestion():
    app, client = make_client()
    with client:
        response = client.get("/api/v1/sources")

    assert response.status_code == 200
    body = response.json()
    assert {item["code"] for item in body["items"]} == {
        definition.code for definition in SOURCE_DEFINITIONS
    }
    assert all(item["recent_article_count"] == 0 for item in body["items"])


def test_sources_can_be_created_and_disabled_from_api():
    app, client = make_client()
    with client:
        created = client.post(
            "/api/v1/sources",
            json={
                "name": "Anthropic News",
                "feed_url": "https://www.anthropic.com/rss.xml",
            },
        )

        assert created.status_code == 201
        source = created.json()
        assert source["code"].startswith("anthropic-news-")
        assert source["enabled"] is True

        updated = client.patch(
            f"/api/v1/sources/{source['code']}",
            json={"enabled": False},
        )

    assert updated.status_code == 200
    assert updated.json()["enabled"] is False


def test_sources_reject_duplicate_feed_url():
    app, client = make_client()
    with client:
        first = client.post(
            "/api/v1/sources",
            json={"name": "一个信源", "feed_url": "https://example.com/feed.xml"},
        )
        duplicate = client.post(
            "/api/v1/sources",
            json={"name": "另一个名字", "feed_url": "https://example.com/feed.xml"},
        )

    assert first.status_code == 201
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "SOURCE_EXISTS"


class FakeFetcher:
    def __init__(self, responses):
        self.responses = responses
        self.calls = []

    async def fetch(self, feed_url: str) -> str:
        self.calls.append(feed_url)
        return self.responses[feed_url]


def test_ingestion_reads_enabled_custom_sources_from_database():
    settings = Settings(
        database_path=":memory:",
        enable_scheduler=False,
        ingest_on_startup=False,
    )
    engine = create_engine_for_settings(settings)
    init_db(engine)
    session_factory = create_session_factory(engine)
    custom_url = "https://custom.example.com/feed.xml"

    with session_factory() as session:
        session.add(
            Source(
                code="custom-source",
                name="自定义信源",
                feed_url=custom_url,
                enabled=True,
            )
        )
        session.commit()

    responses = {
        definition.feed_url: RSS_TEMPLATE.format(
            title=definition.name,
            slug=definition.code,
            summary="默认信源摘要",
        )
        for definition in SOURCE_DEFINITIONS
    }
    responses[custom_url] = RSS_TEMPLATE.format(
        title="自定义信源文章",
        slug="custom",
        summary="自定义摘要",
    )
    fetcher = FakeFetcher(responses)

    result = asyncio.run(
        run_ingestion(session_factory, fetcher=fetcher, settings=settings)
    )

    assert result.successful_sources == 3
    assert custom_url in fetcher.calls
    with session_factory() as session:
        source = session.get(Source, "custom-source")
        assert source.last_success_at is not None
        assert source.last_error is None
