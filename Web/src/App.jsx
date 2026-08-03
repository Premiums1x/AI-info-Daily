import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchLatestArticles, normalizeArticle, refreshLatestSignals } from './api/newsApi.js';
import SourceAtlas from './components/SourceAtlas.jsx';
import { articles, topics } from './data/articles.js';
import { fanPose, filterArticles, getStickyNavState } from './appModel.js';
import { filterArticlesBySource, summarizeSources } from './sourceModel.js';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function ReadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 6.5h14M5 12h14M5 17.5h9" />
      <path d="m17 15 3 3-3 3" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function TopDock({
  dockRef,
  searchButtonRef,
  searchInputRef,
  isSearchOpen,
  isScrolled,
  sourceCount,
  query,
  onToggleSearch,
  onQueryChange,
  onRead,
  onProfile,
}) {
  return (
    <header ref={dockRef} className={`top-dock page-width glass-surface${isScrolled ? ' is-scrolled' : ''}`} aria-label="AI Daily 顶部导航">
      <a className="brand" href="#top" aria-label="AI Daily 首页">
        <BrandMark />
        <span className="brand-copy">
          <strong>AI Daily</strong>
          <small>今日 AI 手牌</small>
        </span>
      </a>

      <div className="dock-middle">
        <span className="dock-date">8月 3日 · 周一</span>
        <span className="dock-divider" aria-hidden="true" />
        <span className="dock-status"><i /> {sourceCount} 个信源正在工作</span>
      </div>

      <div className="dock-actions">
        <button
          ref={searchButtonRef}
          className="dock-action"
          type="button"
          aria-expanded={isSearchOpen}
          aria-controls="search-panel"
          onClick={onToggleSearch}
        >
          <SearchIcon />
          <span>搜索</span>
        </button>
        <button className="dock-action" type="button" onClick={onRead}>
          <ReadIcon />
          <span>开始读</span>
        </button>
        <button className="profile-chip" type="button" aria-label="打开个人设置" onClick={onProfile}>L</button>
      </div>

      <div
        className={`search-panel${isSearchOpen ? ' is-open' : ''}${isScrolled ? ' search-panel--scrolled' : ''}`}
        id="search-panel"
        aria-hidden={!isSearchOpen}
      >
        <label htmlFor="search-input">搜索今天的信号</label>
        <div className="search-input-wrap">
          <SearchIcon />
          <input
            ref={searchInputRef}
            id="search-input"
            type="search"
            placeholder="试试 Agent、开源模型、算力…"
            autoComplete="off"
            tabIndex={isSearchOpen ? 0 : -1}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <kbd>ESC</kbd>
        </div>
      </div>
    </header>
  );
}

function StickyDock({ isVisible, isSearchOpen, sourceCount, onToggleSearch, onScrollTop }) {
  const tabIndex = isVisible ? 0 : -1;

  return (
    <div className={`sticky-dock${isVisible ? ' is-visible' : ''}`} aria-hidden={!isVisible}>
      <div className="sticky-dock-left glass-surface">
        <strong>AI Daily</strong>
        <span className="sticky-dock-date">8月 3日</span>
        <span className="sticky-dock-week">周一</span>
        <span className="sticky-dock-source"><i />{sourceCount} 个信源正在工作</span>
      </div>
      <div className="sticky-dock-actions">
        <button
          className="sticky-dock-action glass-surface"
          type="button"
          aria-label={isSearchOpen ? '关闭搜索' : '搜索'}
          aria-expanded={isSearchOpen}
          tabIndex={tabIndex}
          onClick={onToggleSearch}
        >
          <SearchIcon />
        </button>
        <button
          className="sticky-dock-action glass-surface"
          type="button"
          aria-label="回到顶部"
          tabIndex={tabIndex}
          onClick={onScrollTop}
        >
          <ArrowUpIcon />
        </button>
      </div>
    </div>
  );
}

