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
