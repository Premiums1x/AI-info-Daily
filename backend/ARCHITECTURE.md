# AI Daily 后端架构与 API 说明

## 1. 项目定位

AI Daily 是独立的 AI 资讯聚合项目，不依赖现有 `blogWeb`。

后端只负责资讯采集、处理、存储和 API，不负责渲染 Web 页面。Web 端和后续微信小程序都调用同一套 JSON API。

```text
RSS / Atom 新闻源
        │
        ▼
httpx 请求
        │
        ▼
feedparser 解析
        │
        ▼
清洗、URL 规范化、去重、分类、标签提取
        │
        ▼
SQLite
        │
        ▼
FastAPI JSON API
        ├── Web
        └── 微信小程序
```

当前版本的边界：

- 保存标题、来源、时间、RSS 摘要和原文链接。
- 不保存或展示商业媒体的完整正文。
- 暂不实现登录、用户收藏、推荐算法和 AI 摘要。
- 提供轻量级信源目录管理 API，内置源和用户自定义 RSS / Atom 源统一由数据库驱动。

## 2. 目录结构

```text
backend/
├── app/
│   ├── main.py                 # FastAPI 应用、生命周期、CORS
│   ├── core/
│   │   ├── config.py           # 环境变量和运行配置
│   │   └── database.py         # SQLAlchemy Engine、Session、建表
│   ├── models/
│   │   ├── article.py          # articles 表
│   │   └── source.py           # sources 表
│   ├── schemas/
│   │   ├── article.py          # 文章 API 响应模型
│   │   ├── category.py         # 分类和精选响应模型
│   │   ├── daily_draw.py        # Hero 抽牌响应模型
│   │   └── health.py           # 健康检查响应模型
│   ├── api/v1/
│   │   ├── articles.py         # 文章列表和详情
│   │   ├── categories.py       # 分类统计
│   │   ├── daily_draw.py       # Hero 当日抽牌
│   │   ├── featured.py         # 下方精选牌编排
│   │   └── health.py           # 服务健康状态
│   ├── ingestion/
│   │   ├── sources.py          # 内置 RSS 源配置
│   │   ├── registry.py         # 数据库信源目录与默认源初始化
│   │   ├── fetcher.py          # HTTP 请求
│   │   ├── parser.py           # RSS/Atom 解析和文本清洗
│   │   ├── classifier.py       # 分类和标签规则
│   │   └── pipeline.py         # 完整采集入库流程
│   └── jobs/
│       ├── scheduler.py        # APScheduler 定时任务
│       └── run_ingest.py       # 手动抓取命令
├── tests/                      # 单元测试和 API 测试
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## 3. 应用启动流程

`app.main:app` 创建 FastAPI 应用时会完成以下初始化：

1. 读取 `Settings` 配置。
2. 创建 SQLite Engine 和 SQLAlchemy Session 工厂。
3. 执行 `Base.metadata.create_all()`，确保数据表存在。
4. 配置 CORS 和统一 HTTP 错误响应。
5. 注册 `/api/v1` 路由。

应用进入 lifespan 后：

1. 如果 `ENABLE_SCHEDULER=true`，启动 APScheduler。
2. 如果 `INGEST_ON_STARTUP=true`，立即执行一次 RSS 抓取。
3. 应用退出时关闭调度器。

定时任务默认每 120 分钟执行一次，并使用 `max_instances=1`，避免同一时间重复执行采集任务。

## 4. RSS 采集流程

### 4.1 当前新闻源

新闻源定义位于 [`app/ingestion/sources.py`](app/ingestion/sources.py)：

| code | 名称 | 地址 |
|---|---|---|
| `google_news_ai` | Google News · AI | Google News AI / 人工智能 / 大模型搜索 RSS |
| `huggingface_blog` | Hugging Face Blog | `https://huggingface.co/blog/feed.xml` |

内置来源仍由 `SourceDefinition` 提供默认值；应用首次访问信源目录或执行抓取时会将缺失的内置来源写入数据库。用户新增的 RSS / Atom 来源通过 `/api/v1/sources` 写入数据库，抓取管线只读取数据库中启用的来源。

### 4.2 单个来源的处理步骤

```text
请求 RSS
  ↓
解析 RSS 或 Atom XML
  ↓
读取 title / link / summary / published
  ↓
清除 HTML 和多余空白
  ↓
统一为 UTC 时间
  ↓
移除 utm_*、gclid、fbclid 等追踪参数
  ↓
根据 canonical_url 去重
  ↓
分类和提取标签
  ↓
写入 SQLite
```

请求由 `httpx` 完成，默认超时时间为 20 秒。`requirements.txt` 使用 `httpx[socks]`，因此在本机存在 SOCKS 代理环境变量时也可以正常请求。

### 4.3 去重规则

`original_url` 保存 RSS 中的原始链接；`canonical_url` 保存用于去重的规范化链接。

规范化时会：

