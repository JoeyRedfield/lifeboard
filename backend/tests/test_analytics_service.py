import pytest
from datetime import datetime, timezone, timedelta

from app.models import Transaction, Account, Category
from app.services.analytics_service import TYPE_EXPENSE, TYPE_INCOME, get_overview


@pytest.mark.asyncio
async def test_get_overview_current_month(db):
    tz = timezone(timedelta(hours=8))
    now = datetime.now(tz)

    db.add(Account(id=1, name="现金", currency="CNY", balance=20000))
    db.add(Category(id=1, name="餐饮", type=2))

    db.add(
        Transaction(
            id=1,
            type=TYPE_EXPENSE,
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
            type=TYPE_INCOME,
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
