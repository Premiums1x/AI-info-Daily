from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SourceDefinition:
    code: str
    name: str
    feed_url: str
    enabled: bool = True


GOOGLE_NEWS_AI_URL = (
    "https://news.google.com/rss/search?"
    "q=AI%20OR%20%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20OR%20%E5%A4%A7%E6%A8%A1%E5%9E%8B"
    "&hl=zh-CN&gl=CN&ceid=CN:zh-Hans"
)


SOURCE_DEFINITIONS = [
    SourceDefinition(
        code="google_news_ai",
        name="Google News · AI",
        feed_url=GOOGLE_NEWS_AI_URL,
    ),
    SourceDefinition(
        code="huggingface_blog",
        name="Hugging Face Blog",
        feed_url="https://huggingface.co/blog/feed.xml",
    ),
]

