from fastapi import APIRouter
from app.api.v1.assistant import router as assistant_router

from app.api.v1.articles import router as articles_router
from app.api.v1.categories import router as categories_router
from app.api.v1.daily_draw import router as daily_draw_router
from app.api.v1.featured import router as featured_router
from app.api.v1.health import router as health_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.sources import router as sources_router
from app.api.v1.topics import router as topics_router


router = APIRouter(prefix="/api/v1")
router.include_router(assistant_router)
router.include_router(articles_router)
router.include_router(categories_router)
router.include_router(daily_draw_router)
router.include_router(featured_router)
router.include_router(health_router)
router.include_router(ingestion_router)
router.include_router(sources_router)
router.include_router(topics_router)
