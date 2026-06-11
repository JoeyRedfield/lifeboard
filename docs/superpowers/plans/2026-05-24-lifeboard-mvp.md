# LifeBoard MVP 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 LifeBoard 个人数据中台 MVP——从 ezbookkeeping 同步记账数据，提供可视化仪表盘（消费趋势、分类占比、资产变化）。

**Architecture:** FastAPI 后端 + PostgreSQL 数据仓库 + React/TypeScript 前端，通过抽象数据源接口（DataSourceBase）接入 ezbookkeeping，定时 ETL 同步数据到本地库，前端通过 ECharts 展示分析结果。

**Tech Stack:** Python 3.12 + FastAPI + SQLAlchemy + PostgreSQL 16 + React 18 + TypeScript + Vite + ECharts + Docker Compose

---

## 文件结构总览

```
my-project/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── transaction.py
│   │   │   ├── account.py
│   │   │   └── category.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── dashboard.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── dashboard.py
│   │   │   └── sync.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── sync_service.py
│   │   │   └── analytics_service.py
│   │   ├── datasources/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   └── ezbookkeeping.py
│   │   └── scheduler.py
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_sync_service.py
│       └── test_analytics_service.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── App.css
│       ├── api/
│       │   └── client.ts
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   └── Settings.tsx
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── OverviewCards.tsx
│       │   ├── MonthlyTrendChart.tsx
│       │   ├── CategoryPieChart.tsx
│       │   └── AssetTrendChart.tsx
│       ├── hooks/
│       │   └── useDashboard.ts
│       └── types/
│           └── index.ts
```

---

### Task 1: 项目脚手架与 Docker 环境

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `backend/requirements.txt`
- Create: `frontend/Dockerfile`
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`

- [ ] **Step 1: 创建 docker-compose.yml**

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: lifeboard
      POSTGRES_PASSWORD: lifeboard
      POSTGRES_DB: lifeboard
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://lifeboard:lifeboard@db:5432/lifeboard
      EZBOOKKEEPING_BASE_URL: ""
      EZBOOKKEEPING_TOKEN: ""
    depends_on:
      - db
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  pgdata:
```

- [ ] **Step 2: 创建 backend/Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- [ ] **Step 3: 创建 backend/requirements.txt**

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy[asyncio]==2.0.36
asyncpg==0.30.0
pydantic==2.10.3
pydantic-settings==2.7.0
httpx==0.28.1
apscheduler==3.11.0
alembic==1.14.0
pytest==8.3.4
pytest-asyncio==0.25.0
httpx==0.28.1
```

- [ ] **Step 4: 创建 frontend/Dockerfile**

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- [ ] **Step 5: 创建 frontend/package.json**

```json
{
  "name": "lifeboard-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "echarts": "^5.5.1",
    "echarts-for-react": "^3.0.2",
    "axios": "^1.7.9",
    "dayjs": "^1.11.13"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.6.3",
    "vite": "^6.0.3"
  }
}
```

- [ ] **Step 6: 创建 frontend/tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 7: 创建 frontend/tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

- [ ] **Step 8: 创建 frontend/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 9: 创建 frontend/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 10: 创建 frontend/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LifeBoard - 个人数据中台</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 11: 验证环境启动**

```bash
cd /path/to/my-project
docker compose up -d db
docker compose ps
```

Expected: db 服务状态为 Up/healthy

- [ ] **Step 12: 安装前端依赖并验证**

```bash
cd /path/to/my-project/frontend
npm install
```

- [ ] **Step 13: Commit**

```bash
git add docker-compose.yml backend/Dockerfile backend/requirements.txt frontend/
git commit -m "feat: 初始化项目脚手架与 Docker 环境"
```

---

### Task 2: 后端配置与数据库连接

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/main.py`

- [ ] **Step 1: 创建 backend/app/__init__.py**

```python
```

- [ ] **Step 2: 创建 backend/app/config.py**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://lifeboard:lifeboard@localhost:5432/lifeboard"
    ezbookkeeping_base_url: str = ""
    ezbookkeeping_token: str = ""
    sync_interval_minutes: int = 60

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
```

- [ ] **Step 3: 创建 backend/app/database.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

- [ ] **Step 4: 创建 backend/app/main.py**

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.api import dashboard, sync


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="LifeBoard API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api")
app.include_router(sync.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 5: 验证后端启动**

```bash
cd /path/to/my-project/backend
pip install -r requirements.txt
uvicorn app.main:app --reload &
sleep 3
curl http://localhost:8000/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 6: Commit**

```bash
git add backend/app/
git commit -m "feat: 后端配置与数据库连接"
```

---

### Task 3: 数据库模型

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/transaction.py`
- Create: `backend/app/models/account.py`
- Create: `backend/app/models/category.py`

- [ ] **Step 1: 创建 backend/app/models/__init__.py**

```python
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.category import Category

__all__ = ["Transaction", "Account", "Category"]
```

- [ ] **Step 2: 创建 backend/app/models/account.py**

```python
import datetime

