---
title: ezBookkeeping 个人数据中台开发方向调研
tags:
  - ezBookkeeping
  - 个人财务
  - 个人数据中台
  - 调研
aliases:
  - ezBookkeeping 数据中台开发方向调研
---

# ezBookkeeping 个人数据中台开发方向调研

## 1. 调研摘要

- 未找到可靠的公开第三方项目，能明确证明其直接二次开发或深度集成 ezBookkeeping。
- 但 ezBookkeeping 官方已经把 API、CLI、MCP、Agent Skill、OpenClaw 集成和脚本化工具都做出来了，说明它已经具备“可编排的数据源”特征。
- 相似项目主要集中在四类：规则/导入强的财务系统（Firefly III）、本地优先/预算系统（Actual Budget）、纯文本记账+查询（Beancount/Fava/Ledger）、桌面型本地财务软件（HomeBank / Money Manager Ex）。
- 你当前这个仓库已经不是单纯的记账前端，而是一个轻量的个人财务数据中台：`README.md`、`backend/app/datasources/ezbookkeeping.py`、`backend/app/services/analytics_service.py`、`backend/app/mcp_server.py` 已经把同步、分析、查询和自然语言入口串起来了。
- 当前最值得优先做的三件事是：自动账单导入与清洗、消费/资产驾驶舱、AI 财务问答与自动月报。
- 如果继续往前走，关键不是再造一个记账 App，而是把账务数据变成可查询、可清洗、可联动、可告警、可解释的数据资产。

## 2. 当前项目定位判断

从现状看，ezBookkeeping 在这个项目里已经不只是“上游记账系统”，而是上游事实源。你现在真正拥有的是一个以账务数据为核心的个人财务数据底座。

| 类型 | 当前判断 | 现有基础 | 还缺什么 |
|---|---|---|---|
| 个人财务数据仓库 | 已经接近 | PostgreSQL 落库、账户/分类/交易同步、定时抓取、MCP 查询 | 统一实体模型、历史快照、维度表、变更日志 |
| 消费行为分析系统 | 已有雏形 | 月度收支、分类占比、资产趋势 | 商户、渠道、时间段、频次、聚类和路径分析 |
| 个人资产与现金流驾驶舱 | 很适合 | 账户余额、资产趋势、收支趋势 | 负债、订阅、到期日、现金流预测、资产分布 |
| 自动化账务处理中心 | 很适合 | API、CLI、定时同步、导入格式多 | 导入队列、规则引擎、去重、审核工作台 |
| AI 财务助手 | 很适合 | MCP、Agent Skill、OpenClaw、LLM 兼容 | 权限分层、工具编排、审计、解释型输出 |
| 生活数据整合平台 | 可延展 | 导出、API、可同步、可查询 | Obsidian / Notion / n8n / Home Assistant 等连接器 |

结论很直接：这个项目的上层定位，已经可以从“记账 UI”升级成“个人财务数据操作系统”。

## 3. 直接相关案例：ezBookkeeping

> 未找到可靠的公开项目案例表明其直接二次开发或深度集成 ezBookkeeping。

我检索过的关键词包括：`ezBookkeeping`、`ezbookkeeping api`、`ezbookkeeping mcp`、`ezbookkeeping agent skill`、`ezbookkeeping openclaw`、`ezbookkeeping github`、`ezbookkeeping gitee`、`ezbookkeeping gitlab`、`firefly iii rules import`、`actual budget bank sync`、`beancount fava automation`、`homebank automatic assignment`、`money manager ex general reports`。

主要来源包括：GitHub / GitLab / Gitee、ezBookkeeping 官方仓库与文档、Issue / Discussion、V2EX、少数派、知乎、博客园、掘金、Reddit、Hacker News、Product Hunt。

能确认的“直接相关公开材料”主要是官方集成能力，而不是第三方二开项目：

