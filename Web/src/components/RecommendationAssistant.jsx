import { useEffect, useRef, useState } from 'react';

import { normalizeArticle, queryAssistant } from '../api/newsApi.js';


const STARTER_PROMPTS = [
  '推荐最近的 Agent 资讯',
  '我想了解开源模型',
  '最近有什么 AI 产品发布？',
];

const INITIAL_MESSAGES = [
  {
    id: 'assistant-welcome',
    role: 'assistant',
    text: '您好，我是 AI Daily 助手。您今天对什么比较感兴趣？',
  },
];


export function AssistantIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 6.5h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-7l-4.5 3v-3h-1.5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M15.8 5.3l.5-1.2.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5Z" />
    </svg>
  );
}


function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}


function AssistantResult({ article, onOpen, tabIndex }) {
  return (
    <article className="assistant-result">
      <div className="assistant-result-copy">
        <span className="assistant-result-meta">{article.source} · {article.time}</span>
        <h3>{article.title}</h3>
        <p>{article.summary}</p>
      </div>
      <button type="button" tabIndex={tabIndex} onClick={(event) => onOpen(article, event)}>打开简报</button>
    </article>
  );
}


export default function RecommendationAssistant({ onOpen, enabled, isScrolled, isOpen, onToggle, showLauncher = true }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const launcherRef = useRef(null);
  const widgetRef = useRef(null);
  const inputRef = useRef(null);

  const openAssistant = () => {
    onToggle();
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const closeAssistant = () => {
    onToggle();
    if (document.activeElement === inputRef.current) {
      const returnTarget = isScrolled
        ? document.querySelector('.sticky-dock-action--assistant')
        : launcherRef.current;
      returnTarget?.focus({ preventScroll: true });
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleDocumentPointerDown = (event) => {
      if (event.target instanceof Element && event.target.closest('.sticky-dock-action--assistant')) return;
      if (widgetRef.current?.contains(event.target)) return;
      closeAssistant();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAssistant();
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isScrolled]);

  const submit = async (event) => {
    event.preventDefault();
    const nextMessage = message.trim();
    if (!nextMessage || status === 'loading' || !enabled) return;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: nextMessage },
    ]);
    setMessage('');
    setStatus('loading');

    try {
      const response = await queryAssistant(nextMessage);
      const items = Array.isArray(response.items)
        ? response.items.map((article, index) => normalizeArticle(article, index))
        : [];
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: response.reply || '为你整理了这些资讯。',
          items,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: error instanceof Error ? error.message : '推荐暂时不可用，请稍后再试。',
          isError: true,
        },
      ]);
    } finally {
      setStatus('idle');
    }
  };

  const selectPrompt = (prompt) => {
    setMessage(prompt);
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const tabIndex = isOpen ? 0 : -1;

  return (
    <div ref={widgetRef} className={`assistant-widget${isScrolled ? ' is-scrolled' : ''}${isOpen ? ' is-open' : ''}`}>
      <div
        className="assistant-panel"
        id="assistant-panel"
        role="dialog"
        aria-label="AI Daily 助手"
        aria-hidden={!isOpen}
      >
        <div className="assistant-panel-header">
          <div className="assistant-identity">
            <span className="assistant-mark"><AssistantIcon /></span>
            <span>
              <strong>AI 助手</strong>
              <small>只从已收录资讯里找线索</small>
            </span>
          </div>
          <button className="assistant-close" type="button" tabIndex={tabIndex} aria-label="关闭 AI 助手" onClick={closeAssistant}>
            <CloseIcon />
          </button>
        </div>

        <div className="assistant-messages" aria-live="polite" aria-busy={status === 'loading'}>
          {messages.map((entry) => (
            <div className={`assistant-message assistant-message--${entry.role}${entry.isError ? ' assistant-message--error' : ''}`} key={entry.id}>
              <p>{entry.text}</p>
              {entry.items?.length ? (
                <div className="assistant-results">
                  {entry.items.map((article) => (
                    <AssistantResult key={article.id} article={article} onOpen={onOpen} tabIndex={tabIndex} />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {status === 'loading' && (
            <div className="assistant-message assistant-message--assistant assistant-message--thinking" role="status">
              <span>正在替你整理今天的信号</span><span className="assistant-thinking-dots" aria-hidden="true">···</span>
            </div>
          )}
        </div>

        {enabled ? (
          <>
            <div className="assistant-prompts" aria-label="推荐问题示例">
              {STARTER_PROMPTS.map((prompt) => (
                <button key={prompt} type="button" tabIndex={tabIndex} onClick={() => selectPrompt(prompt)}>{prompt}</button>
              ))}
            </div>
            <form className="assistant-form" onSubmit={submit}>
              <label htmlFor="assistant-question">告诉我你想找什么</label>
              <div className="assistant-input-row">
                <input
                  ref={inputRef}
                  id="assistant-question"
                  type="text"
                  tabIndex={tabIndex}
                  value={message}
                  maxLength={500}
                  autoComplete="off"
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="例如：推荐最近的 Agent 资讯"
                />
                <button type="submit" tabIndex={tabIndex} disabled={status === 'loading' || !message.trim()}>
                  {status === 'loading' ? '整理中…' : '发送'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <p className="assistant-empty">智能推荐尚未配置 LLM API，请先在 backend/.env 中配置。</p>
        )}
      </div>

      {showLauncher && (
        <button
          ref={launcherRef}
          className="assistant-launcher"
          type="button"
          aria-expanded={isOpen}
          aria-controls="assistant-panel"
          aria-label={isOpen ? '关闭 AI 助手' : '打开 AI 助手'}
          onClick={isOpen ? closeAssistant : openAssistant}
        >
          <span className="assistant-launcher-icon"><AssistantIcon /></span>
          <span>AI 助手</span>
          <i aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
