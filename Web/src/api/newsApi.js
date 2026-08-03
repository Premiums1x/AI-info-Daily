const DEFAULT_API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const TOPIC_BY_TAG = new Set(['Agent', '开源模型', 'AI 产品', '算力']);
const TYPE_BY_CATEGORY = {
  product: '产品动向',
  research: '研究信号',
  business: '商业动向',
  open_source: '开源动向',
  other: '综合信号',
};
const TOPIC_BY_CATEGORY = {
  product: 'AI 产品',
  research: 'Agent',
  business: '算力',
  open_source: '开源模型',
  other: 'AI 产品',
};
const ACCENTS = ['forest', 'moss', 'ember', 'ochre'];

function buildUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function sourceNameOf(remoteArticle) {
  if (typeof remoteArticle.source === 'string') return remoteArticle.source;
  return remoteArticle.source?.name || '未知信源';
}

function topicOf(remoteArticle) {
  const tags = Array.isArray(remoteArticle.tags) ? remoteArticle.tags : [];
  const topicTag = tags.find((tag) => TOPIC_BY_TAG.has(tag));
  if (topicTag) return topicTag === '算力与芯片' ? '算力' : topicTag;
  return TOPIC_BY_CATEGORY[remoteArticle.category?.code] || 'AI 产品';
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

  return {
    id: `remote-${id}`,
    rank: String(index + 1).padStart(2, '0'),
    topic: topicOf(remoteArticle),
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

async function requestJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
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

export async function fetchLatestArticles(baseUrl = DEFAULT_API_BASE_URL) {
  const response = await requestJson(buildUrl(baseUrl, '/articles?since_hours=24&limit=50&sort=latest'));
  return Array.isArray(response.items) ? response.items : [];
}
