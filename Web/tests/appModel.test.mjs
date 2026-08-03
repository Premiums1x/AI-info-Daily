import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fanPose,
  filterArticles,
  getStickyNavState,
} from '../src/appModel.js';

const fixtures = [
  {
    id: 'agent-plan',
    topic: 'Agent',
    title: '模型开始学会先做计划',
    summary: '长任务执行正在变化',
    source: 'OpenAI',
    type: '研究信号',
    tags: ['Agent', '计划能力'],
  },
  {
    id: 'open-model',
    topic: '开源模型',
    title: '开放权重模型迎来小模型时刻',
    summary: '更轻量的部署方式',
    source: 'Hugging Face',
    type: '开源动向',
    tags: ['开源模型', '部署'],
  },
  {
    id: 'inference-cost',
    topic: '算力',
    title: '推理成本继续下探',
    summary: '应用的商业空间正在打开',
    source: 'SemiAnalysis',
    type: '基础设施',
    tags: ['算力', '商业'],
  },
];

test('filterArticles matches topic and keyword without mutating source order', () => {
  const source = [...fixtures];

  const result = filterArticles(source, { topic: 'Agent', query: '计划' });

  assert.deepEqual(result.map((article) => article.id), ['agent-plan']);
  assert.deepEqual(source.map((article) => article.id), [
    'agent-plan',
    'open-model',
    'inference-cost',
  ]);
});

test('fanPose centers one card, balances two cards, and centers the odd middle card', () => {
  assert.deepEqual(fanPose(1, 0), { angle: 0, lift: 0 });

  const two = [fanPose(2, 0), fanPose(2, 1)];
  assert.equal(two[0].angle, -7);
  assert.equal(two[1].angle, 7);

  const three = [fanPose(3, 0), fanPose(3, 1), fanPose(3, 2)];
  assert.equal(three[1].angle, 0);
  assert.equal(three[0].angle, -7);
  assert.equal(three[2].angle, 7);
});

test('getStickyNavState activates only after the top dock boundary', () => {
  assert.equal(getStickyNavState(0, 96), false);
  assert.equal(getStickyNavState(96, 96), false);
  assert.equal(getStickyNavState(97, 96), true);
});