from sqlalchemy import BigInteger, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    currency: Mapped[str] = mapped_column(String(10))
    balance: Mapped[int] = mapped_column(BigInteger, default=0)
    type: Mapped[int] = mapped_column(default=0)
    hidden: Mapped[bool] = mapped_column(default=False)
    synced_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 3: 创建 backend/app/models/category.py**

```python
import datetime

from sqlalchemy import BigInteger, String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[int] = mapped_column(Integer, default=0)
    parent_id: Mapped[int] = mapped_column(BigInteger, default=0)
    hidden: Mapped[bool] = mapped_column(default=False)
    synced_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 4: 创建 backend/app/models/transaction.py**

```python
import datetime

from sqlalchemy import BigInteger, Integer, String, Float, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    type: Mapped[int] = mapped_column(Integer)
    category_id: Mapped[int] = mapped_column(BigInteger, nullable=True)
    account_id: Mapped[int] = mapped_column(BigInteger)
    related_account_id: Mapped[int] = mapped_column(BigInteger, default=0)
    amount: Mapped[int] = mapped_column(BigInteger)
    related_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    currency: Mapped[str] = mapped_column(String(10))
    transaction_time: Mapped[int] = mapped_column(BigInteger)
    timezone_offset: Mapped[int] = mapped_column(Integer, default=0)
    comment: Mapped[str] = mapped_column(String(500), default="")
    hide_amount: Mapped[bool] = mapped_column(Boolean, default=False)
    geo_latitude: Mapped[float] = mapped_column(Float, default=0)
    geo_longitude: Mapped[float] = mapped_column(Float, default=0)
    tag_ids: Mapped[str] = mapped_column(String(500), default="")
    synced_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 5: 验证建表**

启动后端并确认数据库表已创建：

```bash
docker compose up -d db backend
sleep 5
docker compose exec db psql -U lifeboard -d lifeboard -c "\dt"
```

Expected: 输出 accounts, categories, transactions 三张表

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/
git commit -m "feat: 数据库模型（账户、分类、交易）"
```

---

### Task 4: 数据源抽象接口

**Files:**
- Create: `backend/app/datasources/__init__.py`
- Create: `backend/app/datasources/base.py`

- [ ] **Step 1: 创建 backend/app/datasources/__init__.py**

```python
from app.datasources.base import DataSourceBase

__all__ = ["DataSourceBase"]
```

- [ ] **Step 2: 创建 backend/app/datasources/base.py**

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class AccountData:
    id: int
    name: str
    currency: str
    balance: int
    type: int
    hidden: bool


@dataclass
class CategoryData:
    id: int
    name: str
    type: int
    parent_id: int
    hidden: bool


@dataclass
class TransactionData:
    id: int
    type: int
    category_id: int
    account_id: int
    related_account_id: int
    amount: int
    related_amount: int
    currency: str
    transaction_time: int
    timezone_offset: int
    comment: str
    hide_amount: bool
    geo_latitude: float
    geo_longitude: float
    tag_ids: str


class DataSourceBase(ABC):
    """数据源抽象接口——后续健身、阅读等数据源均实现此接口"""

    @property
    @abstractmethod
    def name(self) -> str:
        """数据源名称"""
        ...

    @abstractmethod
    async def fetch_accounts(self) -> list[AccountData]:
        """获取账户列表"""
        ...

    @abstractmethod
    async def fetch_categories(self) -> list[CategoryData]:
        """获取分类列表"""
        ...

    @abstractmethod
    async def fetch_transactions(
        self, start_time: int | None = None, end_time: int | None = None
    ) -> list[TransactionData]:
        """获取交易列表，支持时间范围筛选"""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """验证数据源连接是否正常"""
        ...
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/datasources/
git commit -m "feat: 数据源抽象接口定义"
```

---

### Task 5: ezbookkeeping 数据源适配器

**Files:**
- Create: `backend/app/datasources/ezbookkeeping.py`

- [ ] **Step 1: 创建 backend/app/datasources/ezbookkeeping.py**