function Hero({ isDeckFlipped, articleCount, onFlip, onRead, onDeal }) {
  return (
    <section className="intro page-width" aria-labelledby="intro-title">
      <div className="intro-copy">
        <p className="intro-meta">
          <span className="meta-mark" aria-hidden="true" />
          <span>8月 3日 · 周一</span>
          <span className="meta-divider" aria-hidden="true" />
          <span>{articleCount} 张精选信号</span>
        </p>
        <h1 id="intro-title">今天的 AI，<em>已经发到手上。</em></h1>
        <p className="intro-lede">不追逐热闹，只把过去 24 小时里值得继续追踪的变化，整理成一手可以慢慢翻的牌。</p>
        <div className="intro-actions">
          <button className="primary-action" type="button" onClick={onRead}>先看最重要的一张 <span aria-hidden="true">↘</span></button>
          <button className="secondary-action" type="button" onClick={onDeal}>重新发牌 <span aria-hidden="true">↻</span></button>
        </div>
        <p className="intro-footnote"><strong>8 分钟</strong>读完今日重点 <span aria-hidden="true">·</span> 每张牌都能打开原文</p>
      </div>

      <div className="deal-stage" aria-label="翻开今日信号牌">
        <div className="deal-table" aria-hidden="true" />
        <div className="deck-card deck-card--back" aria-hidden="true"><span>AI</span><i /></div>
        <div className="deck-card deck-card--middle" aria-hidden="true"><span>DAILY</span><i /></div>
        <button
          className={`deck-card deck-card--front deck-flip${isDeckFlipped ? ' is-flipped' : ''}`}
          type="button"
          aria-expanded={isDeckFlipped}
          aria-label={isDeckFlipped ? '合上今日信号牌：先做计划，再执行长任务' : '翻开今日信号牌'}
          onClick={onFlip}
        >
          <span className="deck-face deck-face--front" aria-hidden="true">
            <span className="deck-card-top"><span>03</span><span>MON</span></span>
            <span className="deck-card-symbol">✦</span>
            <strong>今日<br />手牌</strong>
            <span className="deck-card-bottom"><span>AI DAILY</span><span>2026</span></span>
          </span>
          <span className="deck-face deck-face--back">
            <span className="deck-reveal-top"><span>A</span><span>AGENT</span></span>
            <span className="deck-reveal-symbol">✦</span>
            <strong>先做计划，再执行长任务</strong>
            <span className="deck-reveal-note">点击卡片，阅读完整简报</span>
          </span>
        </button>
        <span className="deal-stage-caption">悬停或点击，翻一张看看</span>
      </div>
    </section>
  );
}

