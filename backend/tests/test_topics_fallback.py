from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.models.article import Article
from app.models.source import Source


def test_topics_do_not_expose_other_as_a_fake_topic():
    app = create_app(
        Settings(
            database_path=':memory:',
            enable_scheduler=False,
            ingest_on_startup=False,
        )
    )

    with TestClient(app) as client:
        now = datetime.now(timezone.utc)
        with app.state.session_factory() as session:
            session.add(
                Source(
                    code='test-source',
                    name='测试来源',
                    feed_url='https://example.com/rss',
                    enabled=True,
                )
            )
            session.add(
                Article(
                    source_code='test-source',
                    title='没有明确主题的文章',
                    summary='摘要',
                    original_url='https://example.com/other',
                    canonical_url='https://example.com/other',
                    published_at=now,
                    collected_at=now,
                    category_code='other',
                    tags_json='[]',
                    search_text='没有明确主题的文章 摘要',
                )
            )
            session.commit()

        response = client.get('/api/v1/topics')

    assert response.status_code == 200
    assert response.json()['items'] == []
