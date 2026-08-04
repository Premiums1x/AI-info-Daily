from datetime import datetime, timezone

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
    ingestion_started_at = None

    async def fake_run_ingestion(session_factory, settings=None):
        nonlocal ingestion_started_at
        ingestion_started_at = datetime.now(timezone.utc)
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

    request_started_at = datetime.now(timezone.utc)
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
    fetched_at = datetime.fromisoformat(body['fetched_at'])
    assert fetched_at >= ingestion_started_at
    assert fetched_at >= request_started_at
    assert app.state.last_ingest_at == body['fetched_at']
    assert len(calls) == 1


def test_startup_ingestion_records_completion_time(monkeypatch):
    app = create_app(
        Settings(
            database_path=':memory:',
            enable_scheduler=False,
            ingest_on_startup=True,
        )
    )
    ingestion_started_at = None

    async def fake_run_ingestion(session_factory, settings=None):
        nonlocal ingestion_started_at
        ingestion_started_at = datetime.now(timezone.utc)
        return IngestionResult(successful_sources=1)

    monkeypatch.setattr('app.main.run_ingestion', fake_run_ingestion)

    with TestClient(app):
        assert app.state.last_ingest_at is not None
        completed_at = datetime.fromisoformat(app.state.last_ingest_at)

    assert completed_at >= ingestion_started_at