function TopicStrip({ currentTopic, topicCounts, resultCount, onSelect }) {
  return (
    <section className="topic-strip page-width" aria-label="按主题浏览">
      <span className="topic-title">按主题看牌</span>
      <div className="topic-dock" role="tablist" aria-label="资讯主题">
        {topics.map((topic) => (
          <button
            key={topic}
            className={`topic-button${currentTopic === topic ? ' is-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={currentTopic === topic}
            onClick={() => onSelect(topic)}
          >
            <span>{topic}</span>
            <small>{String(topicCounts[topic]).padStart(2, '0')}</small>
          </button>
        ))}
      </div>
      <span className="topic-count" aria-live="polite">{resultCount} 张牌</span>
    </section>
  );
}

function CardHand({ visibleArticles, onOpen, firstCardRef }) {
  const [poppingId, setPoppingId] = useState(null);
  const [isEntering, setIsEntering] = useState(true);
  const signature = visibleArticles.map((article) => article.id).join('|');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsEntering(false));
    return () => window.cancelAnimationFrame(frame);
  }, [signature]);

  const syncPopState = (element, id) => {
    if (element.matches(':hover') || element.matches(':focus-within')) {
      setPoppingId(id);
    } else {
      setPoppingId((current) => (current === id ? null : current));
    }
  };

  return (
    <div className={`card-hand${poppingId ? ' has-pop' : ''}`} data-count={visibleArticles.length} aria-live="polite" aria-atomic="false">
      {visibleArticles.map((article, index) => {
        const pose = fanPose(visibleArticles.length, index);
        const cardClass = [
          'news-card',
          `tone-${article.accent}`,
          isEntering ? 'is-entering' : '',
          poppingId === article.id ? 'is-popping' : '',
        ].filter(Boolean).join(' ');

        return (
          <article
            key={article.id}
            className={cardClass}
            data-id={article.id}
            style={{
              '--angle': `${pose.angle}deg`,
              '--lift': `${pose.lift}px`,
              '--deal-delay': `${index * 42}ms`,
              '--stack': index + 1,
            }}
            onPointerEnter={() => setPoppingId(article.id)}
            onPointerLeave={(event) => {
              const element = event.currentTarget;
              window.requestAnimationFrame(() => syncPopState(element, article.id));
            }}
            onFocus={() => setPoppingId(article.id)}
            onBlur={(event) => {
              const element = event.currentTarget;
              window.requestAnimationFrame(() => syncPopState(element, article.id));
            }}
          >
            <button
              ref={index === 0 ? firstCardRef : undefined}
              className="card-surface"
              type="button"
              aria-label={`打开《${article.title}》`}
              onClick={(event) => onOpen(article, event)}
            >
              <span className="card-content">
                <span className="card-topline"><span className="card-source"><i aria-hidden="true" />{article.source}</span><span className="card-time">{article.time}</span></span>
                <span className="card-rankline"><span className="card-rank">{article.rank}</span><span className="card-type">{article.type}</span></span>
                <span className="card-title">{article.title}</span>
                <span className="card-summary">{article.summary}</span>
                <span className="card-bottom"><span className="card-tags">{article.tags.map((tag) => <span className="card-tag" key={tag}>{tag}</span>)}</span><span className="card-open-label">打开简报 <span aria-hidden="true">↗</span></span></span>
              </span>
            </button>
          </article>
        );
      })}
    </div>
  );
}

function FocusSheet({ article, sheetRef, closeRef, onClose }) {
  if (!article) return null;

  return (
    <section ref={sheetRef} className="focus-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-card">
        <div className="sheet-topline">
          <span className="sheet-index">第 <strong>{article.rank}</strong> 张牌 · {article.type}</span>
          <button ref={closeRef} className="sheet-close" type="button" aria-label="关闭简报" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="sheet-meta"><span className="sheet-dot" data-accent={article.accent} /><span>{article.source}</span><span aria-hidden="true">·</span><span>{article.time}</span><span className="sheet-topic">{article.topic}</span></div>
        <h2 id="sheet-title">{article.title}</h2>
        <p className="sheet-summary">{article.summary}</p>
        <div className="sheet-detail">{article.detail}</div>
        <div className="sheet-footer">
          <div className="sheet-tags">{article.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <a className="source-link" href={article.url} target="_blank" rel="noreferrer">打开原文 <span aria-hidden="true">↗</span></a>
        </div>
      </article>
    </section>
  );
}

function App() {
  const [currentTopic, setCurrentTopic] = useState('全部');
  const [currentQuery, setCurrentQuery] = useState('');
  const [dealRound, setDealRound] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDeckFlipped, setIsDeckFlipped] = useState(false);
  const [activeArticle, setActiveArticle] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loadedArticles, setLoadedArticles] = useState(articles);
  const [activeSource, setActiveSource] = useState('全部');
  const [refreshStatus, setRefreshStatus] = useState('idle');
  const [refreshMessage, setRefreshMessage] = useState('');

  const dockRef = useRef(null);
  const searchButtonRef = useRef(null);
  const searchInputRef = useRef(null);
  const firstCardRef = useRef(null);
  const sheetRef = useRef(null);
  const sheetCloseRef = useRef(null);
  const lastTriggerRef = useRef(null);

  const sourceSummaries = useMemo(
    () => summarizeSources(loadedArticles),
    [loadedArticles],
  );

  const filteredArticles = useMemo(
    () => filterArticles(loadedArticles, { topic: currentTopic, query: currentQuery, shift: dealRound }),
    [loadedArticles, currentTopic, currentQuery, dealRound],
  );

  const visibleArticles = useMemo(
    () => filterArticlesBySource(filteredArticles, activeSource),
    [filteredArticles, activeSource],
  );

  const topicCounts = useMemo(
    () => Object.fromEntries(topics.map((topic) => [topic, loadedArticles.filter((article) => topic === '全部' || article.topic === topic).length])),
    [loadedArticles],
  );

  const selectedSource = sourceSummaries.find((source) => source.id === activeSource);
  const atlasStatus = refreshStatus === 'loading'
    ? '正在同步信源…'
    : refreshMessage || (selectedSource ? `${selectedSource.name} · ${selectedSource.articleCount} 张牌` : '悬停节点查看来源，点击后筛选牌组');

  useEffect(() => {
    const updateStickyState = () => {
      const dock = dockRef.current;
      if (!dock) return;
      const dockBottom = dock.getBoundingClientRect().bottom + window.scrollY;
      const nextState = getStickyNavState(window.scrollY, dockBottom);
      setIsScrolled((current) => (current === nextState ? current : nextState));
    };

    let frame = 0;
    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateStickyState();
      });
    };

    updateStickyState();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateStickyState);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateStickyState);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!activeArticle) return undefined;

    document.body.classList.add('is-sheet-open');
    const frame = window.requestAnimationFrame(() => sheetCloseRef.current?.focus());

    const handleSheetKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setActiveArticle(null);
        return;
      }

      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll('button, a[href]')).filter((element) => !element.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleSheetKeyDown);
    return () => {
      document.body.classList.remove('is-sheet-open');
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleSheetKeyDown);
      window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
    };
  }, [activeArticle]);

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
        window.requestAnimationFrame(() => searchInputRef.current?.focus({ preventScroll: true }));
      }

      if (event.key === 'Escape' && isSearchOpen && !activeArticle) {
        setIsSearchOpen(false);
        searchButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeArticle, isSearchOpen]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const openSearch = () => {
    setIsSearchOpen(true);
    window.requestAnimationFrame(() => window.setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 50));
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    if (document.activeElement === searchInputRef.current) {
      const returnTarget = isScrolled
        ? document.querySelector('.sticky-dock-action[aria-label="关闭搜索"]')
        : searchButtonRef.current;
      returnTarget?.focus({ preventScroll: true });
    }
  };

  const toggleSearch = () => {
    if (isSearchOpen) closeSearch();
    else openSearch();
  };

  const showToast = (message) => setToastMessage(message);

  const openBrief = (article, event) => {
    lastTriggerRef.current = event.currentTarget;
    setActiveArticle(article);
  };

  const scrollToFirstCard = () => {
    const section = document.querySelector('.hand-section');
    if (section) {
      const top = section.getBoundingClientRect().top + window.scrollY;
      const offset = 0; // 调整这个值以改变滚动后头部留出的空间
      window.scrollTo({
        top: top - offset,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }
    window.setTimeout(() => firstCardRef.current?.focus({ preventScroll: true }), 280);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const handleDeal = () => {
    setDealRound((round) => round + 1);
    showToast('已重新发牌：今天的重点换了一个顺序');
  };

  const handleSourceSelect = (source) => {
    setActiveSource(source);
    if (source === '全部') {
      showToast('已显示全部信源');
      return;
    }
    const selected = sourceSummaries.find((item) => item.id === source);
    showToast(`已筛选 ${selected?.name || source} 的信号`);
    window.requestAnimationFrame(() => {
      document.querySelector('#card-hand')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  const handleRefresh = async () => {
    if (refreshStatus === 'loading') return;
    setRefreshStatus('loading');
    setRefreshMessage('正在从已接入信源抓取最新内容…');

    try {
      const result = await refreshLatestSignals();
      const remoteArticles = await fetchLatestArticles();
      const nextArticles = remoteArticles.map((article, index) => normalizeArticle(article, index));
      if (nextArticles.length) {
        setLoadedArticles(nextArticles);
        setDealRound(0);
        setActiveSource('全部');
      }
      const message = `已更新 · 新增 ${result.inserted_articles || 0} 条${result.failed_sources ? ` · ${result.failed_sources} 个信源失败` : ''}`;
      setRefreshStatus('success');
      setRefreshMessage(message);
      showToast(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : '抓取失败，请稍后重试';
      setRefreshStatus('error');
      setRefreshMessage(message);
      showToast(message);
    } finally {
      window.setTimeout(() => setRefreshStatus('idle'), 3200);
    }
  };

  const refreshButtonLabel = refreshStatus === 'loading'
    ? '正在同步信源…'
    : refreshStatus === 'error'
      ? '重试抓取'
      : refreshStatus === 'success'
        ? '已更新最新信号'
        : '抓取最新信号';

  return (
    <>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <div className="ambient ambient--one" aria-hidden="true" />
      <div className="ambient ambient--two" aria-hidden="true" />

      <TopDock
        dockRef={dockRef}
        searchButtonRef={searchButtonRef}
        searchInputRef={searchInputRef}
        isSearchOpen={isSearchOpen}
        isScrolled={isScrolled}
        sourceCount={sourceSummaries.length}
        query={currentQuery}
        onToggleSearch={toggleSearch}
        onQueryChange={setCurrentQuery}
        onRead={scrollToFirstCard}
        onProfile={() => showToast('个人偏好将在后续版本开放')}
      />
      <StickyDock isVisible={isScrolled} isSearchOpen={isSearchOpen} sourceCount={sourceSummaries.length} onToggleSearch={toggleSearch} onScrollTop={scrollToTop} />

      <main id="main-content">
        <Hero
          articleCount={loadedArticles.length}
          isDeckFlipped={isDeckFlipped}
          onFlip={() => {
            const next = !isDeckFlipped;
            setIsDeckFlipped(next);
            if (next) showToast('已翻开 A 号牌：先做计划，再执行长任务');
          }}
          onRead={scrollToFirstCard}
          onDeal={handleDeal}
        />

        <TopicStrip
          currentTopic={currentTopic}
          topicCounts={topicCounts}
          resultCount={visibleArticles.length}
          onSelect={setCurrentTopic}
        />

        <section className="hand-section page-width" aria-labelledby="hand-title">
          <div className="hand-header">
            <h2 id="hand-title">今天发到手上的牌</h2>
            <div className="hand-status"><span className="status-dot" aria-hidden="true" /><span>{activeSource === '全部' ? '按重要度排好' : `只看 ${activeSource}`}</span></div>
          </div>
          <p className="hand-note">每一张都不是一条资讯，而是一个正在发生的方向。悬停时它会离开牌堆，点击即可读完整简报。</p>

          {visibleArticles.length ? (
            <CardHand
              key={visibleArticles.map((article) => article.id).join('|')}
              visibleArticles={visibleArticles}
              onOpen={openBrief}
              firstCardRef={firstCardRef}
            />
          ) : (
            <div className="canvas-empty">
              <span className="empty-mark" aria-hidden="true">◎</span>
              <h3>这一组牌还没有信号</h3>
              <p>换一个主题，或者清除搜索词，继续探索今天的 AI。</p>
            </div>
          )}
        </section>

        <section className="afterword page-width" aria-label="日报结尾">
          <div className="afterword-copy">
            <span className="afterword-mark" aria-hidden="true" />
            <p>读完这手牌，不必记住所有事。</p>
            <strong>只要知道下一件值得继续追踪的事，已经足够。</strong>
          </div>
          <SourceAtlas
            sources={sourceSummaries}
            activeSource={activeSource}
            articleCount={loadedArticles.length}
            isRefreshing={refreshStatus === 'loading'}
            statusMessage={atlasStatus}
            onSelect={handleSourceSelect}
          />
          <button
            className={`closing-action${refreshStatus === 'loading' ? ' is-syncing' : ''}`}
            type="button"
            disabled={refreshStatus === 'loading'}
            onClick={handleRefresh}
          >
            {refreshButtonLabel} <span aria-hidden="true">↻</span>
          </button>
        </section>
      </main>

      <FocusSheet
        article={activeArticle}
        sheetRef={sheetRef}
        closeRef={sheetCloseRef}
        onClose={() => setActiveArticle(null)}
      />
      <div className={`toast${toastMessage ? ' is-visible' : ''}`} role="status" aria-live="polite">{toastMessage}</div>
    </>
  );
}

export default App;




