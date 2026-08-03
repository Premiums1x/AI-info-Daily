import calendar
import html
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import feedparser


TRACKING_PARAMETER_NAMES = {
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "ref",
}


@dataclass(frozen=True, slots=True)
class ArticleCandidate:
    source_code: str
    source_name: str
    title: str
    summary: str
    original_url: str
    canonical_url: str
    published_at: datetime


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    extractor = _TextExtractor()
    extractor.feed(html.unescape(value))
    extractor.close()
    text = " ".join(extractor.parts)
    return re.sub(r"\s+", " ", text).strip()


def normalize_url(url: str) -> str:
    parts = urlsplit(url.strip())
    query = []
    for key, value in parse_qsl(parts.query, keep_blank_values=True):
        lower_key = key.lower()
        if lower_key.startswith("utm_") or lower_key in TRACKING_PARAMETER_NAMES:
            continue
        query.append((key, value))
    path = parts.path or "/"
    if path != "/":
        path = path.rstrip("/")
    return urlunsplit(
        (
            parts.scheme.lower(),
            parts.netloc.lower(),
            path,
            urlencode(query),
            "",
        )
    )


def _published_at(entry) -> datetime:
    parsed = (
        entry.get("published_parsed")
        or entry.get("updated_parsed")
        or entry.get("created_parsed")
    )
    if parsed:
        return datetime.fromtimestamp(calendar.timegm(parsed), tz=timezone.utc)

    raw = entry.get("published") or entry.get("updated") or entry.get("created")
    if raw:
        normalized = raw.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized).astimezone(timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def parse_feed(
    content: str,
    source_code: str,
    source_name: str,
    max_entries: int | None = None,
) -> list[ArticleCandidate]:
    parsed = feedparser.parse(content)
    candidates: list[ArticleCandidate] = []
    seen_urls: set[str] = set()
    entries = parsed.entries if max_entries is None else parsed.entries[:max_entries]

    for entry in entries:
        title = clean_text(entry.get("title"))
        original_url = (entry.get("link") or "").strip()
        if not title or not original_url:
            continue
        canonical_url = normalize_url(original_url)
        if canonical_url in seen_urls:
            continue
        seen_urls.add(canonical_url)
        summary = clean_text(
            entry.get("summary")
            or entry.get("description")
            or (entry.get("content") or [{}])[0].get("value")
        )
        candidates.append(
            ArticleCandidate(
                source_code=source_code,
                source_name=source_name,
                title=title,
                summary=summary,
                original_url=original_url,
                canonical_url=canonical_url,
                published_at=_published_at(entry),
            )
        )
    return candidates