- [ezBookkeeping 官方仓库](https://github.com/mayswind/ezbookkeeping)
- [ezBookkeeping 功能列表](https://ezbookkeeping.mayswind.net/features/)
- [ezBookkeeping 功能对比](https://ezbookkeeping.mayswind.net/comparison/)
- [ezBookkeeping MCP](https://ezbookkeeping.mayswind.net/mcp/)
- [ezBookkeeping Agent Skill](https://ezbookkeeping.mayswind.net/agent/skill)
- [ezBookkeeping 与 OpenClaw 集成](https://ezbookkeeping.mayswind.net/agent/openclaw)
- [ezBookkeeping 命令行](https://ezbookkeeping.mayswind.net/command_line/)

社区侧我找到的更多是“使用、推荐、部署、评测”类材料，而不是明确的二开仓库。例如 V2EX、博客园、知乎都有人把它当作自托管记账选择来介绍，但没有形成清晰可验证的第三方集成项目链路。

## 4. 相似模式项目分析

### Firefly III

- 链接：[GitHub](https://github.com/firefly-iii/firefly-iii)；[API 文档](https://docs.firefly-iii.org/how-to/firefly-iii/features/api/)；[规则引擎](https://docs.firefly-iii.org/how-to/firefly-iii/features/rules/)；[导入文档](https://docs.firefly-iii.org/tutorials/firefly-iii/importing-data/)
- 类型：自托管个人财务管理系统
- 核心能力：预算、分类、标签、周期交易、图表报表、REST API、导入器
- 数据模型特点：以账户、交易、预算、标签、规则为中心，强调导入后清洗和转移识别
- 自动化能力：规则引擎、导入映射、CLI 导入、定时导入
- 可视化能力：报表、图表、预算视图、piggy bank 等财务目标视图
- AI / 智能分析能力：没有原生 AI，但 API 和导入体系很适合接外部智能层
- 与本项目的相似点：同样围绕账户、分类、交易、资产和统计
- 可借鉴点：规则引擎、导入映射、转移识别、API 优先设计
- 不适合照搬的地方：更重、更偏会计语义，复杂度高，用户门槛也更高

### Actual Budget

- 链接：[GitHub](https://github.com/actualbudget/actual)；[官网](https://actualbudget.com/)；[文档](https://actualbudget.com/docs/)；[导入交易](https://actualbudget.com/docs/transactions/importing/)；[规则](https://actualbudget.com/docs/budgeting/rules/)；[同步](https://actualbudget.com/docs/getting-started/sync/)
- 类型：local-first 个人财务 / 预算系统
- 核心能力：Envelope budgeting、多设备同步、银行同步、交易导入、重复交易避免、规则清洗
- 数据模型特点：预算文件 + 同步服务，围绕账户、预算、payee、分类、交易组织
- 自动化能力：银行同步、重复检测、规则自动重命名/分类
- 可视化能力：按月预算视图、预算说明、报表
- AI / 智能分析能力：无原生 AI
- 与本项目的相似点：本地优先、隐私优先、可同步、可导入、可清洗
- 可借鉴点：同步架构、重复交易识别、规则清洗、预算月视图
- 不适合照搬的地方：对外部银行服务依赖强，Envelope 模式不是所有人都需要

### Maybe

- 链接：[GitHub](https://github.com/maybe-finance/maybe)；[Wiki](https://github.com/maybe-finance/maybe/wiki)；[Show HN](https://news.ycombinator.com/item?id=43865479)
- 类型：更宽口径的个人财务 / 财富管理 OS
- 核心能力：把“常见财务场景”作为入口，而不是只盯着单笔记账
- 数据模型特点：比传统记账更贴近“财务场景”和资产负债全景
- 自动化能力：历史产品曾强调辅助顾问和更大的财务场景；当前开源仓库更适合参考产品方向
- 可视化能力：偏整体资产与财务场景的展示
- AI / 智能分析能力：历史 hosted 版本有更强的人类顾问辅助叙事；当前仓库更像产品概念参考
- 与本项目的相似点：都在往“财务 OS”方向延伸
- 可借鉴点：把“场景入口”设计成产品主线，而不是让用户自己理解数据库
- 不适合照搬的地方：仓库已归档，维护风险高，且更偏财富管理而非纯记账

### Beancount / Fava

- 链接：[Beancount](https://github.com/beancount/beancount)；[Beancount 文档](https://beancount.github.io/docs/)；[Fava](https://github.com/beancount/fava)；[Fava 使用说明](https://beancount.github.io/fava/usage.html)
- 类型：纯文本复式记账 + Web UI
- 核心能力：文本账本、查询语言、账目报表、Web 可视化
- 数据模型特点：以文本文件为 canonical source，适合版本控制、脚本处理、可审计
- 自动化能力：`bean-query`、导入脚本、外部工具生态丰富
- 可视化能力：资产负债表、损益表、净值、图表、查询结果导出
- AI / 智能分析能力：非常适合接 LLM 或 CLI 工具，因为数据天生结构化且可读
- 与本项目的相似点：都在做“数据中台化”，而不是单纯记账界面
- 可借鉴点：canonical data、可复现查询、导出文本化、脚本友好
- 不适合照搬的地方：学习曲线高，对非技术用户不友好

### Ledger

- 链接：[GitHub](https://github.com/ledger/ledger)；[官网](https://ledger-cli.org/)；[文档](https://ledger-cli.org/docs.html)
- 类型：命令行复式记账系统
- 核心能力：纯文本输入、命令行报表、无数据库状态
- 数据模型特点：极简、确定性强，适合自动化和脚本
- 自动化能力：天然适合 shell / CI / pipeline 形式调用
- 可视化能力：以文本报表为主，可输出 HTML / 图形
- AI / 智能分析能力：很容易被工具层包起来，但不是原生交互型产品
- 与本项目的相似点：适合做“后端事实层”和查询引擎参考
- 可借鉴点：确定性查询、CLI 报表、极简输入格式
- 不适合照搬的地方：没有现代化 UI，面向普通用户的摩擦太大

### HomeBank

- 链接：[官网](https://www.gethomebank.org/)；[功能页](https://www.gethomebank.org/en/features.php)；[文档](https://www.gethomebank.org/help/frm-main.html)
- 类型：本地个人记账软件
- 核心能力：导入/导出、模板、分类拆分、内部转账、多币种、预算、预测、报表
- 数据模型特点：本地个人账本，偏轻量、偏单用户
- 自动化能力：规则式自动分配、重复检测、错误预防、定时交易
- 可视化能力：动态报表和图表
- AI / 智能分析能力：无原生 AI
- 与本项目的相似点：轻量、自托管、重视导入和统计
- 可借鉴点：Automatic Assignment、Duplicate Detection、Forecast、Remind、Life Energy 这种“结果导向”功能
- 不适合照搬的地方：偏桌面软件，扩展与集成能力没有中台那么顺手

### Money Manager Ex

- 链接：[GitHub](https://github.com/moneymanagerex/moneymanagerex)；[General Reports](https://moneymanagerex.org/docs/features/generalreports/)；[预算](https://moneymanagerex.org/moneymanagerex/en_US/budget.html)；[Android 手册](https://android.moneymanagerex.org/usermanual/)；[WebApp](https://github.com/moneymanagerex/web-money-manager-ex)
- 类型：跨平台个人财务软件 + 伴生 Web / Android 生态
- 核心能力：账户、嵌套分类、预算、现金流预测、定期交易、图表、可定制报表
- 数据模型特点：SQLite 本地库，适合本地优先和离线场景
- 自动化能力：定期交易、预算预测、报表模板（SQL / LUA / HTML / CSS / JS）
- 可视化能力：内置图表和可扩展报表
- AI / 智能分析能力：无原生 AI，但报表引擎已经具备“数据管道”雏形
- 与本项目的相似点：如果你要做个人数据中台，它的“报表模板 + 伴生 WebApp”模式很有参考价值
- 可借鉴点：general report 机制、cash-flow forecast、WebApp 同步桥
- 不适合照搬的地方：桌面中心、历史包袱重，产品语言不是现代中台思路

## 5. 可发展的方向

### 1. 个人消费行为分析仪表盘

- 解决的用户需求：快速看懂钱花在哪、哪些分类在失控、哪些时间段花费异常
- 当前痛点：现有总览偏“会计式”，不够贴近消费行为
- 为什么 ezBookkeeping 适合作为基础：已经有账户、分类、交易、资产趋势和时间序列数据
- 需要新增的数据能力：商户标准化、支付方式、交易备注标签、时间粒度、聚类特征
- 需要新增的产品功能：月度/季度趋势、分类热力图、Top 商户、支出节律、账户间流动图
- 技术实现思路：在 PostgreSQL 上加分析视图或物化视图，前端用 ECharts 扩展钻取
- MVP 范围：月度总览、分类占比、Top 20 商户、近 12 个月趋势、筛选导出
- 复杂度：低
- 价值：高
- 适合优先级：P0
- 参考项目或案例链接：[ezBookkeeping 功能对比](https://ezbookkeeping.mayswind.net/comparison/)；[HomeBank](https://www.gethomebank.org/)；[Money Manager Ex](https://github.com/moneymanagerex/moneymanagerex)

### 2. 自动账单导入与清洗中心

- 解决的用户需求：把银行、支付宝、微信、信用卡账单尽可能自动化地变成可用交易
- 当前痛点：手工录入成本高，导入后分类混乱，重复交易也难处理
- 为什么 ezBookkeeping 适合作为基础：它已经支持多种导入格式和 API，而且你这层可以额外做清洗和审核
- 需要新增的数据能力：导入 staging 区、字段映射模板、重复检测、商户别名、规则库
- 需要新增的产品功能：导入向导、映射预览、重复比对、批量修正、规则保存
- 技术实现思路：分“原始文件 -> staging -> 标准交易 -> 审核 -> 正式入库”五段式管道
- MVP 范围：CSV / OFX / QFX / 微信支付宝账单导入，字段映射，重复检测，人工确认页
- 复杂度：中
- 价值：高
- 适合优先级：P0
- 参考项目或案例链接：[Firefly III 导入文档](https://docs.firefly-iii.org/tutorials/firefly-iii/importing-data/)；[Actual 导入](https://actualbudget.com/docs/transactions/importing/)；[HomeBank 自动分配](https://www.gethomebank.org/)

### 3. 预算、现金流与订阅管理

- 解决的用户需求：提前知道下个月能花多少、固定支出会不会压垮现金流
- 当前痛点：只有历史统计，没有足够强的预测和预算闭环
- 为什么 ezBookkeeping 适合作为基础：已有收入、支出、账户余额，天然可以推预算和现金流
- 需要新增的数据能力：预算项、周期账单、订阅、还款计划、未来交易、预测模型
- 需要新增的产品功能：预算编制、滚动现金流、订阅到期提醒、超支告警
- 技术实现思路：把周期交易与未来支出放入预测表，按月滚动计算预算余额
- MVP 范围：月预算、订阅清单、固定账单提醒、下月现金流预测
- 复杂度：中
- 价值：高
- 适合优先级：P1
- 参考项目或案例链接：[Actual Budget](https://actualbudget.com/)；[Firefly III 规则](https://docs.firefly-iii.org/how-to/firefly-iii/features/rules/)；[Money Manager Ex 预算](https://moneymanagerex.org/moneymanagerex/en_US/budget.html)

### 4. 资产负债与净资产追踪

- 解决的用户需求：真正看清自己有多少资产、多少负债、净资产如何变化
- 当前痛点：很多记账系统只看收支，不看负债和净值
- 为什么 ezBookkeeping 适合作为基础：账户已经是核心实体，余额趋势也已经存在
- 需要新增的数据能力：负债账户映射、资产分类、估值、汇率快照、历史余额快照
- 需要新增的产品功能：净资产曲线、资产分布、负债分布、负债到期日、账户健康度
- 技术实现思路：按账户类型和币种做估值层，定期快照余额并保留历史
- MVP 范围：净资产总览、负债账户页、按月净值曲线、多币种汇总
- 复杂度：中
- 价值：高
- 适合优先级：P1
- 参考项目或案例链接：[Actual Sync](https://actualbudget.com/docs/getting-started/sync/)；[Money Manager Ex Android 手册](https://android.moneymanagerex.org/usermanual/)；[Beancount 文档](https://beancount.github.io/docs/)

### 5. AI 财务问答助手

- 解决的用户需求：用自然语言问“我这个月花超了吗”“最近三个月哪里异常”“我该先看哪张卡”
- 当前痛点：用户要自己理解图表和字段，不够直接
- 为什么 ezBookkeeping 适合作为基础：官方已经有 MCP、Agent Skill、OpenClaw 集成和 API Tools
- 需要新增的数据能力：可问答的指标层、权限分级、可解释摘要、查询日志
- 需要新增的产品功能：自然语言问答、对话式筛选、问答结果卡片、可导出的 Markdown 报告
- 技术实现思路：MCP 只读工具 + 领域指标层 + 模板化回答，再逐步加入写入类工具
- MVP 范围：只读问答、月度摘要、分类解释、账户变化解释
- 复杂度：中
- 价值：高
- 适合优先级：P1
- 参考项目或案例链接：[ezBookkeeping MCP](https://ezbookkeeping.mayswind.net/mcp/)；[Agent Skill](https://ezbookkeeping.mayswind.net/agent/skill)；[与 OpenClaw 集成](https://ezbookkeeping.mayswind.net/agent/openclaw)

### 6. 个人数据仓库连接器与自动报告

- 解决的用户需求：把账务数据同步到 Obsidian / Notion / n8n / Home Assistant / 其他工作流里
- 当前痛点：财务数据停留在单一应用里，难以和笔记、任务、自动化、家庭场景联动
- 为什么 ezBookkeeping 适合作为基础：它已有 HTTP API、CLI、MCP 和多种导入导出能力
- 需要新增的数据能力：统一导出格式、事件订阅、Webhook、报表快照、标签同步
- 需要新增的产品功能：Markdown 导出、JSON 导出、定时报表、Webhook 目标配置、连接器市场
- 技术实现思路：把 ezBookkeeping 作为事实源，外层提供可插拔 connector / exporter / report job
- MVP 范围：月报 Markdown 输出、CSV/JSON 导出、Webhook 推送、Obsidian 链接模板
- 复杂度：中
- 价值：中高
- 适合优先级：P1
- 参考项目或案例链接：[Command Line](https://ezbookkeeping.mayswind.net/command_line/)；[HTTP API](https://ezbookkeeping.mayswind.net/httpapi/account_api)；[Beancount / Fava](https://beancount.github.io/docs/); [Money Manager Ex General Reports](https://moneymanagerex.org/docs/features/generalreports/)

### 7. 家庭财务协作与权限管理

- 解决的用户需求：家庭成员一起记账、对账、看预算、看净资产
- 当前痛点：个人账本和家庭账本常常混在一起，权限和责任边界不清
- 为什么 ezBookkeeping 适合作为基础：它本身支持多用户，而且账户/分类/交易模型天然适合家庭共享
- 需要新增的数据能力：成员角色、审批流、共享账户、责任分摊、审计日志
- 需要新增的产品功能：家庭空间、成员权限、共享预算、协作提醒、家庭月报
- 技术实现思路：RBAC + household workspace + shared accounts + activity log
- MVP 范围：双人共享空间、只读成员、协作录入、共同预算
- 复杂度：高
- 价值：中高
- 适合优先级：P2
- 参考项目或案例链接：[Actual Budget 同步](https://actualbudget.com/docs/getting-started/sync/)；[Firefly III](https://github.com/firefly-iii/firefly-iii)；[ezBookkeeping 功能列表](https://ezbookkeeping.mayswind.net/features/)

### 8. 财务异常检测与提醒

- 解决的用户需求：发现异常消费、重复扣款、订阅涨价、余额异动、周期性漏记
- 当前痛点：财务问题往往发现得太晚
- 为什么 ezBookkeeping 适合作为基础：已有时间序列交易和账户余额，适合做规则和异常模型
- 需要新增的数据能力：异常规则、基线、商户白名单、通知状态、频次统计
- 需要新增的产品功能：异常告警、自动提醒、相似交易聚合、阈值设置
- 技术实现思路：先做规则型告警，再补简单统计异常检测，最后再考虑 ML
- MVP 范围：重复扣款提醒、超阈值提醒、固定支出上涨提醒
- 复杂度：中
- 价值：高
- 适合优先级：P1
- 参考项目或案例链接：[Firefly III 规则引擎](https://docs.firefly-iii.org/how-to/firefly-iii/features/rules/)；[HomeBank Duplicate Detection](https://www.gethomebank.org/)；[Actual Rules](https://actualbudget.com/docs/budgeting/rules/)

## 6. 需求与痛点矩阵

| 用户痛点 | 当前 ezBookkeeping 是否覆盖 | 可扩展功能 | 参考项目 | 优先级 | 备注 |
|---|---|---|---|---|---|
| 手工导账单太耗时 | 部分覆盖 | 自动账单导入、字段映射、重复检测、审核队列 | Firefly III、Actual Budget、HomeBank | P0 | 最先做，直接影响数据质量 |
| 分类和商户命名混乱 | 部分覆盖 | 规则引擎、别名库、批量清洗 | Firefly III、Actual Budget | P0 | 导入后清洗比导入本身更重要 |
| 只能看到收支，看不到消费结构 | 部分覆盖 | 消费行为分析、商户分析、时间节律 | Firefly III、HomeBank | P0 | 现有图表可作为起点 |
| 看不到净资产和负债变化 | 部分覆盖 | 负债账户、净资产曲线、估值层 | Actual Budget、MMEX、Beancount | P1 | 更接近“中台”而不是“记账” |
| 无法预测下月现金流 | 部分覆盖 | 预算、订阅、周期账单、现金流预测 | Actual Budget、MMEX、HomeBank | P1 | 适合做第二阶段增强 |
| 想用自然语言问财务问题 | 基本未覆盖 | MCP 问答、对话式分析、摘要生成 | ezBookkeeping MCP、OpenClaw | P1 | 你这套架构已经有入口 |
| 想自动生成月报 / 年报 / 复盘 | 基本未覆盖 | Markdown 报告、定时摘要、模板化复盘 | Fava、MMEX Reports、Firefly III | P1 | 很适合做低成本高感知功能 |
| 想和家人共享或协作 | 基本未覆盖 | 角色权限、共享预算、审批流 | Actual、Firefly III、ezBookkeeping | P2 | 复杂度高，适合后置 |

## 7. 推荐路线图

### 第一阶段：低成本增强

- 目标：基于现有数据做展示、报表、导出、简单提醒
- 功能：更完整的消费分析、净资产趋势、Markdown / CSV 导出、月报模板、阈值提醒
- 技术任务：补分析视图、补报表接口、补导出任务、把现有 MCP 工具覆盖更多常用问题
- 预期收益：最快形成“这个项目比原生 ezBookkeeping 更有用”的感知
- 风险：如果数据本身不干净，报表会显得“看起来很忙，但不可信”

### 第二阶段：数据中台化

- 目标：引入数据清洗、标签、统一实体、跨来源整合
- 功能：导入 staging、规则引擎、商户别名、统一实体、标签体系、外部数据源连接器
- 技术任务：抽象 canonical schema，建立 ID 映射、历史快照和 ETL 流程
- 预期收益：项目从“可看”变成“可接入、可扩展、可沉淀”
- 风险：建模过重会拖慢迭代，迁移和兼容成本会上升

### 第三阶段：智能化与自动化

- 目标：接入 LLM、自动归类、异常检测、财务建议和自动报告
- 功能：自然语言问答、自动分类、异常提醒、财务复盘、建议生成
- 技术任务：工具层封装、权限控制、审计日志、可解释输出、告警策略
- 预期收益：把手工分析和提醒成本继续压低，形成差异化
- 风险：过度自动化会带来误判和隐私风险，必须保留人工确认

## 8. 最推荐的 3 个 MVP

### MVP 1：自动账单导入与清洗中心

- 一句话价值：把最费时间的数据入口先打通
- 输入数据：CSV / OFX / QFX / 微信账单 / 支付宝账单 / 现有交易数据
- 输出结果：可审核、可去重、可自动分类的标准交易
- 1-2 周可完成版本：导入向导 + 字段映射 + 重复检测 + 人工确认页
- 后续增强空间：定时导入、规则库、OCR、银行直连

### MVP 2：消费行为分析仪表盘

- 一句话价值：让用户一眼看懂钱花在哪里
- 输入数据：已同步的交易、账户、分类、标签
- 输出结果：月度趋势、分类占比、Top 商户、账户流动、资产变化
- 1-2 周可完成版本：4 个核心图表 + 时间筛选 + CSV 导出
- 后续增强空间：商户聚类、节律分析、异常高亮、目标预算对比

### MVP 3：AI 财务问答 + 自动月报

- 一句话价值：让用户用自然语言直接理解财务数据
- 输入数据：MCP 读数工具、分析指标层、月度聚合结果
- 输出结果：自然语言问答、Markdown 月报、关键异常摘要
- 1-2 周可完成版本：只读问答 + 月报模板 + 结果导出
- 后续增强空间：主动提醒、自动分类建议、跨来源财务复盘、可写入动作

## 9. 参考资料

### ezBookkeeping 相关

- [GitHub - mayswind/ezbookkeeping](https://github.com/mayswind/ezbookkeeping)
- [ezBookkeeping 首页](https://ezbookkeeping.mayswind.net/)
- [ezBookkeeping 功能列表](https://ezbookkeeping.mayswind.net/features/)
- [ezBookkeeping 功能对比](https://ezbookkeeping.mayswind.net/comparison/)
- [ezBookkeeping 命令行](https://ezbookkeeping.mayswind.net/command_line/)
- [ezBookkeeping MCP](https://ezbookkeeping.mayswind.net/mcp/)
- [ezBookkeeping Agent Skill](https://ezbookkeeping.mayswind.net/agent/skill)
- [ezBookkeeping 与 OpenClaw 集成](https://ezbookkeeping.mayswind.net/agent/openclaw)
- [ezBookkeeping 开发文档](https://ezbookkeeping.mayswind.net/zh_Hans/developing/)
- [ezBookkeeping Release v1.4.0](https://github.com/mayswind/ezbookkeeping/releases)

### 开源记账系统

- [Firefly III GitHub](https://github.com/firefly-iii/firefly-iii)
- [Firefly III API](https://docs.firefly-iii.org/how-to/firefly-iii/features/api/)
- [Firefly III 规则引擎](https://docs.firefly-iii.org/how-to/firefly-iii/features/rules/)
- [Firefly III 导入教程](https://docs.firefly-iii.org/tutorials/firefly-iii/importing-data/)
- [Actual Budget GitHub](https://github.com/actualbudget/actual)
- [Actual Budget 文档](https://actualbudget.com/docs/)
- [Actual Budget 导入](https://actualbudget.com/docs/transactions/importing/)
- [Actual Budget 同步](https://actualbudget.com/docs/getting-started/sync/)
- [Actual Budget 规则](https://actualbudget.com/docs/budgeting/rules/)
- [Maybe GitHub](https://github.com/maybe-finance/maybe)
- [Beancount GitHub](https://github.com/beancount/beancount)
- [Beancount 文档](https://beancount.github.io/docs/)
- [Fava GitHub](https://github.com/beancount/fava)
- [Ledger GitHub](https://github.com/ledger/ledger)
- [HomeBank 官网](https://www.gethomebank.org/)
- [HomeBank 功能页](https://www.gethomebank.org/en/features.php)
- [HomeBank 文档](https://www.gethomebank.org/help/frm-main.html)
- [Money Manager Ex GitHub](https://github.com/moneymanagerex/moneymanagerex)
- [Money Manager Ex General Reports](https://moneymanagerex.org/docs/features/generalreports/)
- [Money Manager Ex 预算](https://moneymanagerex.org/moneymanagerex/en_US/budget.html)
- [Money Manager Ex Android 手册](https://android.moneymanagerex.org/usermanual/)
- [Money Manager Ex WebApp](https://github.com/moneymanagerex/web-money-manager-ex)

### 个人数据中台 / Quantified Self

- [Beancount User's Manual](https://beancount.github.io/docs/)
- [Fava 使用说明](https://beancount.github.io/fava/usage.html)
- [Ledger 官网](https://ledger-cli.org/)
- [Maybe Wiki](https://github.com/maybe-finance/maybe/wiki)
- [Show HN: Maybe](https://news.ycombinator.com/item?id=43865479)

### 中文社区资料

- [少数派：在尝试了 3 款开源个人记账项目后，谈谈我对这十多年的记账思考](https://sspai.com/post/92911)
- [少数派：开源免费记账，后端，前端和 App，Docker 一键部署记账环境](https://sspai.com/post/80376)
- [少数派：财记：开源自部署的个人资产管理与记账网站](https://sspai.com/post/89711)
- [博客园：轻量又安全！一款开源自托管的个人记账工具！](https://www.cnblogs.com/codechen8848/p/19077111)
- [博客园：开发者导航推荐，免费轻量自托管个人记账的开源免费工具：ezbookkeeping](https://www.cnblogs.com/codernavcom/p/19067206)
- [知乎：我找到了最适合 NAS 的记账应用，开源自托管，适合国人的记账方式](https://www.zhihu.com/tardis/bd/art/29788357680)
- [知乎：告别手动记账！我开发了一个工具，能让支付宝微信账单自动生成专业财务报表](https://zhuanlan.zhihu.com/p/645606240)
- [V2EX：安卓好用的记账软件推荐](https://v2ex.com/t/1170031)
- [V2EX：各位有记账的需求吗，分享下我给 beancount 封装 API 的探索过程](https://www.v2ex.com/t/823477)
- [V2EX：为了和家人一起用纯文本复式记账 我开发了一个 Beancount 托管服务](https://www.v2ex.com/t/994091)

### 英文社区资料

- [Hacker News: Firefly III: An open-source personal finance manager](https://news.ycombinator.com/item?id=41218206)
- [Hacker News: Firefly III: A free and open source personal finance manager](https://news.ycombinator.com/item?id=39392428)
- [Hacker News: Show HN: Actual Budget, a finance app I built over the last two years](https://news.ycombinator.com/item?id=19027064)
- [Product Hunt: Actual Budget](https://www.producthunt.com/posts/actual-budget)
- [Hacker News: Show HN: Maybe – The personal finance app for everyone](https://news.ycombinator.com/item?id=43865479)
