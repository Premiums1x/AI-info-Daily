import { useEffect, useState } from 'react';

import { getArchivePageNavigation, getArchivePageState } from '../appModel.js';

const ARCHIVE_PAGE_SIZE = 12;

export default function SignalArchive({ articles, onOpen, onClose }) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [articles]);

  const archivePage = getArchivePageState(articles, page, ARCHIVE_PAGE_SIZE);
  const firstArticleNumber = articles.length ? (archivePage.page - 1) * archivePage.pageSize + 1 : 0;
  const lastArticleNumber = Math.min(articles.length, archivePage.page * archivePage.pageSize);

  const changePage = (nextPage) => {
    const navigation = getArchivePageNavigation(nextPage, archivePage.pageCount);
    setPage(navigation.page);
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    window.requestAnimationFrame(() => {
      document.querySelector(navigation.target)?.scrollIntoView({
        behavior,
        block: 'start',
      });
    });
  };

  return (
    <section id="signal-archive" className="signal-archive" aria-labelledby="archive-title">
      <div className="archive-heading">
        <div>
          <p className="archive-kicker">THE FULL DECK</p>
          <h3 id="archive-title">今日牌库</h3>
        </div>
        <div className="archive-heading-meta">
          <span className="archive-count">{articles.length} 条全部信号</span>
          <button className="archive-close" type="button" onClick={onClose}>
            收起牌库 <span aria-hidden="true">↖</span>
          </button>
        </div>
      </div>

      <div className="archive-grid" aria-live="polite">
        {archivePage.pageArticles.map((article) => (
          <article key={article.id} className={`archive-card tone-${article.accent}`}>
            <button
              className="archive-card-surface"
              type="button"
              aria-label={`打开《${article.title}》`}
              onClick={(event) => onOpen(article, event)}
            >
              <span className="archive-card-index">{article.rank}</span>
              <span className="archive-card-content">
                <span className="archive-card-meta">
                  <span>{article.source}</span>
                  <span>{article.time}</span>
                </span>
                <span className="archive-card-type">{article.type}</span>
                <span className="archive-card-title">{article.title}</span>
                <span className="archive-card-summary">{article.summary}</span>
                <span className="archive-card-footer">
                  <span className="archive-card-tags">
                    {(article.tags || []).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
                  </span>
                  <span className="archive-card-open">打开简报 <span aria-hidden="true">↗</span></span>
                </span>
              </span>
            </button>
          </article>
        ))}
      </div>

      {archivePage.pageCount > 1 && (
        <nav className="archive-pagination" aria-label="牌库分页">
          <span className="archive-pagination-status">
            第 {archivePage.page} / {archivePage.pageCount} 页 · {firstArticleNumber}–{lastArticleNumber} 条
          </span>
          <div className="archive-page-controls">
            <button
              className="archive-page-button"
              type="button"
              disabled={archivePage.page === 1}
              onClick={() => changePage(archivePage.page - 1)}
            >
              上一页
            </button>
            <button
              className="archive-page-button archive-page-button--next"
              type="button"
              disabled={archivePage.page === archivePage.pageCount}
              onClick={() => changePage(archivePage.page + 1)}
            >
              下一页
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}
