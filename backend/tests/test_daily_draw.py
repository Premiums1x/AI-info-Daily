from types import SimpleNamespace

from app.api.v1.daily_draw import select_daily_draw


def make_article(article_id: int):
    return SimpleNamespace(id=article_id)


def test_select_daily_draw_is_stable_for_the_same_day_and_returns_one_article():
    articles = [make_article(article_id) for article_id in range(1, 8)]

    first = select_daily_draw(articles, '2026-08-04')
    repeat = select_daily_draw(articles, '2026-08-04')

    assert first is repeat
    assert first in articles


def test_select_daily_draw_returns_none_when_there_are_no_recent_articles():
    assert select_daily_draw([], '2026-08-04') is None
