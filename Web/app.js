const articles = [
  {
    id: 'agent-plan',
    rank: 'A',
    topic: 'Agent',
    source: 'OpenAI',
    time: '18 分钟前',
    type: '研究信号',
    title: '模型开始学会“先做计划”，Agent 的下一站是长任务执行',
    summary: '从单轮问答到多步工作流，新的训练范式正在改变模型处理复杂目标的方式。',
    detail: '今天最值得追踪的变化，不是模型又多会回答一个问题，而是它开始把目标拆成一连串可验证的动作。计划、调用工具、检查结果，再决定下一步——这条链路正在从演示走向工程实践。',
    tags: ['Agent', '计划能力'],
    accent: 'forest',
    url: 'https://openai.com/news/',
  },
  {
    id: 'open-model',
    rank: 'K',
    topic: '开源模型',
    source: 'Hugging Face',
    time: '42 分钟前',
    type: '开源动向',
    title: '开放权重模型迎来“小模型时刻”',
    summary: '7B 级模型配合更好的工具链，正在变成真实可用的生产选项。',
    detail: '模型变小之后，重要的事情没有变少：部署成本下降、反馈速度变快、团队可以在本地拥有更多控制权。今天的开源信号，指向的是一条更务实的产品化路径。',
    tags: ['开源模型', '部署'],
    accent: 'moss',
    url: 'https://huggingface.co/blog',
  },
  {
    id: 'inference-cost',
    rank: 'Q',
    topic: '算力',
    source: 'SemiAnalysis',
    time: '2 小时前',
    type: '基础设施',
    title: '推理成本继续下探，应用的商业空间正在打开',
    summary: '硬件利用率、量化和专用推理芯片，共同改变每次调用背后的成本结构。',
    detail: '当一次推理的成本继续往下走，AI 应用就不必只围绕“高价值、低频次”的场景生存。更细碎、更持续的工作流，开始有机会成为产品。',
    tags: ['算力', '商业'],
    accent: 'ochre',
    url: 'https://semianalysis.com/',
  },
  {
    id: 'ai-native-product',
    rank: 'J',
    topic: 'AI 产品',
    source: 'The Verge',
    time: '1 小时前',
    type: '产品观察',
    title: 'AI 产品不再只展示一个聊天框，而是直接接管一段工作流',
    summary: '产品竞争的焦点正从模型参数转向任务完成率。',
    detail: '越来越多的产品开始把模型藏到动作背后：整理会议、填好表格、执行一段查询。用户不再关心“模型回答得像不像人”，而更关心结果有没有真的完成。',
    tags: ['AI 产品', '工作流'],
    accent: 'ember',
    url: 'https://www.theverge.com/ai-artificial-intelligence',
  },
  {
    id: 'memory-layer',
    rank: '10',
    topic: 'Agent',
    source: 'LlamaIndex',
    time: '3 小时前',
    type: '工程实践',
    title: '让 Agent 记住重要的事：长期记忆开始走向工程化',
    summary: '新的记忆层设计，尝试把上下文变成可管理、可检索、可评估的系统组件。',
    detail: '“记住”不再只是把更多文本塞进上下文窗口。真正可用的记忆需要有边界、有更新策略，也需要让人知道它为什么在这一刻被调用。',
    tags: ['Agent', '记忆'],
    accent: 'moss',
    url: 'https://www.llamaindex.ai/blog',
  },
  {
    id: 'interface-shift',
    rank: '9',
    topic: 'AI 产品',
    source: 'MIT Technology Review',
    time: '4 小时前',
    type: '设计视角',
    title: '真正好用的 AI 界面，可能会越来越不像一个“应用”',
    summary: '当模型变成入口，软件的边界开始从页面和按钮移动到意图与结果之间。',
    detail: '这不是要把所有按钮都藏起来，而是重新思考哪些步骤应该被用户看见、哪些步骤应该交给系统完成。好的 AI 界面，可能是一条更短、更可解释的路径。',
    tags: ['AI 产品', '设计'],
    accent: 'ember',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence/',
  },
  {
    id: 'tool-use',
    rank: '8',
    topic: 'Agent',
    source: 'Anthropic',
    time: '6 小时前',
    type: '方法论',
    title: '工具调用真正成熟的标志，是失败之后知道如何回来',
    summary: '比“能不能调用工具”更难的问题，是如何验证结果并安全地重试。',
    detail: '一个可靠的 Agent 不会把每一次调用都当作成功。它需要知道什么时候停下、什么时候解释失败、什么时候把决定交还给人。',
    tags: ['Agent', '可靠性'],
    accent: 'ochre',
    url: 'https://www.anthropic.com/news',
  },
];

