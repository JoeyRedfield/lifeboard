"""MCP Server 工具测试"""
import asyncio

from app.mcp_server import _yuan
from app.mcp_server import mcp
from app.mcp_server import (
    get_financial_overview,
    get_monthly_trends,
    get_category_breakdown,
    get_asset_trends,
    search_transactions,
    list_accounts,
)


def test_yuan_zero():
    assert _yuan(0) == "0.00"


def test_yuan_one_yuan():
    assert _yuan(100) == "1.00"


def test_yuan_with_comma():
    assert _yuan(105462) == "1,054.62"


def test_yuan_negative():
    assert _yuan(-47103) == "-471.03"


def test_yuan_large_number():
    assert _yuan(123456789) == "1,234,567.89"


def test_yuan_decimal_precision():
    assert _yuan(1) == "0.01"
    assert _yuan(99) == "0.99"
    assert _yuan(10050) == "100.50"


def test_mcp_server_has_six_tools():
    tools = asyncio.run(mcp._list_tools())
    assert len(tools) == 6
    tool_names = {t.name for t in tools}
    assert "get_financial_overview" in tool_names
    assert "get_monthly_trends" in tool_names
    assert "get_category_breakdown" in tool_names
    assert "get_asset_trends" in tool_names
    assert "search_transactions" in tool_names
    assert "list_accounts" in tool_names


def test_all_tools_are_importable():
    """验证 6 个工具函数均可直接导入"""
    assert callable(get_financial_overview)
    assert callable(get_monthly_trends)
    assert callable(get_category_breakdown)
    assert callable(get_asset_trends)
    assert callable(search_transactions)
    assert callable(list_accounts)
