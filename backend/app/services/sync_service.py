import logging

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.datasources.base import DataSourceBase
from app.models import Account, Category, Tag, Transaction

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


async def sync_tags(db: AsyncSession, source: DataSourceBase) -> int:
    """同步标签数据"""
    data = await source.fetch_tags()
    if not data:
        return 0

    count = 0
    for item in data:
        stmt = (
            insert(Tag)
            .values(
                id=item.id,
                name=item.name,
                group_id=item.group_id,
                display_order=item.display_order,
                hidden=item.hidden,
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "name": item.name,
                    "group_id": item.group_id,
                    "display_order": item.display_order,
                    "hidden": item.hidden,
                },
            )
        )
        await db.execute(stmt)
        count += 1

    await db.commit()
    logger.info("同步标签完成: %d 条", count)
    return count


async def sync_transactions(db: AsyncSession, source: DataSourceBase) -> int:
    """同步交易数据，新交易插入，已有交易更新可变更字段（标签、分类、备注等）"""
    data = await source.fetch_transactions()
    if not data:
        return 0

    item_ids = [item.id for item in data]
    existing_result = await db.scalars(
        select(Transaction).where(Transaction.id.in_(item_ids))
    )
    existing_by_id = {transaction.id: transaction for transaction in existing_result}

    count = 0
    for item in data:
        values = {
            "id": item.id,
            "type": item.type,
            "category_id": item.category_id,
            "account_id": item.account_id,
            "related_account_id": item.related_account_id,
            "amount": item.amount,
            "related_amount": item.related_amount,
            "currency": item.currency,
            "transaction_time": item.transaction_time,
            "timezone_offset": item.timezone_offset,
            "comment": item.comment,
            "hide_amount": item.hide_amount,
            "geo_latitude": item.geo_latitude,
            "geo_longitude": item.geo_longitude,
            "tag_ids": item.tag_ids,
        }
        existing = existing_by_id.get(item.id)
        if existing is not None and all(
            getattr(existing, key) == value for key, value in values.items()
        ):
            continue

        stmt = insert(Transaction).values(**values).on_conflict_do_update(
            index_elements=["id"],
            set_={key: value for key, value in values.items() if key != "id"},
        )
        await db.execute(stmt)
        count += 1

    await db.commit()
    logger.info("同步交易完成: %d 条新增/更新", count)
    return count


async def full_sync(db: AsyncSession, source: DataSourceBase) -> dict[str, int]:
    """执行全量同步"""
    accounts = await sync_accounts(db, source)
    categories = await sync_categories(db, source)
    tags = await sync_tags(db, source)
    transactions = await sync_transactions(db, source)
    return {
        "accounts": accounts,
        "categories": categories,
        "tags": tags,
        "transactions": transactions,
    }
