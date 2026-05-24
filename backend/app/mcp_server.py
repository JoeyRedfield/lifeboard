"""
LifeBoard MCP Server — 个人财务数据中台

提供 6 个 MCP 工具函数，通过自然语言查询个人财务数据。
所有金额以"分"为单位存储在数据库，展示时转为"元"（两位小数，千分位分隔）。
"""

import calendar
import datetime

from fastmcp import FastMCP
from sqlalchemy import and_, select, func

from app.database import async_session
from app.models import Transaction, Account, Category

# ============================================================================
# 常量
# ============================================================================

TYPE_INCOME = 2   # ezbookkeeping 收入
TYPE_EXPENSE = 3  # ezbookkeeping 支出

TZ = datetime.timezone(datetime.timedelta(hours=8))

# ============================================================================
# FastMCP 实例
# ============================================================================

mcp = FastMCP("LifeBoard")

# ============================================================================
# 辅助函数
# ============================================================================


def _yuan(cents: int) -> str:
    """将金额从分转为元，两位小数，千分位分隔。"""
    if isinstance(cents, float):
        cents = int(cents)
    return f"{cents / 100:,.2f}"


def _month_label(year: int, month: int) -> str:
    """返回 YYYY-MM 格式的月份标签。"""
    return f"{year}-{month:02d}"


def _month_range(year: int, month: int) -> tuple[int, int]:
    """返回该月起止 Unix 时间戳（UTC+8）。"""
    last_day = calendar.monthrange(year, month)[1]
    start_dt = datetime.datetime(year, month, 1, tzinfo=TZ)
    end_dt = datetime.datetime(year, month, last_day, 23, 59, 59, tzinfo=TZ)
    return int(start_dt.timestamp()), int(end_dt.timestamp())


def _iter_recent_months(months: int) -> list[tuple[int, int]]:
    """生成近 N 个月的年月列表，从最早到最近。"""
    now = datetime.datetime.now()
    result = []
    for i in range(months - 1, -1, -1):
        y, m = now.year, now.month - i
        while m <= 0:
            m += 12
            y -= 1
        result.append((y, m))
    return result


# ============================================================================
# Tool 1: get_financial_overview — 财务总览
# ============================================================================


@mcp.tool()
async def get_financial_overview(year: int = 0, month: int = 0) -> str:
    """查询某月财务总览。返回收入、支出、结余（盈余/赤字）和总资产。

    Args:
        year: 年份，默认当年（设为 0 自动取当前年）
        month: 月份，默认当月（设为 0 自动取当前月）
    """
    now = datetime.datetime.now()
    if not year:
        year = now.year
    if not month:
        month = now.month

    start_ts, end_ts = _month_range(year, month)

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

    income_val = int(income or 0)
    expense_val = int(expense or 0)
    net_val = income_val - expense_val
    balance_val = int(total_balance or 0)

    net_label = "盈余" if net_val >= 0 else "赤字"

    return f"""## {year}年{month}月 财务总览

| 指标 | 金额 |
|------|------|
| 收入 | {_yuan(income_val)} |
| 支出 | {_yuan(expense_val)} |
| 净收支（{net_label}） | {_yuan(net_val)} |
| 总资产 | {_yuan(balance_val)} |
"""


# ============================================================================
# Tool 2: get_monthly_trends — 月度收支趋势
# ============================================================================


@mcp.tool()
async def get_monthly_trends(months: int = 12) -> str:
    """查询近 N 个月收支趋势表。每行包含月份、收入、支出、净收支（带 ↑↓ 指示符）。

    Args:
        months: 回溯月数，默认 12
    """
    async with async_session() as db:
        rows = []
        for y, m in _iter_recent_months(months):
            start_ts, end_ts = _month_range(y, m)

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
            arrow = "↑" if net >= 0 else "↓"

            rows.append({
                "label": _month_label(y, m),
                "income": inc,
                "expense": exp,
                "net": net,
                "arrow": arrow,
            })

    lines = [
        f"## 近{months}个月收支趋势",
        "",
        "| 月份 | 收入 | 支出 | 净收支 |",
        "|------|------|------|--------|",
    ]
    for r in rows:
        lines.append(
            f"| {r['label']} | {_yuan(r['income'])} | {_yuan(r['expense'])} "
            f"| {r['arrow']} {_yuan(r['net'])} |"
        )

    return "\n".join(lines)


# ============================================================================
# Tool 3: get_category_breakdown — 支出分类占比
# ============================================================================


