# Reward Todo Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 抽离 `lifeboard` 待办-奖励模块为独立 `reward-todo` 项目，并将 `lifeboard` 切换为读取 `reward-todo` 只读 API。

**Architecture:** 在 `/Users/wuzhuoyi/Desktop/code/reward-todo` 新建独立仓库，沿用当前 `FastAPI + SQLAlchemy + PostgreSQL + React + Vite` 技术栈，补齐 Alembic、迁移脚本、seed、Nginx 单入口与 `public API`。同时保留 `lifeboard` 既有页面，改造为后端代理读取 `reward-todo` 的只读视图，并停止暴露旧写路由。

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy async, Alembic, PostgreSQL 16, pytest, React 18, TypeScript, Vite, Vitest, nginx, Docker Compose

---

## 文件结构总览

### 新仓库 `reward-todo`

- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/.env.example`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/README.md`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/docker-compose.yml`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/Dockerfile`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/requirements.txt`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/alembic.ini`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/alembic/env.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/alembic/versions/0001_init_task_reward.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/config.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/database.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/main.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/models/__init__.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/models/task_project.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/models/task_template.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/models/daily_task.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/models/reward_ledger.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/schemas/task_reward.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/schemas/public.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/services/task_reward_service.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/api/task_reward.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/api/public.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/dependencies.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/tests/conftest.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/tests/test_task_reward_service.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/tests/test_public_api.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/scripts/migrate_from_lifeboard.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/scripts/seed_demo_data.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/package.json`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/vite.config.ts`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/App.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/api/client.ts`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/components/Layout.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/components/TaskSummaryCards.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/components/DailyTaskList.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/components/ProjectTemplatePanel.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/components/RewardLedgerPanel.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/hooks/useTodayBoard.ts`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/hooks/useProjectsBoard.ts`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/hooks/useRewardsBoard.ts`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/pages/Today.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/pages/Projects.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/pages/Rewards.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/pages/Today.test.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/pages/Projects.test.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/pages/Rewards.test.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/types/taskReward.ts`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/test/setup.ts`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/proxy/nginx.conf`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/proxy/.htpasswd`

### 当前仓库 `lifeboard`

- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/backend/app/config.py`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/backend/app/main.py`
- Create: `/Users/wuzhuoyi/Desktop/code/my-project/backend/app/datasources/reward_todo.py`
- Create: `/Users/wuzhuoyi/Desktop/code/my-project/backend/app/schemas/reward_todo.py`
- Create: `/Users/wuzhuoyi/Desktop/code/my-project/backend/app/api/reward_todo.py`
- Create: `/Users/wuzhuoyi/Desktop/code/my-project/backend/tests/test_reward_todo_api.py`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/api/client.ts`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/components/DailyTaskList.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/components/ProjectTemplatePanel.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/components/RewardLedgerPanel.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/pages/Today.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/pages/Projects.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/pages/Rewards.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/hooks/useTodayBoard.ts`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/hooks/useProjectsBoard.ts`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/hooks/useRewardsBoard.ts`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/pages/Today.test.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/pages/Projects.test.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/pages/Rewards.test.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/docker-compose.yml`

## Task 1: 建立独立仓库骨架与基础配置

**Files:**
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/.env.example`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/README.md`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/docker-compose.yml`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/Dockerfile`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/requirements.txt`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/package.json`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/proxy/nginx.conf`

- [ ] **Step 1: 创建独立目录与 git 仓库**

```bash
mkdir -p /Users/wuzhuoyi/Desktop/code/reward-todo
cd /Users/wuzhuoyi/Desktop/code/reward-todo
git init
```

- [ ] **Step 2: 写基础环境变量模板**

```dotenv
POSTGRES_USER=rewardtodo
POSTGRES_PASSWORD=rewardtodo
POSTGRES_DB=rewardtodo
DATABASE_URL=postgresql+asyncpg://rewardtodo:rewardtodo@db:5432/rewardtodo
READONLY_TOKEN=replace-me
APP_BASIC_AUTH_USER=reward
APP_BASIC_AUTH_PASSWORD=replace-me
```

