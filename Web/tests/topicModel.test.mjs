import test from 'node:test';
import assert from 'node:assert/strict';

import { getVisibleTopicItems, summarizeTopics } from '../src/topicModel.js';

test('summarizeTopics builds the all tab and counts every article topic', () => {
  const result = summarizeTopics([
    { id: 'one', topic: 'Agent', topics: ['Agent', '工作流'] },
    { id: 'two', topic: '工作流', topics: ['工作流'] },
    { id: 'three', topic: '研究' },
  ]);

  assert.deepEqual(result, [
    { name: '全部', count: 3 },
    { name: '工作流', count: 2 },
    { name: 'Agent', count: 1 },
    { name: '研究', count: 1 },
  ]);
});

test('getVisibleTopicItems keeps 全部 and limits topic buttons until expanded', () => {
  const items = [
    { name: '全部', count: 10 },
    { name: 'Agent', count: 5 },
    { name: '开源模型', count: 4 },
    { name: '算力', count: 3 },
  ];

  assert.deepEqual(getVisibleTopicItems(items, 3), items.slice(0, 3));
  assert.deepEqual(getVisibleTopicItems(items, 3, true), items);
});
