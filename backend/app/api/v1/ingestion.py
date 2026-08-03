from datetime import datetime, timezone

from fastapi import APIRouter, Request

from app.ingestion.pipeline import run_ingestion


router = APIRouter(prefix='/ingestion', tags=['ingestion'])


@router.post('/refresh')
async def refresh(request: Request):
    fetched_at = datetime.now(timezone.utc).isoformat()
    result = await run_ingestion(
        request.app.state.session_factory,
        settings=request.app.state.settings,
    )
    request.app.state.last_ingest_at = fetched_at
    request.app.state.last_ingest_result = result
    return {
        'fetched_at': fetched_at,
        **result.to_dict(),
    }