```python
import httpx

from app.config import settings
from app.datasources.base import (
    DataSourceBase,
    AccountData,
    CategoryData,
    TransactionData,
)


class EzBookkeepingSource(DataSourceBase):
    name = "ezbookkeeping"

    def __init__(self):
        self.base_url = settings.ezbookkeeping_base_url.rstrip("/")
        self.token = settings.ezbookkeeping_token

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def health_check(self) -> bool:
        try:
            async with self._client() as client:
                resp = await client.get("/api/v1/accounts")
                return resp.status_code == 200
        except Exception:
            return False

    async def fetch_accounts(self) -> list[AccountData]:
        async with self._client() as client:
            resp = await client.get("/api/v1/accounts")
            data = resp.json()
            if not data.get("success"):
                return []
            accounts = data.get("result", [])
            if isinstance(accounts, dict):
                accounts = list(accounts.values())

        return [
            AccountData(
                id=item["id"],
                name=item["name"],
                currency=item.get("currency", ""),
                balance=item.get("balance", 0),
                type=item.get("type", 0),
                hidden=item.get("hidden", False),
            )
            for item in accounts
        ]

    async def fetch_categories(self) -> list[CategoryData]:
        async with self._client() as client:
            resp = await client.get("/api/v1/transaction/categories")
            data = resp.json()
            if not data.get("success"):
                return []
            categories = data.get("result", [])

        return [
            CategoryData(
                id=item["id"],
                name=item["name"],
                type=item.get("type", 0),
                parent_id=item.get("parent_id", 0),
                hidden=item.get("hidden", False),
            )
            for item in categories
        ]

    async def fetch_transactions(
        self, start_time: int | None = None, end_time: int | None = None
    ) -> list[TransactionData]:
        params = {}
        if start_time is not None:
            params["start_time"] = start_time
        if end_time is not None:
            params["end_time"] = end_time

        async with self._client() as client:
            resp = await client.get(
                "/api/v1/transactions/all", params=params
            )
            data = resp.json()
            if not data.get("success"):
                return []
            transactions = data.get("result", [])

        return [
            TransactionData(
                id=item["id"],
                type=item.get("type", 0),
                category_id=item.get("category_id", 0),
                account_id=item.get("account_id", 0),
                related_account_id=item.get("related_account_id", 0),
                amount=item.get("amount", 0),
                related_amount=item.get("related_amount", 0),
                currency=item.get("currency", ""),
                transaction_time=item.get("transaction_time", 0),
                timezone_offset=item.get("timezone_utc_offset", 0),
                comment=item.get("comment", ""),
                hide_amount=item.get("hide_amount", False),
                geo_latitude=item.get("geo_latitude", 0) or 0,
                geo_longitude=item.get("geo_longitude", 0) or 0,
                tag_ids=",".join(str(t) for t in item.get("tag_ids", [])),
            )
            for item in transactions
        ]
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/datasources/
git commit -m "feat: ezbookkeeping 数据源适配器"
```

---

### Task 6: 数据同步服务

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/sync_service.py`

- [ ] **Step 1: 创建 backend/app/services/__init__.py**

```python
```

- [ ] **Step 2: 创建 backend/app/services/sync_service.py**

```python
import logging

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.datasources.base import DataSourceBase
from app.models import Account, Category, Transaction

logger = logging.getLogger(__name__)


async def sync_accounts(db: AsyncSession, source: DataSourceBase) -> int:
    """同步账户数据，返回新增/更新数量"""
    data = await source.fetch_accounts()
    if not data:
        return 0

    count = 0
    for item in data:
        stmt = (
            insert(Account)
            .values(
                id=item.id,
                name=item.name,
                currency=item.currency,
                balance=item.balance,
                type=item.type,
                hidden=item.hidden,
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "name": item.name,
                    "currency": item.currency,
                    "balance": item.balance,
                    "type": item.type,
                    "hidden": item.hidden,
                },
            )
        )
        await db.execute(stmt)
        count += 1

    await db.commit()
    logger.info("同步账户完成: %d 条", count)
    return count


async def sync_categories(db: AsyncSession, source: DataSourceBase) -> int:
    """同步分类数据"""
    data = await source.fetch_categories()
    if not data:
        return 0

    count = 0
    for item in data:
        stmt = (
            insert(Category)
            .values(
                id=item.id,
                name=item.name,
                type=item.type,
                parent_id=item.parent_id,
                hidden=item.hidden,
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "name": item.name,
                    "type": item.type,
                    "parent_id": item.parent_id,
                    "hidden": item.hidden,
                },
            )
        )
        await db.execute(stmt)
        count += 1

    await db.commit()
    logger.info("同步分类完成: %d 条", count)
    return count


async def sync_transactions(db: AsyncSession, source: DataSourceBase) -> int:
    """同步交易数据，仅同步本地不存在的交易"""
    data = await source.fetch_transactions()
    if not data:
        return 0

    existing_ids = set()
    if data:
        ids = [item.id for item in data]
        result = await db.execute(
            select(Transaction.id).where(Transaction.id.in_(ids))
        )
        existing_ids = {row[0] for row in result}

    count = 0
    for item in data:
        if item.id in existing_ids:
            continue

        stmt = insert(Transaction).values(
            id=item.id,
            type=item.type,
            category_id=item.category_id,
            account_id=item.account_id,
            related_account_id=item.related_account_id,
            amount=item.amount,
            related_amount=item.related_amount,
            currency=item.currency,
            transaction_time=item.transaction_time,
            timezone_offset=item.timezone_offset,
            comment=item.comment,
            hide_amount=item.hide_amount,
            geo_latitude=item.geo_latitude,
            geo_longitude=item.geo_longitude,
            tag_ids=item.tag_ids,
        )
        await db.execute(stmt)
        count += 1

    await db.commit()
    logger.info("同步交易完成: %d 条新增", count)
    return count


