import httpx


class FeedFetcher:
    def __init__(self, timeout_seconds: float = 20.0):
        self.timeout_seconds = timeout_seconds

    async def fetch(self, feed_url: str) -> str:
        timeout = httpx.Timeout(self.timeout_seconds)
        headers = {"User-Agent": "AI-Daily/1.0 (+RSS aggregator)"}
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers=headers,
        ) as client:
            response = await client.get(feed_url)
            response.raise_for_status()
            return response.text

