# Reward Todo 抽离设计

日期：2026-06-20

## 目标

将 `lifeboard` 当前内置的待办-奖励模块抽离为独立项目 `reward-todo`，使其像 `ezbookkeeping` 一样以独立 Docker 项目运行，并通过受控的只读 HTTP API 向 `lifeboard` 提供数据。

抽离完成后：

- `reward-todo` 成为待办-奖励数据的唯一写入方与唯一真源
- `lifeboard` 只读取 `reward-todo` 数据，不再写入这部分业务
- 历史数据从 `lifeboard` 现有库一次性迁移到 `reward-todo`
- `reward-todo` 最终推送到 `https://github.com/JoeyRedfield/reward-todo`

## 非目标

- 不在本轮实现完整用户系统
- 不保留 `lifeboard` 与 `reward-todo` 的双写或持续同步
- 不将 `ezbookkeeping`、财务 dashboard、MCP、定时同步能力搬入 `reward-todo`
- 不在本轮删除 `lifeboard` 中旧的待办-奖励源代码文件

## 总体方案

推荐方案为“独立应用 + 只读集成”：

1. 新建独立仓库 `reward-todo`
2. 沿用当前技术栈：
   - 后端：`FastAPI + SQLAlchemy + PostgreSQL + Alembic`
   - 前端：`React + Vite`
3. 新项目以独立 `docker-compose.yml` 运行，默认启动：
   - `db`
   - `backend`
   - `frontend`
   - `proxy`
4. 通过 `nginx` 提供单域单入口
5. `lifeboard` 通过后端代理读取 `reward-todo` 的 `public API`

## 仓库与部署边界

### Reward Todo

`reward-todo` 是完整独立产品，拥有：

- 独立仓库
- 独立数据库
- 独立前端页面
- 独立后端 API
- 独立 Docker 编排
- 独立 README、环境变量模板、迁移脚本、seed 脚本

默认部署形态：

- 单域单入口
- 反向代理由 `nginx` 提供
- UI 路径通过 `Basic Auth` 保护
- `public API` 不走 `Basic Auth`，但要求只读 token

### LifeBoard

`lifeboard` 保留“观察入口”职责：

- 保留 `今日 / 项目 / 奖励` 三个页面
- 页面改为只读
- 数据来自 `reward-todo`
- 前端不直接请求 `reward-todo`
- 后端新增代理读取层

## 数据所有权与迁移

### 真源切换

切流后：

- `reward-todo` 是待办-奖励数据唯一真源
- `lifeboard` 不再暴露本地待办-奖励写接口
- `lifeboard` 不再将本地待办-奖励表视为运行时真源

### 迁移策略

迁移采用一次性迁移，不做双写，不做持续同步。

切流步骤：

1. 冻结 `lifeboard` 中待办-奖励写操作
2. 执行迁移脚本
3. 启动 `reward-todo`
4. 将 `lifeboard` 切到 `reward-todo` 只读代理

### 迁移范围

从 `lifeboard` 旧库迁移以下四张表：

- `task_projects`
- `task_templates`
- `daily_tasks`
- `reward_ledger`

迁移要求：

- 保留原始主键
- 保留原始时间戳
- 保留外键关系
- 导入后输出逐表计数与校验结果

迁移脚本直接连接旧 PostgreSQL 数据库与新 PostgreSQL 数据库，不通过中间 JSON / CSV 文件。

## Reward Todo 产品范围

`reward-todo` 首发为完整可用产品，而不是仅后端服务。首发范围直接平移当前待办-奖励三页结构：

- `Today`
- `Projects`
- `Rewards`

定位文案：

- 产品名：`Reward Todo`
- 中文描述：`个人任务板 + 奖励账本`

### 页面职责

#### Today

- 展示奖励余额与今日摘要
- 展示今日任务列表
- 支持完成任务
- 支持查看完成状态与实际时长

#### Projects

- 展示项目列表
- 展示项目下模板列表
- 支持新增项目
- 支持新增模板
- 支持将模板加入今日

#### Rewards

- 展示当前余额
- 展示今日已赚
- 展示奖励流水
- 支持手动扣减奖励

## Reward Todo API 分层

### 应用接口

应用接口服务于 `reward-todo` 自己的前端页面，负责：

- 项目读写
- 模板读写
- 今日任务读写
- 完成任务
- 重新打开任务
- 奖励扣减

