from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.api import dashboard, sync, task_reward
from app.scheduler import start_scheduler
from app.mcp_server import mcp

mcp_app = mcp.http_app()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # MCP lifespan 初始化 StreamableHTTP 的 task group（必须最先启动）
    async with mcp_app.lifespan(app):
        await init_db()
        start_scheduler()
        yield


app = FastAPI(title="LifeBoard API", version="0.1.0", lifespan=lifespan)

# 获取 MCP 的 StreamableHTTP 处理器并直接注册为路由
# mcp_app 内部只有一个路由 /mcp，直接取出来注册到 FastAPI 的 /mcp 路径
mcp_handler = mcp_app.router.routes[0].endpoint
app.add_route("/mcp", mcp_handler, methods=["GET", "POST"])
app.add_route("/sse", mcp_handler, methods=["GET", "POST"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(task_reward.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