- 将协议和域名转换为小写。
- 删除 URL fragment，例如 `#comments`。
- 删除 `utm_*`、`gclid`、`fbclid` 等追踪参数。
- 删除普通路径末尾的 `/`。

`articles.canonical_url` 有唯一约束。重复资讯不会新增文章，而是更新已有文章的标题、摘要、时间、分类和标签。

### 4.4 分类和标签

分类代码固定为：

| code | 中文名称 |
|---|---|
| `product` | 产品 |
| `research` | 研究 |
| `business` | 商业 |
| `open_source` | 开源 |
| `other` | 其他 |

分类由 [`app/ingestion/classifier.py`](app/ingestion/classifier.py) 根据标题和摘要中的关键词匹配。当前标签包括：

- `Agent`
- `开源模型`
- `AI 产品`
- `算力与芯片`

没有匹配到分类时使用 `other`，没有匹配到标签时返回空数组。

### 4.5 单源失败隔离

每个来源独立执行。某个来源请求失败时：

- 当前来源写入 `last_error`。
- `failed_sources` 加一。
- 其他来源继续处理。
- 本次任务不会因为一个源失败而整体中断。

手动任务会输出类似结果：

```json
{
  "successful_sources": 2,
  "failed_sources": 0,
  "inserted_articles": 100,
  "updated_articles": 0,
  "duplicate_articles": 0,
  "errors": []
}
```

## 5. 数据库设计

数据库默认位置为项目根目录的 `data/news.db`。Docker 环境中对应容器路径 `/app/data/news.db`，通过 volume 持久化。

### 5.1 `sources` 表

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | string, primary key | 来源唯一代码 |
| `name` | string | 来源显示名称 |
| `feed_url` | string | RSS/Atom 地址 |
| `enabled` | boolean | 是否启用 |
| `last_fetched_at` | datetime | 最近一次尝试抓取时间 |
| `last_success_at` | datetime | 最近一次成功抓取时间 |
| `last_error` | text | 最近一次错误信息 |
| `last_item_count` | integer | 最近一次解析到的条目数量 |

### 5.2 `articles` 表

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | integer, primary key | 文章 ID |
| `source_code` | string, foreign key | 对应 `sources.code` |
| `title` | string | 文章标题 |
| `summary` | text | RSS 摘要 |
| `original_url` | string | 原文链接 |
| `canonical_url` | string, unique | 去重链接 |
| `published_at` | datetime | 原文发布时间，UTC |
| `collected_at` | datetime | 后端采集时间，UTC |
| `category_code` | string | 分类代码 |
| `tags_json` | text | JSON 格式标签数组 |
| `search_text` | text | 用于搜索的拼接文本 |

当前没有用户表，也没有收藏表。收藏如果以后加入，应作为用户功能单独建模，不应修改公共文章数据结构。

## 6. API 总览

基础地址：

```text
http://localhost:8000/api/v1
```

