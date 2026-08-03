from fastapi import APIRouter

from app.api.v1.articles import router as articles_router
from app.api.v1.categories import router as categories_router
from app.api.v1.featured import router as featured_router
from app.api.v1.health import router as health_router
from app.api.v1.ingestion import router as ingestion_router


router = APIRouter(prefix="/api/v1")
router.include_router(articles_router)
router.include_router(categories_router)
router.include_router(featured_router)
router.include_router(health_router)
router.include_router(ingestion_router)