let currentTopic = '全部';
let currentQuery = '';
let dealRound = 0;
let lastTrigger = null;
let toastTimer = null;

const cardHand = document.querySelector('#card-hand');
const canvasEmpty = document.querySelector('#canvas-empty');
const topicCount = document.querySelector('#topic-count');
const topicDock = document.querySelector('#topic-dock');
const searchToggle = document.querySelector('#search-toggle');
const searchPanel = document.querySelector('#search-panel');
const searchInput = document.querySelector('#search-input');
const focusSheet = document.querySelector('#focus-sheet');
const toast = document.querySelector('#toast');
const deckFlip = document.querySelector('#deck-flip');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function orderedArticles() {
  const shift = dealRound % articles.length;
  return articles.slice(shift).concat(articles.slice(0, shift));
}

function filteredArticles() {
  const query = currentQuery.trim().toLowerCase();
  return orderedArticles().filter((article) => {
    const topicMatches = currentTopic === '全部' || article.topic === currentTopic;
    const searchable = [article.title, article.summary, article.source, article.topic, article.type].concat(article.tags).join(' ').toLowerCase();
    return topicMatches && (!query || searchable.includes(query));
  });
}

function fanPose(total, index) {
  if (total <= 1) return { angle: 0, lift: 0 };
  const center = (total - 1) / 2;
  const distance = index - center;
  const maxAngle = total === 2 ? 7 : Math.min(10, 4 + total);
  return {
    angle: Number((distance / center * maxAngle).toFixed(2)),
    lift: Number((Math.abs(distance) * 8).toFixed(2)),
  };
}

function cardMarkup(article, index, total) {
  const pose = fanPose(total, index);
  const delay = index * 42;
  return [
    '<article class="news-card is-entering tone-', article.accent, '" data-id="', article.id,
    '" style="--angle:', pose.angle, 'deg;--lift:', pose.lift,
    'px;--deal-delay:', delay, 'ms;--stack:', index + 1, ';">',
    '<button class="card-surface" type="button" data-open-brief="', article.id,
    '" aria-label="打开《', escapeHtml(article.title), '》">',
    '<span class="card-content">',
    '<span class="card-topline"><span class="card-source"><i aria-hidden="true"></i>', escapeHtml(article.source),
    '</span><span class="card-time">', escapeHtml(article.time), '</span></span>',
    '<span class="card-rankline"><span class="card-rank">', escapeHtml(article.rank),
    '</span><span class="card-type">', escapeHtml(article.type), '</span></span>',
    '<span class="card-title">', escapeHtml(article.title), '</span>',
    '<span class="card-summary">', escapeHtml(article.summary), '</span>',
    '<span class="card-bottom"><span class="card-tags">',
    article.tags.map((tag) => '<span class="card-tag">' + escapeHtml(tag) + '</span>').join(''),
    '</span><span class="card-open-label">打开简报 <span aria-hidden="true">↗</span></span></span>',
    '</span></button></article>',
  ].join('');
}

function setCardPopState(card, active) {
  card.classList.toggle('is-popping', active);
  if (active) {
    cardHand.classList.add('has-pop');
  } else if (!cardHand.querySelector('.news-card.is-popping')) {
    cardHand.classList.remove('has-pop');
  }
}

function syncCardPopState(card) {
  setCardPopState(card, card.matches(':hover') || card.matches(':focus-within'));
}

function bindCardMotion() {
  cardHand.querySelectorAll('.news-card').forEach((card) => {
    card.addEventListener('pointerenter', () => setCardPopState(card, true));
    card.addEventListener('pointerleave', () => {
      window.requestAnimationFrame(() => syncCardPopState(card));
    });
    card.addEventListener('focusin', () => setCardPopState(card, true));
    card.addEventListener('focusout', () => {
      window.requestAnimationFrame(() => syncCardPopState(card));
    });
  });
}

function renderHand(animate = true) {
  const visible = filteredArticles();
  cardHand.dataset.count = String(visible.length);
  cardHand.innerHTML = visible.map((article, index) => cardMarkup(article, index, visible.length)).join('');
  canvasEmpty.hidden = visible.length > 0;
  topicCount.textContent = currentQuery
    ? '找到 ' + String(visible.length).padStart(2, '0') + ' 张牌'
    : String(visible.length) + ' 张牌';

  cardHand.querySelectorAll('[data-open-brief]').forEach((button) => {
    button.addEventListener('click', () => openBrief(button.dataset.openBrief, button));
  });
  bindCardMotion();

  const cards = Array.from(cardHand.querySelectorAll('.news-card'));
  if (!animate) {
    cards.forEach((card) => card.classList.remove('is-entering'));
    return;
  }

  window.requestAnimationFrame(() => {
    cards.forEach((card) => card.classList.remove('is-entering'));
  });
}

