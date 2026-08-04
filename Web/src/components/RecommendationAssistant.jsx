import { useState } from 'react';

import { normalizeArticle, queryAssistant } from '../api/newsApi.js';


const STARTER_PROMPTS = [
  '推荐最近的 Agent 资讯',
  '我想了解开源模型',
  '最近有什么 AI 产品发布？',
];


export default function RecommendationAssistant({ onOpen, enabled }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const nextMessage = message.trim();
    if (!nextMessage || status === 'loading') return;

    setStatus('loading');
    setErrorMessage('');
    try {
      const response = await queryAssistant(nextMessage);
      setResult({
        reply: response.reply || '为你整理了这些资讯。',
        items: Array.isArray(response.items)
          ? response.items.map((article, index) => normalizeArticle(article, index))
          : [],
      });
      setStatus('success');
    } catch (error) {
      setResult(null);
      setErrorMessage(error instanceof Error ? error.message : '推荐暂时不可用');
      setStatus('error');
    }
  };

  return (
    <section className="assistant-section page-width" aria-labelledby="assistant-title">
      <div className="assistant-heading">
        <span className="assistant-kicker">AI 助手 · 仅检索已收录资讯</span>
        <h2 id="assistant-title">您今天想看些什么 AI 资讯？</h2>
        <p>用一句话描述方向，我会从日报已有的文章里帮你挑出几篇。</p>
      </div>

      {enabled ? (
        <>
      <form className="assistant-form" onSubmit={submit}>
        <label htmlFor="assistant-question">告诉 AI 你想看的内容</label>
        <div className="assistant-input-row">
          <input
            id="assistant-question"
            value={message}
            maxLength={500}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="例如：推荐最近的 Agent 资讯"
          />
          <button type="submit" disabled={status === 'loading' || !message.trim()}>
            {status === 'loading' ? '正在筛选…' : '开始推荐'}
          </button>
        </div>
      </form>

      <div className="assistant-prompts" aria-label="推荐问题示例">
        {STARTER_PROMPTS.map((prompt) => (
          <button key={prompt} type="button" onClick={() => setMessage(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      </>
      ) : (
        <p className="assistant-empty">智能推荐尚未配置 LLM API，请先在 backend/.env 中配置。</p>
      )}

      <div className="assistant-feedback" aria-live="polite" aria-busy={status === 'loading'}>
        {status === 'error' && <p className="assistant-error">{errorMessage}</p>}
        {status === 'success' && result && (
          <>
            <p className="assistant-reply">{result.reply}</p>
            {result.items.length ? (
              <div className="assistant-results">
                {result.items.map((article) => (
                  <article className="assistant-result" key={article.id}>
                    <div>
                      <span className="assistant-result-meta">{article.source} · {article.time}</span>
                      <h3>{article.title}</h3>
                      <p>{article.summary}</p>
                    </div>
                    <button type="button" onClick={(event) => onOpen(article, event)}>打开简报</button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="assistant-empty">换一个主题，或者把时间范围说得宽一些。</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

