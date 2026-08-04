import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSource,
  fetchSources,
  updateSource,
} from '../src/api/newsApi.js';
import { summarizeSources } from '../src/sourceModel.js';


test('fetchSources keeps source status and recent article counts', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify({
      since_hours: 24,
      items: [
        {
          code: 'google_news_ai',
          name: 'Google News · AI',
          feed_url: 'https://news.google.com/rss/search?q=AI',
          enabled: true,
          last_item_count: 50,
          recent_article_count: 87,
          last_error: null,
        },
      ],
    }),
  });

  try {
    const sources = await fetchSources('http://api.test/api/v1');
    assert.deepEqual(sources, [
      {
        id: 'google_news_ai',
        code: 'google_news_ai',
        name: 'Google News · AI',
        feedUrl: 'https://news.google.com/rss/search?q=AI',
        enabled: true,
        recentArticleCount: 87,
        lastItemCount: 50,
        lastError: null,
        lastFetchedAt: null,
        lastSuccessAt: null,
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test('createSource and updateSource send JSON source management requests', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return {
      ok: true,
      text: async () => JSON.stringify({
        code: 'anthropic-news-a1b2c3',
        name: 'Anthropic News',
        feed_url: 'https://www.anthropic.com/rss.xml',
        enabled: false,
        recent_article_count: 0,
        last_item_count: 0,
        last_error: null,
      }),
    };
  };

  try {
    await createSource(
      { name: 'Anthropic News', feed_url: 'https://www.anthropic.com/rss.xml' },
      'http://api.test/api/v1',
    );
    await updateSource(
      'anthropic-news-a1b2c3',
      { enabled: false },
      'http://api.test/api/v1',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    name: 'Anthropic News',
    feed_url: 'https://www.anthropic.com/rss.xml',
  });
  assert.equal(calls[1].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[1].options.body), { enabled: false });
});


test('summarizeSources includes configured sources with zero recent cards', () => {
  const summary = summarizeSources(
    [
      {
        id: 'article-1',
        sourceId: 'google_news_ai',
        source: 'Google News · AI',
        accent: 'forest',
      },
    ],
    [
      {
        code: 'google_news_ai',
        name: 'Google News · AI',
        enabled: true,
        recentArticleCount: 1,
      },
      {
        code: 'huggingface_blog',
        name: 'Hugging Face Blog',
        enabled: true,
        recentArticleCount: 0,
      },
    ],
  );

  assert.deepEqual(summary.map((source) => source.id), [
    'google_news_ai',
    'huggingface_blog',
  ]);
  assert.equal(summary.find((source) => source.id === 'google_news_ai').articleCount, 1);
  assert.equal(summary.find((source) => source.id === 'huggingface_blog').articleCount, 0);
});