function updateTopicState(topic) {
  currentTopic = topic;
  topicDock.querySelectorAll('.topic-button').forEach((button) => {
    const active = button.dataset.topic === topic;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  renderHand();
}

function isSearchOpen() {
  return searchPanel.classList.contains('is-open');
}

function openSearch() {
  searchPanel.classList.add('is-open');
  searchPanel.setAttribute('aria-hidden', 'false');
  searchInput.tabIndex = 0;
  searchToggle.setAttribute('aria-expanded', 'true');
  window.setTimeout(() => { if (isSearchOpen()) searchInput.focus(); }, 120);
}

function closeSearch() {
  searchPanel.classList.remove('is-open');
  searchPanel.setAttribute('aria-hidden', 'true');
  searchInput.tabIndex = -1;
  searchToggle.setAttribute('aria-expanded', 'false');
  if (document.activeElement === searchInput) searchToggle.focus();
}

function openBrief(id, trigger) {
  const article = articles.find((item) => item.id === id);
  if (!article) return;
  lastTrigger = trigger || cardHand.querySelector('[data-open-brief="' + id + '"]');
  document.querySelector('#sheet-rank').textContent = article.rank;
  document.querySelector('#sheet-type').textContent = article.type;
  document.querySelector('#sheet-source').textContent = article.source;
  document.querySelector('#sheet-time').textContent = article.time;
  document.querySelector('#sheet-topic').textContent = article.topic;
  document.querySelector('#sheet-title').textContent = article.title;
  document.querySelector('#sheet-summary').textContent = article.summary;
  document.querySelector('#sheet-detail').textContent = article.detail;
  document.querySelector('#sheet-tags').innerHTML = article.tags.map((tag) => '<span>' + escapeHtml(tag) + '</span>').join('');
  document.querySelector('#source-link').href = article.url;
  document.querySelector('#sheet-dot').dataset.accent = article.accent;
  focusSheet.hidden = false;
  document.body.classList.add('is-sheet-open');
  document.querySelector('#sheet-close').focus();
}

function closeBrief() {
  if (focusSheet.hidden) return;
  focusSheet.hidden = true;
  document.body.classList.remove('is-sheet-open');
  if (lastTrigger && document.contains(lastTrigger)) {
    lastTrigger.focus();
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

deckFlip.addEventListener('click', () => {
  const flipped = deckFlip.classList.toggle('is-flipped');
  deckFlip.setAttribute('aria-expanded', String(flipped));
  deckFlip.setAttribute('aria-label', flipped ? '合上今日信号牌：先做计划，再执行长任务' : '翻开今日信号牌');
  if (flipped) showToast('已翻开 A 号牌：先做计划，再执行长任务');
});

topicDock.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target.closest('.topic-button') : null;
  if (target) updateTopicState(target.dataset.topic);
});

searchToggle.addEventListener('click', () => {
  if (isSearchOpen()) closeSearch();
  else openSearch();
});

searchInput.addEventListener('input', (event) => {
  currentQuery = event.target.value;
  renderHand(false);
});

document.querySelector('#deal-button').addEventListener('click', () => {
  dealRound += 1;
  renderHand();
  showToast('已重新发牌：今天的重点换了一个顺序');
});

function goToFirstCard() {
  const firstButton = cardHand.querySelector('[data-open-brief]');
  cardHand.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.setTimeout(() => firstButton?.focus(), 480);
}

document.querySelector('#read-first').addEventListener('click', goToFirstCard);
document.querySelector('#read-toggle').addEventListener('click', goToFirstCard);

document.querySelector('#sheet-close').addEventListener('click', closeBrief);
focusSheet.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.matches('[data-close-sheet]')) closeBrief();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!focusSheet.hidden) closeBrief();
    else if (isSearchOpen()) closeSearch();
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearch();
  }

  if (event.key === 'Tab' && !focusSheet.hidden) {
    const focusable = Array.from(focusSheet.querySelectorAll('button, a[href]')).filter((item) => !item.hasAttribute('disabled'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

document.querySelector('#profile-button').addEventListener('click', () => showToast('个人偏好将在后续版本开放'));
document.querySelector('#subscribe-button').addEventListener('click', () => showToast('明日信号提醒将在后续版本开放'));

document.querySelectorAll('.topic-button').forEach((button) => {
  const topic = button.dataset.topic;
  const count = articles.filter((article) => topic === '全部' || article.topic === topic).length;
  const counter = button.querySelector('[data-topic-count]');
  if (counter) counter.textContent = String(count).padStart(2, '0');
});

renderHand();