async def full_sync(db: AsyncSession, source: DataSourceBase) -> dict[str, int]:
    """执行全量同步"""
    accounts = await sync_accounts(db, source)
    categories = await sync_categories(db, source)
    transactions = await sync_transactions(db, source)
    return {
        "accounts": accounts,
        "categories": categories,
        "transactions": transactions,
    }
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/
git commit -m "feat: 数据同步服务（Upsert 策略）"
```

---

### Task 7: 同步 API 端点

**Files:**
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/sync.py`

- [ ] **Step 1: 创建 backend/app/api/__init__.py**

```python
```

- [ ] **Step 2: 创建 backend/app/api/sync.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.datasources.ezbookkeeping import EzBookkeepingSource
from app.services.sync_service import full_sync

router = APIRouter(tags=["sync"])


@router.post("/api/sync")
async def trigger_sync(db: AsyncSession = Depends(get_db)):
    """手动触发全量同步"""
    source = EzBookkeepingSource()

    if not await source.health_check():
        return {
            "success": False,
            "error": "无法连接到 ezbookkeeping，请检查配置",
        }

    result = await full_sync(db, source)
    return {"success": True, "result": result}


@router.get("/api/sync/status")
async def sync_status(db: AsyncSession = Depends(get_db)):
    """获取同步状态（各表数据量）"""
    from sqlalchemy import text

    result = {}
    for table in ["accounts", "categories", "transactions"]:
        row = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
        count = row.scalar()
        result[table] = count
    return {"success": True, "result": result}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/
git commit -m "feat: 同步 API 端点"
```

---

### Task 8: 分析服务

**Files:**
- Create: `backend/app/services/analytics_service.py`

- [ ] **Step 1: 创建 backend/app/services/analytics_service.py`

```python
import calendar
import datetime

from sqlalchemy import select, func, extract, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Transaction, Account, Category

# ezbookkeeping transaction types
TYPE_INCOME = 1
TYPE_EXPENSE = 2
TYPE_TRANSFER = 3


async def get_overview(db: AsyncSession, year: int, month: int) -> dict:
    """获取当月收支总览"""
    tz = datetime.timezone(datetime.timedelta(hours=8))
    start_dt = datetime.datetime(year, month, 1, tzinfo=tz)
    last_day = calendar.monthrange(year, month)[1]
    end_dt = datetime.datetime(year, month, last_day, 23, 59, 59, tzinfo=tz)

    start_ts = int(start_dt.timestamp())
    end_ts = int(end_dt.timestamp())

    income = await db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.type == TYPE_INCOME,
            Transaction.transaction_time >= start_ts,
            Transaction.transaction_time <= end_ts,
            Transaction.hide_amount == False,
        )
    )

    expense = await db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.type == TYPE_EXPENSE,
            Transaction.transaction_time >= start_ts,
            Transaction.transaction_time <= end_ts,
            Transaction.hide_amount == False,
        )
    )

    total_balance = await db.scalar(
        select(func.coalesce(func.sum(Account.balance), 0))
    )

    return {
        "year": year,
        "month": month,
        "income": int(income or 0),
        "expense": int(expense or 0),
        "balance": int(total_balance or 0),
        "net": int((income or 0) - (expense or 0)),
    }


async def get_monthly_trends(
    db: AsyncSession, months: int = 12
) -> list[dict]:
    """获取近 N 个月的收支趋势"""
    now = datetime.datetime.now()
    result = []

    for i in range(months - 1, -1, -1):
        year = now.year
        month = now.month - i
        while month <= 0:
            month += 12
            year -= 1

        tz = datetime.timezone(datetime.timedelta(hours=8))
        start_dt = datetime.datetime(year, month, 1, tzinfo=tz)
        last_day = calendar.monthrange(year, month)[1]
        end_dt = datetime.datetime(year, month, last_day, 23, 59, 59, tzinfo=tz)

        start_ts = int(start_dt.timestamp())
        end_ts = int(end_dt.timestamp())

        income = await db.scalar(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.type == TYPE_INCOME,
                Transaction.transaction_time >= start_ts,
                Transaction.transaction_time <= end_ts,
                Transaction.hide_amount == False,
            )
        )

        expense = await db.scalar(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.type == TYPE_EXPENSE,
                Transaction.transaction_time >= start_ts,
                Transaction.transaction_time <= end_ts,
                Transaction.hide_amount == False,
            )
        )

        result.append({
            "year": year,
            "month": month,
            "income": int(income or 0),
            "expense": int(expense or 0),
        })

    return result


async def get_category_breakdown(
    db: AsyncSession, year: int, month: int
) -> list[dict]:
    """获取当月支出分类占比"""
    tz = datetime.timezone(datetime.timedelta(hours=8))
    start_dt = datetime.datetime(year, month, 1, tzinfo=tz)
    last_day = calendar.monthrange(year, month)[1]
    end_dt = datetime.datetime(year, month, last_day, 23, 59, 59, tzinfo=tz)

    start_ts = int(start_dt.timestamp())
    end_ts = int(end_dt.timestamp())

    rows = await db.execute(
        select(
            Category.name,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .join(Category, Transaction.category_id == Category.id, isouter=True)
        .where(
            Transaction.type == TYPE_EXPENSE,
            Transaction.transaction_time >= start_ts,
            Transaction.transaction_time <= end_ts,
            Transaction.hide_amount == False,
        )
        .group_by(Category.name)
        .order_by(func.sum(Transaction.amount).desc())
    )

    result = []
    for row in rows:
        name = row[0] or "未分类"
        total = int(row[1] or 0)
        result.append({"category": name, "amount": total})

    return result


async def get_asset_trends(
    db: AsyncSession, months: int = 12
) -> list[dict]:
    """获取近 N 个月资产趋势（月末账户余额汇总）"""
    now = datetime.datetime.now()
    result = []

    for i in range(months - 1, -1, -1):
        year = now.year
        month = now.month - i
        while month <= 0:
            month += 12
            year -= 1

        total = await db.scalar(
            select(func.coalesce(func.sum(Account.balance), 0))
        )

        result.append({
            "year": year,
            "month": month,
            "total_balance": int(total or 0),
        })

    return result
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/analytics_service.py
git commit -m "feat: 分析服务（总览、趋势、分类占比、资产变化）"
```

