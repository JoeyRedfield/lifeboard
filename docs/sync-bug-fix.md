# Sync 连接失败 Bug 修复

> 2026-06-11

## Bug：同步报"无法连接到 ezbookkeeping，请检查配置"

### 现象

`http://localhost:5173/settings` 点击"立即同步"报错：

```
同步失败: 无法连接到 ezbookkeeping，请检查配置
```

### 调用链

```
Settings.tsx "立即同步" → client.ts POST /api/sync
  → sync.py EzBookkeepingSource.health_check()
    → GET http://ezbookkeeping:8080/api/v1/accounts/list.json
    → 检查 resp.success
    → false → 返回错误
```

### 排查过程

1. **ezbookkeeping 容器正常运行**，宿主机 `curl localhost:8080` 直接调用 API 正常，token 有效
2. **容器间网络正常**，backend 容器能解析 `ezbookkeeping` 主机名并连通
3. **ezbookkeeping 日志** 显示 `401 "current token is invalid"`，原因是 `token record not found`
4. **对比 JWT 解码**：

| 来源 | userTokenId | 状态 |
|------|------------|------|
| 宿主机 `.env` | `3506849521971612977` | 有效 |
| 容器内环境变量 | `2347793986392775275` | ezbookkeeping 中不存在 |

**根因：** `.env` 文件更新 token 后（commit `2541516`），backend 容器已运行 2 周未重建，环境变量停留在旧值。Docker Compose 的 `environment` 注入只在容器创建时生效。

### 修复

```bash
docker compose up -d backend
```

重建后 sync 成功，导入 797 条交易记录。

### 经验

- 修改 `.env` 后必须重建容器：`docker compose up -d <service>`
- 容器内 `docker exec <container> env` 可快速确认环境变量是否最新
- `docker compose logs ezbookkeeping` 可看到 token 验证失败的详细信息

