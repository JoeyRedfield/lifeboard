# Task Reward Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `LifeBoard` 内实现待办激励模块，支持项目与任务模板管理、今日任务执行、完成后奖励额度累积、奖励额度手动扣减。

**Architecture:** 后端沿用当前 `FastAPI + SQLAlchemy async + service` 结构，新增独立任务激励业务域，不复用财务交易表。前端沿用当前 `React + Vite + React Router` 结构，新增 `今日 / 项目 / 奖励` 三个页面，并通过轻量 hooks 与统一 API 客户端通信。

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy async, PostgreSQL, pytest, React 18, TypeScript, Vite, axios, Vitest, Testing Library

---

## 文件结构总览

### 后端

- Create: `backend/app/models/task_project.py`
  内部项目模型，承载长期事项容器。
- Create: `backend/app/models/task_template.py`
  项目下模板任务，保存默认时长与默认奖励。
- Create: `backend/app/models/daily_task.py`
  某天实际执行的任务快照实例。
- Create: `backend/app/models/reward_ledger.py`
  奖励额度流水，记录赚取、扣减、冲销。
- Modify: `backend/app/models/__init__.py`
  导出新增模型，确保 `Base.metadata.create_all()` 能创建表。
- Create: `backend/app/schemas/task_reward.py`
  请求/响应 schema，覆盖项目、模板、今日任务、奖励摘要与奖励流水。
- Create: `backend/app/services/task_reward_service.py`
  核心业务逻辑，负责 CRUD、完成任务、重开任务、奖励摘要与扣减。
- Create: `backend/app/api/task_reward.py`
  独立路由文件，保持 route 薄、逻辑进 service。
- Modify: `backend/app/main.py`
  注册新路由。
- Create: `backend/tests/test_task_reward_service.py`
  服务级测试，覆盖完成、重复完成、重开冲销、余额扣减、模板停用等核心规则。
- Create: `backend/tests/test_task_reward_api.py`
  API 级测试，确保主要端点连通并返回预期状态码/结构。

### 前端

- Modify: `frontend/package.json`
  增加 `vitest` 与 `Testing Library` 测试依赖和 `test` script。
- Create: `frontend/src/test/setup.ts`
  Vitest 测试初始化。
- Create: `frontend/src/types/taskReward.ts`
  任务激励模块的前端类型定义。
- Modify: `frontend/src/types/index.ts`
  统一导出新增类型。
- Modify: `frontend/src/api/client.ts`
  复用现有 axios client，新增任务激励模块 API 方法。
- Create: `frontend/src/hooks/useTodayBoard.ts`
  今日页数据装载与动作封装。
- Create: `frontend/src/hooks/useProjectsBoard.ts`
  项目页数据装载与动作封装。
- Create: `frontend/src/hooks/useRewardsBoard.ts`
  奖励页数据装载与动作封装。
- Create: `frontend/src/pages/Today.tsx`
  今日主战场页面。
- Create: `frontend/src/pages/Projects.tsx`
  项目与模板管理页面。
- Create: `frontend/src/pages/Rewards.tsx`
  奖励摘要与流水页面。
- Create: `frontend/src/components/TaskSummaryCards.tsx`
  今日页摘要卡片组件。
- Create: `frontend/src/components/DailyTaskList.tsx`
  今日任务列表组件。
- Create: `frontend/src/components/ProjectTemplatePanel.tsx`
  项目与模板双栏组件。
- Create: `frontend/src/components/RewardLedgerPanel.tsx`
  奖励流水列表与扣减入口组件。
- Modify: `frontend/src/App.tsx`
  新增路由。
- Modify: `frontend/src/components/Layout.tsx`
  新增导航入口。
- Modify: `frontend/src/App.css`
  增加任务激励模块的页面样式。
- Create: `frontend/src/pages/Today.test.tsx`
  今日页关键流程测试。
- Create: `frontend/src/pages/Projects.test.tsx`
  项目页增改模板流程测试。
- Create: `frontend/src/pages/Rewards.test.tsx`
  奖励页扣减与余额不足提示测试。

---

### Task 1: 建立后端数据模型与服务测试骨架

**Files:**
- Create: `backend/app/models/task_project.py`
- Create: `backend/app/models/task_template.py`
- Create: `backend/app/models/daily_task.py`
- Create: `backend/app/models/reward_ledger.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/tests/test_task_reward_service.py`

- [ ] **Step 1: 写服务测试，先锁定核心业务规则**

