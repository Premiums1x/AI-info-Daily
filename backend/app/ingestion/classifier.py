from collections.abc import Iterable


CATEGORY_NAMES = {
    "product": "产品",
    "research": "研究",
    "business": "商业",
    "open_source": "开源",
    "other": "其他",
}

_CATEGORY_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "open_source",
        ("开源", "开放权重", "开放模型", "open source", "github", "hugging face", "huggingface", "权重"),
    ),
    ("research", ("研究", "论文", "research", "benchmark", "基准", "arxiv", "评测")),
    ("business", ("融资", "收购", "商业", "芯片", "算力", "营收", "投资", "估值", "合作")),
    ("product", ("发布", "推出", "产品", "api", "模型", "工具", "上线", "launch", "release")),
)

_TAG_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("Agent", ("agent", "智能体")),
    ("开源模型", ("开源模型", "开放权重", "开放模型", "open source", "huggingface")),
    ("AI 产品", ("ai 产品", "ai product")),
    ("算力与芯片", ("算力", "芯片", "推理成本", "inference")),
)


def _haystack(title: str, summary: str) -> str:
    return f"{title} {summary}".casefold()


def classify_article(title: str, summary: str) -> str:
    text = _haystack(title, summary)
    for category, keywords in _CATEGORY_KEYWORDS:
        if any(keyword.casefold() in text for keyword in keywords):
            return category
    return "other"


def extract_tags(title: str, summary: str) -> list[str]:
    text = _haystack(title, summary)
    return [
        tag
        for tag, keywords in _TAG_KEYWORDS
        if any(keyword.casefold() in text for keyword in keywords)
    ]


def build_search_text(
    title: str,
    summary: str,
    source_name: str,
    tags: Iterable[str],
) -> str:
    return " ".join([title, summary, source_name, *tags]).strip()

