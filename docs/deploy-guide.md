# LifeBoard 部署与配置指南

## 架构总览

```
┌─────────────────────────────────────┐
│  LifeBoard 前端 (React)             │  localhost:5173
│  仪表盘 · 设置 · 待办奖励只读页        │
└────────────┬────────────────────────┘
             │ Vite 代理 /api
┌────────────▼────────────────────────┐
│  LifeBoard 后端 (FastAPI)           │  localhost:8000
│  同步 · 分析 · 调度 · reward-todo 代理 │
└─────┬──────────────┬─────────────────┘
      │ asyncpg      │ httpx
┌─────▼──────┐  ┌────▼─────────────────┐
│ PostgreSQL │  │  ezbookkeeping       │  localhost:8080
│ (lifeboard)│  │  (同一 compose 网络)   │
└────────────┘  └────┬─────────────────┘
                      │ host.docker.internal:8088
                 ┌────▼─────────────────┐
                 │ reward-todo          │  localhost:8088
                 │ 独立 Docker 项目       │
                 └──────────────────────┘
```

所有服务由一个 `docker-compose.yml` 统一管理，`docker compose up -d` 一键启动全部。

---

## 一、首次启动

```bash
cd my-project
cp .env.example .env
# 编辑 .env，填入 EZBOOKKEEPING_TOKEN 和 POSTGRES_PASSWORD
docker compose up -d
```

四个服务依次启动：`db` → `ezbookkeeping` → `backend` → `frontend`

确认状态：
```bash
docker compose ps
# 预期: db、ezbookkeeping、backend、frontend 均为 Up

curl http://localhost:8000/api/health
# 预期: {"status":"ok"}
```

如果需要联通待办-奖励只读页，还要单独启动 `reward-todo`：

```bash
cd ../reward-todo
cp .env.example .env
docker compose up -d
```

---

## 二、获取 API 令牌（一次性）

ezbookkeeping 已配置 `EBK_SECURITY_ENABLE_API_TOKEN=true`。

1. 打开 http://localhost:8080
2. 登录后进入 **设置** → **API 令牌**
3. 点击 **生成令牌**，复制生成的 Token
4. 将 Token 填入 `.env` 文件的 `EZBOOKKEEPING_TOKEN` 字段
5. 重启后端：`docker compose restart backend`

---

## 三、同步数据

### 3.1 首次同步

1. 访问 http://localhost:5173/settings
2. 点击 **立即同步**
3. 等待几秒，看到 `同步完成 — 账户 X条, 分类 X条, 交易 X条`

### 3.2 查看仪表盘

回到首页 http://localhost:5173 查看：
- 本月收入/支出/结余/总资产概览卡片
- 月度收支趋势柱状图
- 支出分类占比环形图
- 资产变化趋势面积图

### 3.3 查看 Reward Todo 只读页

访问 `今日 / 项目 / 奖励` 三页时，数据来自 `reward-todo` 的只读 API：

```bash
curl http://localhost:8000/api/reward-todo/summary
curl "http://localhost:8000/api/reward-todo/today?date=2026-06-21"
```

预期：

- `reward-todo` 正常时返回 `200` JSON
- `reward-todo` 未启动或 token 不匹配时返回 `503`

### 3.4 定时同步

后端默认每 60 分钟自动同步一次（环境变量 `SYNC_INTERVAL_MINUTES` 可调）。

---

## 四、网络互通原理

所有服务在同一 Docker Compose 网络内，通过 **服务名** 直接通信：

| 来源 | 目标 | 地址 | 说明 |
|---|---|---|---|
| backend 容器 | ezbookkeeping | `http://ezbookkeeping:8080` | Compose 内部 DNS |
| backend 容器 | PostgreSQL | `db:5432` | Compose 内部 DNS |
| backend 容器 | reward-todo | `http://host.docker.internal:8088` | 读取独立项目公开只读 API |
| 浏览器 | 前端 | `localhost:5173` | 端口映射 |
| 浏览器 | 后端 | `localhost:8000` | 端口映射 |
| 浏览器 | ezbookkeeping | `localhost:8080` | 端口映射 |
| 浏览器 | reward-todo | `localhost:8088` | 独立项目单入口 |