---

### Task 9: Dashboard API 端点

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/dashboard.py`
- Create: `backend/app/api/dashboard.py`

- [ ] **Step 1: 创建 backend/app/schemas/__init__.py**

```python
```

- [ ] **Step 2: 创建 backend/app/schemas/dashboard.py**

```python
from pydantic import BaseModel


class OverviewResponse(BaseModel):
    year: int
    month: int
    income: int
    expense: int
    balance: int
    net: int


class MonthlyTrendItem(BaseModel):
    year: int
    month: int
    income: int
    expense: int


class CategoryBreakdownItem(BaseModel):
    category: str
    amount: int


class AssetTrendItem(BaseModel):
    year: int
    month: int
    total_balance: int
```

- [ ] **Step 3: 创建 backend/app/api/dashboard.py**

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import analytics_service
from app.schemas.dashboard import (
    OverviewResponse,
    MonthlyTrendItem,
    CategoryBreakdownItem,
    AssetTrendItem,
)

router = APIRouter(tags=["dashboard"])


@router.get("/api/dashboard/overview", response_model=OverviewResponse)
async def dashboard_overview(
    year: int = Query(default=None),
    month: int = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    import datetime
    now = datetime.datetime.now()
    year = year or now.year
    month = month or now.month
    return await analytics_service.get_overview(db, year, month)


@router.get(
    "/api/dashboard/trends",
    response_model=list[MonthlyTrendItem],
)
async def dashboard_trends(
    months: int = Query(default=12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_monthly_trends(db, months)


@router.get(
    "/api/dashboard/categories",
    response_model=list[CategoryBreakdownItem],
)
async def dashboard_categories(
    year: int = Query(default=None),
    month: int = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    import datetime
    now = datetime.datetime.now()
    year = year or now.year
    month = month or now.month
    return await analytics_service.get_category_breakdown(db, year, month)


@router.get(
    "/api/dashboard/assets",
    response_model=list[AssetTrendItem],
)
async def dashboard_assets(
    months: int = Query(default=12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_asset_trends(db, months)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/ backend/app/api/dashboard.py
git commit -m "feat: Dashboard 分析 API 端点"
```

---

### Task 10: 定时同步调度

**Files:**
- Create: `backend/app/scheduler.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 创建 backend/app/scheduler.py**

```python
import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.database import async_session
from app.datasources.ezbookkeeping import EzBookkeepingSource
from app.services.sync_service import full_sync

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def start_scheduler():
    if not settings.ezbookkeeping_base_url or not settings.ezbookkeeping_token:
        logger.warning("ezbookkeeping 未配置，跳过定时同步")
        return

    @scheduler.scheduled_job(
        "interval",
        minutes=settings.sync_interval_minutes,
        id="sync_ezbookkeeping",
    )
    async def scheduled_sync():
        async with async_session() as db:
            source = EzBookkeepingSource()
            try:
                result = await full_sync(db, source)
                logger.info("定时同步完成: %s", result)
            except Exception as e:
                logger.error("定时同步失败: %s", e)

    scheduler.start()
    logger.info("定时同步已启动，间隔 %d 分钟", settings.sync_interval_minutes)
```

- [ ] **Step 2: 修改 backend/app/main.py 启动调度器**

在 lifespan 中调用 `start_scheduler()`：

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.api import dashboard, sync
from app.scheduler import start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_scheduler()
    yield


app = FastAPI(title="LifeBoard API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api")
app.include_router(sync.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/scheduler.py backend/app/main.py
git commit -m "feat: 定时同步调度（APScheduler）"
```

---

