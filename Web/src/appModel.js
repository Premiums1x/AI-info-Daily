const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function formatCurrentDate(date = new Date()) {
  return `${date.getMonth() + 1}月 ${date.getDate()}日 · ${WEEKDAYS[date.getDay()]}`;
}

export function formatLastFetchedAt(value) {
  if (!value) return '等待首次抓取';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '等待首次抓取';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${date.getMonth() + 1}月${date.getDate()}日 ${hours}:${minutes}`;
}
export function orderedArticles(articles, shift = 0) {
  if (!articles.length) return [];
  const offset = ((shift % articles.length) + articles.length) % articles.length;
  return articles.slice(offset).concat(articles.slice(0, offset));
}

export function selectHandArticles(articles, limit = 7) {
  return articles.slice(0, Math.max(0, limit));
}

export function getArchivePageNavigation(page, pageCount) {
  const safePageCount = Math.max(1, Math.floor(Number.isFinite(pageCount) ? pageCount : 1));
  const safePage = Number.isFinite(page) ? Math.floor(page) : 1;

  return {
    page: Math.min(safePageCount, Math.max(1, safePage)),
    target: '#signal-archive',
  };
}

export function filterArticles(articles, { topic = '全部', query = '', shift = 0 } = {}) {
  const normalizedQuery = query.trim().toLowerCase();

  return orderedArticles(articles, shift).filter((article) => {
    const articleTopics = Array.isArray(article.topics) && article.topics.length ? article.topics : [article.topic];
    const topicMatches = topic === '全部' || articleTopics.includes(topic);
    const searchable = [
      article.title,
      article.summary,
      article.source,
      article.topic,
      article.type,
      ...(article.tags || []),
    ].join(' ').toLowerCase();

    return topicMatches && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}

export function fanPose(total, index) {
  if (total <= 1) return { angle: 0, lift: 0 };

  const center = (total - 1) / 2;
  const distance = index - center;
  const maxAngle = total === 2 ? 7 : Math.min(10, 4 + total);

  return {
    angle: Number((distance / center * maxAngle).toFixed(2)),
    lift: Number((Math.abs(distance) * 8).toFixed(2)),
  };
}

export function getStickyNavState(scrollY, dockBottom) {
  return scrollY > dockBottom;
}

export function getArchiveNavigationState(isArchiveOpen, isScrolled) {
  return {
    isVisible: isArchiveOpen || isScrolled,
    showReturnToFeatured: isArchiveOpen,
    target: isArchiveOpen ? '#card-hand' : null,
  };
}
export function getArchivePageState(articles, page = 1, pageSize = 12) {
  const safePageSize = Math.max(1, Math.floor(Number.isFinite(pageSize) ? pageSize : 12));
  const pageCount = Math.max(1, Math.ceil(articles.length / safePageSize));
  const safePage = Number.isFinite(page) ? Math.floor(page) : 1;
  const currentPage = Math.min(pageCount, Math.max(1, safePage));
  const start = (currentPage - 1) * safePageSize;

  return {
    page: currentPage,
    pageCount,
    pageArticles: articles.slice(start, start + safePageSize),
    pageSize: safePageSize,
  };
}

export function resolveCardClick(selectedId, articleId = null) {
  if (articleId === null || articleId === undefined) {
    return { selectedId: null, shouldOpen: false };
  }

  return {
    selectedId: articleId,
    shouldOpen: selectedId === articleId,
  };
}

export function resolveDailyDrawClick(isFlipped, hasArticle) {
  if (!isFlipped) return { nextFlipped: true, shouldOpen: false, shouldToast: false };

  return {
    nextFlipped: true,
    shouldOpen: Boolean(hasArticle),
    shouldToast: false,
  };
}

export function resolveDailyDrawDismiss() {
  return { nextFlipped: false };
}
