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

## API

```text
GET /api/v1/articles
GET /api/v1/articles/{id}
GET /api/v1/categories
GET /api/v1/featured
GET /api/v1/health
```

`/api/v1/articles` 支持 `q`、`category`、`tag`、`since_hours`、`limit`、`offset` 和 `sort` 参数。

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

