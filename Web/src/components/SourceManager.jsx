import { useEffect, useRef, useState } from 'react';

import '../source-manager.css';


function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}


function sourceStatus(source) {
  if (source.lastError) return { label: '最近失败', tone: 'error' };
  if (!source.lastSuccessAt) return { label: '等待首次抓取', tone: 'idle' };
  return { label: '运行正常', tone: 'ok' };
}


function lastSyncLabel(value) {
  if (!value) return '尚未同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '尚未同步';
  return `上次同步 ${date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}


export default function SourceManager({
  isOpen,
  sources,
  isSaving,
  errorMessage,
  onClose,
  onCreate,
  onToggle,
}) {
  const [name, setName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    document.body.classList.add('is-sheet-open');
    setName('');
    setFeedUrl('');
    const frame = window.requestAnimationFrame(() => nameRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('is-sheet-open');
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = (event) => {
    event.preventDefault();
    onCreate({ name: name.trim(), feed_url: feedUrl.trim() });
  };

  return (
    <div className="source-manager-layer" role="presentation">
      <button className="source-manager-backdrop" type="button" aria-label="关闭信源管理" onClick={onClose} />
      <section className="source-manager-dialog" role="dialog" aria-modal="true" aria-labelledby="source-manager-title">
        <header className="source-manager-header">
          <div>
            <p className="source-manager-kicker">SOURCE CABINET</p>
            <h2 id="source-manager-title">管理你的信源</h2>
            <p>把长期关注的 RSS / Atom 地址放进来，下一次同步就会一起发牌。</p>
          </div>
          <button className="source-manager-close" type="button" aria-label="关闭信源管理" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <form className="source-manager-form" onSubmit={submit}>
          <label>
            <span>信源名称</span>
            <input
              ref={nameRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：Anthropic News"
              required
              maxLength={200}
            />
          </label>
          <label>
            <span>RSS / Atom 地址</span>
            <input
              type="url"
              value={feedUrl}
              onChange={(event) => setFeedUrl(event.target.value)}
              placeholder="https://example.com/feed.xml"
              required
            />
          </label>
          <div className="source-manager-form-footer">
            <small>只接受公开的 HTTP(S) RSS / Atom 地址；保存后会在本次同步中尝试抓取。</small>
            <button className="source-manager-submit" type="submit" disabled={isSaving}>
              {isSaving ? '正在接入…' : '接入这个信源'}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>

        {errorMessage ? <p className="source-manager-error" role="alert">{errorMessage}</p> : null}

        <div className="source-manager-list-heading">
          <span>已在手上的信源</span>
          <small>{sources.length} 个</small>
        </div>

        <div className="source-manager-list">
          {sources.map((source) => {
            const status = sourceStatus(source);
            return (
              <article className={`source-manager-item${source.enabled ? '' : ' is-disabled'}`} key={source.id}>
                <span className={`source-manager-item-dot tone-${source.accent}`} aria-hidden="true" />
                <div className="source-manager-item-copy">
                  <div className="source-manager-item-title">
                    <strong>{source.name}</strong>
                    <span className={`source-manager-status is-${status.tone}`}>{status.label}</span>
                  </div>
                  <span className="source-manager-item-url" title={source.feedUrl || source.name}>
                    {source.feedUrl || '原型数据源，启动后端后可管理'}
                  </span>
                  <small>{source.articleCount} 张牌 · {lastSyncLabel(source.lastSuccessAt)}</small>
                </div>
                <button
                  className="source-manager-toggle"
                  type="button"
                  disabled={isSaving}
                  onClick={() => onToggle(source)}
                >
                  {source.enabled ? '停用' : '启用'}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
