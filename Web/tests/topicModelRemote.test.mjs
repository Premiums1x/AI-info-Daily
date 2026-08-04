import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeTopicItems } from '../src/topicModel.js';

test('mergeTopicItems keeps the all count and uses backend topic names', () => {
  assert.deepEqual(mergeTopicItems([
    { code: '工作流', name: '工作流', count: 2 },
    { code: '研究', name: '研究', count: 1 },
  ], [{ id: 1 }, { id: 2 }, { id: 3 }]), [
    { name: '全部', count: 3 },
    { name: '工作流', count: 2 },
    { name: '研究', count: 1 },
  ]);
});