接口列表：

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/articles` | 文章列表、搜索、分类、标签和分页 |
| `GET` | `/articles/{id}` | 文章详情 |
| `GET` | `/categories` | 分类统计 |
| `GET` | `/daily-draw` | Hero 当天抽一张牌 |
| `GET` | `/featured` | 下方精选牌（按信源和主题分散） |
| `GET` | `/health` | 数据库、调度器和来源健康状态 |
| `GET` | `/sources` | 全部信源及最近文章数、抓取状态 |
| `POST` | `/sources` | 新增 RSS / Atom 信源 |
| `PATCH` | `/sources/{code}` | 修改名称、地址或启停状态 |

### 6.1 通用约定

- 所有时间使用 UTC ISO 8601，例如 `2026-08-03T09:00:00Z`。
- 列表默认只查询最近 24 小时的数据。
- `limit` 使用数量限制，`offset` 使用偏移分页。
- 文章详情只返回摘要和原文链接，不返回完整正文。
- API 不返回 `saved`、用户 ID 或登录信息。
- 错误响应使用统一结构：

```json
{
  "code": "ARTICLE_NOT_FOUND",
  "message": "文章不存在"
}
```

## 7. API 详细说明

### 7.1 获取文章列表

```http
GET /api/v1/articles
```

查询参数：

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `q` | string | 无 | 搜索标题、摘要、来源和标签 |
| `category` | string | 无 | `product`、`research`、`business`、`open_source`、`other` |
| `tag` | string | 无 | 按标签搜索 |
| `since_hours` | integer | `24` | 查询最近多少小时，范围 1 到 720 |
| `limit` | integer | `20` | 返回数量，范围 1 到 50 |
| `offset` | integer | `0` | 分页偏移量 |
| `sort` | string | `latest` | `latest` 或 `oldest` |

请求示例：

```http
GET /api/v1/articles?q=Agent&category=product&limit=20&offset=0
```

响应示例：

```json
{
  "items": [
    {
      "id": 1,
      "title": "OpenAI 发布新的 Agent 工具",
      "summary": "新的 Agent 工作流工具。",
      "source": {
        "code": "google_news_ai",
        "name": "Google News · AI"
      },
      "category": {
        "code": "product",
        "name": "产品"
      },
      "tags": ["Agent", "AI 产品"],
      "original_url": "https://example.com/article",
      "published_at": "2026-08-03T09:00:00Z",
      "collected_at": "2026-08-03T09:05:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0,
  "has_more": false
}
```

### 7.2 获取文章详情

```http
GET /api/v1/articles/{id}
```

示例：

```http
GET /api/v1/articles/1
```

成功响应与列表中的单篇文章结构相同。

文章不存在时返回：

```http
404 Not Found
```

```json
{
  "code": "ARTICLE_NOT_FOUND",
  "message": "文章不存在"
}
```

### 7.3 获取分类统计

```http
GET /api/v1/categories?since_hours=24
```

响应示例：

```json
{
  "items": [
    {"code": "product", "name": "产品", "count": 16},
    {"code": "research", "name": "研究", "count": 12},
    {"code": "business", "name": "商业", "count": 9},
    {"code": "open_source", "name": "开源", "count": 11},
    {"code": "other", "name": "其他", "count": 0}
  ],
  "since_hours": 24
}
```

该接口始终返回全部五个分类，即使某个分类当前没有文章。

### 7.4 获取今日抽牌

```http
GET /api/v1/daily-draw?since_hours=24
```

该接口只为 Hero 区域返回当天的一张牌。后端按当天日期生成稳定的抽牌索引，因此同一天重复加载时会得到同一张牌，第二天会重新抽取；没有最近资讯时 `article` 返回 `null`。

响应示例：

```json
{
  "drawn_at": "2026-08-04",
  "article": null
}
```
### 7.5 获取精选牌

```http
GET /api/v1/featured?since_hours=24&limit=7
```

该接口为首页下方七张精选牌提供确定性的牌面顺序：

- 先从时间范围内按 `published_at` 倒序的文章中，每个信源选一篇。
- 如果牌数还未达到 `limit`，再优先补充尚未出现的主题。
- 最后按发布时间倒序补足剩余名额。

因此它不是 AI 推荐或摘要接口，而是一个轻量、可解释的日报编排接口。`limit` 默认 7，允许范围为 1–20；`since_hours` 默认 24。

响应示例：

```json
{
  "generated_at": "2026-08-03T09:10:00Z",
  "total_new": 48,
  "items": []
}
```

### 7.6 健康检查

```http
GET /api/v1/health
```

正常响应：

```json
{
  "status": "ok",
  "database": "ok",
  "scheduler": {
    "enabled": true,
    "last_run_at": null,
    "next_run_at": "2026-08-03T05:33:40+00:00",
    "last_status": "ok"
  },
  "sources": {
    "total": 2,
    "healthy": 2,
    "failed": 0
  }
}
```

数据库连接失败或来源存在错误时，接口仍返回 HTTP 200，但 `status` 会变为 `degraded`，调用方应检查 `database` 和 `sources.failed`。

## 8. 运行方式

### 8.1 本地运行

在 `backend` 目录执行：

```powershell
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m app.jobs.run_ingest
python -m uvicorn app.main:app --reload --port 8000
```

### 8.2 Docker 运行

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose logs -f api
```

Docker 中：

- FastAPI 监听容器的 `8000` 端口。
- 宿主机 `../data` 挂载到 `/app/data`。
- 数据库路径为 `/app/data/news.db`。
- 容器启动后会按环境变量决定是否立即采集和启动定时任务。

## 9. 前端调用建议

Web 和小程序都只依赖公共 API，不应直接访问 SQLite 或 RSS 源。

前端建议按以下方式使用：

1. 首页加载时请求 `/daily-draw?since_hours=24` 作为 Hero 当天抽牌，请求 `/featured?since_hours=24&limit=7` 作为下方七张精选牌，同时请求 `/articles` 作为完整牌库数据。
2. Hero 只展示 `/daily-draw` 返回的一张牌；下方精选牌直接使用 `/featured` 的顺序。
3. 主题、搜索和信源筛选由前端基于完整文章数据处理，完整牌库通过 `limit` 和 `offset` 分页。
4. 点击标题后进入详情层，并使用 `original_url` 跳转原文。
5. 收藏等用户状态暂时放在前端本地，不写入公共资讯 API。

## 10. 后续扩展方向

### 可以直接扩展

- 在 `sources.py` 增加更多已验证 RSS/Atom 来源。
- 增加来源健康度和抓取耗时字段。
- 将关键词分类替换为可配置规则或模型分类。
- 增加全文搜索索引。
- 增加日报摘要接口。

### 需要单独设计

- 用户登录和微信身份绑定。
- 用户收藏、阅读历史和个性化推荐。
- 更复杂的权限、审核和多用户信源管理。
- PostgreSQL、Redis 或消息队列。
- AI 摘要、翻译和内容质量评估。

这些功能不应通过修改当前文章响应的基础字段来临时实现，应保持 `/api/v1` 公共资讯接口的兼容性。信源管理已经作为独立资源实现，前端和后续小程序都可以复用。

