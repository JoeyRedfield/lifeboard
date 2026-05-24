# LifeBoard 部署与配置指南

## 架构总览

```
┌─────────────────────────────────────┐
│  LifeBoard 前端 (React)             │  localhost:5173
│  仪表盘 · 设置                       │
└────────────┬────────────────────────┘
             │ Vite 代理 /api
┌────────────▼────────────────────────┐
│  LifeBoard 后端 (FastAPI)           │  localhost:8000
│  同步 · 分析 · 调度                  │
└─────┬──────────────┬────────────────┘
      │ asyncpg      │ httpx (host.docker.internal:8080)
┌─────▼──────┐  ┌────▼─────────────────┐
│ PostgreSQL │  │  ezbookkeeping       │  localhost:8080
│ (lifeboard)│  │  (外部数据源)         │
└────────────┘  └──────────────────────┘
```

---

## 一、启动 ezbookkeeping 并获取 API 令牌

### 1.1 启动 ezbookkeeping

```bash
cd /Users/wuzhuoyi/Desktop/docker-data/ezb-data
docker compose up -d
```

已配置环境变量 `EBK_SECURITY_ENABLE_API_TOKEN=true`，重启后 API 令牌功能自动开启。

### 1.2 获取 API 令牌

1. 浏览器打开 http://localhost:8080
2. 登录后进入 **设置** → **API 令牌**（左侧菜单底部）
3. 点击 **生成令牌**，记录生成的 Token（只显示一次）

![](https://ezbookkeeping.mayswind.net/zh_Hans/configuration/)

### 1.3 确认 ezbookkeeping 正常运行

```bash
docker ps | grep ezbookkeeping
# 预期输出: ezbookkeeping132   Up ...
```

---

## 二、配置 LifeBoard

### 2.1 填入 API 令牌

编辑 `docker-compose.yml` 中的 `EZBOOKKEEPING_TOKEN`：

```yaml
backend:
  environment:
    EZBOOKKEEPING_BASE_URL: "http://host.docker.internal:8080"
    EZBOOKKEEPING_TOKEN: "将这里替换为你的真实令牌"
```

> **说明**：`host.docker.internal` 是 Docker Desktop / Orbstack 提供的特殊 DNS，容器可通过它访问宿主机上暴露的端口。ezbookkeeping 映射在宿主机的 `8080` 端口，所以用这个地址。

### 2.2 网络互通原理

| 来源 | 目标 | 地址 | 说明 |
|---|---|---|---|
| LifeBoard 后端容器 | ezbookkeeping | `host.docker.internal:8080` | 通过 Orbstack 特殊 DNS 访问宿主机端口 |
| LifeBoard 后端容器 | PostgreSQL | `db:5432` | 同一 compose 网络内直接通信 |
| 浏览器 | LifeBoard 前端 | `localhost:5173` | 宿主机端口映射 |
| 浏览器 | LifeBoard 后端 | `localhost:8000` | 宿主机端口映射 |

---

## 三、启动 LifeBoard

### 3.1 首次启动

```bash
cd /Users/wuzhuoyi/Desktop/code/my-project
docker compose up -d
```

三个服务依次启动（db → backend → frontend），PostgreSQL 就绪后后端才启动。

### 3.2 确认服务状态

```bash
docker compose ps
# 预期: db、backend、frontend 均为 Up

curl http://localhost:8000/api/health
# 预期: {"status":"ok"}
```

### 3.3 前端访问

打开 http://localhost:5173 ，看到仪表盘页面（初始无数据，需要先同步）。

---

## 四、同步数据

### 4.1 首次同步

1. 访问 http://localhost:5173/settings（设置页）
2. 点击 **立即同步** 按钮
3. 等待片刻，看到 `同步完成 — 账户 X条, 分类 X条, 交易 X条`

### 4.2 查看仪表盘

回到首页 http://localhost:5173 ，即可看到：
- 本月收入/支出/结余/总资产概览卡片
- 月度收支趋势柱状图
- 支出分类占比环形图
- 资产变化趋势面积图

### 4.3 定时同步

后端默认每 60 分钟自动同步一次（可通过 `SYNC_INTERVAL_MINUTES` 环境变量调整）。如果 ezbookkeeping 未配置，调度器自动跳过。

---

## 五、目录结构

```
/Users/wuzhuoyi/Desktop/
├── code/
│   └── my-project/                    ← LifeBoard 项目
│       ├── docker-compose.yml
│       ├── backend/                   ← FastAPI 后端
│       │   ├── app/
│       │   │   ├── api/               ← API 路由
│       │   │   ├── datasources/       ← 数据源适配器
│       │   │   │   ├── base.py        ← 抽象接口
│       │   │   │   └── ezbookkeeping.py ← ezbookkeeping 适配器
│       │   │   ├── models/            ← 数据库模型
│       │   │   ├── schemas/           ← Pydantic 模型
│       │   │   └── services/          ← 业务逻辑
│       │   └── tests/                 ← 单元测试
│       └── frontend/                  ← React 前端
│           └── src/
│               ├── components/        ← 图表组件
│               ├── pages/             ← 页面
│               └── hooks/             ← 自定义 Hook
│
└── docker-data/
    └── ezb-data/                      ← ezbookkeeping 部署
        ├── docker-compose.yml
        └── data/                      ← SQLite 数据库
            └── ezbookkeeping.db
```

---

## 六、环境变量参考

### LifeBoard 后端

| 变量 | 说明 | 默认值 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql+asyncpg://lifeboard:lifeboard@db:5432/lifeboard` |
| `EZBOOKKEEPING_BASE_URL` | ezbookkeeping 地址 | — |
| `EZBOOKKEEPING_TOKEN` | API 令牌 | — |
| `SYNC_INTERVAL_MINUTES` | 定时同步间隔（分钟） | `60` |

### ezbookkeeping（新增）

| 变量 | 说明 |
|---|---|
| `EBK_SECURITY_ENABLE_API_TOKEN` | 开启 API 令牌功能（`true`） |

---

## 七、扩展数据源

LifeBoard 的数据源接口设计为可插拔。接入新数据源只需两步：

1. 在 `backend/app/datasources/` 下新建适配器，实现 `DataSourceBase` 接口
2. 在同步服务中注册新数据源

```python
# 示例：健身数据源骨架
class FitbitSource(DataSourceBase):
    name = "fitbit"

    async def fetch_accounts(self) -> list[AccountData]: ...
    async def fetch_categories(self) -> list[CategoryData]: ...
    async def fetch_transactions(self, ...) -> list[TransactionData]: ...
    async def health_check(self) -> bool: ...
```

参考 `backend/app/datasources/ezbookkeeping.py` 了解完整实现。
