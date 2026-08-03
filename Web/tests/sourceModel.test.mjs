import test from 'node:test';
import assert from 'node:assert/strict';

import { filterArticlesBySource, summarizeSources } from '../src/sourceModel.js';

const fixtures = [
  { id: 'one', source: 'OpenAI', accent: 'forest' },
  { id: 'two', source: 'Hugging Face', accent: 'moss' },
  { id: 'three', source: 'OpenAI', accent: 'forest' },
];

test('filterArticlesBySource returns only the selected source and preserves order', () => {
  const result = filterArticlesBySource(fixtures, 'OpenAI');

  assert.deepEqual(result.map((article) => article.id), ['one', 'three']);
  assert.deepEqual(fixtures.map((article) => article.id), ['one', 'two', 'three']);
  assert.deepEqual(filterArticlesBySource(fixtures, '全部'), fixtures);
});

test('summarizeSources deduplicates sources, counts cards, and keeps nodes inside the safe area', () => {
  const summary = summarizeSources(fixtures, {
    OpenAI: { accent: 'forest', x: 18, y: 32 },
  });

  assert.deepEqual(summary.map((source) => source.name), ['OpenAI', 'Hugging Face']);
  assert.equal(summary.find((source) => source.id === 'OpenAI').articleCount, 2);
  assert.equal(summary.find((source) => source.id === 'OpenAI').accent, 'forest');
  assert.ok(summary.every((source) => source.x >= 10 && source.x <= 90));
  assert.ok(summary.every((source) => source.y >= 10 && source.y <= 90));
});
