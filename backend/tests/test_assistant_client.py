import json

import httpx
import pytest

from app.assistant.client import OpenAICompatibleLLMClient, create_llm_client
from app.core.config import Settings


@pytest.mark.asyncio
async def test_client_extracts_and_normalizes_intent_from_json_response():
    requests = []

    def handler(request: httpx.Request):
        requests.append(request)
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "topics": ["Agent", ""],
                                    "keywords": ["工具调用"],
                                    "category": "product",
                                    "since_hours": 9999,
                                    "limit": 50,
                                },
                                ensure_ascii=False,
                            )
                        }
                    }
                ]
            },
        )

    client = OpenAICompatibleLLMClient(
        api_url="https://llm.example.test/v1/chat/completions",
        api_key="test-key",
        model="test-model",
        transport=httpx.MockTransport(handler),
    )

    intent = await client.extract_intent(
        "推荐 Agent 工具调用资讯",
        default_since_hours=168,
        default_limit=5,
    )

    assert intent.topics == ["Agent"]
    assert intent.keywords == ["工具调用"]
    assert intent.category == "product"
    assert intent.since_hours == 720
    assert intent.limit == 20
    assert requests[0].headers["authorization"] == "Bearer test-key"
    body = json.loads(requests[0].content)
    assert body["model"] == "test-model"
    assert body["max_tokens"] == 300
    assert body["response_format"] == {"type": "json_object"}


def test_create_llm_client_is_disabled_when_configuration_is_incomplete():
    settings = Settings(
        assistant_enabled=True,
        llm_api_url="https://llm.example.test/v1/chat/completions",
        llm_model="test-model",
        llm_api_key="",
    )

    assert create_llm_client(settings) is None