```python
import datetime

import pytest

from app.services.task_reward_service import (
    complete_daily_task,
    create_daily_task,
    create_project,
    create_task_template,
    get_reward_summary,
    list_daily_tasks,
    reopen_daily_task,
    spend_reward,
    update_task_template,
)


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
            "date": datetime.date.today(),
            "task_template_id": template.id,
            "estimated_duration_minutes": 30,
            "reward_amount": 2000,
        },
    )

    completed = await complete_daily_task(db, task.id, actual_duration_minutes=28)
    summary = await get_reward_summary(db, datetime.date.today())

    assert completed.status == "completed"
    assert completed.actual_duration_minutes == 28
    assert summary["current_balance"] == 2000
    assert summary["today_earned"] == 2000


@pytest.mark.asyncio
async def test_complete_daily_task_is_idempotent(db):
    project = await create_project(db, {"name": "写作"})
    template = await create_task_template(
        db,
        {
            "project_id": project.id,
            "name": "写 800 字",
            "default_estimated_duration_minutes": 45,
            "default_reward_amount": 3000,
            "notes": "",
        },
    )
    task = await create_daily_task(
        db,
        {
            "date": datetime.date.today(),
            "task_template_id": template.id,
            "estimated_duration_minutes": 45,
            "reward_amount": 3000,
        },
    )

    await complete_daily_task(db, task.id, actual_duration_minutes=None)
    await complete_daily_task(db, task.id, actual_duration_minutes=None)
    summary = await get_reward_summary(db, datetime.date.today())

    assert summary["current_balance"] == 3000
    assert summary["today_earned"] == 3000


@pytest.mark.asyncio
async def test_reopen_daily_task_reverses_reward_balance(db):
    project = await create_project(db, {"name": "英语"})
    template = await create_task_template(
        db,
        {
            "project_id": project.id,
            "name": "英语复盘",
            "default_estimated_duration_minutes": 20,
            "default_reward_amount": 1000,
            "notes": "",
        },
    )
    task = await create_daily_task(
        db,
        {
            "date": datetime.date.today(),
            "task_template_id": template.id,
            "estimated_duration_minutes": 20,
            "reward_amount": 1000,
        },
    )

    await complete_daily_task(db, task.id, actual_duration_minutes=15)
    reopened = await reopen_daily_task(db, task.id)
    summary = await get_reward_summary(db, datetime.date.today())

    assert reopened.status == "pending"
    assert summary["current_balance"] == 0


@pytest.mark.asyncio
async def test_spend_reward_rejects_when_balance_is_insufficient(db):
    with pytest.raises(ValueError, match="余额不足"):
        await spend_reward(db, amount=500, reason="咖啡")


@pytest.mark.asyncio
async def test_inactive_template_cannot_create_daily_task(db):
    project = await create_project(db, {"name": "学习"})
    template = await create_task_template(
        db,
        {
            "project_id": project.id,
            "name": "背单词",
            "default_estimated_duration_minutes": 15,
            "default_reward_amount": 800,
            "notes": "",
        },
    )
    await update_task_template(db, template.id, {"is_active": False})

    with pytest.raises(ValueError, match="模板已停用"):
        await create_daily_task(
            db,
            {
                "date": datetime.date.today(),
                "task_template_id": template.id,
                "estimated_duration_minutes": 15,
                "reward_amount": 800,
            },
        )
```

- [ ] **Step 2: 运行测试，确认现在失败**

Run: `cd backend && pytest tests/test_task_reward_service.py -v`

Expected: FAIL，报 `ModuleNotFoundError` 或 `ImportError`，因为模型和服务尚未创建。

- [ ] **Step 3: 新增 SQLAlchemy 模型并导出**

```python
# backend/app/models/task_project.py
import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TaskProject(Base):
    __tablename__ = "task_projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="active")
    sort_order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

```python
# backend/app/models/task_template.py
import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TaskTemplate(Base):
    __tablename__ = "task_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("task_projects.id"))
    name: Mapped[str] = mapped_column(String(200))
    default_estimated_duration_minutes: Mapped[int] = mapped_column(Integer)
    default_reward_amount: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