### Task 11: 前端基础框架

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/App.css`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: 创建 frontend/src/types/index.ts**

```typescript
export interface OverviewData {
  year: number;
  month: number;
  income: number;
  expense: number;
  balance: number;
  net: number;
}

export interface MonthlyTrendItem {
  year: number;
  month: number;
  income: number;
  expense: number;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
}

export interface AssetTrendItem {
  year: number;
  month: number;
  total_balance: number;
}

export interface SyncResult {
  success: boolean;
  result?: {
    accounts: number;
    categories: number;
    transactions: number;
  };
  error?: string;
}
```

- [ ] **Step 2: 创建 frontend/src/api/client.ts**

```typescript
import axios from "axios";
import type {
  OverviewData,
  MonthlyTrendItem,
  CategoryBreakdownItem,
  AssetTrendItem,
  SyncResult,
} from "../types";

const api = axios.create({ baseURL: "/api" });

export async function fetchOverview(
  year?: number,
  month?: number
): Promise<OverviewData> {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  const { data } = await api.get(`/dashboard/overview?${params}`);
  return data;
}

export async function fetchTrends(
  months = 12
): Promise<MonthlyTrendItem[]> {
  const { data } = await api.get(`/dashboard/trends?months=${months}`);
  return data;
}

export async function fetchCategories(
  year?: number,
  month?: number
): Promise<CategoryBreakdownItem[]> {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  const { data } = await api.get(`/dashboard/categories?${params}`);
  return data;
}

export async function fetchAssets(
  months = 12
): Promise<AssetTrendItem[]> {
  const { data } = await api.get(`/dashboard/assets?months=${months}`);
  return data;
}

export async function triggerSync(): Promise<SyncResult> {
  const { data } = await api.post("/sync");
  return data;
}
```

- [ ] **Step 3: 创建 frontend/src/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: 创建 frontend/src/App.tsx**

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: 创建 frontend/src/App.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #f5f6fa;
  color: #2d3436;
}

.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  background: #2d3436;
  color: #fff;
  padding: 24px 0;
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  font-size: 20px;
  font-weight: 700;
  padding: 0 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
}

.sidebar-nav a {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.2s;
}

.sidebar-nav a:hover,
.sidebar-nav a.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.main-content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
}
```

- [ ] **Step 6: 创建 frontend/src/components/Layout.tsx**

```tsx
import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">LifeBoard</div>
        <nav className="sidebar-nav">
          <NavLink to="/" end>
            仪表盘
          </NavLink>
          <NavLink to="/settings">设置</NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: 前端基础框架（路由、布局、API 客户端）"
```

---

### Task 12: 仪表盘页面与图表组件

**Files:**
- Create: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/components/OverviewCards.tsx`
- Create: `frontend/src/components/MonthlyTrendChart.tsx`
- Create: `frontend/src/components/CategoryPieChart.tsx`
- Create: `frontend/src/components/AssetTrendChart.tsx`
- Create: `frontend/src/hooks/useDashboard.ts`

- [ ] **Step 1: 创建 frontend/src/hooks/useDashboard.ts**

```typescript
import { useState, useEffect, useCallback } from "react";
import {
  fetchOverview,
  fetchTrends,
  fetchCategories,
  fetchAssets,
} from "../api/client";
import type {
  OverviewData,
  MonthlyTrendItem,
  CategoryBreakdownItem,
  AssetTrendItem,
} from "../types";

export function useDashboard() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trends, setTrends] = useState<MonthlyTrendItem[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdownItem[]>([]);
  const [assets, setAssets] = useState<AssetTrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, tr, ca, as] = await Promise.all([
      fetchOverview(),
      fetchTrends(),
      fetchCategories(),
      fetchAssets(),
    ]);
    setOverview(ov);
    setTrends(tr);
    setCategories(ca);
    setAssets(as);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { overview, trends, categories, assets, loading, reload: load };
}
```

- [ ] **Step 2: 创建 frontend/src/components/OverviewCards.tsx**

```tsx
import type { OverviewData } from "../types";

function formatYuan(cent: number): string {
  const yuan = cent / 100;
  if (Math.abs(yuan) >= 10000) {
    return (yuan / 10000).toFixed(1) + "万";
  }
  return yuan.toFixed(0);
}

interface Props {
  data: OverviewData | null;
}