@mcp.tool()
async def get_category_breakdown(year: int = 0, month: int = 0) -> str:
    """查询某月支出分类占比，按金额降序排列。

    Args:
        year: 年份，默认当年
        month: 月份，默认当月
    """
    now = datetime.datetime.now()
    if not year:
        year = now.year
    if not month:
        month = now.month

    start_ts, end_ts = _month_range(year, month)

    async with async_session() as db:
        result = await db.execute(
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
        rows = [(row[0] or "未分类", int(row[1] or 0)) for row in result]

    if not rows or all(amt == 0 for _, amt in rows):
        return f"## {year}年{month}月 支出分类占比\n\n该月暂无支出记录。"

    total_expense = sum(amt for _, amt in rows)

    lines = [
        f"## {year}年{month}月 支出分类占比",
        "",
        "| 分类 | 金额 | 占比 |",
        "|------|------|------|",
    ]
    for name, amt in rows:
        pct = (amt / total_expense * 100) if total_expense > 0 else 0.0
        lines.append(f"| {name} | {_yuan(amt)} | {pct:.1f}% |")

    return "\n".join(lines)


# ============================================================================
# Tool 4: get_asset_trends — 资产趋势
# ============================================================================


@mcp.tool()
async def get_asset_trends(months: int = 12) -> str:
    """查询近 N 个月资产趋势。从当前余额倒推历史每月月末资产。

    Args:
        months: 回溯月数，默认 12
    """
    async with async_session() as db:
        # 1. 当前总资产
        current_balance = await db.scalar(
            select(func.coalesce(func.sum(Account.balance), 0))
        )
        current_balance = int(current_balance or 0)

        # 2. 每月净收支（从最早到最近）
        monthly_data = []
        for y, m in _iter_recent_months(months):
            start_ts, end_ts = _month_range(y, m)

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
            monthly_data.append({
                "label": _month_label(y, m),
                "net": int(income or 0) - int(expense or 0),
            })

        # 3. 倒推每月月末资产
        # balance[month] = balance[next_month] - net[next_month]
        balance = current_balance
        for i in range(len(monthly_data) - 1, -1, -1):
            monthly_data[i]["balance"] = balance
            if i > 0:
                balance -= monthly_data[i]["net"]

    lines = [
        f"## 近{months}个月资产趋势",
        "",
        "| 月份 | 总资产 | 环比变化 |",
        "|------|--------|----------|",
    ]

    prev_balance = None
    for entry in monthly_data:
        cur = entry["balance"]
        if prev_balance is not None:
            change = cur - prev_balance
            arrow = "↑" if change >= 0 else "↓"
            change_str = f"{arrow} {_yuan(change)}"
        else:
            change_str = "-"
        lines.append(f"| {entry['label']} | {_yuan(cur)} | {change_str} |")
        prev_balance = cur

    return "\n".join(lines)


# ============================================================================
# Tool 5: search_transactions — 搜索交易
# ============================================================================


@mcp.tool()
async def search_transactions(
    keyword: str = "",
    category: str = "",
    limit: int = 20,
) -> str:
    """按备注关键词和分类名搜索交易记录。

    Args:
        keyword: 备注关键词（模糊匹配，ILIKE）
        category: 分类名（模糊匹配，ILIKE）
        limit: 返回条数上限，默认 20
    """
    async with async_session() as db:
        query = (
            select(
                Transaction.transaction_time,
                Transaction.type,
                Category.name,
                Transaction.amount,
                Transaction.comment,
            )
            .join(Category, Transaction.category_id == Category.id, isouter=True)
        )

        conditions = []
        if keyword:
            conditions.append(Transaction.comment.ilike(f"%{keyword}%"))
        if category:
            conditions.append(Category.name.ilike(f"%{category}%"))
        if conditions:
            query = query.where(and_(*conditions))

        query = query.order_by(Transaction.transaction_time.desc()).limit(limit)

        result = await db.execute(query)
        rows = result.all()

    # 构造筛选条件描述
    filter_desc = []
    if keyword:
        filter_desc.append(f"关键词 \"{keyword}\"")
    if category:
        filter_desc.append(f"分类 \"{category}\"")
    desc = "、".join(filter_desc) if filter_desc else "全部交易"

    if not rows:
        return f"## 搜索结果\n\n未找到匹配 {desc} 的交易记录。"

    title = f"## 搜索结果（{desc}）" if filter_desc else "## 最近交易"

    lines = [
        title,
        "",
        "| 日期 | 类型 | 分类 | 金额 | 备注 |",
        "|------|------|------|------|------|",
    ]
    for row in rows:
        ts, ttype, cat_name, amount, comment = row
        date_str = datetime.datetime.fromtimestamp(ts, tz=TZ).strftime("%Y-%m-%d")
        type_str = "收入" if ttype == TYPE_INCOME else "支出"
        cat_str = cat_name or "未分类"
        comment_str = (comment or "")[:30]
        lines.append(
            f"| {date_str} | {type_str} | {cat_str} | {_yuan(amount)} | {comment_str} |"
        )

    return "\n".join(lines)


# ============================================================================
# Tool 6: list_accounts — 账户列表
# ============================================================================


@mcp.tool()
async def list_accounts() -> str:
    """列出所有账户及其余额。

    账户类型：0=普通, 1=信用卡, 2=储蓄, 3=投资
    """
    async with async_session() as db:
        result = await db.execute(
            select(Account.name, Account.currency, Account.type, Account.balance)
            .order_by(Account.type, Account.name)
        )
        rows = result.all()

    if not rows:
        return "## 账户列表\n\n暂无账户数据。"

    type_map = {0: "普通", 1: "信用卡", 2: "储蓄", 3: "投资"}

    lines = [
        "## 账户列表",
        "",
        "| 账户名 | 币种 | 类型 | 余额 |",
        "|--------|------|------|------|",
    ]
    for name, currency, atype, balance in rows:
        type_str = type_map.get(atype, str(atype))
        lines.append(f"| {name} | {currency} | {type_str} | {_yuan(balance)} |")

    return "\n".join(lines)
