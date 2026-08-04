import time

from fastapi import APIRouter, HTTPException, Request

from app.assistant.client import AssistantClientError
from app.assistant.service import build_reply, search_articles_for_intent
from app.schemas.assistant import AssistantQueryRequest, AssistantQueryResponse
from app.api.v1.articles import article_to_schema


router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/query", response_model=AssistantQueryResponse)
async def query_assistant(payload: AssistantQueryRequest, request: Request):
    settings = request.app.state.settings
    client = getattr(request.app.state, "assistant_client", None)
    if not settings.assistant_enabled or client is None:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "ASSISTANT_NOT_CONFIGURED",
                "message": "智能推荐尚未配置 LLM API",
            },
        )

    client_id = request.client.host if request.client else "unknown"
    now = time.monotonic()
    last_request_at = request.app.state.assistant_request_times.get(client_id)
    if (
        last_request_at is not None
        and now - last_request_at < settings.assistant_min_interval_seconds
    ):
        raise HTTPException(
            status_code=429,
            detail={
                "code": "ASSISTANT_RATE_LIMITED",
                "message": "请求过于频繁，请稍后再试",
            },
        )
    request.app.state.assistant_request_times[client_id] = now
    try:
        intent = await client.extract_intent(
            payload.message,
            default_since_hours=settings.assistant_default_since_hours,
            default_limit=settings.assistant_max_results,
        )
    except AssistantClientError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "ASSISTANT_PROVIDER_ERROR",
                "message": str(exc),
            },
        ) from exc

    with request.app.state.session_factory() as session:
        articles = search_articles_for_intent(session, intent)
        items = [article_to_schema(article) for article in articles]

    return AssistantQueryResponse(
        reply=build_reply(payload.message, len(items)),
        items=items,
    )

