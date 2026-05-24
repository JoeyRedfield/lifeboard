"""MCP Server stdio 入口 — 通过 docker compose exec 调用"""
from app.mcp_server import mcp

if __name__ == "__main__":
    mcp.run(transport="stdio")
