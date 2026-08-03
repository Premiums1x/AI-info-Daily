export function orderedArticles(articles, shift = 0) {
  if (!articles.length) return [];
  const offset = ((shift % articles.length) + articles.length) % articles.length;
  return articles.slice(offset).concat(articles.slice(0, offset));
}

export function filterArticles(articles, { topic = '全部', query = '', shift = 0 } = {}) {
  const normalizedQuery = query.trim().toLowerCase();

  return orderedArticles(articles, shift).filter((article) => {
    const topicMatches = topic === '全部' || article.topic === topic;
    const searchable = [
      article.title,
      article.summary,
      article.source,
      article.topic,
      article.type,
      ...(article.tags || []),
    ].join(' ').toLowerCase();

    return topicMatches && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}

export function fanPose(total, index) {
  if (total <= 1) return { angle: 0, lift: 0 };

  const center = (total - 1) / 2;
  const distance = index - center;
  const maxAngle = total === 2 ? 7 : Math.min(10, 4 + total);

  return {
    angle: Number((distance / center * maxAngle).toFixed(2)),
    lift: Number((Math.abs(distance) * 8).toFixed(2)),
  };
}

export function getStickyNavState(scrollY, dockBottom) {
  return scrollY > dockBottom;
}
