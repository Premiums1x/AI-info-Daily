import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeArticle } from '../src/api/newsApi.js';

test('normalizeArticle adapts the backend article shape to a playable news card', () => {
  const article = normalizeArticle({
    id: 21,
    title: '开放权重模型迎来新工具链',
    summary: '新的部署方式正在降低使用门槛。',
    source: { code: 'huggingface_blog', name: 'Hugging Face Blog' },
    category: { code: 'open_source', name: '开源' },
    tags: ['开源模型', '部署'],
    original_url: 'https://example.com/article',
    published_at: '2026-08-03T10:00:00Z',
    collected_at: '2026-08-03T10:05:00Z',
  }, 0, new Date('2026-08-03T11:00:00Z'));

  assert.equal(article.id, 'remote-21');
  assert.equal(article.source, 'Hugging Face Blog');
  assert.equal(article.topic, '开源模型');
  assert.equal(article.type, '开源动向');
  assert.equal(article.time, '1 小时前');
  assert.equal(article.detail, '新的部署方式正在降低使用门槛。');
  assert.equal(article.url, 'https://example.com/article');
  assert.deepEqual(article.tags, ['开源模型', '部署']);
});
