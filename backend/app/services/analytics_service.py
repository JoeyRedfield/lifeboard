import calendar
import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Transaction, Account, Category

# ezbookkeeping transaction types (from API)
TYPE_INCOME = 2
TYPE_EXPENSE = 3


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
    """获取近 N 个月资产趋势（从当前余额倒推每月历史余额）"""
    tz = datetime.timezone(datetime.timedelta(hours=8))
    now = datetime.datetime.now()

    # 当前总资产
    current_balance = await db.scalar(
        select(func.coalesce(func.sum(Account.balance), 0))
    )
    current_balance = int(current_balance or 0)

    # 从最早月到当月的每月净收支
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

    # 倒推：每月月末资产 = 下月月末资产 - 下月净收支
    balance = current_balance
    for i in range(len(monthly_net) - 1, -1, -1):
        monthly_net[i]["total_balance"] = balance
        if i > 0:
            balance -= monthly_net[i]["net"]

    return monthly_net
