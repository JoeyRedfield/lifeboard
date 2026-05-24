# LifeBoard MCP Server 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 LifeBoard 集成 MCP Server，让 Claude Code CLI 能通过自然语言查询个人财务数据（收支、趋势、分类、交易）。

**Architecture:** FastMCP Server 挂载在现有 FastAPI 应用上（同时挂载 `/mcp` 和 `/sse` 两个路径以兼容 Claude Code 的 HTTP transport 路径发现机制），复用现有的 analytics_service 和数据库连接。另提供独立的 stdio 入口（`mcp_main.py`）作为备选方案。Claude Code CLI 通过项目级 `.mcp.json` 配置文件连接。

**Tech Stack:** FastMCP (Python) + 现有 FastAPI + SQLAlchemy async + PostgreSQL

**关键兼容性:** Claude Code 的 HTTP transport 在发现 MCP endpoint 时可能忽略自定义路径而回退到 `/sse`，因此同时挂载两个路径确保连接成功。

---

## 文件结构

```
backend/
├── app/
│   ├── mcp_server.py          ← 新建: MCP Server 定义 + 6 个工具
│   ├── mcp_main.py            ← 新建: stdio 模式入口（备选）
│   └── main.py                ← 修改: 挂载 MCP app（双路径）
├── requirements.txt           ← 修改: 添加 fastmcp
└── tests/
    └── test_mcp_server.py     ← 新建: MCP 工具单元测试

.mcp.json                      ← 新建: Claude Code CLI MCP 配置（项目根目录）
```

---

### Task 1: 添加 fastmcp 依赖

**Files:**
- Modify: `backend/requirements.txt:12`

- [ ] **Step 1: 添加 fastmcp 到 requirements.txt**

```text
fastmcp==2.13.1
```

在 `backend/requirements.txt` 末尾追加一行。

- [ ] **Step 2: 在 backend 容器中安装新依赖**

Run: `docker compose exec backend pip install fastmcp==2.13.1`
Expected: `Successfully installed fastmcp-2.13.1`

- [ ] **Step 3: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore: 添加 fastmcp 依赖"
```

---

### Task 2: 创建 MCP Server + 6 个工具

**Files:**
- Create: `backend/app/mcp_server.py`

- [ ] **Step 1: 编写完整的 MCP Server**

```python
"""LifeBoard MCP Server — 通过自然语言查询个人财务数据"""
import datetime
import calendar

from fastmcp import FastMCP
from sqlalchemy import select, func, or_

from app.database import async_session
from app.models import Transaction, Account, Category
from app.services.analytics_service import (
    TYPE_INCOME,
    TYPE_EXPENSE,
)

mcp = FastMCP("LifeBoard", description="个人财务数据中台 — 查询收支、趋势、分类、资产")


def _yuan(cent: int) -> str:
    """分 → 元字符串，保留两位小数"""
    return f"{cent / 100:,.2f}"


async def _get_db():
    async with async_session() as session:
        yield session


# ===== Tool 1: 收支总览 =====

@mcp.tool()
async def get_financial_overview(year: int | None = None, month: int | None = None) -> str:
    """查询某月的财务总览——本月收入、支出、结余、总资产。

    Args:
        year: 年份，默认今年
        month: 月份(1-12)，默认本月
    """
    now = datetime.datetime.now()
    year = year or now.year
    month = month or now.month

    tz = datetime.timezone(datetime.timedelta(hours=8))
    start_dt = datetime.datetime(year, month, 1, tzinfo=tz)
    last_day = calendar.monthrange(year, month)[1]
    end_dt = datetime.datetime(year, month, last_day, 23, 59, 59, tzinfo=tz)
    start_ts = int(start_dt.timestamp())
    end_ts = int(end_dt.timestamp())

    async with async_session() as db:
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

    inc = int(income or 0)
    exp = int(expense or 0)
    bal = int(total_balance or 0)
    net = inc - exp

    return (
        f"## {year}年{month}月 财务总览\n"
        f"- 收入：¥{_yuan(inc)}\n"
        f"- 支出：¥{_yuan(exp)}\n"
        f"- 结余：¥{_yuan(net)}（{'盈余' if net >= 0 else '赤字'}）\n"
        f"- 总资产：¥{_yuan(bal)}"
    )


