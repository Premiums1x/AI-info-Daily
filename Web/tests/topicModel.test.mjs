import test from 'node:test';
import assert from 'node:assert/strict';

import { summarizeTopics } from '../src/topicModel.js';

test('summarizeTopics builds the all tab and counts every article topic', () => {
  const result = summarizeTopics([
    { id: 'one', topic: 'Agent', topics: ['Agent', '工作流'] },
    { id: 'two', topic: '工作流', topics: ['工作流'] },
    { id: 'three', topic: '研究' },
  ]);

  assert.deepEqual(result, [
    { name: '全部', count: 3 },
    { name: 'Agent', count: 1 },
    { name: '工作流', count: 2 },
    { name: '研究', count: 1 },
  ]);
});
