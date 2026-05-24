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
    """ezbookkeeping 数据源适配器

    API 路径格式: /api/v1/<resource>/*.json
    需要 X-Timezone-Offset 请求头（分钟，UTC+8=480）
    ID 在响应中为字符串，需转为 int64
    """

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
                "X-Timezone-Offset": "480",
            },
            timeout=30.0,
        )

    async def health_check(self) -> bool:
        try:
            async with self._client() as client:
                resp = await client.get("/api/v1/accounts/list.json")
                data = resp.json()
                return data.get("success", False)
        except Exception:
            return False

    async def fetch_accounts(self) -> list[AccountData]:
        async with self._client() as client:
            resp = await client.get("/api/v1/accounts/list.json")
            data = resp.json()
            if not data.get("success"):
                return []
            accounts = data.get("result", [])

        result = []
        for item in accounts:
            result.append(
                AccountData(
                    id=int(item["id"]),
                    name=item.get("name", ""),
                    currency=item.get("currency", ""),
                    balance=item.get("balance", 0),
                    type=item.get("type", 0),
                    hidden=item.get("hidden", False),
                )
            )
        return result

    async def fetch_categories(self) -> list[CategoryData]:
        async with self._client() as client:
            resp = await client.get("/api/v1/transaction/categories/list.json")
            data = resp.json()
            if not data.get("success"):
                return []
            categories = data.get("result", {})

        result = []
        self._flatten_categories(categories, result)
        return result

    def _flatten_categories(
        self, categories: dict, result: list[CategoryData]
    ):
        """展平层级分类结构（父分类含 subCategories 列表）"""
        for cat_id, cat_data in categories.items():
            if isinstance(cat_data, dict):
                result.append(
                    CategoryData(
                        id=int(cat_id),
                        name=cat_data.get("name", ""),
                        type=cat_data.get("type", 0),
                        parent_id=int(cat_data.get("parentId", 0)),
                        hidden=cat_data.get("hidden", False),
                    )
                )
                sub_cats = cat_data.get("subCategories", [])
                for sub in sub_cats:
                    if isinstance(sub, dict):
                        result.append(
                            CategoryData(
                                id=int(sub["id"]),
                                name=sub.get("name", ""),
                                type=sub.get("type", 0),
                                parent_id=int(sub.get("parentId", 0)),
                                hidden=sub.get("hidden", False),
                            )
                        )

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
                "/api/v1/transactions/list/all.json", params=params
            )
            data = resp.json()
            if not data.get("success"):
                return []
            transactions = data.get("result", [])

        result = []
        for item in transactions:
            src_account = item.get("sourceAccount", {})
            currency = item.get("currency") or src_account.get("currency", "")

            result.append(
                TransactionData(
                    id=int(item["id"]),
                    type=item.get("type", 0),
                    category_id=int(item.get("categoryId", 0)),
                    account_id=int(item.get("sourceAccountId", 0)),
                    related_account_id=int(item.get("destinationAccountId", 0)),
                    amount=item.get("sourceAmount", 0),
                    related_amount=item.get("destinationAmount", 0),
                    currency=currency,
                    transaction_time=item.get("time", 0),
                    timezone_offset=item.get("utcOffset", 0),
                    comment=item.get("comment", ""),
                    hide_amount=item.get("hideAmount", False),
                    geo_latitude=item.get("geoLatitude", 0) or 0,
                    geo_longitude=item.get("geoLongitude", 0) or 0,
                    tag_ids=",".join(
                        str(t) for t in item.get("tagIds", [])
                    ),
                )
            )
        return result
