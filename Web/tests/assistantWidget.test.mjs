import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';


const appSource = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const assistantSource = fs.readFileSync(new URL('../src/components/RecommendationAssistant.jsx', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');


test('assistant widget lives in the top dock and reuses the sticky side controls', () => {
  const topDockDefinition = appSource.match(/function TopDock[\s\S]*?function StickyDock/);
  const stickyDockDefinition = appSource.match(/function StickyDock[\s\S]*?function Hero/);
  const heroDefinition = appSource.match(/function Hero[\s\S]*?function TopicStrip/);

  assert.ok(topDockDefinition, 'expected TopDock definition');
  assert.ok(stickyDockDefinition, 'expected StickyDock definition');
  assert.ok(heroDefinition, 'expected Hero definition');
  assert.match(topDockDefinition[0], /<RecommendationAssistant/);
  assert.match(topDockDefinition[0], /showLauncher=\{!isScrolled\}/);
  assert.match(stickyDockDefinition[0], /sticky-dock-action--assistant/);
  assert.match(stickyDockDefinition[0], /onClick=\{onToggleAssistant\}/);
  assert.doesNotMatch(heroDefinition[0], /<RecommendationAssistant/);
  assert.match(appSource, /isAssistantOpen/);
  assert.doesNotMatch(appSource, /className="assistant-section/);
});


test('assistant widget renders a welcome message, conversation states, and AI thinking feedback', () => {
  assert.match(assistantSource, /INITIAL_MESSAGES/);
  assert.match(assistantSource, /您今天对什么比较感兴趣/);
  assert.match(assistantSource, /useState\(INITIAL_MESSAGES\)/);
  assert.match(assistantSource, /assistant-message--\$\{entry\.role\}/);
  assert.match(assistantSource, /role: 'user'/);
  assert.match(assistantSource, /assistant-message--thinking/);
  assert.match(assistantSource, /aria-live="polite"/);
  assert.match(assistantSource, /queryAssistant\(nextMessage\)/);
  assert.match(assistantSource, /AI 助手/);
});


test('assistant widget closes when the pointer lands outside the widget', () => {
  assert.match(assistantSource, /const widgetRef = useRef\(null\);/);
  assert.match(assistantSource, /ref=\{widgetRef\}/);
  assert.match(assistantSource, /document\.addEventListener\('pointerdown', handleDocumentPointerDown\)/);
  assert.match(assistantSource, /if \(event\.target instanceof Element && event\.target\.closest\('\.sticky-dock-action--assistant'\)\) return;/);
  assert.match(assistantSource, /if \(widgetRef\.current\?\.contains\(event\.target\)\) return;/);
  assert.match(assistantSource, /closeAssistant\(\);/);
});



test('top dock assistant uses navigation styling and expands to the dock width', () => {
  assert.match(styles, /\.top-dock \.assistant-widget:not\(\.is-scrolled\)\s*\{[\s\S]*?position:\s*static;/);
  assert.match(styles, /\.top-dock \.assistant-widget:not\(\.is-scrolled\) \.assistant-launcher\s*\{[\s\S]*?border:\s*1px solid rgba\(200, 111, 72, 0\.34\);[\s\S]*?background:\s*transparent;/);
  assert.match(styles, /\.top-dock \.assistant-widget:not\(\.is-scrolled\) \.assistant-panel\s*\{[\s\S]*?left:\s*0;[\s\S]*?right:\s*0;[\s\S]*?width:\s*auto;[\s\S]*?height:\s*auto;[\s\S]*?max-height:/);
  assert.match(styles, /\.top-dock \.assistant-widget:not\(\.is-scrolled\) \.assistant-panel\s*\{[\s\S]*?overflow-y:\s*auto;/);
});


test('top dock keeps its opening frame free of an immediate full-panel scrollbar', () => {
  assert.match(styles, /\.top-dock \.assistant-widget:not\(\.is-scrolled\) \.assistant-panel\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-rows:\s*auto auto auto auto;/);
  assert.match(styles, /\.top-dock \.assistant-widget:not\(\.is-scrolled\) \.assistant-panel\s*\{[\s\S]*?height:\s*auto;[\s\S]*?max-height:[\s\S]*?overflow-y:\s*auto;/);
  assert.match(styles, /\.top-dock \.assistant-widget:not\(\.is-scrolled\) \.assistant-panel\s*\{[^}]*top:\s*calc\(100% \+ 10px\);[^}]*bottom:\s*auto;/);
});


test('scrolled assistant remains fixed-height and scrollable beside sticky controls', () => {
  assert.match(styles, /\.top-dock \.assistant-widget\.is-scrolled\s*\{[\s\S]*?top:\s*18px;[\s\S]*?right:\s*74px;/);
  assert.match(styles, /\.sticky-dock-action--assistant/);
  assert.match(styles, /\.assistant-widget\.is-scrolled\s*\{/);
  assert.match(styles, /\.assistant-panel\s*\{[\s\S]*?max-height:/);
  assert.match(styles, /\.assistant-panel\s*\{[\s\S]*?overflow-y:\s*auto;/);
  assert.match(styles, /\.assistant-widget\.is-scrolled\s+\.assistant-panel\s*\{[\s\S]*?height:/);
  assert.match(styles, /\.assistant-widget\.is-scrolled\s+\.assistant-panel\s*\{[\s\S]*?overflow-y:\s*auto;/);
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.assistant-panel[\s\S]*?calc\(100vw\s*-\s*24px\)/);
});
