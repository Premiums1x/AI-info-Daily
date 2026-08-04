import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

from app.core.config import Settings
from app.ingestion.pipeline import IngestionResult
from app.jobs.scheduler import create_scheduler


def test_scheduled_ingestion_records_completion_time(monkeypatch):
    state = SimpleNamespace(last_ingest_at=None, last_ingest_result=None)
    app = SimpleNamespace(state=state)
    started_at = None

    async def fake_run_ingestion(session_factory, settings=None):
        nonlocal started_at
        started_at = datetime.now(timezone.utc)
        return IngestionResult(successful_sources=1)

    monkeypatch.setattr('app.jobs.scheduler.run_ingestion', fake_run_ingestion)
    scheduler = create_scheduler(
        app,
        Settings(ingest_interval_minutes=120),
        session_factory=object(),
    )

    try:
        asyncio.run(scheduler.get_job('rss-ingestion').func())
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)

    assert state.last_ingest_at is not None
    assert datetime.fromisoformat(state.last_ingest_at) >= started_at
