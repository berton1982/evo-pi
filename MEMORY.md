<!-- markdownlint-disable MD024 MD040 MD022 MD031 MD032 MD012 MD037 MD029 MD026 MD036 -->

# MEMORY.md

evo-pi 项目的**持久记忆**——跨会话生效的内容。

**边界**（避免与 `AGENTS.md` 重复）：
- 本文件 = 项目知识（是什么、为什么）+ 状态（决策/阶段/配置）+ 长期约定
- **不包含**：导航/行为规则（见 `AGENTS.md`）

---

## 1. 项目定位

**一句话**：在 AI 时代，把"做事"建模为可设计、可观测、可改进的工作流（harness），通过同一套机制实现系统能力、项目推进、价值交付与自我演化。

**技术形态**：基于 pi 生态（`@earendil-works/pi-coding-agent` / `pi-ai` / `pi-agent-core`）的 monorepo，双层结构（`packages/` 独立可发布包 + `pi-packages/` pi 扩展）。

**核心约束**：
- pi 生态是依赖资产，能用 pi 就不自研
- 自演化是 workflow，不是引擎机制——同构递归
- 三层 harness（L1 系统 / L2 项目 / L3 内容）作为应用存在，不是引擎架构
- 平台先于引擎（pi-web 重构式迁移 → core 实现 → 应用）

---

## 2. 当前状态

| 维度 | 状态 |
|---|---|
| monorepo 工具链 | pnpm 12.10.1 + Turborepo 2.11 + biome 2.5 + vitest 5 + playwright 1.63 + changesets 3 + husky 9 |
| `packages/core` | `_shared/domain` (branded types + DomainError) + `session/domain` (SDK re-exports + BranchPreview/SubagentSessionStatus 本地定义) |
| `packages/web`  | **3-zone scaffold 完成**：AppProviders + Layout + Sidebar container + 12 子组件 + zones + SettingsPanel + /sessions route |
| `pi-packages`   | 目录未初始化（ADR 0002 定义，V2 后期启用） |

### 2.1 重构迁移关键参数（与 pi-web 共存 / 大爆炸模式）

| 参数 | 取值 | 备注 |
|---|---|---|
| **重构模式** | big-bang | evo-pi 一次性上线，pi-web 同期冻结；不增量并行 |
| **数据目录共享** | 与 pi-web 同 `PI_CODING_AGENT_DIR`（默认 `~/.pi/agent`） | 同样本格式、session 文件同名同结构；不需数据迁移 |
| **开发期隔离** | 测试用 fixture（`packages/core/src/<capability>/infrastructures/__fixtures__/sessions/*.jsonl`）或 env `PI_CODING_AGENT_DIR=<test-dir>` | 不许污染 live `~/.pi/agent/` |
| **evo-pi 端口** | **30041** | 严格区别于 pi-web 30141；见 §6.1 |
| **pi-web 端口** | 30141 | 用户当前工作工具；**禁止 evo-pi agent 触碰** |

---

## 3. 开放问题

> 任何卡住的问题或待决策项都登记在这里，避免在对话中飘着。  
> 格式建议：**Q{n} <一句话标题>** — <描述>（登记日期：YYYY-MM-DD）

---

## 4. 决策

### 4.1 项目级决策（已稳定）

| 决策 | 值 | 来源 |
|------|---|------|
| 工具链 | pnpm 12.10.1 + Turborepo + biome + changesets + vitest + playwright | ADR 0001 |
| monorepo 结构 | `packages/` + `pi-packages/` 双层 | ADR 0002 |
| 包架构 | Clean Architecture 4 层（domain / use-cases / adapters / infrastructure）+ capability-first；`core/_shared/` 跨 capability 共享；跨 capability 走 port+adapter 反转 | ADR 0003 |
| 状态管理 | zustand（UI 状态）+ @tanstack/react-query（服务端状态）+ zod（运行时校验）+ 自研 streamReducer（SSE） | ADR 0004 |
| UI 组件 | shadcn/ui（Radix 底层）+ Tailwind v4 + motion + lucide-react + react-resizable-panels | ADR 0005 |
| OpenWiki 跨仓 | `evo` workspace 包含 `evo-pi` + `pi-web`（vendored），注册在用户级 `~/.openwiki/wiki-workspaces.json`；走 `openwiki link` 机制，不合并 wiki | [`docs/agents/openwiki-workspaces.md`](./docs/agents/openwiki-workspaces.md) |

