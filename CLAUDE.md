# CLAUDE.md

## 项目概述

LifeBoard — 个人财务数据中台。以 ezBookkeeping 为财务上游数据源，提供数据同步、分析仪表盘、MCP Server 自然语言查询。

待办-奖励模块已抽离为独立项目 `reward-todo`：

- `reward-todo` 是待办-奖励数据唯一真源
- `lifeboard` 仅通过 `/api/reward-todo/*` 代理路由只读接入
- `lifeboard` 前端的 `今日 / 项目 / 奖励` 页面为只读视图，不再直接写本地待办奖励数据

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

# 启动独立 reward-todo（在 ../reward-todo 仓库）
cd ../reward-todo && docker compose up -d

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

## Reward Todo 接入规则

- 后端只读代理统一位于 `backend/app/api/reward_todo.py`
- 代理配置来自 `REWARD_TODO_BASE_URL`、`REWARD_TODO_READONLY_TOKEN`、`REWARD_TODO_APP_URL`
- `backend/app/api/task_reward.py` 文件仍保留，但**不得重新注册到 `app.main`**
- 若要验证只读链路，优先使用 `curl http://localhost:8000/api/reward-todo/summary`
