import pytest
from unittest.mock import AsyncMock

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
