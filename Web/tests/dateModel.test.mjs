import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { formatCurrentDate } from '../src/appModel.js';

const appSource = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('formatCurrentDate renders the local date and weekday used by the top docks', () => {
  assert.equal(formatCurrentDate(new Date(2026, 7, 4, 10, 30)), '8月 4日 · 周二');
  assert.equal(formatCurrentDate(new Date(2026, 7, 9, 23, 59)), '8月 9日 · 周日');
});

test('top docks do not use a hard-coded calendar date', () => {
  assert.doesNotMatch(appSource, /8月 3日 · 周一/);
});
