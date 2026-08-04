import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('places the featured reorder action in the featured section and redraw action in the hero', () => {
  const heroActions = appSource.match(
    /<div className="intro-actions">([\s\S]*?)<\/div>/,
  )?.[1] || '';
  const featuredSectionStart = appSource.indexOf('<section className="hand-section');
  const featuredSectionEnd = appSource.indexOf('<section className="afterword');
  const featuredSection = appSource.slice(featuredSectionStart, featuredSectionEnd);
  const heroCall = appSource.match(/<Hero([\s\S]*?)\/>/)?.[1] || '';

  assert.match(heroActions, /onClick=\{onRedraw\}/);
  assert.match(heroActions, /重新抽牌/);
  assert.doesNotMatch(heroActions, /onClick=\{onDrawClick\}[^>]*>重新抽牌/);
  assert.doesNotMatch(heroActions, /重排精选|重新排精选/);
  assert.match(featuredSection, /onClick=\{handleDeal\}[^>]*>重排精选/);
  assert.match(heroCall, /onRedraw=\{handleDailyRedraw\}/);
  assert.doesNotMatch(appSource, /<\/StickyDock>\s+onRedraw=\{handleDailyRedraw\}\s+<main/);
  assert.match(appSource, /isRedrawing/);
  assert.match(stylesSource, /\.deal-stage\.is-redrawing/);
  assert.doesNotMatch(appSource, /showToast\(nextArticle/);
  assert.doesNotMatch(appSource, /已重新抽牌：/);
});