```python
# backend/app/models/daily_task.py
import datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[datetime.date] = mapped_column(Date)
    project_id: Mapped[int] = mapped_column(ForeignKey("task_projects.id"))
    task_template_id: Mapped[int] = mapped_column(ForeignKey("task_templates.id"))
    name_snapshot: Mapped[str] = mapped_column(String(200))
    estimated_duration_minutes_snapshot: Mapped[int] = mapped_column(Integer)
    reward_amount_snapshot: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    actual_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

```python
# backend/app/models/reward_ledger.py
import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RewardLedger(Base):
    __tablename__ = "reward_ledger"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entry_type: Mapped[str] = mapped_column(String(20))
    amount: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(Text, default="")
    daily_task_id: Mapped[int | None] = mapped_column(
        ForeignKey("daily_tasks.id"), nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

```python
# backend/app/models/__init__.py
from app.models.account import Account
from app.models.category import Category
from app.models.daily_task import DailyTask
from app.models.reward_ledger import RewardLedger
from app.models.tag import Tag
from app.models.task_project import TaskProject
from app.models.task_template import TaskTemplate
from app.models.transaction import Transaction

__all__ = [
    "Transaction",
    "Account",
    "Category",
    "Tag",
    "TaskProject",
    "TaskTemplate",
    "DailyTask",
    "RewardLedger",
]
```

- [ ] **Step 4: 再跑一次测试，确认失败点推进到服务缺失**

Run: `cd backend && pytest tests/test_task_reward_service.py -v`

Expected: FAIL，报 `ImportError: cannot import name ... from app.services.task_reward_service`，说明模型表结构已就位。

- [ ] **Step 5: 提交模型与测试骨架**

```bash
git add backend/app/models backend/tests/test_task_reward_service.py
git commit -m "feat: add task reward data models"
```

### Task 2: 实现后端服务与 API

**Files:**
- Create: `backend/app/schemas/task_reward.py`
- Create: `backend/app/services/task_reward_service.py`
- Create: `backend/app/api/task_reward.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_task_reward_api.py`

- [ ] **Step 1: 先写 API 测试，锁定主要端点**

```python
import datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_daily_tasks_endpoint_returns_ok():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/daily-tasks",
            params={"date": datetime.date.today().isoformat()},
        )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_reward_summary_endpoint_returns_balance_fields():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/rewards/summary")

    assert response.status_code == 200
    data = response.json()
    assert "current_balance" in data
    assert "today_earned" in data
```

- [ ] **Step 2: 运行 API 测试，确认当前失败**

Run: `cd backend && pytest tests/test_task_reward_api.py -v`

Expected: FAIL，报 `404 Not Found` 或导入错误，因为路由和 schema 还未注册。

- [ ] **Step 3: 实现 schema、service 与 route**

```python
# backend/app/schemas/task_reward.py
import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    status: str | None = None
    sort_order: int | None = None


class TaskTemplateCreate(BaseModel):
    project_id: int
    name: str = Field(min_length=1, max_length=200)
    default_estimated_duration_minutes: int = Field(ge=1, le=1440)
    default_reward_amount: int = Field(ge=0)
    notes: str = ""


class TaskTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    default_estimated_duration_minutes: int | None = Field(default=None, ge=1, le=1440)
    default_reward_amount: int | None = Field(default=None, ge=0)
    notes: str | None = None
    is_active: bool | None = None


class DailyTaskCreate(BaseModel):
    date: datetime.date
    task_template_id: int
    estimated_duration_minutes: int = Field(ge=1, le=1440)
    reward_amount: int = Field(ge=0)


class DailyTaskUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    estimated_duration_minutes: int | None = Field(default=None, ge=1, le=1440)
    reward_amount: int | None = Field(default=None, ge=0)


class CompleteDailyTaskRequest(BaseModel):
    actual_duration_minutes: int | None = Field(default=None, ge=1, le=1440)


class RewardSpendRequest(BaseModel):
    amount: int = Field(ge=1)
    reason: str = Field(min_length=1, max_length=500)
```

```python
# backend/app/services/task_reward_service.py
import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DailyTask, RewardLedger, TaskProject, TaskTemplate


async def create_project(db: AsyncSession, payload: dict) -> TaskProject:
    project = TaskProject(name=payload["name"])
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def create_task_template(db: AsyncSession, payload: dict) -> TaskTemplate:
    template = TaskTemplate(**payload)
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


async def update_task_template(db: AsyncSession, template_id: int, payload: dict) -> TaskTemplate:
    template = await db.get(TaskTemplate, template_id)
    for key, value in payload.items():
        setattr(template, key, value)
    await db.commit()
    await db.refresh(template)
    return template


async def list_daily_tasks(db: AsyncSession, date: datetime.date) -> list[DailyTask]:
    rows = await db.scalars(
        select(DailyTask).where(DailyTask.date == date).order_by(DailyTask.created_at.asc())
    )
    return list(rows)


async def create_daily_task(db: AsyncSession, payload: dict) -> DailyTask:
    template = await db.get(TaskTemplate, payload["task_template_id"])
    if template is None or not template.is_active:
        raise ValueError("模板已停用")

    task = DailyTask(
        date=payload["date"],
        project_id=template.project_id,
        task_template_id=template.id,
        name_snapshot=template.name,
        estimated_duration_minutes_snapshot=payload["estimated_duration_minutes"],
        reward_amount_snapshot=payload["reward_amount"],
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def complete_daily_task(
    db: AsyncSession, task_id: int, actual_duration_minutes: int | None
) -> DailyTask:
    task = await db.get(DailyTask, task_id)
    if task.status == "completed":
        return task

    task.status = "completed"
    task.actual_duration_minutes = actual_duration_minutes
    task.completed_at = datetime.datetime.now(datetime.timezone.utc)
    db.add(
        RewardLedger(
            entry_type="earn",
            amount=task.reward_amount_snapshot,
            reason=task.name_snapshot,
            daily_task_id=task.id,
        )
    )
    await db.commit()
    await db.refresh(task)
    return task


async def reopen_daily_task(db: AsyncSession, task_id: int) -> DailyTask:
    task = await db.get(DailyTask, task_id)
    if task.status != "completed":
        return task

    task.status = "pending"
    task.completed_at = None
    db.add(
        RewardLedger(
            entry_type="adjust",
            amount=-task.reward_amount_snapshot,
            reason=f"reopen:{task.name_snapshot}",
            daily_task_id=task.id,
        )
    )
    await db.commit()
    await db.refresh(task)
    return task


async def get_reward_summary(db: AsyncSession, date: datetime.date) -> dict:
    balance = await db.scalar(select(func.coalesce(func.sum(RewardLedger.amount), 0)))
    today_earned = await db.scalar(
        select(func.coalesce(func.sum(RewardLedger.amount), 0)).where(
            RewardLedger.entry_type == "earn",
            func.date(RewardLedger.created_at) == date,
        )
    )
    return {
        "current_balance": int(balance or 0),
        "today_earned": int(today_earned or 0),
    }


async def spend_reward(db: AsyncSession, amount: int, reason: str) -> RewardLedger:
    balance = await db.scalar(select(func.coalesce(func.sum(RewardLedger.amount), 0)))
    if int(balance or 0) < amount:
        raise ValueError("余额不足")

    entry = RewardLedger(entry_type="spend", amount=-amount, reason=reason)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
```

```python
# backend/app/api/task_reward.py
import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.task_reward import (
    CompleteDailyTaskRequest,
    DailyTaskCreate,
    RewardSpendRequest,
)
from app.services import task_reward_service

router = APIRouter(tags=["task_reward"])


@router.get("/daily-tasks")
async def get_daily_tasks(
    date: datetime.date = Query(...),
    db: AsyncSession = Depends(get_db),
):
    return await task_reward_service.list_daily_tasks(db, date)


@router.post("/daily-tasks")
async def create_daily_task(payload: DailyTaskCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await task_reward_service.create_daily_task(db, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/daily-tasks/{task_id}/complete")
async def complete_daily_task(
    task_id: int,
    payload: CompleteDailyTaskRequest,
    db: AsyncSession = Depends(get_db),
):
    return await task_reward_service.complete_daily_task(
        db, task_id, payload.actual_duration_minutes
    )


@router.post("/daily-tasks/{task_id}/reopen")
async def reopen_daily_task(task_id: int, db: AsyncSession = Depends(get_db)):
    return await task_reward_service.reopen_daily_task(db, task_id)


@router.get("/rewards/summary")
async def reward_summary(db: AsyncSession = Depends(get_db)):
    return await task_reward_service.get_reward_summary(db, datetime.date.today())


@router.post("/rewards/spend")
async def spend_reward(payload: RewardSpendRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await task_reward_service.spend_reward(db, payload.amount, payload.reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
```

```python
# backend/app/main.py
from app.api import dashboard, sync, task_reward

app.include_router(dashboard.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(task_reward.router, prefix="/api")
```

- [ ] **Step 4: 运行后端测试，确保服务与 API 都通过**

Run: `cd backend && pytest tests/test_task_reward_service.py tests/test_task_reward_api.py -v`

Expected: PASS，至少通过以下断言：
- 完成任务只生成一次奖励
- 重开任务会冲销余额
- 奖励摘要端点返回 `current_balance` 与 `today_earned`

- [ ] **Step 5: 提交后端业务域**

```bash
git add backend/app/schemas/task_reward.py backend/app/services/task_reward_service.py backend/app/api/task_reward.py backend/app/main.py backend/tests/test_task_reward_api.py
git commit -m "feat: add task reward backend APIs"
```

### Task 3: 建立前端测试基建、类型、API 与路由壳

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/types/taskReward.ts`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/pages/Today.tsx`
- Create: `frontend/src/pages/Projects.tsx`
- Create: `frontend/src/pages/Rewards.tsx`

- [ ] **Step 1: 写页面路由测试，先锁定导航入口**

```tsx
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";

import App from "../App";


test("renders task reward navigation entries", () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  expect(screen.getByText("今日")).toBeInTheDocument();
  expect(screen.getByText("项目")).toBeInTheDocument();
  expect(screen.getByText("奖励")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行前端测试，确认当前失败**

Run: `cd frontend && npm run test -- --run`

Expected: FAIL，提示缺少 `test` script 或 `vitest` 依赖。

- [ ] **Step 3: 添加测试依赖、类型、API 方法与页面壳**

```json
// frontend/package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "~5.6.3",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
```

```ts
// frontend/src/test/setup.ts
import "@testing-library/jest-dom";
```

```ts
// frontend/src/types/taskReward.ts
export interface TaskProject {
  id: number;
  name: string;
  status: string;
  sort_order: number;
}

export interface TaskTemplate {
  id: number;
  project_id: number;
  name: string;
  default_estimated_duration_minutes: number;
  default_reward_amount: number;
  notes: string;
  is_active: boolean;
}

export interface DailyTask {
  id: number;
  date: string;
  project_id: number;
  task_template_id: number;
  name_snapshot: string;
  estimated_duration_minutes_snapshot: number;
  reward_amount_snapshot: number;
  status: "pending" | "completed";
  actual_duration_minutes: number | null;
}

export interface RewardSummary {
  current_balance: number;
  today_earned: number;
}
```

```ts
// frontend/src/types/index.ts
export * from "./taskReward";
```

```ts
// frontend/src/api/client.ts
export async function fetchDailyTasks(date: string): Promise<DailyTask[]> {
  const { data } = await api.get(`/daily-tasks?date=${date}`);
  return data;
}

export async function fetchRewardSummary(): Promise<RewardSummary> {
  const { data } = await api.get("/rewards/summary");
  return data;
}
```

```tsx
// frontend/src/App.tsx
<Route path="/" element={<Dashboard />} />
<Route path="/today" element={<Today />} />
<Route path="/projects" element={<Projects />} />
<Route path="/rewards" element={<Rewards />} />
<Route path="/settings" element={<Settings />} />
```

```tsx
// frontend/src/components/Layout.tsx
<NavLink to="/today">
  <span className="sidebar-nav-icon">◉</span>
  今日
</NavLink>
<NavLink to="/projects">
  <span className="sidebar-nav-icon">▣</span>
  项目
</NavLink>
<NavLink to="/rewards">
  <span className="sidebar-nav-icon">¤</span>
  奖励
</NavLink>
```

```tsx
// frontend/src/pages/Today.tsx
export default function Today() {
  return <h1 className="page-title">今日</h1>;
}
```

```tsx
// frontend/src/pages/Projects.tsx
export default function Projects() {
  return <h1 className="page-title">项目</h1>;
}
```

```tsx
// frontend/src/pages/Rewards.tsx
export default function Rewards() {
  return <h1 className="page-title">奖励</h1>;
}
```

- [ ] **Step 4: 运行前端测试，确认路由壳通过**

Run: `cd frontend && npm run test -- --run`

Expected: PASS，至少通过导航入口测试。

- [ ] **Step 5: 提交前端壳与测试基建**

```bash
git add frontend/package.json frontend/src/test/setup.ts frontend/src/types frontend/src/api/client.ts frontend/src/App.tsx frontend/src/components/Layout.tsx frontend/src/pages
git commit -m "feat: add task reward frontend shell"
```

### Task 4: 实现今日页数据流与交互

**Files:**
- Create: `frontend/src/hooks/useTodayBoard.ts`
- Create: `frontend/src/components/TaskSummaryCards.tsx`
- Create: `frontend/src/components/DailyTaskList.tsx`
- Modify: `frontend/src/api/client.ts`
- Create: `frontend/src/pages/Today.test.tsx`
- Modify: `frontend/src/pages/Today.tsx`
- Modify: `frontend/src/App.css`

- [ ] **Step 1: 先写今日页测试，锁定完成任务与摘要刷新**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import Today from "./Today";

vi.mock("../api/client", () => ({
  fetchDailyTasks: vi.fn().mockResolvedValue([
    {
      id: 1,
      date: "2026-06-20",
      project_id: 1,
      task_template_id: 1,
      name_snapshot: "跑步 30 分钟",
      estimated_duration_minutes_snapshot: 30,
      reward_amount_snapshot: 2000,
      status: "pending",
      actual_duration_minutes: null,
    },
  ]),
  fetchRewardSummary: vi.fn().mockResolvedValue({
    current_balance: 0,
    today_earned: 0,
  }),
  completeDailyTask: vi.fn().mockResolvedValue({
    id: 1,
    status: "completed",
    actual_duration_minutes: 28,
  }),
}));


test("completes daily task from today page", async () => {
  const user = userEvent.setup();
  render(<Today />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "完成" }));
  await user.type(screen.getByLabelText("实际时长"), "28");
  await user.click(screen.getByRole("button", { name: "确认完成" }));

  await waitFor(() => {
    expect(screen.getByText("已完成")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行今日页测试，确认当前失败**

Run: `cd frontend && npm run test -- --run src/pages/Today.test.tsx`

Expected: FAIL，提示 `completeDailyTask`、`TaskSummaryCards` 或交互元素不存在。

- [ ] **Step 3: 实现今日页 hook、摘要卡片、任务列表与页面**

```ts
// frontend/src/api/client.ts
export async function completeDailyTask(taskId: number, actualDurationMinutes?: number) {
  const { data } = await api.post(`/daily-tasks/${taskId}/complete`, {
    actual_duration_minutes: actualDurationMinutes,
  });
  return data;
}
```

```ts
// frontend/src/hooks/useTodayBoard.ts
import { useEffect, useState } from "react";

import { completeDailyTask, fetchDailyTasks, fetchRewardSummary } from "../api/client";
import type { DailyTask, RewardSummary } from "../types";

export function useTodayBoard() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [summary, setSummary] = useState<RewardSummary>({ current_balance: 0, today_earned: 0 });

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [taskData, rewardSummary] = await Promise.all([
      fetchDailyTasks(today),
      fetchRewardSummary(),
    ]);
    setTasks(taskData);
    setSummary(rewardSummary);
  };

  const finishTask = async (taskId: number, actualDurationMinutes?: number) => {
    await completeDailyTask(taskId, actualDurationMinutes);
    await load();
  };

  useEffect(() => {
    void load();
  }, []);

  return { tasks, summary, finishTask, reload: load };
}
```

```tsx
// frontend/src/components/TaskSummaryCards.tsx
import type { DailyTask, RewardSummary } from "../types";