# ===== Tool 2: 月度趋势 =====

@mcp.tool()
async def get_monthly_trends(months: int = 12) -> str:
    """查询近 N 个月的收支趋势，返回每月收入、支出和净收支。

    Args:
        months: 回溯月数，默认 12 个月
    """
    now = datetime.datetime.now()
    tz = datetime.timezone(datetime.timedelta(hours=8))
    lines = []

    async with async_session() as db:
        for i in range(months - 1, -1, -1):
            year = now.year
            month = now.month - i
            while month <= 0:
                month += 12
                year -= 1

            last_day = calendar.monthrange(year, month)[1]
            start_dt = datetime.datetime(year, month, 1, tzinfo=tz)
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

            inc = int(income or 0)
            exp = int(expense or 0)
            net = inc - exp
            indicator = "↑" if net >= 0 else "↓"
            lines.append(
                f"| {year}-{month:02d} | ¥{_yuan(inc)} | ¥{_yuan(exp)} | {indicator} ¥{_yuan(abs(net))} |"
            )

    header = "| 月份 | 收入 | 支出 | 净收支 |\n|------|------|------|--------|\n"
    return f"## 近{months}个月收支趋势\n{header}{chr(10).join(lines)}"


# ===== Tool 3: 分类占比 =====

@mcp.tool()
async def get_category_breakdown(year: int | None = None, month: int | None = None) -> str:
    """查询某月支出分类占比，按金额从高到低排列。

    Args:
        year: 年份，默认今年
        month: 月份(1-12)，默认本月
    """
    now = datetime.datetime.now()
    year = year or now.year
    month = month or now.month

    tz = datetime.timezone(datetime.timedelta(hours=8))
    start_dt = datetime.datetime(year, month, 1, tzinfo=tz)
    last_day = calendar.monthrange(year, month)[1]
    end_dt = datetime.datetime(year, month, last_day, 23, 59, 59, tzinfo=tz)
    start_ts = int(start_dt.timestamp())
    end_ts = int(end_dt.timestamp())

    async with async_session() as db:
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

        total_expense = 0
        items = []
        for row in rows:
            name = row[0] or "未分类"
            amount = int(row[1] or 0)
            total_expense += amount
            items.append((name, amount))

    lines = []
    for name, amount in items:
        pct = f"({amount / total_expense * 100:.1f}%)" if total_expense > 0 else ""
        lines.append(f"| {name} | ¥{_yuan(amount)} | {pct} |")

    header = "| 分类 | 金额 | 占比 |\n|------|------|------|\n"
    return f"## {year}年{month}月 支出分类占比\n{header}{chr(10).join(lines)}"


# ===== Tool 4: 资产趋势 =====

@mcp.tool()
async def get_asset_trends(months: int = 12) -> str:
    """查询近 N 个月的总资产变化趋势（月末余额）。

    Args:
        months: 回溯月数，默认 12 个月
    """
    now = datetime.datetime.now()
    tz = datetime.timezone(datetime.timedelta(hours=8))

    async with async_session() as db:
        current_balance = await db.scalar(
            select(func.coalesce(func.sum(Account.balance), 0))
        )
        current_balance = int(current_balance or 0)

        monthly_net = []
        for i in range(months - 1, -1, -1):
            year = now.year
            month = now.month - i
            while month <= 0:
                month += 12
                year -= 1

            last_day = calendar.monthrange(year, month)[1]
            start_dt = datetime.datetime(year, month, 1, tzinfo=tz)
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
            monthly_net.append({
                "year": year,
                "month": month,
                "net": int(income or 0) - int(expense or 0),
            })

    balance = current_balance
    lines = []
    for i in range(len(monthly_net) - 1, -1, -1):
        m = monthly_net[i]
        m["total_balance"] = balance
        if i > 0:
            balance -= monthly_net[i]["net"]
        change = ""
        if i < len(monthly_net) - 1:
            diff = monthly_net[i + 1]["total_balance"] - m["total_balance"]
            arrow = "↑" if diff >= 0 else "↓"
            change = f" {arrow}¥{_yuan(abs(diff))}"
        lines.append(f"| {m['year']}-{m['month']:02d} | ¥{_yuan(m['total_balance'])} | {change} |")

    header = "| 月份 | 总资产 | 环比变化 |\n|------|--------|----------|\n"
    return f"## 近{months}个月资产趋势\n{header}{chr(10).join(lines)}"


