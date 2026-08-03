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

export function summarizeSources(articles, sourceMeta = {}) {
  const summary = new Map();

  articles.forEach((article) => {
    const id = getSourceId(article);
    const name = getSourceName(article, id);
    if (!summary.has(id)) {
      const index = summary.size;
      const [defaultX, defaultY] = DEFAULT_SOURCE_POSITIONS[index % DEFAULT_SOURCE_POSITIONS.length];
      const meta = sourceMeta[id] ?? sourceMeta[name] ?? {};
      summary.set(id, {
        id,
        name,
        index,
        articleCount: 0,
        accent: meta.accent ?? article.accent ?? SOURCE_ACCENTS[index % SOURCE_ACCENTS.length],
        x: isSafeCoordinate(meta.x) ? meta.x : defaultX,
        y: isSafeCoordinate(meta.y) ? meta.y : defaultY,
      });
    }
    summary.get(id).articleCount += 1;
  });

  return [...summary.values()];
}

export function filterArticlesBySource(articles, source = '全部') {
  if (!source || source === '全部') return [...articles];

  return articles.filter((article) => getSourceId(article) === source);
}
