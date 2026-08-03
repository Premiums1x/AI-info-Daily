from fastapi import APIRouter, Request
from sqlalchemy import func, select, text

from app.models.source import Source
from app.schemas.health import HealthResponse


router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthResponse)
def health(request: Request):
    scheduler = getattr(request.app.state, "scheduler", None)
    last_result = getattr(request.app.state, "last_ingest_result", None)
    scheduler_data = {
        "enabled": scheduler is not None,
        "last_run_at": getattr(request.app.state, "last_ingest_at", None),
        "next_run_at": None,
        "last_status": "never",
    }
    if last_result is not None:
        scheduler_data["last_status"] = "degraded" if last_result.failed_sources else "ok"
    if scheduler is not None:
        job = scheduler.get_job("rss-ingestion")
        if job and job.next_run_time:
            scheduler_data["next_run_at"] = job.next_run_time.isoformat()

    try:
        with request.app.state.session_factory() as session:
            session.execute(text("SELECT 1"))
            total_sources = session.scalar(select(func.count(Source.code))) or 0
            failed_sources = session.scalar(
                select(func.count(Source.code)).where(Source.last_error.is_not(None))
            ) or 0
        database_status = "ok"
    except Exception:
        total_sources = 0
        failed_sources = 0
        database_status = "error"

    status = "ok" if database_status == "ok" and failed_sources == 0 else "degraded"
    return HealthResponse(
        status=status,
        database=database_status,
        scheduler=scheduler_data,
        sources={
            "total": total_sources,
            "healthy": max(total_sources - failed_sources, 0),
            "failed": failed_sources,
        },
    )

