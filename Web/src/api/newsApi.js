const DEFAULT_API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';


const TYPE_BY_CATEGORY = {
  product: '产品动向',
  research: '研究信号',
  business: '商业动向',
  open_source: '开源动向',
  other: '综合信号',
};

const ACCENTS = ['forest', 'moss', 'ember', 'ochre'];


function buildUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}


function sourceIdOf(remoteArticle) {
  if (typeof remoteArticle.source === 'object' && remoteArticle.source !== null) {
    return remoteArticle.source.code || remoteArticle.source.id || remoteArticle.source.name;
  }
  return remoteArticle.source_id || remoteArticle.sourceId || remoteArticle.source || 'unknown';
}


function sourceNameOf(remoteArticle) {
  if (typeof remoteArticle.source === 'string') return remoteArticle.source;
  return remoteArticle.source?.name || '未知信源';
}


function topicsOf(remoteArticle) {
  const tags = Array.isArray(remoteArticle.tags) ? remoteArticle.tags : [];
  const topics = [...new Set(tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean))];
  if (topics.length) return topics;
  const categoryName = remoteArticle.category?.name?.trim();
  return categoryName ? [categoryName] : ['其他'];
}


function relativeTime(value, now) {
  const publishedAt = new Date(value);
  if (Number.isNaN(publishedAt.getTime())) return '刚刚';

  const minutes = Math.max(0, Math.floor((now.getTime() - publishedAt.getTime()) / 60000));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return `${publishedAt.getUTCMonth() + 1}月 ${publishedAt.getUTCDate()}日`;
}


export function normalizeArticle(remoteArticle, index = 0, now = new Date()) {
  const id = remoteArticle.id ?? remoteArticle.original_url ?? `article-${index}`;
  const categoryCode = remoteArticle.category?.code || 'other';
  const summary = remoteArticle.summary || '这条信号暂时没有摘要。';
  const topics = topicsOf(remoteArticle);

  return {
    id: `remote-${id}`,
    rank: String(index + 1).padStart(2, '0'),
    remoteId: Number.isFinite(Number(remoteArticle.id)) ? Number(remoteArticle.id) : null,
    topic: topics[0],
    topics,
    sourceId: sourceIdOf(remoteArticle),
    source: sourceNameOf(remoteArticle),
    time: relativeTime(remoteArticle.published_at, now),
    type: TYPE_BY_CATEGORY[categoryCode] || '综合信号',
    title: remoteArticle.title || '未命名信号',
    summary,
    detail: summary,
    tags: Array.isArray(remoteArticle.tags) ? remoteArticle.tags : [],
    accent: ACCENTS[index % ACCENTS.length],
    url: remoteArticle.original_url || '#',
  };
}


export function normalizeSource(remoteSource, index = 0) {
  const code = remoteSource.code || remoteSource.id || remoteSource.name || `source-${index}`;
  return {
    id: code,
    code,
    name: remoteSource.name || code,
    feedUrl: remoteSource.feed_url || remoteSource.feedUrl || '',
    enabled: remoteSource.enabled !== false,
    recentArticleCount: Number(remoteSource.recent_article_count ?? remoteSource.recentArticleCount) || 0,
    lastItemCount: Number(remoteSource.last_item_count ?? remoteSource.lastItemCount) || 0,
    lastError: remoteSource.last_error ?? remoteSource.lastError ?? null,
    lastFetchedAt: remoteSource.last_fetched_at ?? remoteSource.lastFetchedAt ?? null,
    lastSuccessAt: remoteSource.last_success_at ?? remoteSource.lastSuccessAt ?? null,
  };
}


async function requestJson(url, options = {}) {
  let response;
  try {
    const headers = options.body
      ? { 'Content-Type': 'application/json', ...(options.headers || {}) }
      : options.headers;
    response = await fetch(url, { ...options, ...(headers ? { headers } : {}) });
  } catch (_error) {
    throw new Error('无法连接日报后端，请先启动 FastAPI 服务');
  }

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch (_error) {
    body = {};
  }

  if (!response.ok) {
    throw new Error(body.message || `请求失败（${response.status}）`);
  }
  return body;
}


export async function refreshLatestSignals(baseUrl = DEFAULT_API_BASE_URL) {
  return requestJson(buildUrl(baseUrl, '/ingestion/refresh'), { method: 'POST' });
}


export async function fetchFeaturedArticles(baseUrl = DEFAULT_API_BASE_URL, limit = 7) {
  const response = await requestJson(buildUrl(baseUrl, '/featured?since_hours=24&limit=' + limit));
  return Array.isArray(response.items) ? response.items : [];
}


export async function fetchDailyDraw(baseUrl = DEFAULT_API_BASE_URL) {
  const response = await requestJson(buildUrl(baseUrl, '/daily-draw?since_hours=24'));
  return response.article || null;
}

export async function redrawDailyDraw(currentId, baseUrl = DEFAULT_API_BASE_URL) {
  const response = await requestJson(buildUrl(baseUrl, '/daily-draw/redraw'), {
    method: 'POST',
    body: JSON.stringify({ current_id: currentId ?? null }),
  });
  return response.article || null;
}


export async function fetchLatestArticles(baseUrl = DEFAULT_API_BASE_URL) {
  const items = [];
  let offset = 0;

  while (true) {
    const response = await requestJson(buildUrl(baseUrl, `/articles?since_hours=24&limit=50&offset=${offset}&sort=latest`));
    const pageItems = Array.isArray(response.items) ? response.items : [];
    items.push(...pageItems);

    if (!response.has_more || pageItems.length === 0) break;
    offset += pageItems.length;
  }

  return items;
}


export async function fetchTopics(baseUrl = DEFAULT_API_BASE_URL) {
  const response = await requestJson(buildUrl(baseUrl, '/topics?since_hours=24'));
  return Array.isArray(response.items) ? response.items : [];
}


export async function fetchHealth(baseUrl = DEFAULT_API_BASE_URL) {
  return requestJson(buildUrl(baseUrl, '/health'));
}

export function normalizeIngestionStatus(remoteHealth) {
  const scheduler = remoteHealth?.scheduler || {};
  return {
    lastFetchedAt: scheduler.last_run_at ?? null,
    nextRunAt: scheduler.next_run_at ?? null,
    status: scheduler.last_status ?? 'never',
  };
}
export async function queryAssistant(message, baseUrl = DEFAULT_API_BASE_URL) {
  return requestJson(buildUrl(baseUrl, '/assistant/query'), {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
export async function fetchSources(baseUrl = DEFAULT_API_BASE_URL) {
  const response = await requestJson(buildUrl(baseUrl, '/sources?since_hours=24'));
  return Array.isArray(response.items) ? response.items.map(normalizeSource) : [];
}


export async function createSource(payload, baseUrl = DEFAULT_API_BASE_URL) {
  const response = await requestJson(buildUrl(baseUrl, '/sources'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeSource(response);
}


export async function updateSource(sourceCode, changes, baseUrl = DEFAULT_API_BASE_URL) {
  const response = await requestJson(buildUrl(baseUrl, `/sources/${encodeURIComponent(sourceCode)}`), {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
  return normalizeSource(response);
}
