import asyncio
import json
from typing import Any

import httpx

from app.assistant.intent import AssistantIntent


INTENT_SYSTEM_PROMPT = """
你是 AI Daily 的资讯检索意图解析器。
只输出 JSON，不要输出 Markdown 或解释文字。
JSON 字段必须是：topics（主题字符串数组）、keywords（关键词字符串数组）、
category（product/research/business/open_source/other 或 null）、
since_hours（1 到 720 的整数）、limit（1 到 20 的整数）。
用户没有明确时间范围时使用系统提供的默认值；不要虚构文章标题。
""".strip()


class AssistantClientError(RuntimeError):
    """Raised when the remote LLM cannot return a valid assistant intent."""


class OpenAICompatibleLLMClient:
    def __init__(
        self,
        api_url: str,
        api_key: str,
        model: str,
        timeout_seconds: float = 30.0,
        max_tokens: int = 300,
        max_concurrency: int = 1,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.api_url = api_url
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.max_tokens = max_tokens
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self.transport = transport

    async def extract_intent(
        self,
        message: str,
        *,
        default_since_hours: int,
        default_limit: int,
    ) -> AssistantIntent:
        payload = {
            "model": self.model,
            "temperature": 0,
            "max_tokens": self.max_tokens,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": INTENT_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"默认时间范围：{default_since_hours} 小时；"
                        f"默认返回数量：{default_limit}。\n用户请求：{message}"
                    ),
                },
            ],
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        await self._semaphore.acquire()
        try:
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds,
                transport=self.transport,
            ) as client:
                response = await client.post(self.api_url, headers=headers, json=payload)
                response.raise_for_status()
                body = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise AssistantClientError(f"LLM request failed: {exc}") from exc
        finally:
            self._semaphore.release()

        try:
            content: Any = body["choices"][0]["message"]["content"]
            intent_payload = content if isinstance(content, dict) else json.loads(content)
            return AssistantIntent.from_payload(
                intent_payload,
                default_since_hours=default_since_hours,
                default_limit=default_limit,
            )
        except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise AssistantClientError("LLM returned an invalid intent") from exc


def create_llm_client(settings) -> OpenAICompatibleLLMClient | None:
    if not settings.assistant_enabled:
        return None
    if not settings.llm_api_url or not settings.llm_api_key or not settings.llm_model:
        return None
    return OpenAICompatibleLLMClient(
        api_url=settings.llm_api_url,
        max_tokens=settings.llm_max_tokens,
        max_concurrency=settings.assistant_max_concurrency,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        timeout_seconds=settings.llm_timeout_seconds,
    )

