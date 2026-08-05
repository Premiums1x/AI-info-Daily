import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dailyDrawStyles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
import {
  fanPose,
  filterArticles,
  getArchiveNavigationState,
  getStickyNavState,
  resolveCardClick,
  resolveDailyDrawClick,
  resolveDailyDrawDismiss,
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


test('resolveCardClick selects on first click and opens only on the second click', () => {
  assert.deepEqual(resolveCardClick(null, 'agent-plan'), {
    selectedId: 'agent-plan',
    shouldOpen: false,
  });

  assert.deepEqual(resolveCardClick('agent-plan', 'agent-plan'), {
    selectedId: 'agent-plan',
    shouldOpen: true,
  });
});

test('resolveCardClick switches selection when another card is clicked and clears on blank space', () => {
  assert.deepEqual(resolveCardClick('agent-plan', 'open-model'), {
    selectedId: 'open-model',
    shouldOpen: false,
  });

  assert.deepEqual(resolveCardClick('open-model', null), {
    selectedId: null,
    shouldOpen: false,
  });
});

test('daily draw flips first and opens its detail on the second click', () => {
  assert.deepEqual(resolveDailyDrawClick(false, true), {
    nextFlipped: true,
    shouldOpen: false,
    shouldToast: false,
  });

  assert.deepEqual(resolveDailyDrawClick(true, true), {
    nextFlipped: true,
    shouldOpen: true,
    shouldToast: false,
  });

  assert.deepEqual(resolveDailyDrawClick(true, false), {
    nextFlipped: true,
    shouldOpen: false,
    shouldToast: false,
  });
});

test('daily draw does not show a toast while flipping or opening', () => {
  assert.equal(resolveDailyDrawClick(false, true).shouldToast, false);
  assert.equal(resolveDailyDrawClick(true, true).shouldToast, false);
});

test('dismissing daily draw returns it to the face-down state', () => {
  assert.deepEqual(resolveDailyDrawDismiss(), {
    nextFlipped: false,
  });
});
test('daily draw changes face only after click, not hover', () => {
  assert.doesNotMatch(dailyDrawStyles, /\.deck-flip:hover\s+\.deck-face--(front|back)/);
  assert.doesNotMatch(dailyDrawStyles, /\.deck-flip:focus-visible\s+\.deck-face--(front|back)/);
  assert.match(dailyDrawStyles, /\.deck-flip\.is-flipped\s+\.deck-face--front/);
  assert.match(dailyDrawStyles, /\.deck-flip\.is-flipped\s+\.deck-face--back/);
  assert.doesNotMatch(appSource, /悬停或点击，翻一张看看/);
  assert.match(appSource, /点击，翻一张看看/);
});
test('archive mode keeps return-to-featured navigation visible away from the archive footer', () => {
  assert.deepEqual(getArchiveNavigationState(true, false), {
    isVisible: true,
    showReturnToFeatured: true,
    target: '#card-hand',
  });

  assert.deepEqual(getArchiveNavigationState(false, true), {
    isVisible: true,
    showReturnToFeatured: false,
    target: null,
  });
});

test('escape closes a scrolled search panel through the scroll-safe close path', () => {
  const escapeHandler = appSource.match(/const handleGlobalKeyDown = \(event\) => \{[\s\S]*?\n    \};/)[0];

  assert.match(escapeHandler, /event\.key === 'Escape'/);
  assert.match(escapeHandler, /closeSearch\(\)/);
  assert.match(appSource, /\[activeArticle, isSearchOpen, isScrolled\]/);
  assert.doesNotMatch(escapeHandler, /searchButtonRef\.current\?\.focus\(\)/);
});

test('sticky search action does not show the default focus ring', () => {
  assert.match(dailyDrawStyles, /\.dock-action\[aria-expanded="false"\]:focus-visible,\s*\.sticky-dock-action\[aria-label="搜索"\]:focus-visible\s*\{[\s\S]*?outline:\s*none;/);
});

test('search closes when the pointer lands outside the top and sticky search controls', () => {
  const topDockDefinition = appSource.match(/function TopDock[\s\S]*?function StickyDock/)[0];
  const stickyDockDefinition = appSource.match(/function StickyDock[\s\S]*?function Hero/)[0];
  const searchPointerHandler = appSource.match(/const handleSearchPointerDown = \(event\) => \{[\s\S]*?\n    \};/)[0];

  assert.match(topDockDefinition, /ref=\{searchRegionRef\}/);
  assert.match(topDockDefinition, /ref=\{searchButtonRef\}/);
  assert.match(stickyDockDefinition, /aria-label=\{isSearchOpen \? '关闭搜索' : '搜索'\}/);
  assert.match(searchPointerHandler, /searchRegionRef\.current\?\.contains\(event\.target\)/);
  assert.match(searchPointerHandler, /target\?\.closest\('.sticky-dock-action\[aria-label="搜索"\], \.sticky-dock-action\[aria-label="关闭搜索"\]'\)/);
  assert.match(searchPointerHandler, /closeSearch\(\)/);
  assert.match(appSource, /document\.addEventListener\('pointerdown', handleSearchPointerDown\)/);
});