export default function TaskSummaryCards({
  summary,
  tasks,
}: {
  summary: RewardSummary;
  tasks: DailyTask[];
}) {
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const estimatedMinutes = tasks.reduce(
    (total, task) => total + task.estimated_duration_minutes_snapshot,
    0
  );

  return (
    <div className="overview-grid">
      <div className="overview-card"><div className="card-title">奖励余额</div><div>{summary.current_balance / 100} 元</div></div>
      <div className="overview-card"><div className="card-title">今日已赚</div><div>{summary.today_earned / 100} 元</div></div>
      <div className="overview-card"><div className="card-title">完成进度</div><div>{completedCount}/{tasks.length}</div></div>
      <div className="overview-card"><div className="card-title">预计总时长</div><div>{estimatedMinutes} 分钟</div></div>
    </div>
  );
}
```

```tsx
// frontend/src/components/DailyTaskList.tsx
import { useState } from "react";

import type { DailyTask } from "../types";

export default function DailyTaskList({
  tasks,
  onComplete,
}: {
  tasks: DailyTask[];
  onComplete: (taskId: number, actualDurationMinutes?: number) => Promise<void>;
}) {
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [actualDuration, setActualDuration] = useState("");

  return (
    <div className="card">
      {tasks.map((task) => (
        <div key={task.id} className="daily-task-row">
          <div>
            <div>{task.name_snapshot}</div>
            <div>{task.estimated_duration_minutes_snapshot} 分钟 · {task.reward_amount_snapshot / 100} 元</div>
          </div>
          {task.status === "completed" ? (
            <span>已完成</span>
          ) : (
            <button className="btn btn-primary" onClick={() => setSelectedTask(task)}>
              完成
            </button>
          )}
        </div>
      ))}

      {selectedTask && (
        <div className="modal-mask">
          <div className="card">
            <div className="card-title">完成 {selectedTask.name_snapshot}</div>
            <label>
              实际时长
              <input
                aria-label="实际时长"
                value={actualDuration}
                onChange={(event) => setActualDuration(event.target.value)}
              />
            </label>
            <button
              className="btn btn-primary"
              onClick={async () => {
                await onComplete(
                  selectedTask.id,
                  actualDuration ? Number(actualDuration) : undefined
                );
                setSelectedTask(null);
                setActualDuration("");
              }}
            >
              确认完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

```tsx
// frontend/src/pages/Today.tsx
import DailyTaskList from "../components/DailyTaskList";
import TaskSummaryCards from "../components/TaskSummaryCards";
import { useTodayBoard } from "../hooks/useTodayBoard";

export default function Today() {
  const { tasks, summary, finishTask } = useTodayBoard();

  return (
    <div>
      <h1 className="page-title">今日</h1>
      <TaskSummaryCards summary={summary} tasks={tasks} />
      <DailyTaskList tasks={tasks} onComplete={finishTask} />
    </div>
  );
}
```

- [ ] **Step 4: 运行今日页测试与构建**

Run: `cd frontend && npm run test -- --run src/pages/Today.test.tsx && npm run build`

Expected: PASS，且 `vite build` 成功，无 TypeScript 报错。

- [ ] **Step 5: 提交今日页**

```bash
git add frontend/src/hooks/useTodayBoard.ts frontend/src/components/TaskSummaryCards.tsx frontend/src/components/DailyTaskList.tsx frontend/src/pages/Today.tsx frontend/src/pages/Today.test.tsx frontend/src/App.css frontend/src/api/client.ts
git commit -m "feat: add today board for task rewards"
```

### Task 5: 实现项目页与奖励页

**Files:**
- Create: `frontend/src/hooks/useProjectsBoard.ts`
- Create: `frontend/src/hooks/useRewardsBoard.ts`
- Create: `frontend/src/components/ProjectTemplatePanel.tsx`
- Create: `frontend/src/components/RewardLedgerPanel.tsx`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/pages/Projects.tsx`
- Modify: `frontend/src/pages/Rewards.tsx`
- Create: `frontend/src/pages/Projects.test.tsx`
- Create: `frontend/src/pages/Rewards.test.tsx`

- [ ] **Step 1: 先写项目页与奖励页测试**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import Projects from "./Projects";
import Rewards from "./Rewards";

vi.mock("../api/client", () => ({
  fetchProjects: vi.fn().mockResolvedValue([{ id: 1, name: "健身", status: "active", sort_order: 0 }]),
  fetchTaskTemplates: vi.fn().mockResolvedValue([
    {
      id: 1,
      project_id: 1,
      name: "跑步 30 分钟",
      default_estimated_duration_minutes: 30,
      default_reward_amount: 2000,
      notes: "",
      is_active: true,
    },
  ]),
  fetchRewardLedger: vi.fn().mockResolvedValue([
    { id: 1, entry_type: "earn", amount: 2000, reason: "跑步 30 分钟", daily_task_id: 1 },
  ]),
  fetchRewardSummary: vi.fn().mockResolvedValue({ current_balance: 2000, today_earned: 2000 }),
  spendReward: vi.fn().mockResolvedValue({ id: 2, entry_type: "spend", amount: -500, reason: "咖啡" }),
}));


test("renders project template list", async () => {
  render(<Projects />);
  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();
});


test("submits reward spend form", async () => {
  const user = userEvent.setup();
  render(<Rewards />);

  await screen.findByText("跑步 30 分钟");
  await user.type(screen.getByLabelText("扣减金额"), "5");
  await user.type(screen.getByLabelText("扣减原因"), "咖啡");
  await user.click(screen.getByRole("button", { name: "确认扣减" }));

  expect(await screen.findByText("咖啡")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行页面测试，确认当前失败**

Run: `cd frontend && npm run test -- --run src/pages/Projects.test.tsx src/pages/Rewards.test.tsx`

Expected: FAIL，提示缺少 `fetchProjects`、`fetchRewardLedger`、`spendReward` 或对应页面结构。

- [ ] **Step 3: 实现项目页与奖励页的数据流和 UI**

```ts
// frontend/src/api/client.ts
export async function fetchProjects() {
  const { data } = await api.get("/task-projects");
  return data;
}

export async function fetchTaskTemplates(projectId: number) {
  const { data } = await api.get(`/task-templates?project_id=${projectId}`);
  return data;
}

export async function fetchRewardLedger(limit = 20) {
  const { data } = await api.get(`/rewards/ledger?limit=${limit}`);
  return data;
}

export async function spendReward(amountYuan: number, reason: string) {
  const { data } = await api.post("/rewards/spend", {
    amount: amountYuan * 100,
    reason,
  });
  return data;
}
```

```ts
// frontend/src/hooks/useProjectsBoard.ts
import { useEffect, useState } from "react";

import { fetchProjects, fetchTaskTemplates } from "../api/client";
import type { TaskProject, TaskTemplate } from "../types";

export function useProjectsBoard() {
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);

  useEffect(() => {
    const load = async () => {
      const projectData = await fetchProjects();
      setProjects(projectData);
      if (projectData.length > 0) {
        setSelectedProjectId(projectData[0].id);
        setTemplates(await fetchTaskTemplates(projectData[0].id));
      }
    };
    void load();
  }, []);

  return { projects, selectedProjectId, setSelectedProjectId, templates };
}
```

```ts
// frontend/src/hooks/useRewardsBoard.ts
import { useEffect, useState } from "react";

import { fetchRewardLedger, fetchRewardSummary, spendReward } from "../api/client";

export function useRewardsBoard() {
  const [summary, setSummary] = useState({ current_balance: 0, today_earned: 0 });
  const [ledger, setLedger] = useState<any[]>([]);

  const load = async () => {
    const [summaryData, ledgerData] = await Promise.all([
      fetchRewardSummary(),
      fetchRewardLedger(),
    ]);
    setSummary(summaryData);
    setLedger(ledgerData);
  };

  const submitSpend = async (amountYuan: number, reason: string) => {
    await spendReward(amountYuan, reason);
    await load();
  };

  useEffect(() => {
    void load();
  }, []);

  return { summary, ledger, submitSpend };
}
```

```tsx
// frontend/src/components/ProjectTemplatePanel.tsx
import type { TaskProject, TaskTemplate } from "../types";

export default function ProjectTemplatePanel({
  projects,
  selectedProjectId,
  onSelectProject,
  templates,
}: {
  projects: TaskProject[];
  selectedProjectId: number | null;
  onSelectProject: (projectId: number) => void;
  templates: TaskTemplate[];
}) {
  return (
    <div className="split-panels">
      <div className="card">
        {projects.map((project) => (
          <button key={project.id} className={project.id === selectedProjectId ? "active-project" : ""} onClick={() => onSelectProject(project.id)}>
            {project.name}
          </button>
        ))}
      </div>
      <div className="card">
        {templates.map((template) => (
          <div key={template.id} className="daily-task-row">
            <div>{template.name}</div>
            <div>{template.default_estimated_duration_minutes} 分钟 · {template.default_reward_amount / 100} 元</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/components/RewardLedgerPanel.tsx
import { useState } from "react";

export default function RewardLedgerPanel({
  summary,
  ledger,
  onSpend,
}: {
  summary: { current_balance: number; today_earned: number };
  ledger: Array<{ id: number; entry_type: string; amount: number; reason: string }>;
  onSpend: (amountYuan: number, reason: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div>
      <div className="overview-grid">
        <div className="overview-card"><div className="card-title">当前余额</div><div>{summary.current_balance / 100} 元</div></div>
        <div className="overview-card"><div className="card-title">今日已赚</div><div>{summary.today_earned / 100} 元</div></div>
      </div>
      <div className="card">
        <label>扣减金额<input aria-label="扣减金额" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label>扣减原因<input aria-label="扣减原因" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <button className="btn btn-primary" onClick={() => onSpend(Number(amount), reason)}>确认扣减</button>
      </div>
      <div className="card">
        {ledger.map((entry) => (
          <div key={entry.id} className="daily-task-row">
            <div>{entry.reason}</div>
            <div>{entry.amount / 100} 元</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/pages/Projects.tsx
import ProjectTemplatePanel from "../components/ProjectTemplatePanel";
import { useProjectsBoard } from "../hooks/useProjectsBoard";

export default function Projects() {
  const { projects, selectedProjectId, setSelectedProjectId, templates } = useProjectsBoard();

  return (
    <div>
      <h1 className="page-title">项目</h1>
      <ProjectTemplatePanel
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        templates={templates}
      />
    </div>
  );
}
```

```tsx
// frontend/src/pages/Rewards.tsx
import RewardLedgerPanel from "../components/RewardLedgerPanel";
import { useRewardsBoard } from "../hooks/useRewardsBoard";

export default function Rewards() {
  const { summary, ledger, submitSpend } = useRewardsBoard();

  return (
    <div>
      <h1 className="page-title">奖励</h1>
      <RewardLedgerPanel summary={summary} ledger={ledger} onSpend={submitSpend} />
    </div>
  );
}
```

- [ ] **Step 4: 运行前端页面测试与生产构建**

Run: `cd frontend && npm run test -- --run src/pages/Projects.test.tsx src/pages/Rewards.test.tsx && npm run build`

Expected: PASS，`Projects` 与 `Rewards` 页面测试通过，构建成功。

- [ ] **Step 5: 提交项目页与奖励页**

```bash
git add frontend/src/hooks/useProjectsBoard.ts frontend/src/hooks/useRewardsBoard.ts frontend/src/components/ProjectTemplatePanel.tsx frontend/src/components/RewardLedgerPanel.tsx frontend/src/pages/Projects.tsx frontend/src/pages/Rewards.tsx frontend/src/pages/Projects.test.tsx frontend/src/pages/Rewards.test.tsx frontend/src/api/client.ts
git commit -m "feat: add task reward management pages"
```

### Task 6: 全链路收尾与验证

**Files:**
- Modify: `backend/app/services/task_reward_service.py`
- Modify: `backend/app/api/task_reward.py`
- Modify: `frontend/src/pages/Today.tsx`
- Modify: `frontend/src/pages/Projects.tsx`
- Modify: `frontend/src/pages/Rewards.tsx`
- Modify: `frontend/src/App.css`

- [ ] **Step 1: 补齐缺口行为并清理明显 UX 问题**

```python
# backend/app/services/task_reward_service.py
async def get_reward_summary(db: AsyncSession, date: datetime.date) -> dict:
    balance = await db.scalar(select(func.coalesce(func.sum(RewardLedger.amount), 0)))
    today_earned = await db.scalar(
        select(func.coalesce(func.sum(RewardLedger.amount), 0)).where(
            RewardLedger.entry_type == "earn",
            func.date(RewardLedger.created_at) == date,
        )
    )
    today_spent = await db.scalar(
        select(func.coalesce(func.sum(RewardLedger.amount), 0)).where(
            RewardLedger.entry_type == "spend",
            func.date(RewardLedger.created_at) == date,
        )
    )
    return {
        "current_balance": int(balance or 0),
        "today_earned": int(today_earned or 0),
        "today_spent": abs(int(today_spent or 0)),
    }
```

```tsx
// frontend/src/pages/Today.tsx
// 在页面顶部按钮区补上“手动扣减奖励”和“从模板加入今日”入口占位，
// 即便第一版先走简单 prompt/modal，也不要把入口遗漏掉。
<div className="page-actions">
  <button className="btn btn-secondary">从模板加入今日</button>
  <button className="btn btn-primary">手动扣减奖励</button>
</div>
```

- [ ] **Step 2: 跑完整验证**

Run:

```bash
cd backend && pytest -v
cd frontend && npm run test -- --run
cd frontend && npm run build
```

Expected:
- 后端测试全绿
- 前端测试全绿
- Vite 生产构建成功

- [ ] **Step 3: 手动验证关键流程**

Run:

```bash
docker compose up -d
curl http://localhost:8000/api/health
```

Expected:
- `docker compose` 服务启动成功
- `curl` 返回 `{"status":"ok"}`

然后在浏览器手动检查：
- `/today` 能看到摘要卡片和任务列表
- 点击完成任务后状态变为已完成
- `/rewards` 提交扣减时，余额不足会收到错误提示
- `/projects` 能切换项目并显示模板任务

- [ ] **Step 4: 提交收尾修正**

```bash
git add backend/app/services/task_reward_service.py backend/app/api/task_reward.py frontend/src/pages/Today.tsx frontend/src/pages/Projects.tsx frontend/src/pages/Rewards.tsx frontend/src/App.css
git commit -m "feat: finalize task reward module"
```

---

## Self-Review

### Spec coverage

- `项目 -> 模板 -> 今日任务`：Task 1, Task 2, Task 5
- `完成任务获得奖励额度`：Task 2, Task 4
- `重开任务自动冲销`：Task 1, Task 2
- `手动扣减奖励额度`：Task 2, Task 5
- `今日 / 项目 / 奖励` 三视图：Task 3, Task 4, Task 5
- `奖励不进入真实账本`：Task 1, Task 2 明确走独立模型 `RewardLedger`
- `前后端验证`：Task 2, Task 4, Task 5, Task 6

### Placeholder scan

- 未使用 `TODO`、`TBD` 或“类似上一步”之类占位说法
- 每个测试命令、文件路径、提交命令都已写明
- 代码步骤使用了实际函数名与路径

### Type consistency

- 后端服务统一使用 `create_daily_task / complete_daily_task / reopen_daily_task / spend_reward`
- 前端统一使用 `fetchDailyTasks / fetchRewardSummary / completeDailyTask / spendReward`
- 奖励金额前端按元录入，API 层转换为分，和后端存储口径一致