- [ ] **Step 3: 写 Compose 基础骨架**

```yaml
services:
  db:
    image: postgres:16-alpine
    env_file:
      - .env
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}

  backend:
    build: ./backend
    env_file:
      - .env
    depends_on:
      - db

  frontend:
    build: ./frontend
    depends_on:
      - backend

  proxy:
    image: nginx:1.27-alpine
    depends_on:
      - frontend
      - backend
```

- [ ] **Step 4: 写 nginx 单入口骨架**

```nginx
server {
  listen 80;

  location /api/public/ {
    proxy_pass http://backend:8000;
  }

  location /api/ {
    auth_basic "Reward Todo";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://backend:8000;
  }

  location / {
    auth_basic "Reward Todo";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://frontend:5173;
  }
}
```

- [ ] **Step 5: 写 README 最小启动说明**

```md
# Reward Todo

个人任务板 + 奖励账本。

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```
```

- [ ] **Step 6: 运行目录检查**

Run: `cd /Users/wuzhuoyi/Desktop/code/reward-todo && find . -maxdepth 2 -type f | sort`
Expected: 输出 `.env.example`、`README.md`、`docker-compose.yml`、`backend/*`、`frontend/*`、`proxy/nginx.conf`

## Task 2: 先写后端业务测试，再实现 Reward Todo API

**Files:**
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/tests/conftest.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/tests/test_task_reward_service.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/tests/test_public_api.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/models/*.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/services/task_reward_service.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/api/task_reward.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/api/public.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/schemas/task_reward.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/schemas/public.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/dependencies.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/main.py`

- [ ] **Step 1: 写 service 层失败测试**

```python
@pytest.mark.asyncio
async def test_complete_daily_task_creates_reward_entry(db):
    project = await create_project(db, {"name": "健身"})
    template = await create_task_template(
        db,
        {
            "project_id": project.id,
            "name": "跑步 30 分钟",
            "default_estimated_duration_minutes": 30,
            "default_reward_amount": 2000,
            "notes": "",
        },
    )
    task = await create_daily_task(
        db,
        {
            "date": datetime.date(2026, 6, 20),
            "task_template_id": template.id,
            "estimated_duration_minutes": 30,
            "reward_amount": 2000,
        },
    )

    completed = await complete_daily_task(db, task.id, actual_duration_minutes=28)

    assert completed.status == "completed"
```

- [ ] **Step 2: 写 public API 失败测试**

```python
def test_public_summary_requires_token(client):
    response = client.get("/api/public/summary")
    assert response.status_code == 401


def test_public_today_returns_readonly_payload(client, readonly_headers, seeded_task):
    response = client.get("/api/public/today?date=2026-06-20", headers=readonly_headers)
    assert response.status_code == 200
    assert response.json()[0]["name"] == "跑步 30 分钟"
```

- [ ] **Step 3: 运行测试确认失败**

Run: `cd /Users/wuzhuoyi/Desktop/code/reward-todo/backend && pytest tests/test_task_reward_service.py tests/test_public_api.py -q`
Expected: FAIL，提示模块或路由尚未实现

- [ ] **Step 4: 实现最小模型与数据库骨架**

```python
class TaskProject(Base):
    __tablename__ = "task_projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
```

```python
class RewardLedger(Base):
    __tablename__ = "reward_ledger"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entry_type: Mapped[str] = mapped_column(String(20))
    amount: Mapped[int] = mapped_column(Integer)
```

- [ ] **Step 5: 实现 service 最小逻辑**

```python
async def spend_reward(db: AsyncSession, amount: int, reason: str) -> RewardLedger:
    current_balance = await db.scalar(select(func.coalesce(func.sum(RewardLedger.amount), 0)))
    if int(current_balance or 0) < amount:
        raise ValueError("余额不足")

    entry = RewardLedger(entry_type="spend", amount=-amount, reason=reason)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
```

- [ ] **Step 6: 实现只读 token 依赖与 public 路由**

```python
def require_readonly_token(authorization: str = Header(default="")) -> None:
    expected = f"Bearer {settings.readonly_token}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="invalid token")
```

```python
@router.get("/summary", response_model=PublicRewardSummary)
async def public_summary(db: AsyncSession = Depends(get_db)):
    summary = await task_reward_service.get_reward_summary(db)
    return {"current_balance": summary["current_balance"], "today_earned": summary["today_earned"]}
```

- [ ] **Step 7: 运行后端测试确认通过**

Run: `cd /Users/wuzhuoyi/Desktop/code/reward-todo/backend && pytest tests/test_task_reward_service.py tests/test_public_api.py -q`
Expected: PASS

## Task 3: 引入 Alembic，并让 schema 可重复创建

**Files:**
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/alembic.ini`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/alembic/env.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/alembic/versions/0001_init_task_reward.py`
- Modify: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/config.py`
- Modify: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/app/database.py`

- [ ] **Step 1: 写 migration 存在性测试**

```bash
test -f /Users/wuzhuoyi/Desktop/code/reward-todo/backend/alembic/versions/0001_init_task_reward.py
```

- [ ] **Step 2: 写初始 migration**

```python
def upgrade() -> None:
    op.create_table(
        "task_projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
    )
```

- [ ] **Step 3: 配置 Alembic env**

```python
from app.models import Base

target_metadata = Base.metadata
config.set_main_option("sqlalchemy.url", settings.database_url.replace("+asyncpg", ""))
```

- [ ] **Step 4: 运行 migration 验证**

Run: `cd /Users/wuzhuoyi/Desktop/code/reward-todo/backend && alembic upgrade head`
Expected: PASS，数据库出现 4 张业务表和 `alembic_version`

## Task 4: 先写脚本验证，再实现历史迁移与 seed

**Files:**
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/scripts/migrate_from_lifeboard.py`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/backend/scripts/seed_demo_data.py`
- Modify: `/Users/wuzhuoyi/Desktop/code/reward-todo/README.md`

- [ ] **Step 1: 写迁移脚本 smoke 测试命令**

```bash
cd /Users/wuzhuoyi/Desktop/code/reward-todo/backend && python scripts/migrate_from_lifeboard.py --help
```

- [ ] **Step 2: 写导入顺序实现**

```python
TABLES = [
    "task_projects",
    "task_templates",
    "daily_tasks",
    "reward_ledger",
]
```

```python
async def copy_table(source_conn, target_conn, table_name: str) -> int:
    rows = await source_conn.execute(text(f"select * from {table_name} order by id"))
    payload = [dict(row._mapping) for row in rows]
    if not payload:
        return 0
    await target_conn.execute(metadata.tables[table_name].insert(), payload)
    return len(payload)
```

- [ ] **Step 3: 写 seed 脚本**

```python
async def main():
    async with async_session() as db:
        project = await create_project(db, {"name": "健身"})
        template = await create_task_template(
            db,
            {
                "project_id": project.id,
                "name": "跑步 30 分钟",
                "default_estimated_duration_minutes": 30,
                "default_reward_amount": 2000,
                "notes": "",
            },
        )
        await create_daily_task(
            db,
            {
                "date": datetime.date.today(),
                "task_template_id": template.id,
                "estimated_duration_minutes": 30,
                "reward_amount": 2000,
            },
        )
```

- [ ] **Step 4: 运行脚本验证**

Run: `cd /Users/wuzhuoyi/Desktop/code/reward-todo/backend && python scripts/seed_demo_data.py`
Expected: PASS，数据库出现一组可演示数据

## Task 5: 迁移现有前端与测试到 reward-todo 独立仓库

**Files:**
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/pages/*.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/components/*.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/hooks/*.ts`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/pages/*.test.tsx`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/api/client.ts`
- Create: `/Users/wuzhuoyi/Desktop/code/reward-todo/frontend/src/types/taskReward.ts`

- [ ] **Step 1: 写前端失败测试**

```tsx
test("completes daily task from today page", async () => {
  render(<Today />);
  expect(await screen.findByText("今日")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行前端测试确认失败**

Run: `cd /Users/wuzhuoyi/Desktop/code/reward-todo/frontend && npm test -- --run`
Expected: FAIL，提示页面或依赖未实现

- [ ] **Step 3: 迁移最小路由与 API 客户端**

```tsx
<Routes>
  <Route element={<Layout />}>
    <Route path="/" element={<Navigate to="/today" replace />} />
    <Route path="/today" element={<Today />} />
    <Route path="/projects" element={<Projects />} />
    <Route path="/rewards" element={<Rewards />} />
  </Route>
</Routes>
```

```ts
export async function fetchRewardSummary(): Promise<RewardSummary> {
  const { data } = await api.get("/rewards/summary");
  return data;
}
```

- [ ] **Step 4: 迁移交互组件**

```tsx
<DailyTaskList
  tasks={tasks}
  finishingTaskId={finishingTaskId}
  onFinishTask={finishTask}
/>
```

- [ ] **Step 5: 运行前端测试确认通过**

Run: `cd /Users/wuzhuoyi/Desktop/code/reward-todo/frontend && npm test -- --run`
Expected: PASS

## Task 6: 完成 proxy 与 compose 单入口，并验证 Reward Todo 可运行

**Files:**
- Modify: `/Users/wuzhuoyi/Desktop/code/reward-todo/docker-compose.yml`
- Modify: `/Users/wuzhuoyi/Desktop/code/reward-todo/proxy/nginx.conf`
- Modify: `/Users/wuzhuoyi/Desktop/code/reward-todo/README.md`

- [ ] **Step 1: 完成 proxy 分流配置**

```nginx
location /api/public/ {
  proxy_set_header Authorization $http_authorization;
  proxy_pass http://backend:8000;
}

location /api/ {
  auth_basic "Reward Todo";
  auth_basic_user_file /etc/nginx/.htpasswd;
  proxy_pass http://backend:8000;
}
```

- [ ] **Step 2: 完成 compose 挂载与端口**

```yaml
  proxy:
    image: nginx:1.27-alpine
    ports:
      - "8088:80"
    volumes:
      - ./proxy/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./proxy/.htpasswd:/etc/nginx/.htpasswd:ro
```

- [ ] **Step 3: 启动独立项目**

Run: `cd /Users/wuzhuoyi/Desktop/code/reward-todo && docker compose up --build -d`
Expected: PASS，`db/backend/frontend/proxy` 全部启动

- [ ] **Step 4: 验证单入口**

Run: `curl -I http://127.0.0.1:8088/`
Expected: 返回 `401 Unauthorized`

Run: `curl -H "Authorization: Bearer replace-me" http://127.0.0.1:8088/api/public/summary`
Expected: 返回 200 JSON

## Task 7: 先写 lifeboard 后端代理测试，再接入 reward-todo public API

**Files:**
- Create: `/Users/wuzhuoyi/Desktop/code/my-project/backend/app/datasources/reward_todo.py`
- Create: `/Users/wuzhuoyi/Desktop/code/my-project/backend/app/schemas/reward_todo.py`
- Create: `/Users/wuzhuoyi/Desktop/code/my-project/backend/app/api/reward_todo.py`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/backend/app/config.py`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/backend/app/main.py`
- Create: `/Users/wuzhuoyi/Desktop/code/my-project/backend/tests/test_reward_todo_api.py`

- [ ] **Step 1: 写代理 API 失败测试**

```python
def test_reward_todo_summary_proxy(client, monkeypatch):
    monkeypatch.setattr("app.datasources.reward_todo.fetch_summary", lambda: {"current_balance": 2000, "today_earned": 1000})
    response = client.get("/api/reward-todo/summary")
    assert response.status_code == 200
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/wuzhuoyi/Desktop/code/my-project/backend && pytest tests/test_reward_todo_api.py -q`
Expected: FAIL，提示路由或 datasource 未实现

- [ ] **Step 3: 实现 reward-todo datasource**

```python
class RewardTodoSource:
    def __init__(self):
        self.base_url = settings.reward_todo_base_url.rstrip("/")
        self.token = settings.reward_todo_readonly_token

    async def fetch_summary(self) -> dict:
        async with httpx.AsyncClient(base_url=self.base_url, headers={"Authorization": f"Bearer {self.token}"}) as client:
            response = await client.get("/api/public/summary")
            response.raise_for_status()
            return response.json()
```

- [ ] **Step 4: 实现后端代理路由**

```python
@router.get("/reward-todo/summary", response_model=RewardTodoSummaryRead)
async def reward_todo_summary():
    source = RewardTodoSource()
    return await source.fetch_summary()
```

- [ ] **Step 5: 停止注册旧 task_reward 路由**

```python
app.include_router(dashboard.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(reward_todo.router, prefix="/api")
```

- [ ] **Step 6: 运行 lifeboard 后端测试确认通过**

Run: `cd /Users/wuzhuoyi/Desktop/code/my-project/backend && pytest tests/test_reward_todo_api.py -q`
Expected: PASS

## Task 8: 先写 lifeboard 前端只读测试，再改三页为只读展示

**Files:**
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/api/client.ts`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/hooks/useTodayBoard.ts`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/hooks/useProjectsBoard.ts`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/hooks/useRewardsBoard.ts`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/components/DailyTaskList.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/components/ProjectTemplatePanel.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/components/RewardLedgerPanel.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/pages/Today.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/pages/Projects.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/pages/Rewards.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/pages/Today.test.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/pages/Projects.test.tsx`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/frontend/src/pages/Rewards.test.tsx`

- [ ] **Step 1: 写 Today 只读失败测试**

```tsx
test("renders today page as readonly", async () => {
  render(<Today />);
  expect(await screen.findByText("前往 Reward Todo 管理")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /完成/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 写 Projects 与 Rewards 只读失败测试**

```tsx
test("projects page hides create actions", async () => {
  render(<Projects />);
  expect(screen.queryByText("新增项目")).not.toBeInTheDocument();
});

test("rewards page hides spend form", async () => {
  render(<Rewards />);
  expect(screen.queryByText("扣减奖励")).not.toBeInTheDocument();
});
```

- [ ] **Step 3: 运行前端测试确认失败**

Run: `cd /Users/wuzhuoyi/Desktop/code/my-project/frontend && npm test -- --run src/pages/Today.test.tsx src/pages/Projects.test.tsx src/pages/Rewards.test.tsx`
Expected: FAIL，提示旧交互元素仍存在

- [ ] **Step 4: 改 API 客户端为新代理路由**

```ts
export async function fetchRewardTodoSummary(): Promise<RewardSummary> {
  const { data } = await api.get("/reward-todo/summary");
  return data;
}
```

```ts
export async function fetchRewardTodoToday(date = dayjs().format("YYYY-MM-DD")) {
  const { data } = await api.get(`/reward-todo/today?date=${date}`);
  return data;
}
```

- [ ] **Step 5: 改 hooks 和页面为只读**

```tsx
const { tasks, summary, loading, error } = useTodayBoard();
```

```tsx
<a href={rewardTodoAppUrl} className="btn btn-primary" target="_blank" rel="noreferrer">
  前往 Reward Todo 管理
</a>
```

- [ ] **Step 6: 改只读组件**

```tsx
{showActions ? (
  <button onClick={() => onFinishTask?.(task.id)}>完成</button>
) : null}
```

```tsx
{isReadonly ? null : <form onSubmit={handleSubmitProject}>...</form>}
```

- [ ] **Step 7: 运行前端测试确认通过**

Run: `cd /Users/wuzhuoyi/Desktop/code/my-project/frontend && npm test -- --run src/pages/Today.test.tsx src/pages/Projects.test.tsx src/pages/Rewards.test.tsx`
Expected: PASS

## Task 9: 更新本地 Docker 与运行说明，联通两个项目

**Files:**
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/docker-compose.yml`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/backend/app/config.py`

- [ ] **Step 1: 增加 reward-todo 相关环境变量读取**

```python
class Settings(BaseSettings):
    reward_todo_base_url: str = ""
    reward_todo_readonly_token: str = ""
    reward_todo_app_url: str = ""
```

- [ ] **Step 2: 更新本地 compose 示例**

```yaml
  backend:
    environment:
      REWARD_TODO_BASE_URL: ${REWARD_TODO_BASE_URL:-http://host.docker.internal:8088}
      REWARD_TODO_READONLY_TOKEN: ${REWARD_TODO_READONLY_TOKEN:-replace-me}
      REWARD_TODO_APP_URL: ${REWARD_TODO_APP_URL:-http://127.0.0.1:8088}
```

- [ ] **Step 3: 手动联通验证**

Run: `curl http://127.0.0.1:8000/api/reward-todo/summary`
Expected: 当 `reward-todo` 可用时返回 summary JSON；不可用时返回 502/503

## Task 10: 全量验证、初始化远端仓库并推送

**Files:**
- Modify: `/Users/wuzhuoyi/Desktop/code/reward-todo/*`
- Modify: `/Users/wuzhuoyi/Desktop/code/my-project/*`

- [ ] **Step 1: 运行 reward-todo 后端测试**

Run: `cd /Users/wuzhuoyi/Desktop/code/reward-todo/backend && pytest -q`
Expected: PASS

- [ ] **Step 2: 运行 reward-todo 前端测试**

Run: `cd /Users/wuzhuoyi/Desktop/code/reward-todo/frontend && npm test -- --run`
Expected: PASS

- [ ] **Step 3: 运行 lifeboard 后端测试**

Run: `cd /Users/wuzhuoyi/Desktop/code/my-project/backend && pytest tests/test_reward_todo_api.py -q`
Expected: PASS

- [ ] **Step 4: 运行 lifeboard 前端测试**

Run: `cd /Users/wuzhuoyi/Desktop/code/my-project/frontend && npm test -- --run src/pages/Today.test.tsx src/pages/Projects.test.tsx src/pages/Rewards.test.tsx`
Expected: PASS

- [ ] **Step 5: 构建 reward-todo**

Run: `cd /Users/wuzhuoyi/Desktop/code/reward-todo && docker compose build`
Expected: PASS

- [ ] **Step 6: 配置远端并推送**

```bash
cd /Users/wuzhuoyi/Desktop/code/reward-todo
git remote add origin https://github.com/JoeyRedfield/reward-todo.git
git add .
git commit -m "feat: extract reward todo as standalone project"
git push -u origin main
```

- [ ] **Step 7: 记录 lifeboard 改动但不删除旧文件**

```bash
cd /Users/wuzhuoyi/Desktop/code/my-project
git status --short
```

## Self-Review

### Spec coverage

- 独立仓库、独立数据库、独立 Docker：Task 1、Task 3、Task 6
- `public API` 与只读 token：Task 2、Task 7
- 一次性历史迁移与 seed：Task 4
- 三页完整迁移到 `reward-todo`：Task 5
- `lifeboard` 后端代理与新路由：Task 7、Task 9
- `lifeboard` 三页只读改造：Task 8
- 失败退化与跳转入口：Task 8、Task 9
- 推送远端仓库：Task 10

### Placeholder scan

- 无 `TODO` / `TBD`
- 每个任务都给出文件、命令和最小代码片段
- 未引用未定义的额外模块名作为实现前提

### Type consistency

- `RewardSummary` / `DailyTask` 在 `reward-todo` 与 `lifeboard` 前端均沿用现有字段语义
- `public` 路由统一位于 `/api/public/*`
- `lifeboard` 代理路由统一位于 `/api/reward-todo/*`
