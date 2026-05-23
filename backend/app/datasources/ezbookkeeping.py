from typing import Optional

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
        self, start_time: Optional[int] = None, end_time: Optional[int] = None
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
