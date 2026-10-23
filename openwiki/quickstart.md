---
type: index
title: 快速开始：按问题路由到对应页面
description: evo-pi 代码库 wiki 的入口页——把“我想知道 X / 我想改 Y”映射到具体页面，并说明证据优先级（代码优先于文档）与两处容易踩空的引用。
tags: [index, navigation, quickstart, routing]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T09:08:25.607Z
sources:
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-e119253b3c3737247dc63f2a
    resource: repo://.openwikiignore
  - id: openwiki-source-59f729b67c0a733dbed55b7f
    resource: repo://biome.json
  - id: openwiki-source-95ebef8d5ce56ff21d136397
    resource: repo://MEMORY.md
  - id: openwiki-source-b6d4dbadc290acfd0ace4931
    resource: repo://packages/core/package.json
  - id: openwiki-source-bb4774a025167dcf20474522
    resource: repo://packages/core/src/session/adapters/filesystem-session-storage.ts
  - id: openwiki-source-8e1389d9cf9e65ce13a6f3de
    resource: repo://packages/core/src/session/adapters/jsonl-session-repository.ts
  - id: openwiki-source-9cd4896b22c0c96820a46999
    resource: repo://packages/core/src/session/index.ts
  - id: openwiki-source-4b5549338e2c170c73ef3562
    resource: repo://packages/web/package.json
  - id: openwiki-source-56595e70a41c9bfedaa261d7
    resource: repo://packages/web/src/app/api/sessions/route.ts
generated: { by: "pi", at: "2026-10-17T09:08:25.607Z" }
---

# evo-pi Wiki 快速开始

本 wiki 由代码生成，描述 `evo-pi` monorepo 的**实际状态**。所有事实以源码为准，文档只在被代码证实时才采信。

## 按问题找页面

### 我想理解整体

| 问题 | 页面 |
|---|---|
| 这个仓库长什么样？有哪些包？ | [系统全景](./overview/system-map.md) |
| core 的四层结构是怎么落地的？ | [Clean Architecture 四层落地](./core/clean-architecture-layers.md) |
| 为什么做了这些决策？ | [决策记录与交付纪律](./process/decision-records-and-delivery.md) |

### 我要改 core

| 问题 | 页面 |
|---|---|
| 加一个 session 读侧用例 / 改端口契约 | [session capability](./core/session-capability.md) |
| 改 JSONL 读取、缓存或索引 | [存储适配与 scan-index](./core/session-storage-and-scan-index.md) |
| 改搜索行为或上限 | [session 搜索](./core/session-search.md) |
| 改 agentDir 解析或 trust 检查 | [system capability](./core/system-capability.md) |

### 我要改 web

| 问题 | 页面 |
|---|---|
| 加/改 HTTP 端点、DTO、错误码 | [HTTP API 层](./web/api-routes.md) |
| 改取数、缓存策略、选中态 | [客户端数据获取](./web/data-fetching.md) |
| 改布局、面板、Provider | [应用外壳](./web/app-shell.md) |
| 改会话列表 / 消息渲染 | [Session 浏览 UI](./web/session-browsing-ui.md) |
| 改文案、主题、样式 token | [i18n 与主题](./web/i18n-and-theme.md) |

### 我要跑测试 / 排查问题

| 问题 | 页面 |
|---|---|
| `pnpm test` 有用例失败 | [单元与集成测试](./testing/unit-tests.md)（含 5 个失败用例的成因与已验证修法） |
| `pnpm e2e` 连不上 / 用例被跳过 | [端到端测试](./testing/e2e-playwright.md) |
| 想知道测试怎么跑、CI 怎么触发 | [开发工作流](./operations/developer-workflow.md) |

### 我在本机操作

| 问题 | 页面 |
|---|---|
| 起 dev server、杀进程、避免误伤 pi-web | [本地隔离与 live 数据](./operations/local-isolation-and-live-data.md) |
| 不想污染 `~/.pi/agent` | 同上（本页最该先读的一页） |

## 三条使用须知

**1. `ref_projects/` 不属于本仓库。** 它是若干完整 clone（`pi-web`、`pi`、`study` 等），被 `.gitignore`、`biome.json` 与 `.openwikiignore` 三处排除，不参与构建、不被 lint、也不进本 wiki。源码注释里大量的 `per ref_projects/pi-web/...` 只记录**设计意图的来源**，判断实际行为必须读 `packages/` 下的代码。

**2. 代码与文档冲突时以代码为准。** 本仓库的状态文档存在明显滞后：`packages/*/package.json` 的 description 仍写着 "empty scaffold / placeholder"，`MEMORY.md` §2 仍写 "Phase 0 完成 / capability 数 0 / 单测 56 个"。本 wiki 已把这些漂移标注在各相关页面。

**3. 两处引用会落空。** `MEMORY.md` 与 `AGENTS.md` 指向的 `docs/research/`、`docs/superpowers/plans/`、`docs/handoffs/`、`CONTEXT-MAP.md`、`CONTEXT.md` 在当前工作树中都不存在；`MEMORY.md` §6.4 的 handoff 模板还引用了一个已不存在的示例文件。详见[决策记录与交付纪律](./process/decision-records-and-delivery.md)。

## 读代码的建议顺序

```text
1. packages/core/src/<capability>/domain/ports/*.ts   端口契约（先看边界）
2. packages/core/src/<capability>/use-cases/*.ts      用例（薄，看签名即可）
3. packages/web/src/app/api/**/*.ts                   HTTP 边界（Date 映射、错误码）
4. packages/core/src/<capability>/adapters/*.ts       真正的实现与坑
5. packages/web/src/{hooks,components}/**            消费端与 DOM 契约
```

第 4 步之前的文件都很短；真正的复杂度集中在 adapter 与 route 的**实现与注释不一致处**（例如 `listSessions` 实际扫描整个 agentDir、`getSessionFileForId` 实际整文件读盘）。

## 当前阶段速览

- 已交付：会话列表、上下文读取、全文搜索的端到端读链路（core → HTTP → UI）。
- 未交付：写侧（创建/删除/重命名）、fork 树、worktree 归组、subagent 管理。
- 当前 `pnpm test`：**41 个文件 / 327 个用例，5 个失败 + 1 个性能用例抖动**（原因与修法见[单元与集成测试](./testing/unit-tests.md)）。

> 附注：仓库 `master` 分支目前**尚无任何 commit**，因此 OpenWiki 的 drift 检测没有历史基线；`.github/workflows/openwiki-update.yml` 依赖完整 git 历史，历史上传前它的变更摘要会是空的。
