---
type: process
title: 决策记录与交付纪律：ADR 地图、文档布局与六道门
description: 给出决策与流程导航——5 篇 ADR 与 1 份 architecture spec 各自锁定了什么、docs/ 各子目录的分工、MEMORY §6 的注释卫生与六道交付门在实操中的含义，并如实记录文档树中已失效的路径引用。
tags: [process, adr, documentation, delivery-gates, comment-hygiene, agent-workflow]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T09:08:25.607Z
sources:
  - id: openwiki-source-c197345976380cefccef9191
    resource: repo://.github/workflows/README.md
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-1f0b77785f943495f5e86749
    resource: repo://docs/adr/0001-monorepo-toolchain.md
  - id: openwiki-source-ce66cd77d32d9c57b298cfc9
    resource: repo://docs/adr/0002-monorepo-package-structure.md
  - id: openwiki-source-93886feacb9db007797e424f
    resource: repo://docs/adr/0003-clean-architecture-package-layout.md
  - id: openwiki-source-0c1b9fd0f3391e2da72e5c00
    resource: repo://docs/adr/0004-state-management-strategy.md
  - id: openwiki-source-ddc5ccbfcdf8e579cec811f7
    resource: repo://docs/adr/0005-ui-component-strategy.md
  - id: openwiki-source-e706cdf6ed71c3ed5f88e79f
    resource: repo://docs/agents/domain.md
  - id: openwiki-source-329a99d2c6d1522bba08b083
    resource: repo://docs/agents/openwiki-workspaces.md
  - id: openwiki-source-a9ebc306d11fda793c9706a5
    resource: repo://docs/architecture/0001-clean-architecture-4-layer-organization.md
  - id: openwiki-source-0cc19bf766d62a5f4abafed4
    resource: repo://docs/architecture/README.md
  - id: openwiki-source-1b1a1beecd4fa50e66dedf9e
    resource: repo://docs/conventions/code-comment-hygiene.md
  - id: openwiki-source-0075953b265fd90570cbc8d4
    resource: repo://docs/conventions/dev.md
  - id: openwiki-source-95ebef8d5ce56ff21d136397
    resource: repo://MEMORY.md
  - id: openwiki-source-bb4774a025167dcf20474522
    resource: repo://packages/core/src/session/adapters/filesystem-session-storage.ts
  - id: openwiki-source-8e1389d9cf9e65ce13a6f3de
    resource: repo://packages/core/src/session/adapters/jsonl-session-repository.ts
  - id: openwiki-source-707a77923239544819388613
    resource: repo://tooling/README.md
generated: { by: "pi", at: "2026-10-17T09:08:25.607Z" }
---

# 决策记录与交付纪律

## 决策地图

| 文档 | 状态 | 实际锁定了什么 |
|---|---|---|
| **ADR 0001** monorepo-toolchain | Accepted | pnpm / Turborepo / biome / vitest / playwright / changesets / husky 的选型与版本，以及"跨包任务走 turbo 不走 `pnpm -r`""禁止引入 ESLint/Prettier"等硬约束 |
| **ADR 0002** monorepo-package-structure | Accepted | 双层 workspace（`packages/` + `pi-packages/`）与两个命名空间；规定哪些内容**不算** package。`pi-packages/` 至今未创建 |
| **ADR 0003** clean-architecture-package-layout | Accepted | capability-first 包结构、跨 capability 类型走 `_shared/`、跨 capability 逻辑走 port + adapter 反转、`domain` 不依赖任何其他包 |
| **ADR 0004** state-management-strategy | Accepted | 状态分层：zustand（UI）/ react-query（服务端）/ zod（边界校验）/ 自研 streamReducer（SSE），以及"zustand 不放服务端数据、react-query 不放 UI 偏好"两条互斥规则 |
| **ADR 0005** ui-component-strategy | Accepted | shadcn/ui + Tailwind v4 + motion + lucide-react + react-resizable-panels 的分工，含"固定行高列表用 `@tanstack/react-virtual`、聊天 feed 用 react-virtuoso"的划分 |
| **Architecture 0001** | Accepted (2026-10-07) | ADR 0003 的 micro 层补充：每个 capability 的精确目录结构、import 允许/禁止清单、命名约定、5 条 verification checklist |

ADR 与 Architecture spec 的关系：**ADR 定"有哪些包、为什么"，Architecture spec 定"目录里放什么、怎么 import"**。`docs/architecture/README.md` 提供了二者的分工索引——新建 capability 先读 Architecture 0001，做架构决策才读 ADR。

> ⚠️ Architecture 0001 §Concrete Examples 里的目录树是**规划态**（含 `create-session.ts`、`append-message.ts`、`file-session-storage.ts` 等当前不存在的文件），不要当成现状。见[Clean Architecture 四层落地](../core/clean-architecture-layers.md)。

## 文档布局

| 目录 | 用途 |
|---|---|
| `docs/adr/` | 系统级决策记录（工具链、包结构、架构、状态、UI 策略） |
| `docs/architecture/` | 架构规范，含集中索引 README |
| `docs/agents/` | **面向 AI agent 的协议**：issue tracker 命令约定、triage 标签映射、多 context 领域文档读取规则、OpenWiki 跨仓 workspace 约定 |
| `docs/conventions/` | 长期约定：日常 dev 命令、注释卫生、重构模式日志 |
| `tooling/` | 预留的项目自维护脚本目录，目前只有 README（明确列出"不放什么"） |
| `MEMORY.md` | 跨会话项目记忆：定位、状态表、开放问题、决策、纪律 |
| `AGENTS.md` | AI agent 的导航与行为规则（必读顺序、语言约定、任务拆解原则） |

