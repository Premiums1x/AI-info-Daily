const DEFAULT_SOURCE_POSITIONS = [
  [18, 30],
  [38, 14],
  [64, 18],
  [82, 34],
  [86, 64],
  [67, 84],
  [42, 90],
  [18, 76],
  [10, 52],
  [32, 54],
  [57, 48],
  [74, 58],
];

const SOURCE_ACCENTS = ['forest', 'moss', 'ember', 'ochre'];


function getSourceId(article) {
  if (typeof article.source === 'object' && article.source !== null) {
    return article.source.id ?? article.source.code ?? article.source.name;
  }
  return article.sourceId ?? article.sourceName ?? article.source ?? 'unknown';
}


function getSourceName(article, id) {
  if (typeof article.source === 'object' && article.source !== null) {
    return article.source.name ?? id;
  }
  return article.sourceName ?? article.source ?? id;
}


function isSafeCoordinate(value) {
  return Number.isFinite(value) && value >= 10 && value <= 90;
}


function sourceCatalogEntries(sourceCatalog) {
  if (Array.isArray(sourceCatalog)) {
    return sourceCatalog.map((source) => [source.id ?? source.code ?? source.name, source]);
  }
  return Object.entries(sourceCatalog || {});
}


export function summarizeSources(articles, sourceCatalog = {}) {
  const summary = new Map();
  const catalog = sourceCatalogEntries(sourceCatalog);
  const metaById = new Map(catalog.map(([id, meta]) => [id, meta]));
  const metaByName = new Map(catalog.map(([id, meta]) => [meta.name, meta]));

  const addSource = (id, name, meta = {}, article = null) => {
    if (!id || summary.has(id)) return;
    const index = summary.size;
    const [defaultX, defaultY] = DEFAULT_SOURCE_POSITIONS[index % DEFAULT_SOURCE_POSITIONS.length];
    summary.set(id, {
      id,
      name,
      index,
      articleCount: 0,
      accent: meta.accent ?? article?.accent ?? SOURCE_ACCENTS[index % SOURCE_ACCENTS.length],
      x: isSafeCoordinate(meta.x) ? meta.x : defaultX,
      y: isSafeCoordinate(meta.y) ? meta.y : defaultY,
      feedUrl: meta.feedUrl ?? meta.feed_url ?? '',
      enabled: meta.enabled !== false,
      recentArticleCount: Number(meta.recentArticleCount ?? meta.recent_article_count) || 0,
      lastItemCount: Number(meta.lastItemCount ?? meta.last_item_count) || 0,
      lastError: meta.lastError ?? meta.last_error ?? null,
      lastFetchedAt: meta.lastFetchedAt ?? meta.last_fetched_at ?? null,
      lastSuccessAt: meta.lastSuccessAt ?? meta.last_success_at ?? null,
    });
  };

  catalog.forEach(([id, meta]) => addSource(id, meta.name ?? id, meta));

  articles.forEach((article) => {
    const id = getSourceId(article);
    const name = getSourceName(article, id);
    const meta = metaById.get(id) ?? metaByName.get(name) ?? {};
    addSource(id, name, meta, article);
    summary.get(id).articleCount += 1;
  });

  return [...summary.values()];
}


export function filterArticlesBySource(articles, source = '全部') {
  if (!source || source === '全部') return [...articles];

  return articles.filter((article) => {
    const id = getSourceId(article);
    const name = getSourceName(article, id);
    return id === source || name === source;
  });
}
