# AI Daily Backend

独立的 AI 每日资讯后端，负责 RSS/Atom 抓取、清洗、去重、分类、SQLite 持久化和 JSON API。

## 本地运行

在 `backend` 目录执行：

```powershell
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m app.jobs.run_ingest
python -m uvicorn app.main:app --reload --port 8000
```

访问：

- Swagger：<http://localhost:8000/docs>
- 健康检查：<http://localhost:8000/api/v1/health>
- 资讯列表：<http://localhost:8000/api/v1/articles>

数据库默认保存到项目根目录的 `data/news.db`。RSS 摘要和原文链接会被保存，不会抓取完整新闻正文。
健康检查中的 `scheduler.last_run_at` 是最近一次完整 ingestion 流程完成的 UTC 时间；启动、定时和手动抓取都会更新它。进程重启后，健康接口会从已持久化的 `sources.last_fetched_at` 聚合回退，因此前端仍能显示最近一次信源抓取时间。

## API

```text
GET /api/v1/articles
GET /api/v1/articles/{id}
GET /api/v1/categories
GET /api/v1/topics
GET /api/v1/daily-draw
GET /api/v1/featured
GET /api/v1/health
GET /api/v1/sources
POST /api/v1/sources
PATCH /api/v1/sources/{code}
POST /api/v1/ingestion/refresh
POST /api/v1/assistant/query
```

`/api/v1/articles` 支持 `q`、`category`、`tag`、`since_hours`、`limit`、`offset` 和 `sort` 参数。

`/api/v1/daily-draw?since_hours=24` 只返回 Hero 区域当天抽到的一张牌；同一天结果稳定，没有最近资讯时 `article` 为 `null`。

`/api/v1/featured?since_hours=24&limit=7` 是首页下方七张精选牌接口。它只返回时间范围内的文章，但会先按信源分散，再按主题补齐，最后按发布时间补足，保证默认牌面不会被单一信源占满；它不额外生成 AI 摘要。

`/api/v1/topics` 根据指定时间范围内已解析文章的标签聚合主题；没有标签的文章会使用有意义的文章分类作为兜底，“其他”不会生成主题：

```text
GET /api/v1/topics?since_hours=24
```

返回 `items: [{ code, name, count }]`，前端可以直接用 `name` 渲染主题并用 `count` 显示数量。

信源目录管理：

```text
GET   /api/v1/sources?since_hours=24
POST  /api/v1/sources
PATCH /api/v1/sources/{code}
```

新增请求体只需要提供 `name` 和公开的 `feed_url`。新增后默认启用，下一次手动或定时抓取会自动读取该信源；如果 RSS 地址暂时不可用，错误会记录在该信源的 `last_error` 中，不会阻断其他信源。`PATCH` 可用于启用或停用信源。

手动抓取当前已启用的 RSS 信源：

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/v1/ingestion/refresh
```

接口会返回本次成功、失败、新增、更新和去重数量，其中 `fetched_at` 是本次 ingestion 完成时间；抓取逻辑复用已有 ingestion pipeline。前端轮询只读取 `GET /api/v1/health`，不会触发新的 RSS 抓取。
## AI 智能推荐

初版智能推荐只从已经抓取并保存到 SQLite 的文章中筛选，不执行 Web Search，也不抓取原文全文。LLM API 只负责把用户的一句话转换成主题、关键词、分类和时间范围，后端再执行确定性的文章查询。

启用前，在 `backend` 目录的 `.env` 中配置：

```env
ASSISTANT_ENABLED=true
LLM_API_URL=https://your-provider.example/v1/chat/completions
LLM_API_KEY=your-api-key
LLM_MODEL=your-model
LLM_MAX_TOKENS=300
ASSISTANT_MAX_CONCURRENCY=1
ASSISTANT_MIN_INTERVAL_SECONDS=2
```

未配置时，普通 RSS、主题和文章接口仍然可以正常使用，智能推荐接口会返回未配置状态。

接口：

```text
POST /api/v1/assistant/query
请求体：{"message":"推荐最近的 Agent 资讯"}
```


## Docker

在 `backend` 目录执行：

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose logs -f api
```

宿主机的 `../data` 会挂载到容器 `/app/data`，容器删除后数据库仍然保留。

## 测试

```powershell
python -m pytest -q
python -m compileall app
```

