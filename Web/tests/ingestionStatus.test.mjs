import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { formatLastFetchedAt } from '../src/appModel.js';
import { fetchHealth, normalizeIngestionStatus } from '../src/api/newsApi.js';


test('formatLastFetchedAt renders a valid backend timestamp in local time', () => {
  const value = '2026-08-04T10:30:00+08:00';
  const date = new Date(value);

  assert.equal(
    formatLastFetchedAt(value),
    `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  );
});


test('formatLastFetchedAt explains that no ingestion has completed yet', () => {
  assert.equal(formatLastFetchedAt(null), '等待首次抓取');
  assert.equal(formatLastFetchedAt('not-a-date'), '等待首次抓取');
});


test('normalizeIngestionStatus maps health scheduler timestamps safely', () => {
  assert.deepEqual(
    normalizeIngestionStatus({
      scheduler: {
        last_run_at: '2026-08-04T10:30:00+00:00',
        next_run_at: '2026-08-04T12:30:00+00:00',
        last_status: 'ok',
      },
    }),
    {
      lastFetchedAt: '2026-08-04T10:30:00+00:00',
      nextRunAt: '2026-08-04T12:30:00+00:00',
      status: 'ok',
    },
  );
  assert.deepEqual(normalizeIngestionStatus({}), {
    lastFetchedAt: null,
    nextRunAt: null,
    status: 'never',
  });
});


test('fetchHealth polls the health endpoint with GET only', async () => {
  const originalFetch = globalThis.fetch;
  let request = null;
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), options };
    return {
      ok: true,
      text: async () => JSON.stringify({ scheduler: { last_run_at: null } }),
    };
  };

  try {
    await fetchHealth('http://api.test/api/v1');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(new URL(request.url).pathname, '/api/v1/health');
  assert.equal(request.options?.method, undefined);
});


test('the polling contract never turns a health check into an ingestion refresh', () => {
  const appSource = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(appSource, /const ingestionPollTimer = window\.setInterval\(pollIngestionStatus, 60_000\);/);
  assert.doesNotMatch(appSource, /setInterval[\s\S]{0,500}refreshLatestSignals/);
});
