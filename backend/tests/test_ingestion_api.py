from fastapi.testclient import TestClient

from app.core.config import Settings
from app.ingestion.pipeline import IngestionResult
from app.main import create_app


def test_manual_refresh_runs_ingestion_and_returns_statistics(monkeypatch):
    app = create_app(
        Settings(
            database_path=':memory:',
            enable_scheduler=False,
            ingest_on_startup=False,
        )
    )
    calls = []

    async def fake_run_ingestion(session_factory, settings=None):
        calls.append((session_factory, settings))
        return IngestionResult(
            successful_sources=2,
            failed_sources=1,
            inserted_articles=4,
            updated_articles=2,
            duplicate_articles=1,
            errors=['broken: feed unavailable'],
        )

    monkeypatch.setattr('app.api.v1.ingestion.run_ingestion', fake_run_ingestion)

    with TestClient(app) as client:
        response = client.post('/api/v1/ingestion/refresh')

    assert response.status_code == 200
    body = response.json()
    assert body['successful_sources'] == 2
    assert body['failed_sources'] == 1
    assert body['inserted_articles'] == 4
    assert body['updated_articles'] == 2
    assert body['duplicate_articles'] == 1
    assert body['errors'] == ['broken: feed unavailable']
    assert body['fetched_at']
    assert len(calls) == 1
