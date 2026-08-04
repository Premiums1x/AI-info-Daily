test('fetchDailyDraw reads one separate daily draw card', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      text: async () => JSON.stringify({
        drawn_at: '2026-08-04',
        article: { id: 11, title: '今日抽到的牌' },
      }),
    };
  };

  try {
    assert.deepEqual(await fetchDailyDraw('http://api.test/api/v1'), {
      id: 11,
      title: '今日抽到的牌',
    });
    const url = new URL(requestedUrl);
    assert.equal(url.pathname, '/api/v1/daily-draw');
    assert.equal(url.searchParams.get('since_hours'), '24');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test('fetchFeaturedArticles reads the backend daily hand endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      text: async () => JSON.stringify({
        generated_at: '2026-08-04T01:00:00Z',
        total_new: 12,
        items: [{ id: 7, title: '今日手牌' }],
      }),
    };
  };

  try {
    assert.deepEqual(await fetchFeaturedArticles('http://api.test/api/v1'), [
      { id: 7, title: '今日手牌' },
    ]);
    const url = new URL(requestedUrl);
    assert.equal(url.pathname, '/api/v1/featured');
    assert.equal(url.searchParams.get('since_hours'), '24');
    assert.equal(url.searchParams.get('limit'), '7');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchDailyDraw, fetchFeaturedArticles, fetchLatestArticles, fetchTopics, normalizeArticle } from '../src/api/newsApi.js';

test('fetchLatestArticles follows the FastAPI pagination contract', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const offset = new URL(url).searchParams.get('offset');
    const body = offset === '0'
      ? { items: [{ id: 1 }], total: 2, limit: 50, offset: 0, has_more: true }
      : { items: [{ id: 2 }], total: 2, limit: 50, offset: 1, has_more: false };
    return { ok: true, text: async () => JSON.stringify(body) };
  };

  try {
    const items = await fetchLatestArticles('http://api.test/api/v1');
    assert.deepEqual(items, [{ id: 1 }, { id: 2 }]);
    assert.equal(calls.length, 2);
    assert.match(calls[1], /offset=1/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchTopics returns backend-derived topic counts', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify({
      since_hours: 24,
      items: [{ code: '工作流', name: '工作流', count: 2 }],
    }),
  });

  try {
    assert.deepEqual(await fetchTopics('http://api.test/api/v1'), [
      { code: '工作流', name: '工作流', count: 2 },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('normalizeArticle keeps all backend topics for local filtering', () => {
  const article = normalizeArticle({
    id: 7,
    title: 'Agent 工作流工具',
    summary: '摘要',
    source: { name: '测试来源' },
    category: { code: 'product', name: '产品' },
    tags: ['Agent', '工作流'],
    original_url: 'https://example.com/article',
    published_at: '2026-08-03T10:00:00Z',
  }, 0, new Date('2026-08-03T11:00:00Z'));

  assert.deepEqual(article.topics, ['Agent', '工作流']);
  assert.equal(article.topic, 'Agent');
});
