from pydantic import BaseModel


class OverviewResponse(BaseModel):
    year: int
    month: int
    income: int
    expense: int
    balance: int
    net: int


class MonthlyTrendItem(BaseModel):
    year: int
    month: int
    income: int
    expense: int


class CategoryBreakdownItem(BaseModel):
    category: str
    amount: int


class AssetTrendItem(BaseModel):
    year: int
    month: int
    total_balance: int
