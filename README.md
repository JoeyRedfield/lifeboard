# LifeBoard — 个人财务数据中台

统一的个人财务数据看板，聚合多数据源、提供可视化仪表盘和 MCP Server，支持自然语言查询。当前财务数据来自 `ezbookkeeping`，待办-奖励数据改为只读接入独立项目 `reward-todo`。

## 功能

- **财务仪表盘**：月度收支总览、趋势图表、分类占比、资产变化
- **多数据源聚合**：插件式数据源架构，当前支持 ezbookkeeping
- **定时同步**：APScheduler 定时从外部数据源拉取最新数据
- **MCP Server**：6 个财务查询工具，通过 Claude Code 自然语言查询
- **Reward Todo 只读视图**：`今日 / 项目 / 奖励` 三页通过后端代理读取 `reward-todo` 的只读 API，并提供跳转入口到独立管理端

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | FastAPI + SQLAlchemy async + FastMCP |
| 数据库 | PostgreSQL 16 |
| 前端 | React 18 + TypeScript + Vite + ECharts |
| 部署 | Docker Compose |
| 数据源 | ezbookkeeping 1.5.1 + reward-todo (readonly) |

## 快速开始

### 1. 克隆项目

```bash
git clone <repo-url>
cd my-project
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入以下必填项：

- `POSTGRES_PASSWORD`：数据库密码
- `EZBOOKKEEPING_TOKEN`：ezbookkeeping API 令牌

如果本机同时运行了 `reward-todo`，默认还会读取：

- `REWARD_TODO_BASE_URL=http://host.docker.internal:8088`
- `REWARD_TODO_READONLY_TOKEN=replace-me`
- `REWARD_TODO_APP_URL=http://127.0.0.1:8088`

获取令牌：打开 ezbookkeeping 网页端 → 设置 → API 令牌 → 生成令牌。

### 3. 启动服务

```bash
docker compose up -d
```

确认状态：

```bash
docker compose ps
# 预期：db、ezbookkeeping、backend、frontend 均为 Up

curl http://localhost:8000/api/health
# {"status":"ok"}
```

### 4. 打开前端

访问 http://localhost:5173：

- `仪表盘 / 设置`：财务数据与同步控制
- `今日 / 项目 / 奖励`：`reward-todo` 只读视图

首次只读接入验证：

```bash
curl http://localhost:8000/api/reward-todo/summary
```

如果你还没启动独立的 `reward-todo`，该接口会返回 `503`。

### 5. 配置 MCP（可选）

项目根目录的 `.mcp.json` 已预配置，Claude Code 自动加载。启动后即可通过自然语言查询：

- "这个月花了多少钱？"
- "最近 3 个月收支趋势怎么样？"
- "食品类的支出占比多少？"

## 架构

```
┌─────────────────────────────────┐
│  LifeBoard 前端 (React)          │  localhost:5173
│  仪表盘 · 设置 · 待办奖励只读页     │
└────────────┬────────────────────┘
             │ /api
┌────────────▼────────────────────┐
│  LifeBoard 后端 (FastAPI)        │  localhost:8000
│  API · 同步 · 分析 · MCP Server  │
└─────┬────────────┬───────────────┘
      │ asyncpg    │ httpx
┌─────▼──────┐  ┌──▼───────────────┐
│ PostgreSQL │  │  ezbookkeeping    │  localhost:8080
└────────────┘  └──┬───────────────┘
                   │
                   │ httpx + Bearer Token
              ┌────▼───────────────┐
              │ reward-todo         │  localhost:8088
              │ 独立项目，只读接入    │
              └────────────────────┘
```

## 目录结构

```
├── docker-compose.yml       # 服务编排
├── .env.example             # 环境变量模板
├── .mcp.json                # Claude Code MCP 配置
├── backend/
│   ├── app/
│   │   ├── api/             # API 路由（dashboard、sync、reward_todo）
│   │   ├── datasources/     # 数据源插件与外部只读代理
│   │   ├── models/          # SQLAlchemy 模型
│   │   ├── services/        # 业务逻辑
│   │   ├── mcp_server.py    # MCP Server（6 个工具）
│   │   └── config.py        # 配置管理
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/      # 图表组件（ECharts）
│       ├── pages/           # 页面（Dashboard, Settings, Today, Projects, Rewards）
│       └── api/             # API 客户端
└── docs/
    ├── deploy-guide.md      # 部署与配置详细指南
    └── mcp-troubleshooting.md # MCP 故障排查记录
```

## 环境变量

| 变量 | 说明 | 必填 |
|---|---|---|
| `POSTGRES_PASSWORD` | 数据库密码 | 是 |
| `DATABASE_URL` | PostgreSQL 连接串 | 否（自动拼接） |
| `EZBOOKKEEPING_TOKEN` | ezbookkeeping API 令牌 | 是 |
| `EZBOOKKEEPING_BASE_URL` | ezbookkeeping 地址 | 否 |
| `REWARD_TODO_BASE_URL` | `reward-todo` 只读 API 基地址 | 否 |
| `REWARD_TODO_READONLY_TOKEN` | `reward-todo` Bearer 只读令牌 | 否 |
| `REWARD_TODO_APP_URL` | 前端“前往 Reward Todo 管理”跳转地址 | 否 |
| `VITE_REWARD_TODO_APP_URL` | 前端构建时注入的 `reward-todo` 地址 | 否 |
| `SYNC_INTERVAL_MINUTES` | 同步间隔（分钟） | 否（默认 60） |

## 扩展数据源

实现 `DataSourceBase` 接口即可接入新数据源：

```python
from app.datasources.base import DataSourceBase, AccountData, CategoryData, TransactionData

class MySource(DataSourceBase):
    name = "my_source"

    async def fetch_accounts(self) -> list[AccountData]: ...
    async def fetch_categories(self) -> list[CategoryData]: ...
    async def fetch_transactions(self, **kwargs) -> list[TransactionData]: ...
    async def health_check(self) -> bool: ...
```

## License

MIT