# ===== Tool 5: 搜索交易 =====

@mcp.tool()
async def search_transactions(
    keyword: str = "",
    category: str = "",
    limit: int = 20,
) -> str:
    """搜索交易记录，可按关键词（备注）和分类名称筛选。

    Args:
        keyword: 搜索备注中的关键词，如"美团"、"滴滴"
        category: 按分类名称筛选，如"食品"、"交通"
        limit: 返回条数上限，默认 20
    """
    async with async_session() as db:
        conditions = []
        if keyword:
            conditions.append(Transaction.comment.ilike(f"%{keyword}%"))
        if category:
            conditions.append(Category.name.ilike(f"%{category}%"))

        query = (
            select(
                Transaction.transaction_time,
                Transaction.type,
                Transaction.amount,
                Transaction.comment,
                Category.name.label("cat_name"),
            )
            .join(Category, Transaction.category_id == Category.id, isouter=True)
            .where(*conditions)
            .order_by(Transaction.transaction_time.desc())
            .limit(limit)
        )

        rows = await db.execute(query)
        transactions = rows.all()

    if not transactions:
        filters = []
        if keyword:
            filters.append(f"关键词"{keyword}"")
        if category:
            filters.append(f"分类"{category}"")
        return f"未找到匹配{' + '.join(filters)}的交易记录。"

    lines = []
    for t in transactions:
        ts = datetime.datetime.fromtimestamp(t[0], tz=datetime.timezone(datetime.timedelta(hours=8)))
        type_name = {2: "收入", 3: "支出"}.get(t[1], f"类型{t[1]}")
        cat = t[4] or "未分类"
        comment = f" — {t[3]}" if t[3] else ""
        lines.append(
            f"| {ts.strftime('%Y-%m-%d')} | {type_name} | {cat} | ¥{_yuan(t[2])} |{comment} |"
        )

    header = "| 日期 | 类型 | 分类 | 金额 | 备注 |\n|------|------|------|------|------|\n"
    return f"## 交易记录（共{len(transactions)}条）\n{header}{chr(10).join(lines)}"


# ===== Tool 6: 账户列表 =====

@mcp.tool()
async def list_accounts() -> str:
    """列出所有账户及当前余额。"""
    async with async_session() as db:
        rows = await db.execute(
            select(Account.name, Account.currency, Account.balance, Account.type)
            .order_by(Account.balance.desc())
        )
        accounts = rows.all()

    lines = []
    for a in accounts:
        type_names = {0: "普通", 1: "信用卡", 2: "储蓄", 3: "投资"}
        type_name = type_names.get(a[3], f"类型{a[3]}")
        lines.append(f"| {a[0]} | {a[1]} | {type_name} | ¥{_yuan(a[2])} |")

    header = "| 账户 | 币种 | 类型 | 余额 |\n|------|------|------|------|\n"
    return f"## 账户列表（共{len(accounts)}个）\n{header}{chr(10).join(lines)}"
```

- [ ] **Step 2: 验证语法正确**

Run: `docker compose exec backend python -c "from app.mcp_server import mcp; print(f'MCP Server: {len(mcp._tool_manager._tools)} tools')"`
Expected: `MCP Server: 6 tools`

- [ ] **Step 3: Commit**

```bash
git add backend/app/mcp_server.py
git commit -m "feat: 添加 LifeBoard MCP Server（6 个财务查询工具）"
```

---

### Task 3: 在 FastAPI 中挂载 MCP Server（双路径）

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: 读取当前 main.py**

Run: `cat backend/app/main.py`

- [ ] **Step 2: 在 app 创建后挂载 MCP 到双路径**

`/mcp` 和 `/sse` 两个路径指向同一个 MCP app。Claude Code 的 HTTP transport 会自动探测 `/sse` 路径。

在 `backend/app/main.py` 的 `app = FastAPI(...)` 之后添加：

```python
from app.mcp_server import mcp