---

## 5. 文档索引（按需读取）

### 5.1 必读（每次实际工作前）

- [`AGENTS.md`](./AGENTS.md) — 导航与行为规则（含必读顺序）

### 5.2 skill 协议

- [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md) — GitHub issue 约定
- [`docs/agents/triage-labels.md`](./docs/agents/triage-labels.md) — 标签映射
- [`docs/agents/domain.md`](./docs/agents/domain.md) — 领域文档消费规则
- [`docs/agents/openwiki-workspaces.md`](./docs/agents/openwiki-workspaces.md) — `evo` workspace 跨仓 OpenWiki 约定 + re-link 流程
- [`.pi/skills/migrating-god-files/SKILL.md`](./.pi/skills/migrating-god-files/SKILL.md) — god 文件迁移技能（16 阶段 × 4 作用域，机器门 + 状态机；入口与索引）
- [`.evo/migration/README.md`](./.evo/migration/README.md) — 迁移立案区目录约定与入库政策
- [`docs/agents/openwiki-usage.md`](./docs/agents/openwiki-usage.md) — OpenWiki **怎么用**：检索链路（`openwiki_search` → `openwiki_read` 读 pi-web 等跨仓页面）+ MCP 注册 + 生成 update 流程 + 踩坑

### 5.3 conventions（长期约定）

- [`docs/conventions/code-comment-hygiene.md`](./docs/conventions/code-comment-hygiene.md) — AI 协作时代注释卫生纪律
- [`docs/conventions/dev.md`](./docs/conventions/dev.md) — 日常 dev 命令约束（pnpm/biome/vitest/husky）
- [`docs/conventions/refactor-patterns.md`](./docs/conventions/refactor-patterns.md) — ANTI_PATTERN + CONVENTION 集

### 5.4 architecture

- [`docs/architecture/README.md`](./docs/architecture/README.md) — architecture spec 集中索引
- [`docs/architecture/0001-clean-architecture-4-layer-organization.md`](./docs/architecture/0001-clean-architecture-4-layer-organization.md) — Clean Architecture 4-layer + import 规则 + verification checklist

### 5.5 ADRs

- `docs/adr/0001-monorepo-toolchain.md`
- `docs/adr/0002-monorepo-package-structure.md`
- `docs/adr/0003-clean-architecture-package-layout.md`
- `docs/adr/0004-state-management-strategy.md`
- `docs/adr/0005-ui-component-strategy.md`

---

## 6. 跨会话生效的工作流纪律

- **每个 phase 退出前**：跑 `verification-before-completion`，**先看输出再下断言**
- **每次 commit 前**：`code-review`（Standards + Spec 双轴）
- **任何"做完了"的声称**：附上命令输出或测试结果
- **任何卡住的开放问题**：登记到 §3，不在对话里飘着
- **任何长期约定**：写进本文件或对应的 `docs/agents/` / `docs/conventions/`，不靠记忆
- **要查代码库 wiki（含 pi-web 等跨仓页面）**：用 `openwiki_search` / `openwiki_read`（见 [`docs/agents/openwiki-usage.md`](./docs/agents/openwiki-usage.md)）；**不要**为查询启动 `openwiki_begin` 生成 run

### 6.1 agent 进程管理纪律（2026-10-10 强化：evo-pi / pi-web 端口隔离）