---

## 五、目录结构

```
my-project/
├── docker-compose.yml          ← 四个服务统一编排
├── ezbookkeeping-data/         ← ezbookkeeping SQLite 数据
│   └── ezbookkeeping.db
├── backend/
│   ├── app/
│   │   ├── api/                ← API 路由 (dashboard, sync, reward_todo)
│   │   ├── datasources/        ← 数据源插件与 reward-todo 代理
│   │   │   ├── base.py         ← DataSourceBase 抽象接口
│   │   │   └── ezbookkeeping.py ← ezbookkeeping 适配器
│   │   ├── models/             ← SQLAlchemy 模型
│   │   ├── schemas/            ← Pydantic 模型
│   │   └── services/           ← 业务逻辑 (sync, analytics)
│   └── tests/                  ← 单元测试
└── frontend/
    └── src/
        ├── api/client.ts       ← API 客户端
        ├── components/         ← 图表组件 (ECharts)
        ├── pages/              ← 页面 (Dashboard, Settings)
        └── hooks/              ← useDashboard
```

---

## 六、环境变量参考

| 变量 | 说明 | 默认值 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 连接串 | — |
| `EZBOOKKEEPING_BASE_URL` | ezbookkeeping 地址 | `http://ezbookkeeping:8080` |
| `EZBOOKKEEPING_TOKEN` | API 令牌（从 ezbookkeeping 网页端获取） | 必填 |
| `REWARD_TODO_BASE_URL` | `reward-todo` 公开只读 API 地址 | `http://host.docker.internal:8088` |
| `REWARD_TODO_READONLY_TOKEN` | `reward-todo` Bearer Token | `replace-me` |
| `REWARD_TODO_APP_URL` | 前端跳转到 `reward-todo` 的地址 | `http://127.0.0.1:8088` |
| `SYNC_INTERVAL_MINUTES` | 定时同步间隔（分钟） | `60` |

所有环境变量在 `.env` 文件中配置，参考 `.env.example`。

---

## 七、Reward Todo 集成说明

`lifeboard` 不再暴露本地待办-奖励写接口，旧的 `/api/daily-tasks`、`/api/task-projects`、`/api/rewards/*` 已停止注册。当前仅保留只读代理：

- `GET /api/reward-todo/summary`
- `GET /api/reward-todo/today?date=YYYY-MM-DD`
- `GET /api/reward-todo/ledger?limit=N`
- `GET /api/reward-todo/projects`
- `GET /api/reward-todo/templates?project_id=ID`

前端三页已改成只读展示，并在页面顶部提供“前往 Reward Todo 管理”跳转按钮。

---

## 八、API 适配说明

ezbookkeeping API 的实际路径格式为 `/api/v1/<resource>/*.json`，需要 `X-Timezone-Offset: 480` 请求头，ID 字段在响应中为字符串。

适配器文件 `backend/app/datasources/ezbookkeeping.py` 已处理这些差异：
- **路径转换**：`/api/v1/accounts/list.json`、`/api/v1/transactions/list/all.json`、`/api/v1/transaction/categories/list.json`
- **字段映射**：`sourceAccountId` → `account_id`、`sourceAmount` → `amount`、`time` → `transaction_time`
- **类型转换**：`str` ID → `int64`、`sourceAccount.currency` → transaction currency
- **分类展平**：层级 `subCategories` 结构递归展平为扁列表

---

## 九、扩展数据源

仅需两步接入新数据源：

```python
# backend/app/datasources/fitbit.py
from app.datasources.base import DataSourceBase, TransactionData

class FitbitSource(DataSourceBase):
    name = "fitbit"

    async def fetch_accounts(self) -> list[AccountData]: ...
    async def fetch_categories(self) -> list[CategoryData]: ...
    async def fetch_transactions(self, ...) -> list[TransactionData]: ...
    async def health_check(self) -> bool: ...
```

参考 `ezbookkeeping.py` 了解完整实现模式。