# 挂载 MCP Server（双路径兼容）
# /mcp — 标准 MCP Streamable HTTP endpoint
# /sse — Claude Code HTTP transport 默认探测路径
mcp_app = mcp.http_app()
app.mount("/mcp", mcp_app)
app.mount("/sse", mcp_app)
```

- [ ] **Step 3: 重启 backend 验证两个端点**

Run:
```bash
docker compose restart backend
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/mcp
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/sse
```

Expected: 两个端点均返回非 404 状态码（可能是 200 或 406，表示 MCP 端点存在）

- [ ] **Step 4: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: 在 FastAPI 上挂载 MCP Server（/mcp + /sse 双路径）"
```

---

### Task 3.5: 创建 stdio 模式入口（备选方案）

**Files:**
- Create: `backend/app/mcp_main.py`

当 HTTP transport 出现兼容性问题时，可以用 stdio 模式通过 `docker compose exec` 直接调用。

- [ ] **Step 1: 编写 stdio 入口**

```python
"""MCP Server stdio 入口 — 通过 docker compose exec 调用"""
from app.mcp_server import mcp

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

- [ ] **Step 2: 验证 stdio 模式可启动**

Run: `docker compose exec -T backend python -m app.mcp_main --help 2>&1 || true`
Expected: 进程能正常启动（会等待 stdio 输入，Ctrl+C 退出即可）

- [ ] **Step 3: Commit**

```bash
git add backend/app/mcp_main.py
git commit -m "feat: 添加 MCP Server stdio 入口（备选方案）"
```

---

### Task 4: 编写 MCP 工具测试

**Files:**
- Create: `backend/tests/test_mcp_server.py`

- [ ] **Step 1: 编写测试（仅测 _yuan 格式化 + 模块导入，DB 相关验证在 Task 5 通过 Claude Desktop 手动验证）**

```python
"""MCP Server 工具测试"""
from app.mcp_server import _yuan
from app.mcp_server import mcp
from app.mcp_server import (
    get_financial_overview,
    get_monthly_trends,
    get_category_breakdown,
    get_asset_trends,
    search_transactions,
    list_accounts,
)


def test_yuan_zero():
    assert _yuan(0) == "0.00"


def test_yuan_one_yuan():
    assert _yuan(100) == "1.00"


def test_yuan_with_comma():
    assert _yuan(105462) == "1,054.62"


def test_yuan_negative():
    assert _yuan(-47103) == "-471.03"


def test_yuan_large_number():
    assert _yuan(123456789) == "1,234,567.89"


def test_yuan_decimal_precision():
    assert _yuan(1) == "0.01"
    assert _yuan(99) == "0.99"
    assert _yuan(10050) == "100.50"


def test_mcp_server_has_six_tools():
    tools = mcp._tool_manager._tools
    assert len(tools) == 6
    tool_names = {t.name for t in tools.values()}
    assert "get_financial_overview" in tool_names
    assert "get_monthly_trends" in tool_names
    assert "get_category_breakdown" in tool_names
    assert "get_asset_trends" in tool_names
    assert "search_transactions" in tool_names
    assert "list_accounts" in tool_names


def test_all_tools_are_importable():
    """验证 6 个工具函数均可直接导入"""
    assert callable(get_financial_overview)
    assert callable(get_monthly_trends)
    assert callable(get_category_breakdown)
    assert callable(get_asset_trends)
    assert callable(search_transactions)
    assert callable(list_accounts)
```

- [ ] **Step 2: 运行测试**

Run: `docker compose exec backend pytest tests/test_mcp_server.py -v`
Expected: 9 tests passing（7 个 _yuan 测试 + 1 个工具数量测试 + 1 个导入测试）

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_mcp_server.py
git commit -m "test: MCP Server _yuan 格式化 + 导入验证测试"
```

---

### Task 5: 创建 Claude Code CLI 的 MCP 配置

**Files:**
- Create: `.mcp.json` (项目根目录)

Claude Code CLI 通过项目根目录的 `.mcp.json` 发现 MCP Server。

- [ ] **Step 1: 创建 .mcp.json**

