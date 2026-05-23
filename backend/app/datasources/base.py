from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


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
        self, start_time: Optional[int] = None, end_time: Optional[int] = None
    ) -> list[TransactionData]:
        """获取交易列表，支持时间范围筛选"""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """验证数据源连接是否正常"""
        ...
