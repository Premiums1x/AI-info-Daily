import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchHealth } from '../src/api/newsApi.js';


test('fetchHealth reads assistant availability from the backend', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      text: async () => JSON.stringify({ assistant: { enabled: true } }),
    };
  };

  try {
    const result = await fetchHealth('http://api.test/api/v1');

    assert.equal(new URL(requestedUrl).pathname, '/api/v1/health');
    assert.equal(result.assistant.enabled, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

