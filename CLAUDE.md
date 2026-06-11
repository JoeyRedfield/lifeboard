# CLAUDE.md

## 项目概述

LifeBoard — 个人财务数据中台。以 ezBookkeeping 为上游数据源，提供数据同步、分析仪表盘、MCP Server 自然语言查询。

技术栈：FastAPI (Python) + React (TypeScript) + PostgreSQL + Docker Compose。

## 隐私与安全

- **个人财务数据（交易记录、账户余额、资产趋势、旅游花费等）属于敏感隐私信息，严禁写入会提交到 Git 的文档中。** 此类内容应放到 `private/` 目录下。
- `.mcp.json` 包含 API Token，已加入 `.gitignore`，不可提交。模板文件为 `.mcp.json.example`。
- `.env` 包含数据库密码和 API 密钥，已加入 `.gitignore`，不可提交。模板文件为 `.env.example`。
- 写文档时避免使用绝对路径（如 `/Users/<username>/...`），使用相对路径或 `$PROJECT_ROOT`。
- 代码中的示例值使用占位符（如 `<your-token>`、`your_password_here`），不要硬编码真实凭据。
- 提交前检查 `git diff --staged` 确保没有意外包含敏感数据。

## 常用命令

```bash
# 启动所有服务
docker compose up -d

# 重启后端（代码修改后）
docker compose restart backend

# 触发数据同步
curl -X POST http://localhost:8000/api/sync

# 在 Docker 中直接测试 MCP 工具
docker compose exec -T backend python -c "
import asyncio
from app.mcp_server import search_transactions
async def test():
    print(await search_transactions(limit=5))
asyncio.run(test())
"

# 运行后端测试
docker compose exec backend pytest tests/ -v
```
