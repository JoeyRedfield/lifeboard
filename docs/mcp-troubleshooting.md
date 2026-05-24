# MCP Server HTTP 端点故障排查与修复记录

## 问题背景

LifeBoard MCP Server 使用 FastMCP 构建，挂载在 FastAPI 应用上，通过 Claude Code CLI 的 `.mcp.json` 配置连接。

## 问题 1：500 Internal Server Error（Lifespan 未传递）

### 现象

```bash
curl http://localhost:8000/sse/mcp  # → 500 Internal Server Error
curl http://localhost:8000/mcp/mcp  # → 500 Internal Server Error
```

### 根因

FastMCP 的 `http_app()` 返回的 Starlette app 内部有一个 lifespan，负责初始化 `StreamableHTTPSessionManager` 的 task group。当使用 `app.mount()` 挂载到 FastAPI 时，Starlette 的 Mount 机制**不会自动传递**子应用的 lifespan 到父应用。

日志错误：
```
RuntimeError: FastMCP's StreamableHTTPSessionManager task group was not initialized.
This commonly occurs when the FastMCP application's lifespan is not passed to
the parent ASGI application (e.g., FastAPI or Starlette). Please ensure you are
setting `lifespan=mcp_app.lifespan` in your parent app's constructor.
```

### 修复方法

将 MCP app 的 lifespan 组合到 FastAPI 的 lifespan 中：

```python
from app.mcp_server import mcp

mcp_app = mcp.http_app()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # MCP lifespan 必须最先启动，初始化 task group
    async with mcp_app.lifespan(app):
        await init_db()
        start_scheduler()
        yield


app = FastAPI(title="LifeBoard API", version="0.1.0", lifespan=lifespan)
```

**关键点**：`mcp_app.lifespan(app)` 必须用 `async with` 包裹，确保 MCP 的 task group 在应用启动时初始化、关闭时清理。

---

## 问题 2：路由路径嵌套（307 重定向 → 404）

### 现象

```bash
curl http://localhost:8000/sse   # → 307 Temporary Redirect → /sse/
curl http://localhost:8000/sse/  # → 404 Not Found
```

### 根因

FastMCP 的 `http_app()` 内部注册了一个路由 `/mcp`（指向 `StreamableHTTPASGIApp` 处理器）。当通过 `app.mount("/sse", mcp_app)` 挂载时：

| 概念 | 路径 |
|------|------|
| FastAPI mount 前缀 | `/sse` |
| MCP app 内部路由 | `/mcp` |
| **实际有效路径** | `/sse/mcp` |

Starlette 的 Mount 行为：`/sse` → 307 重定向到 `/sse/` → 在子应用中找 `/` 路由 → 子应用没有 `/` 路由 → 404。

### 调试过程

1. 发现 MCP app 只有一个路由 `path='/mcp'`，对应 `StreamableHTTPASGIApp`
2. 尝试修改 `route.path = "/"` 但无效——因为 Starlette `Route` 在 `__init__` 时已将路径编译为正则 `path_regex`，修改 `path` 属性不会同步更新 `path_regex`
3. 验证：`route.path_regex.pattern` 始终为 `^/mcp$`

### 修复方法

不使用 `app.mount()`，改用 `app.add_route()` 直接将 MCP 处理器注册到 FastAPI：

```python
mcp_app = mcp.http_app()
mcp_handler = mcp_app.router.routes[0].endpoint  # StreamableHTTPASGIApp 实例

app.add_route("/mcp", mcp_handler, methods=["GET", "POST"])
app.add_route("/sse", mcp_handler, methods=["GET", "POST"])
```

这样 `/mcp` 和 `/sse` 直接映射到 MCP 处理器，无路径嵌套。

---

## MCP Streamable HTTP 协议知识

### 会话生命周期

```
Client                           Server
  │                                │
  │  POST /sse                     │
  │  {"method":"initialize",...}   │
  │ ─────────────────────────────> │  创建新会话，返回 mcp-session-id
  │  <─ SSE: result (capabilities) │
  │                                │
  │  POST /sse                     │
  │  mcp-session-id: <session_id>  │
  │  {"method":"tools/list",...}   │
  │ ─────────────────────────────> │  使用已有会话
  │  <─ SSE: result (tools[])      │
  │                                │
  │  POST /sse                     │
  │  mcp-session-id: <session_id>  │
  │  {"method":"tools/call",...}   │
  │ ─────────────────────────────> │
  │  <─ SSE: result (content)      │
```

### 关键规则

1. **必须先 `initialize`**：第一个请求必须是 `initialize`，服务器创建会话并返回 `mcp-session-id`
2. **后续请求带会话 ID**：所有非 initialize 请求必须在请求头中带上 `mcp-session-id`
3. **Accept 头必须含 `text/event-stream`**：GET 和 POST 请求都需要（POST 还需要 `application/json`）
4. **无会话 ID 的非 initialize 请求返回 400**：`"Bad Request: Missing session ID"`
5. **错误会话 ID 返回 404**：`"Not Found: Invalid or expired session ID"`

### 验证命令

```bash
# Step 1: 初始化会话
curl -s -X POST http://localhost:8000/sse \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  -D /tmp/headers.txt

# 提取 session ID
SESSION_ID=$(grep -i "mcp-session-id" /tmp/headers.txt | awk '{print $2}' | tr -d '\r')

# Step 2: 列出工具
curl -s -X POST http://localhost:8000/sse \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Step 3: 调用工具
curl -s -X POST http://localhost:8000/sse \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_financial_overview","arguments":{"year":2026,"month":5}}}'
```

---

## 调试技巧备忘

### 检查 FastMCP http_app 内部路由

```python
app = mcp.http_app()
for route in app.routes:
    print(f'{route.path!r}  methods={route.methods}  handler={type(route.endpoint).__name__}')
```

### 检查 Starlette 路由匹配

```python
scope = {'type': 'http', 'method': 'POST', 'path': '/mcp', 'headers': []}
match, child_scope = route.matches(scope)
print(match)  # Match.NONE / Match.PARTIAL / Match.FULL
```

### 直接测试 ASGI handler（绕过路由）

```python
async with mcp_app.lifespan(mcp_app):
    scope = {
        'type': 'http', 'method': 'POST', 'path': '/mcp',
        'headers': [(b'accept', b'application/json, text/event-stream')],
        ...
    }
    await mcp_app(scope, receive, send)
```

### 检查编译后的路由正则

```python
route = mcp_app.routes[0]
print(route.path_regex.pattern)  # 修改 route.path 不会更新此正则
```

---

## 最终架构

```
FastAPI app
├── /api/health              (health check)
├── /api/dashboard/*         (dashboard API)
├── /api/sync/*              (sync API)
├── /mcp  ← StreamableHTTPASGIApp (MCP endpoint)
└── /sse  ← StreamableHTTPASGIApp (MCP endpoint, Claude Code 默认路径)
```

`.mcp.json` 配置：
```json
{
  "mcpServers": {
    "lifeboard": {
      "type": "http",
      "url": "http://localhost:8000/sse"
    }
  }
}
```

### 备选方案：stdio transport

如果 HTTP transport 遇到兼容性问题，可以改用 stdio：

```json
{
  "mcpServers": {
    "lifeboard": {
      "type": "stdio",
      "command": "docker",
      "args": ["compose", "exec", "-T", "backend", "python", "-m", "app.mcp_main"]
    }
  }
}
```
