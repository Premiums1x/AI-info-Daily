from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.models.source import Source
from app.main import create_app


def test_health_exposes_last_ingestion_completion_time():
    app = create_app(
        Settings(
            database_path=':memory:',
            enable_scheduler=False,
            ingest_on_startup=False,
        )
    )
    expected = datetime(2026, 8, 4, 10, 30, tzinfo=timezone.utc).isoformat()
    app.state.last_ingest_at = expected

    with TestClient(app) as client:
        response = client.get('/api/v1/health')

    assert response.status_code == 200
    assert response.json()['scheduler']['last_run_at'] == expected


def test_health_falls_back_to_persisted_source_fetch_time():
    app = create_app(
        Settings(
            database_path=':memory:',
            enable_scheduler=False,
            ingest_on_startup=False,
        )
    )
    persisted_at = datetime(2026, 8, 4, 9, 15, tzinfo=timezone.utc)
    with app.state.session_factory() as session:
        session.add(
            Source(
                code='persisted-source',
                name='Persisted source',
                feed_url='https://example.com/feed.xml',
                enabled=True,
                last_fetched_at=persisted_at,
            )
        )
        session.commit()

    with TestClient(app) as client:
        response = client.get('/api/v1/health')

    assert response.status_code == 200
    assert response.json()['scheduler']['last_run_at'] == persisted_at.isoformat()
