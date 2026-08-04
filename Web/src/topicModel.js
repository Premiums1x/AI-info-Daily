function namesForArticle(article) {
  const values = Array.isArray(article.topics) && article.topics.length
    ? article.topics
    : [article.topic];

  return [...new Set(
    values
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean),
  )];
}

export function summarizeTopics(articles) {
  const counts = new Map();

  articles.forEach((article) => {
    namesForArticle(article).forEach((name) => {
      counts.set(name, (counts.get(name) || 0) + 1);
    });
  });

  return [
    { name: '全部', count: articles.length },
    ...[...counts.entries()].map(([name, count]) => ({ name, count })),
  ];
}
export function mergeTopicItems(remoteItems, articles) {
  const items = Array.isArray(remoteItems)
    ? remoteItems
      .filter((item) => item && typeof item.name === 'string' && item.name.trim())
      .map((item) => ({ name: item.name.trim(), count: Number(item.count) || 0 }))
    : [];

  return items.length
    ? [{ name: '全部', count: articles.length }, ...items]
    : summarizeTopics(articles);
}