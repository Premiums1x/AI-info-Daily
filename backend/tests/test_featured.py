from types import SimpleNamespace

from app.api.v1.featured import select_daily_hand


def make_article(article_id: int, source_code: str, category_code: str):
    return SimpleNamespace(
        id=article_id,
        source_code=source_code,
        category_code=category_code,
    )


def test_select_daily_hand_spreads_sources_before_filling_by_recency():
    articles = [
        make_article(1, "source-a", "product"),
        make_article(2, "source-a", "research"),
        make_article(3, "source-b", "business"),
        make_article(4, "source-c", "other"),
        make_article(5, "source-b", "open_source"),
    ]

    assert [article.id for article in select_daily_hand(articles, 3)] == [1, 3, 4]
    assert [article.id for article in select_daily_hand(articles, 5)] == [1, 3, 4, 2, 5]
