import json
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.models.article import Article
from app.models.source import Source


def test_topics_are_aggregated_from_recent_article_tags_and_category_fallback():
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
            session.add_all(
                [
                    Article(
                        source_code='test-source',
                        title='Agent 工作流产品',
                        summary='摘要',
                        original_url='https://example.com/1',
                        canonical_url='https://example.com/1',
                        published_at=now,
                        collected_at=now,
                        category_code='product',
                        tags_json=json.dumps(['Agent', '工作流'], ensure_ascii=False),
                        search_text='Agent 工作流产品 摘要',
                    ),
                    Article(
                        source_code='test-source',
                        title='工作流研究',
                        summary='摘要',
                        original_url='https://example.com/2',
                        canonical_url='https://example.com/2',
                        published_at=now,
                        collected_at=now,
                        category_code='research',
                        tags_json=json.dumps(['工作流'], ensure_ascii=False),
                        search_text='工作流研究 摘要',
                    ),
                    Article(
                        source_code='test-source',
                        title='没有标签的研究',
                        summary='摘要',
                        original_url='https://example.com/3',
                        canonical_url='https://example.com/3',
                        published_at=now,
                        collected_at=now,
                        category_code='research',
                        tags_json='[]',
                        search_text='没有标签的研究 摘要',
                    ),
                    Article(
                        source_code='test-source',
                        title='旧主题',
                        summary='摘要',
                        original_url='https://example.com/4',
                        canonical_url='https://example.com/4',
                        published_at=now - timedelta(days=3),
                        collected_at=now,
                        category_code='business',
                        tags_json=json.dumps(['旧主题'], ensure_ascii=False),
                        search_text='旧主题 摘要',
                    ),
                ]
            )
            session.commit()

        response = client.get('/api/v1/topics', params={'since_hours': 24})

    assert response.status_code == 200
    assert response.json() == {
        'since_hours': 24,
        'items': [
            {'code': '工作流', 'name': '工作流', 'count': 2},
            {'code': 'Agent', 'name': 'Agent', 'count': 1},
            {'code': '研究', 'name': '研究', 'count': 1},
        ],
    }