```json
{
  "mcpServers": {
    "lifeboard": {
      "type": "http",
      "url": "http://localhost:8000/sse"
    }
  }
}
```

**说明：**
- `type: "http"` — 使用 Streamable HTTP transport（MCP 2025-11-25 协议）
- URL 使用 `/sse` 路径——Claude Code 的 HTTP transport 探测机制会优先使用 `/sse`
- 如果 `/sse` 不可用，回退到 `/mcp`
- Docker 服务必须先启动：`docker compose up -d`

**备选：stdio 模式配置**

如果 HTTP 模式遇到兼容性问题（如 Claude Code 版本差异），可以改用 stdio：

```json
{
  "mcpServers": {
    "lifeboard": {
      "type": "stdio",
      "command": "docker",
      "args": ["compose", "exec", "-T", "backend", "python", "-m", "app.mcp_main"]
    }
  }
}
```

- [ ] **Step 2: 验证配置能被 Claude Code 识别**

Run: `claude mcp list`
Expected: 列出 `lifeboard` 服务器（如果 claude mcp CLI 可用）

如果 `claude mcp` 命令不可用，可以在当前会话中直接验证：在 Claude Code 中提及"查一下这个月的财务情况"，观察是否能自动调用 MCP 工具。

- [ ] **Step 3: Commit**

```bash
git add .mcp.json
git commit -m "feat: 添加 Claude Code CLI MCP 连接配置"
```

---

### Task 6: 端到端验证

- [ ] **Step 1: 确认所有服务运行中**

Run: `docker compose ps`
Expected: db (healthy), ezbookkeeping, backend, frontend 均为 Up

- [ ] **Step 2: 确认 MCP 端点可达**

Run:
```bash
# 测试 /sse 端点
curl -s -X POST http://localhost:8000/sse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -50
```

Expected: 返回包含 6 个工具定义的 JSON-RPC 响应

- [ ] **Step 3: 直接调用一个工具验证数据**

Run:
```bash
curl -s -X POST http://localhost:8000/sse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_financial_overview","arguments":{"year":2026,"month":5}}}' | head -100
```

Expected: 返回 2026 年 5 月的财务总览数据（包含收入、支出、结余、总资产）

- [ ] **Step 4: 在 Claude Code 中实测自然语言查询**

在当前或新会话中测试以下问题，验证 AI 能调用 MCP 工具并返回正确数据：
1. "帮我查一下这个月的财务总览" → 应调用 `get_financial_overview`
2. "最近 3 个月我在食品上花了多少钱？" → 应调用 `get_category_breakdown` 或 `search_transactions`
3. "我的资产变化趋势怎么样？" → 应调用 `get_asset_trends`

---

## 自检清单

**1. Spec 覆盖:** 
- 6 个 MCP 工具覆盖全部查询场景——总览、趋势、分类占比、资产、搜索交易、账户列表 ✓
- Task 2: 工具实现 ✓
- Task 3: HTTP 双路径挂载（`/mcp` + `/sse`）兼容 Claude Code 路径发现 ✓
- Task 3.5: stdio 入口备选方案 ✓
- Task 4: 格式化 + 导入测试 ✓
- Task 5: `.mcp.json` 项目级配置 ✓
- Task 6: 端到端验证（curl + Claude Code 实测） ✓

**2. 无占位符:** 所有步骤均包含完整代码、命令和预期结果。

**3. 类型一致性:** 
- `_yuan(cents: int) -> str` 在所有 6 个工具中一致使用，金额永远两位小数 ✓
- 时间戳计算统一使用 UTC+8（与 `analytics_service.py` 保持一致） ✓
- 交易类型常量 `TYPE_INCOME=2, TYPE_EXPENSE=3` 从 `analytics_service` 导入 ✓
- `async_session` 从 `app.database` 导入，每个工具独立管理数据库会话 ✓

**4. Claude Code CLI 特定适配:**
- 挂载 `/sse` 路径兼容 HTTP transport 的路径发现机制 ✓
- `.mcp.json` 使用项目级配置，可提交到 Git ✓
- 提供 stdio 备选方案（通过 `docker compose exec`）应对版本兼容性 ✓
