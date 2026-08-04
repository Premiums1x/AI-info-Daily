import test from 'node:test';
import assert from 'node:assert/strict';

import { queryAssistant } from '../src/api/newsApi.js';


test('queryAssistant posts the user message to the assistant endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestOptions = null;
  globalThis.fetch = async (url, options) => {
    requestUrl = String(url);
    requestOptions = options;
    return {
      ok: true,
      text: async () => JSON.stringify({
        reply: '为你找到 1 篇相关资讯。',
        items: [{ id: 1, title: 'Agent 工具发布' }],
      }),
    };
  };

  try {
    const result = await queryAssistant('推荐最近的 Agent 资讯', 'http://api.test/api/v1');

    assert.deepEqual(result.items, [{ id: 1, title: 'Agent 工具发布' }]);
    assert.equal(new URL(requestUrl).pathname, '/api/v1/assistant/query');
    assert.equal(requestOptions.method, 'POST');
    assert.deepEqual(JSON.parse(requestOptions.body), { message: '推荐最近的 Agent 资讯' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

