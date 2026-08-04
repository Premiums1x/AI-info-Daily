from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.assistant.intent import AssistantIntent
from app.core.config import Settings
from app.main import create_app
from app.models.article import Article
from app.models.source import Source


class FakeAssistantClient:
    async def extract_intent(self, message, *, default_since_hours, default_limit):
        assert message == "推荐最近的 Agent 资讯"
        return AssistantIntent(
            topics=["Agent"],
            keywords=["Agent"],
            since_hours=default_since_hours,
            limit=default_limit,
        )


def make_assistant_app():
    app = create_app(
        Settings(
            database_path=":memory:",
            enable_scheduler=False,
            ingest_on_startup=False,
            assistant_enabled=True,
        )
    )
    app.state.assistant_client = FakeAssistantClient()
    now = datetime.now(timezone.utc)
    with app.state.session_factory() as session:
        session.add(
            Source(
                code="test-source",
                name="测试来源",
                feed_url="https://example.com/rss",
                enabled=True,
            )
        )
        session.add_all(
            [
                Article(
                    source_code="test-source",
                    title="Agent 工具发布",
                    summary="一个新的 Agent 工具。",
                    original_url="https://example.com/agent",
                    canonical_url="https://example.com/agent",
                    published_at=now,
                    collected_at=now,
                    category_code="product",
                    tags_json='["Agent"]',
                    search_text="Agent 工具发布 一个新的 Agent 工具 测试来源 Agent",
                ),
                Article(
                    source_code="test-source",
                    title="开源模型更新",
                    summary="模型摘要。",
                    original_url="https://example.com/model",
                    canonical_url="https://example.com/model",
                    published_at=now,
                    collected_at=now,
                    category_code="open_source",
                    tags_json='["开源模型"]',
                    search_text="开源模型更新 模型摘要 测试来源 开源模型",
                ),
                Article(
                    source_code="test-source",
                    title="旧 Agent 文章",
                    summary="旧摘要。",
                    original_url="https://example.com/old",
                    canonical_url="https://example.com/old",
                    published_at=now - timedelta(days=10),
                    collected_at=now,
                    category_code="product",
                    tags_json='["Agent"]',
                    search_text="旧 Agent 文章 旧摘要 测试来源 Agent",
                ),
            ]
        )
        session.commit()
    return app


def test_assistant_query_returns_recent_articles_matching_fake_intent():
    app = make_assistant_app()

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/assistant/query",
            json={"message": "推荐最近的 Agent 资讯"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"]
    assert [item["title"] for item in body["items"]] == ["Agent 工具发布"]
    assert body["items"][0]["original_url"] == "https://example.com/agent"
    assert "content" not in body["items"][0]


def test_assistant_query_returns_503_when_not_configured():
    app = create_app(
        Settings(
            database_path=":memory:",
            enable_scheduler=False,
            ingest_on_startup=False,
        )
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/assistant/query",
            json={"message": "推荐一些资讯"},
        )

    assert response.status_code == 503
    assert response.json()["code"] == "ASSISTANT_NOT_CONFIGURED"

def test_assistant_query_rate_limits_repeated_requests_from_one_client():
    app = make_assistant_app()

    with TestClient(app) as client:
        first = client.post(
            "/api/v1/assistant/query",
            json={"message": "推荐最近的 Agent 资讯"},
        )
        second = client.post(
            "/api/v1/assistant/query",
            json={"message": "推荐最近的 Agent 资讯"},
        )

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["code"] == "ASSISTANT_RATE_LIMITED"