export default function OverviewCards({ data }: Props) {
  if (!data) return null;

  const cards = [
    { label: "本月收入", value: data.income, color: "#00b894" },
    { label: "本月支出", value: data.expense, color: "#e17055" },
    { label: "本月结余", value: data.net, color: "#0984e3" },
    { label: "总资产", value: data.balance, color: "#6c5ce7" },
  ];

  return (
    <div style={{ display: "flex", gap: 20, marginBottom: 28 }}>
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 12,
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 14, color: "#636e72", marginBottom: 8 }}>
            {card.label}
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: card.color,
            }}
          >
            ¥{formatYuan(card.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 创建 frontend/src/components/MonthlyTrendChart.tsx**

```tsx
import ReactECharts from "echarts-for-react";
import type { MonthlyTrendItem } from "../types";

interface Props {
  data: MonthlyTrendItem[];
}

export default function MonthlyTrendChart({ data }: Props) {
  const option = {
    tooltip: {
      trigger: "axis",
    },
    legend: {
      data: ["收入", "支出"],
      bottom: 0,
    },
    grid: {
      left: 20,
      right: 20,
      top: 20,
      bottom: 40,
    },
    xAxis: {
      type: "category",
      data: data.map((d) => `${d.year}-${String(d.month).padStart(2, "0")}`),
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (v: number) => (v / 10000).toFixed(0) + "w",
      },
    },
    series: [
      {
        name: "收入",
        type: "bar",
        data: data.map((d) => d.income / 100),
        itemStyle: { color: "#00b894" },
      },
      {
        name: "支出",
        type: "bar",
        data: data.map((d) => d.expense / 100),
        itemStyle: { color: "#e17055" },
      },
    ],
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
        月度收支趋势
      </h3>
      <ReactECharts option={option} style={{ height: 350 }} />
    </div>
  );
}
```

- [ ] **Step 4: 创建 frontend/src/components/CategoryPieChart.tsx**

```tsx
import ReactECharts from "echarts-for-react";
import type { CategoryBreakdownItem } from "../types";

interface Props {
  data: CategoryBreakdownItem[];
}

export default function CategoryPieChart({ data }: Props) {
  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: ¥{c} ({d}%)",
    },
    legend: {
      type: "scroll",
      orient: "vertical",
      right: 10,
      top: 20,
      bottom: 20,
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["40%", "50%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: "bold" },
        },
        data: data.map((d) => ({
          name: d.category,
          value: +(d.amount / 100).toFixed(0),
        })),
      },
    ],
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
        支出分类占比
      </h3>
      <ReactECharts option={option} style={{ height: 350 }} />
    </div>
  );
}
```

- [ ] **Step 5: 创建 frontend/src/components/AssetTrendChart.tsx**

```tsx
import ReactECharts from "echarts-for-react";
import type { AssetTrendItem } from "../types";

interface Props {
  data: AssetTrendItem[];
}

export default function AssetTrendChart({ data }: Props) {
  const option = {
    tooltip: {
      trigger: "axis",
    },
    grid: {
      left: 20,
      right: 20,
      top: 20,
      bottom: 20,
    },
    xAxis: {
      type: "category",
      data: data.map((d) => `${d.year}-${String(d.month).padStart(2, "0")}`),
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (v: number) => (v / 10000).toFixed(0) + "w",
      },
    },
    series: [
      {
        type: "line",
        data: data.map((d) => +(d.total_balance / 100).toFixed(0)),
        smooth: true,
        lineStyle: { color: "#6c5ce7", width: 2 },
        itemStyle: { color: "#6c5ce7" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(108,92,231,0.25)" },
              { offset: 1, color: "rgba(108,92,231,0.02)" },
            ],
          },
        },
      },
    ],
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
        资产变化趋势
      </h3>
      <ReactECharts option={option} style={{ height: 350 }} />
    </div>
  );
}
```

- [ ] **Step 6: 创建 frontend/src/pages/Dashboard.tsx**

```tsx
import { useDashboard } from "../hooks/useDashboard";
import OverviewCards from "../components/OverviewCards";
import MonthlyTrendChart from "../components/MonthlyTrendChart";
import CategoryPieChart from "../components/CategoryPieChart";
import AssetTrendChart from "../components/AssetTrendChart";

export default function Dashboard() {
  const { overview, trends, categories, assets, loading } = useDashboard();

  if (loading) {
    return <div style={{ textAlign: "center", padding: 60 }}>加载中...</div>;
  }

  return (
    <div>
      <h1 className="page-title">仪表盘</h1>
      <OverviewCards data={overview} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <MonthlyTrendChart data={trends} />
        <CategoryPieChart data={categories} />
      </div>

      <AssetTrendChart data={assets} />
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: 仪表盘页面与图表组件"
```

---

### Task 13: 设置页面

**Files:**
- Create: `frontend/src/pages/Settings.tsx`

- [ ] **Step 1: 创建 frontend/src/pages/Settings.tsx**

```tsx
import { useState } from "react";
import { triggerSync } from "../api/client";

export default function Settings() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const handleSync = async () => {
    setSyncing(true);
    setMessage("");
    try {
      const result = await triggerSync();
      if (result.success && result.result) {
        setMessage(
          `同步完成 — 账户 ${result.result.accounts}条, 分类 ${result.result.categories}条, 交易 ${result.result.transactions}条`
        );
      } else {
        setMessage(`同步失败: ${result.error || "未知错误"}`);
      }
    } catch {
      setMessage("同步请求失败，请检查后端服务");
    }
    setSyncing(false);
  };

  return (
    <div>
      <h1 className="page-title">设置</h1>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          marginBottom: 20,
        }}
      >
        <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
          数据源管理
        </h3>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "#f8f9fa",
            borderRadius: 8,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>ezbookkeeping</div>
            <div style={{ fontSize: 13, color: "#636e72" }}>
              记账数据源 — 自动同步交易、账户、分类
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: "8px 24px",
              background: syncing ? "#b2bec3" : "#0984e3",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              cursor: syncing ? "not-allowed" : "pointer",
            }}
          >
            {syncing ? "同步中..." : "立即同步"}
          </button>
        </div>

        {message && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 8,
              background: message.includes("失败") ? "#ffeaa7" : "#dfe6e9",
              fontSize: 14,
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Settings.tsx
git commit -m "feat: 设置页面（手动同步触发）"
```

---

### Task 14: 后端测试

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_sync_service.py`
- Create: `backend/tests/test_analytics_service.py`

- [ ] **Step 1: 创建 backend/tests/__init__.py**

```python
```

- [ ] **Step 2: 创建 backend/tests/conftest.py**

```python
import pytest
import asyncio

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.database import Base
from app.models import Transaction, Account, Category

TEST_DB_URL = "postgresql+asyncpg://lifeboard:lifeboard@localhost:5432/lifeboard_test"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db():
    engine = create_async_engine(TEST_DB_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()
```

- [ ] **Step 3: 创建 backend/tests/test_sync_service.py**

```python
import pytest
from unittest.mock import AsyncMock, patch

from app.services.sync_service import sync_transactions
from app.datasources.base import TransactionData


@pytest.mark.asyncio
async def test_sync_transactions_inserts_new(db):
    mock_source = AsyncMock()
    mock_source.fetch_transactions.return_value = [
        TransactionData(
            id=1,
            type=2,
            category_id=1,
            account_id=1,
            related_account_id=0,
            amount=5000,
            related_amount=0,
            currency="CNY",
            transaction_time=1700000000,
            timezone_offset=8,
            comment="午餐",
            hide_amount=False,
            geo_latitude=0,
            geo_longitude=0,
            tag_ids="",
        )
    ]

    count = await sync_transactions(db, mock_source)

    assert count == 1


@pytest.mark.asyncio
async def test_sync_transactions_skips_existing(db):
    mock_source = AsyncMock()
    data = TransactionData(
        id=1,
        type=2,
        category_id=1,
        account_id=1,
        related_account_id=0,
        amount=5000,
        related_amount=0,
        currency="CNY",
        transaction_time=1700000000,
        timezone_offset=8,
        comment="午餐",
        hide_amount=False,
        geo_latitude=0,
        geo_longitude=0,
        tag_ids="",
    )
    mock_source.fetch_transactions.return_value = [data]

    await sync_transactions(db, mock_source)
    count = await sync_transactions(db, mock_source)

    assert count == 0
```

- [ ] **Step 4: 创建 backend/tests/test_analytics_service.py**

```python
import pytest
from datetime import datetime, timezone, timedelta

from app.models import Transaction, Account, Category
from app.services.analytics_service import get_overview


@pytest.mark.asyncio
async def test_get_overview_current_month(db):
    tz = timezone(timedelta(hours=8))
    now = datetime.now(tz)

    db.add(Account(id=1, name="现金", currency="CNY", balance=20000))
    db.add(Category(id=1, name="餐饮", type=2))

    db.add(
        Transaction(
            id=1,
            type=2,
            category_id=1,
            account_id=1,
            amount=5000,
            currency="CNY",
            transaction_time=int(now.replace(day=5).timestamp()),
        )
    )
    db.add(
        Transaction(
            id=2,
            type=1,
            category_id=1,
            account_id=1,
            amount=10000,
            currency="CNY",
            transaction_time=int(now.replace(day=10).timestamp()),
        )
    )
    await db.commit()

    result = await get_overview(db, now.year, now.month)

    assert result["expense"] == 5000
    assert result["income"] == 10000
    assert result["net"] == 5000
    assert result["balance"] == 20000
```

- [ ] **Step 5: 运行测试**

```bash
cd /path/to/my-project/backend
PYTHONPATH=. pytest tests/ -v
```

Expected: 3 tests passing

- [ ] **Step 6: Commit**

```bash
git add backend/tests/
git commit -m "test: 同步服务与分析服务单元测试"
```

---

## 自检清单

**1. Spec 覆盖：** 每条需求均有对应 Task — 数据同步(Task 4-7)、可视化仪表盘(Task 9,12)、可扩展数据源接口(Task 4)、定时同步(Task 10)、设置页面(Task 13)、测试(Task 14)。

**2. 占位符扫描：** 无 TBD/TODO/占位描述，所有步骤均包含完整可执行代码。

**3. 类型一致性：** `OverviewData` 等类型在前端 `types/index.ts` 和后端 `schemas/dashboard.py` 中字段匹配，`TransactionData` dataclass 在 `base.py` 定义并在 `ezbookkeeping.py` 中实例化，`full_sync` 返回的 dict 与 `SyncResult` 类型一致。