`docs/agents/openwiki-workspaces.md` 记录了一件容易踩的事：本仓与 vendored 的 `ref_projects/pi-web` 被注册进一个名为 `evo` 的**用户级** wiki workspace（`~/.openwiki/wiki-workspaces.json`，不入仓）。这样搜索时能跨仓命中，同时不污染本仓的 Claim 与 provenance。该文件也记录了重建流程——换机器或文件被删后需要 `openwiki link` 重建。

## 文档树中的失效引用

`MEMORY.md` 与 `AGENTS.md` 多处引用了**当前工作树中不存在**的路径。按这些路径查资料会直接落空：

| 被引用的路径 | 引用位置 | 状态 |
|---|---|---|
| `docs/research/capability-boundary-final.md` | `MEMORY.md` Q2 | 不存在 |
| `docs/research/source-code-study/SOURCE-CODE-STUDY.md` | `MEMORY.md` Q3 | 不存在 |
| `docs/superpowers/plans/2026-10-10-session-list-sessions.md` | `MEMORY.md` Q4、Q5 | 不存在 |
| `docs/handoffs/2026-10-10-phase-0-handoff.md` | `MEMORY.md` §6.3 门 6、§6.4 模板 | 不存在（§6.4 的 handoff 结构模板直接引用它作为范例） |
| `CONTEXT-MAP.md` | `AGENTS.md` Domain docs、`docs/agents/domain.md` | 不存在；`domain.md` 自己注明"本仓库当前不是该布局" |
| per-context `CONTEXT.md` | `docs/agents/domain.md` | 不存在 |

`docs/` 下实际只有 `adr/`、`agents/`、`architecture/`、`conventions/` 四个子目录。需要这些资料时只能从 `MEMORY.md` 正文、`docs/adr/` 与代码注释里重建线索。

## 注释卫生：判据与现实

核心判据只有一句：**删掉注释后理解成本是否上升？上升就保留，不上升就删。**

配套的六条 agent 纪律（`MEMORY.md` §6.2）：写代码后解释**为什么**而不是**做了什么**；**代码改了注释必须同步**（这是最严重的反模式）；commit 时检查注释 diff；PR review 时同时看代码 diff 与注释 diff；发现注释变冗余或错误时**主动报告不一致的原因**；风格上中文为主、1–3 行、超过 3 行考虑移到独立文档。

**但在当前代码里确实存在注释与实现的漂移**，遇到时以代码为准：

| 位置 | 注释声称 | 实际实现 |
|---|---|---|
| `FileSystemSessionStorage.getSessionFileForId` | "只读首行，`readFileSync` on a tiny file is faster" | 无长度参数的 `readFileSync` 把整个文件读进内存 |
| `JsonlSessionRepository.listSessions` | 缓存命中分支注释暗示可跳过 | 分支体内只有注释，没有任何短路 |
| `listSessionsSummaryAll` | "uses cache" | 完全不访问 scan-index |
| Architecture 0001 §Concrete Examples | 目标目录树 | 与已落地的读侧实现不符 |

这些漂移恰好是"注释与代码不一致 = 误导"的实例，也是本 wiki 反复强调"以代码为准"的直接原因。

## 交付纪律：六道门

`MEMORY.md` §6.3 定义的交付门槛，**顺序执行，任一不过都不算交付**。它的存在源于一个具体教训：Phase 0 交付时 vitest / build / lint 全绿，用户在浏览器实测却发现 4 个视觉 bug（404、layout 坍缩、zone overlap、footer 错位）。结论是"**代码能编译 + 单元测试过 ≠ 可交付**"。

| 门 | 内容 |
|---|---|
| 1 · 内部代码测试 | `pnpm install/lint/test/build` 全 exit 0，且测试覆盖每个 task 的完成条件 |
| 2 · 浏览器功能测试 | playwright + 系统 Chrome 走**完整交互路径**（每个 toggle / button / modal 至少点一次）+ 截图 + `getBoundingClientRect` 测量关键节点 |
| 3 · 与 pi-web 交叉比对 | 两侧同时截图并翻阅参考实现源码，验证视觉决策的依据是"需要"而不是"猜" |
| 4 · 用户手工验收 | 提供测试用例清单、点击步骤、已知缺陷与未覆盖项 |
| 5 · 验收通过 | 门 1–4 全部通过且用户口头认可 |
| 6 · 交付后 handoff | 写 `docs/handoffs/YYYY-MM-DD-<phase>-handoff.md`（模板见 `MEMORY.md` §6.4） |

另有三条贯穿性纪律（§6）：任何"做完了"的声称必须附命令输出或测试结果；任何卡住的开放问题登记到 `MEMORY.md` §3 而不是留在对话里；任何长期约定写进文档而不靠记忆。

`AGENTS.md` 另有一条任务拆解原则：**一次只做一件事**——每个 ticket 只承载一个独立可验证的进展，自检四问（AC 之间不强依赖 / 不同 AC 对应不同关注点 / 一张 issue 能一次读完并关闭 / 一个 commit 闭环）。竖切（端到端可演示）与它是正交关系。

## 相关页面

- [Clean Architecture 四层落地](../core/clean-architecture-layers.md) — ADR 0003 与 Architecture 0001 的落地情况
- [开发工作流](../operations/developer-workflow.md) — ADR 0001 锁定的工具链如何执行
- [系统全景](../overview/system-map.md) — ADR 0002 定义的双层结构现状
<!-- openwiki: broken internal link [./quickstart.md] file "./quickstart.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- [快速开始](./quickstart.md) — 按问题路由
