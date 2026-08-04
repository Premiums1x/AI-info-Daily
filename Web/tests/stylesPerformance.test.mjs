import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const stylesCss = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const sourceManagerCss = fs.readFileSync(new URL('../src/source-manager.css', import.meta.url), 'utf8');
const css = `${stylesCss}\n${sourceManagerCss}`;
const appSource = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

function ruleFor(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'));
  assert.ok(match, `Expected CSS rule for ${selector}`);
  return match[1];
}

test('frequently rendered surfaces avoid backdrop-filter', () => {
  for (const selector of ['.glass-surface', '.card-surface', '.archive-card-surface']) {
    const rule = ruleFor(selector);
    assert.doesNotMatch(rule, /(?:-webkit-)?backdrop-filter\s*:/);
  }
  assert.doesNotMatch(css, /(?:-webkit-)?backdrop-filter\s*:/);
});

test('decorative source animations are not permanently running', () => {
  assert.doesNotMatch(css, /animation:\s*source-core-breathe/);
  assert.doesNotMatch(css, /animation:\s*source-orbit-drift/);
});

test('below-the-fold sections opt into content visibility', () => {
  for (const selector of ['.assistant-section', '.afterword']) {
    const rule = ruleFor(selector);
    assert.match(rule, /content-visibility:\s*auto/);
    assert.match(rule, /contain-intrinsic-size:\s*[^;]+/);
  }
});

test('archive remains lazily mounted instead of reserving an unstable intrinsic size', () => {
  assert.match(appSource, /\{isArchiveOpen \? \(/);
  assert.match(appSource, /<SignalArchive articles=\{visibleArticles\}/);
  assert.doesNotMatch(ruleFor('.signal-archive'), /content-visibility|contain-intrinsic-size/);
});
