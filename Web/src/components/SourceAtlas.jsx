export default function SourceAtlas({
  sources,
  activeSource,
  articleCount,
  isRefreshing,
  statusMessage,
  onSelect,
}) {
  const defaultStatus = isRefreshing
    ? '正在同步信源…'
    : '悬停节点查看来源，点击后筛选牌组';

  return (
    <section className={`source-atlas${isRefreshing ? ' is-refreshing' : ''}`} aria-label="今日信源星图">
      <div className="source-atlas-bar">
        <span>今天接入的信源</span>
        <span>{sources.length} 个来源 · {articleCount} 张牌</span>
      </div>

      <div className="source-orbit" role="group" aria-label="可筛选的信源节点">
        <span className="source-orbit-line source-orbit-line--one" aria-hidden="true" />
        <span className="source-orbit-line source-orbit-line--two" aria-hidden="true" />
        <span className="source-core" aria-hidden="true">
          <strong>{sources.length}</strong>
          <small>个信源</small>
        </span>

        {sources.map((source) => {
          const isActive = activeSource === source.id;
          return (
            <button
              key={source.id}
              className={`source-node tone-${source.accent}${isActive ? ' is-active' : ''}`}
              style={{
                '--source-x': `${source.x}%`,
                '--source-y': `${source.y}%`,
                '--source-delay': `${source.index * 64}ms`,
              }}
              type="button"
              aria-label={`${source.name}，${source.articleCount} 张牌`}
              aria-pressed={isActive}
              onClick={() => onSelect(isActive ? '全部' : source.id)}
            >
              <i aria-hidden="true" />
              <span className="source-node-label">
                <strong>{source.name}</strong>
                <small>{source.articleCount} 张牌</small>
              </span>
            </button>
          );
        })}
      </div>

      <p className="source-atlas-status" aria-live="polite">
        {statusMessage || defaultStatus}
      </p>
    </section>
  );
}
