from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.ingestion.pipeline import run_ingestion


def create_scheduler(app, settings, session_factory) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="UTC")

    async def scheduled_ingestion():
        result = await run_ingestion(
            session_factory,
            settings=settings,
        )
        app.state.last_ingest_result = result
        app.state.last_ingest_at = datetime.now(timezone.utc).isoformat()

    scheduler.add_job(
        scheduled_ingestion,
        trigger=IntervalTrigger(minutes=settings.ingest_interval_minutes, timezone="UTC"),
        id="rss-ingestion",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=300,
    )
    return scheduler