这些接口不作为外部稳定契约公开文档的核心部分，默认通过同域方式供本应用使用。

### Public 只读接口

`public API` 作为跨系统稳定契约，给 `lifeboard` 使用。首发包含：

- `GET /api/public/summary`
- `GET /api/public/today?date=YYYY-MM-DD`
- `GET /api/public/ledger?limit=N`
- `GET /api/public/projects`
- `GET /api/public/templates?project_id=ID`

设计要求：

- 独立路由前缀
- 独立响应 schema
- 只暴露展示所需字段
- 不直接将内部写接口模型原样外露

## 安全模型

### Web UI

`reward-todo` Web UI 通过反向代理 `Basic Auth` 保护。

原因：

- 不引入完整用户系统
- 不在浏览器中暴露管理员 token
- 保持独立自托管应用的简单部署方式

### Public API

`/api/public/*` 不走 `Basic Auth`，但要求 `READONLY_TOKEN`。

用途：

- 允许 `lifeboard` 作为机器客户端稳定读取
- 避免公共只读接口被匿名访问

### 不采用的方案

本轮不实现：

- 完整登录系统
- 多用户体系
- 浏览器持有管理员 token 的写接口访问

## LifeBoard 集成设计

### 集成方式

`lifeboard` 不直接在前端请求 `reward-todo`。改为：

1. `lifeboard` 前端调用本地后端
2. `lifeboard` 后端携带 `READONLY_TOKEN` 请求 `reward-todo public API`
3. `lifeboard` 后端返回适合前端的只读数据

新增环境变量：

- `REWARD_TODO_BASE_URL`
- `REWARD_TODO_READONLY_TOKEN`
- `REWARD_TODO_APP_URL`

### LifeBoard 后端代理路由

为避免边界模糊，新增明确的代理路由，而不是伪装成本地原始资源：

- `GET /api/reward-todo/summary`
- `GET /api/reward-todo/today?date=YYYY-MM-DD`
- `GET /api/reward-todo/ledger?limit=N`
- `GET /api/reward-todo/projects`
- `GET /api/reward-todo/templates?project_id=ID`

### LifeBoard 前端改造

#### Today

保留：

- summary 卡片
- 今日任务列表
- 完成状态
- 实际时长

移除：

- 完成按钮
- 编辑/展开动作

#### Projects

保留：

- 项目列表
- 项目下模板列表

移除：

- 新增项目
- 新增模板
- 将模板加入今日

#### Rewards

保留：

- 当前余额
- 今日已赚
- 流水列表

移除：

- 奖励扣减表单

### 页面引导

在 `今日 / 项目 / 奖励` 三页顶部提供“前往 Reward Todo 管理”的跳转入口，链接目标来自 `REWARD_TODO_APP_URL`。

### 失败退化

若 `reward-todo` 不可用：

- `lifeboard` 后端返回 502/503
- 前端明确展示“Reward Todo 不可用”
- 不回退到旧本地数据
- 不伪造空状态

## Reward Todo 仓库结构

建议结构：

- `backend/`
- `frontend/`
- `proxy/`
- `alembic/`
- `scripts/migrate_from_lifeboard.py`
- `scripts/seed_demo_data.py`
- `docker-compose.yml`
- `.env.example`
- `README.md`

## 数据库管理

`reward-todo` 使用 Alembic 管理 schema。

分工：

- Alembic：建库与后续 schema 升级
- `migrate_from_lifeboard.py`：从旧库导入真实历史数据
- `seed_demo_data.py`：空库演示与开发 seed

## 测试与验证

### Reward Todo

迁移并保留当前已有核心测试资产：

- 后端 `pytest`
- 前端 `Vitest`

至少覆盖：

- 完成任务发奖励
- 重开任务冲销奖励
- 余额不足拒绝扣减
- 停用模板不可创建日任务
- 今日页完成任务流程
- 项目页新增模板与加入今日
- 奖励页扣减奖励

### LifeBoard

新增或调整测试以覆盖：

- 代理读取 `reward-todo` 的后端接口
- 三个只读页面的渲染与错误态
- 不再暴露旧写路由

## 交付边界

本轮交付包含两部分，并在同一轮完成：

1. 建立并推送独立仓库 `reward-todo`
2. 修改 `lifeboard`，使其切换到 `reward-todo` 只读数据接入

本轮不删除 `lifeboard` 中旧待办-奖励文件；如需物理删除，后续单独确认。
