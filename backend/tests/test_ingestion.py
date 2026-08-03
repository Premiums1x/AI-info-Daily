from datetime import datetime, timezone

import pytest

from app.ingestion.classifier import classify_article, extract_tags
from app.ingestion.parser import clean_text, normalize_url, parse_feed


RSS_XML = """
<rss version="2.0">
  <channel>
    <title>AI Daily Test Feed</title>
    <item>
      <title>OpenAI 发布新的 Agent 工具</title>
      <link>https://example.com/news?id=1&amp;utm_source=rss</link>
      <description><![CDATA[<p>新的 <strong>Agent</strong> 工作流工具。</p>]]></description>
      <pubDate>Mon, 03 Aug 2026 09:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
"""

ATOM_XML = """
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Test Feed</title>
  <entry>
    <title>开源模型发布新版本</title>
    <link href="https://example.com/open-source" />
    <summary>一个更轻量的开放权重模型。</summary>
    <updated>2026-08-03T10:00:00Z</updated>
  </entry>
</feed>
"""


def test_normalize_url_removes_tracking_parameters_and_fragment():
    result = normalize_url(
        "HTTPS://Example.com/article/?utm_source=rss&gclid=123&id=7#comments"
    )

    assert result == "https://example.com/article?id=7"


def test_clean_text_strips_html_and_collapses_whitespace():
    assert clean_text("  <p>Hello&nbsp; <b>AI</b></p>\n") == "Hello AI"


def test_parse_rss_entry_returns_normalized_candidate():
    candidates = parse_feed(RSS_XML, source_code="test-rss", source_name="测试源")

    assert len(candidates) == 1
    candidate = candidates[0]
    assert candidate.title == "OpenAI 发布新的 Agent 工具"
    assert candidate.summary == "新的 Agent 工作流工具。"
    assert candidate.original_url == "https://example.com/news?id=1&utm_source=rss"
    assert candidate.canonical_url == "https://example.com/news?id=1"
    assert candidate.published_at == datetime(2026, 8, 3, 9, tzinfo=timezone.utc)


def test_parse_atom_entry_uses_updated_time():
    candidates = parse_feed(ATOM_XML, source_code="test-atom", source_name="Atom")

    assert len(candidates) == 1
    assert candidates[0].title == "开源模型发布新版本"
    assert candidates[0].published_at == datetime(2026, 8, 3, 10, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("OpenAI 发布 API 产品", "product"),
        ("新的 benchmark 研究论文", "research"),
        ("芯片公司完成融资并扩大算力", "business"),
        ("GitHub 开源模型权重发布", "open_source"),
        ("今天的 AI 行业动态", "other"),
    ],
)
def test_classify_article_covers_all_categories(text, expected):
    assert classify_article(text, "") == expected


def test_extract_tags_returns_known_topics_without_duplicates():
    tags = extract_tags("Agent 工作流与开放权重模型降低推理成本", "")

    assert tags == ["Agent", "开源模型", "算力与芯片"]

