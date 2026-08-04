import test from 'node:test';
import assert from 'node:assert/strict';

import { filterArticles, getArchivePageNavigation, getArchivePageState, selectHandArticles } from '../src/appModel.js';

test('filterArticles matches any backend-provided topic on an article', () => {
  const result = filterArticles([
    { id: 'one', topic: 'Agent', topics: ['Agent', '工作流'], title: '工具', summary: '', source: '', type: '', tags: [] },
    { id: 'two', topic: '研究', topics: ['研究'], title: '论文', summary: '', source: '', type: '', tags: [] },
  ], { topic: '工作流' });

  assert.deepEqual(result.map((article) => article.id), ['one']);
});

test('selectHandArticles keeps the deck interaction bounded while archive keeps the rest', () => {
  const articles = Array.from({ length: 12 }, (_, index) => ({ id: String(index) }));

  assert.deepEqual(selectHandArticles(articles, 7).map((article) => article.id), [
    '0', '1', '2', '3', '4', '5', '6',
  ]);
});

test('getArchivePageState renders a bounded page and clamps invalid page numbers', () => {
  const articles = Array.from({ length: 25 }, (_, index) => ({ id: String(index) }));

  assert.deepEqual(getArchivePageState(articles, 1, 12), {
    page: 1,
    pageCount: 3,
    pageArticles: articles.slice(0, 12),
    pageSize: 12,
  });

  assert.deepEqual(getArchivePageState(articles, 99, 12), {
    page: 3,
    pageCount: 3,
    pageArticles: articles.slice(24),
    pageSize: 12,
  });
});

test('getArchivePageNavigation keeps page changes anchored to the archive heading', () => {
  assert.deepEqual(getArchivePageNavigation(2, 10), {
    page: 2,
    target: '#signal-archive',
  });
});
