from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.assistant.client import create_llm_client
from app.api.v1 import router as api_router
from app.core.config import Settings
from app.core.database import create_engine_for_settings, create_session_factory, init_db
from app.ingestion.pipeline import run_ingestion
from app.jobs.scheduler import create_scheduler


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    engine = create_engine_for_settings(settings)
    assistant_client = create_llm_client(settings)
    init_db(engine)
    session_factory = create_session_factory(engine)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        scheduler = None
        if settings.enable_scheduler:
            scheduler = create_scheduler(app, settings, session_factory)
            app.state.scheduler = scheduler
            scheduler.start()
        if settings.ingest_on_startup:
            app.state.last_ingest_result = await run_ingestion(
                session_factory,
                settings=settings,
            )
            app.state.last_ingest_at = datetime.now(timezone.utc).isoformat()
        try:
            yield
        finally:
            if scheduler is not None:
                scheduler.shutdown(wait=False)

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description="RSS-powered AI news aggregation API",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.assistant_request_times = {}
    app.state.assistant_client = assistant_client
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.scheduler = None
    app.state.last_ingest_at = None
    app.state.last_ingest_result = None
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["*"],
    )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException):
        if isinstance(exc.detail, dict):
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": "HTTP_ERROR", "message": str(exc.detail)},
        )

    app.include_router(api_router)
    return app


app = create_app()