> **背景**：用户当前使用 pi-web（端口 30141）作为工作工具。evo-pi dev server 使用端口 **30041**，与 pi-web 严格端口区分。这是 process management 的最高优先级约束。
>
> agent 永远遵守：
>
> 1. **启动后台进程** → 立即 `my_pid=$!` capture PID
> 2. **杀进程前** → 先 `ps aux | grep` 或 `lsof -i:<port>` **确认是谁的进程**
> 3. **杀进程** → 优先 `kill -TERM "$my_pid"`（自己的）或 `kill -TERM $(lsof -ti:<port>)`（按端口）
> 4. **NEVER** 使用 `pkill -f <pattern>`、`killall <name>`、`pgrep + for loop kill` 这类模糊匹配
> 5. **DO** prefer `pnpm -F <pkg> build` over `dev` 做验证（无需运行进程，没有"清理 dev"问题）
> 6. **默认假设**：杀任何东西之前，默认是 **用户进程**，**除非 100% 确认是自己的**
> 7. **【加强】kill 前 3 问**：
>    - 是**我的**进程吗？默认"不是"
>    - **必须** kill 吗？默认"不需要"（验证只需 curl；server 可留 user 管理）
>    - 有更精确方式吗？port > PID > 永远不用 process name pattern
>    - 任一回答"我不确定" → 不 kill
>
> 8. **【evo-pi 专属】端口 30141 是用户的 pi-web，绝不触碰**：
>    - evo-pi 所有 dev/test server **只**绑 30041（或测试专用端口）
>    - `lsof -ti:30141` 只用于"查看 pi-web 是否在跑"，**禁止**用于 kill
>    - `lsof -ti:30041` 用于 kill evo-pi 自己的 dev server
>    - 任何 `kill` 命令前必查端口；端口不在 30041 / test-range 内 → 不 kill
>    - **不要假设端口空闲**——agent 启动前 `lsof -i:30041` 检查；占用则向用户报请
> 9. **【数据隔离】不写 live `~/.pi/agent/`**：
>    - 测试用 `__fixtures__/` 或 env 覆盖 `PI_CODING_AGENT_DIR=<test-dir>`
>    - 任何 `core` 代码触发真实 `~/.pi/agent` 写入 → 立即停并报请

### 6.2 agent 注释卫生纪律

> **原则**：注释删掉后，理解成本是否上升？是：保留；否：删。

1. **写代码后必写注释**——解释 *为什么*，不是 *做什么*
2. **修改代码同步 commit 注释**——代码改而注释不改 = agent 被误导（**最严重反模式**）
3. **commit message** 可选加 `comments updated` 标签，让 reviewer 重视注释同步
4. **PR review 时检查**：代码 diff + 注释 diff 同步；注释里引用的其他文件 / ADR / issue 仍有效
5. **注释变冗余/错误时主动报告**——不说"代码改了注释没改"；说不一致原因
6. **风格**：中文为主、1-3 行简洁、结构化 JSDoc 标签；超 3 行考虑移到独立 doc

详细 doc：`docs/conventions/code-comment-hygiene.md`。

### 6.3 交付门槛 —— 5 道门全部通过才算交付

5 道门顺序执行，任一不过都不算交付：

1. **门 1 — 内部代码测试**：`pnpm install/lint/test/build` 全 exit 0；测试覆盖每个 task 的完成条件（per `superpowers:verification-before-completion`）。

2. **门 2 — 浏览器功能测试**：用 playwright + 系统 chrome（`/usr/bin/google-chrome`，fallback when browser MCP wedge）启动 dev server，**走完整交互路径**（每个 toggle / button / modal 至少点一次）+ 截图 + `getBoundingClientRect` 测量关键节点（DOM 存在 ≠ 视觉正确）。

3. **门 3 — 与 pi-web 交叉比对**：evo-pi 跑在 30041、pi-web 跑在 30141，同时截图两侧并**翻阅 pi-web 源码**验证 visual 决策（bg / border / height / padding）的依据不是“猜”而是“霱要”。

4. **门 4 — 用户手工验收**：提供给用户
   - 测试用例清单（场景 + 预期）
   - 测试步骤（点击序列）
   - 已知缺陷 / 未覆盖项
   - 请用户在浏览器走一遍。

5. **门 5 — 验收通过**：门 1–4 全部通过，用户口头认可。**只有这时才算本次交付完成**；否则返 门 2。
