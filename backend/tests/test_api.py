from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.models.article import Article
from app.models.source import Source


@contextmanager
def make_client():
    settings = Settings(
        database_path=":memory:",
        enable_scheduler=False,
        ingest_on_startup=False,
    )
    app = create_app(settings)
    with TestClient(app) as client:
        with app.state.session_factory() as session:
            source = Source(
                code="test-source",
                name="测试来源",
                feed_url="https://example.com/rss",
                enabled=True,
            )
            session.add(source)
            now = datetime.now(timezone.utc)
            session.add_all(
                [
                    Article(
                        source_code="test-source",
                        title="Agent 工作流产品发布",
                        summary="一个新的 AI 产品。",
                        original_url="https://example.com/1",
                        canonical_url="https://example.com/1",
                        published_at=now,
                        collected_at=now,
                        category_code="product",
                        tags_json='["Agent", "AI 产品"]',
                        search_text="Agent 工作流产品发布 一个新的 AI 产品 测试来源 Agent AI 产品",
                    ),
                    Article(
                        source_code="test-source",
                        title="旧研究文章",
                        summary="研究摘要。",
                        original_url="https://example.com/2",
                        canonical_url="https://example.com/2",
                        published_at=now - timedelta(days=3),
                        collected_at=now,
                        category_code="research",
                        tags_json='["研究"]',
                        search_text="旧研究文章 研究摘要 测试来源 研究",
                    ),
                ]
            )
            session.commit()
        yield client, app


def test_articles_supports_search_category_and_pagination():
    with make_client() as (client, _):
        response = client.get(
            "/api/v1/articles",
            params={"q": "Agent", "category": "product", "limit": 1},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["has_more"] is False
    assert body["items"][0]["category"]["code"] == "product"
    assert body["items"][0]["tags"] == ["Agent", "AI 产品"]


def test_article_detail_returns_original_link_without_full_body():
    with make_client() as (client, _):
        response = client.get("/api/v1/articles/1")

    assert response.status_code == 200
    body = response.json()
    assert body["original_url"] == "https://example.com/1"
    assert "content" not in body


def test_missing_article_returns_not_found():
    with make_client() as (client, _):
        response = client.get("/api/v1/articles/999")

    assert response.status_code == 404
    assert response.json()["code"] == "ARTICLE_NOT_FOUND"


def test_categories_returns_all_supported_categories_with_time_window_counts():
    with make_client() as (client, _):
        response = client.get("/api/v1/categories")

    assert response.status_code == 200
    categories = {item["code"]: item["count"] for item in response.json()["items"]}
    assert set(categories) == {"product", "research", "business", "open_source", "other"}
    assert categories["product"] == 1
    assert categories["research"] == 0


def test_featured_returns_recent_articles_only():
    with make_client() as (client, _):
        response = client.get("/api/v1/featured")

    assert response.status_code == 200
    body = response.json()
    assert body["total_new"] == 1
    assert [item["id"] for item in body["items"]] == [1]


def test_daily_draw_returns_one_recent_article():
    with make_client() as (client, _):
        response = client.get("/api/v1/daily-draw")

    assert response.status_code == 200
    body = response.json()
    assert body["article"]["id"] == 1
    assert body["drawn_at"]

def test_health_reports_degraded_when_database_session_fails():
    with make_client() as (client, app):
        def broken_session_factory():
            raise RuntimeError("database unavailable")

        app.state.session_factory = broken_session_factory
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
    assert response.json()["database"] == "error"

