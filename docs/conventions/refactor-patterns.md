# Refactor Patterns & Conventions Log

> P1 pi-web 重构迁移过程中的**设计模式 + 项目约定**日志。
>
> **目的**：让每次发现的模式/约定被显式记录，让后续开发保持一致。
>
> **纪律**（来自用户 2026-09-28）：
>
> - 只记录有**清晰未来收益**的模式/约定
> - **不为用模式而用模式**——cost 超过 benefit 时不引入
> - 反模式（应避免的写法）也记录，避免重蹈覆辙
> - 每张 PR 增量更新
>
> **如何使用本文件**：
>
> - 新人 onboarding：先读全部 entry，了解项目约定
> - 开始新功能前：扫一遍"未来收益"决定是否复用
> - PR review 时：检查是否新增了 entry（如有，验证 entry 是否合格）

---

## 格式

每条 entry 用以下结构：

```md
### <TYPE>: <name>

**Context**: <when does this apply>
**Applied in**: <file or commit>
**Code example**: <snippet or path:line>
**Future benefit**: <why we'll want this again>
**Cost**: <tradeoff / when NOT to use>
**Source**: <book / article / discussion; if external>
```

**TYPE** ∈ `{ CONVENTION, PATTERN, BEST_PRACTICE, ANTI_PATTERN }`

| TYPE | 含义 | 例子 |
|---|---|---|
| **CONVENTION** | 项目特有的硬性规则 | 端口 = 30041；包名 `@evo-pi/*`；commit 用 conventional commits |
| **PATTERN** | 设计模式 / 架构选择 | Clean architecture 4 包；barrel export；branded types |
| **BEST_PRACTICE** | 通用工程最佳实践 | 行为测试而非实现测试；pure functions in domain |
| **ANTI_PATTERN** | 应避免的写法 | god component（>2000 LOC）；直接暴露 SDK 类型 |

---

## 当前 entry 列表（按发现时间）

### CONVENTION: 端口隔离

**Context**: 重构期需要 evo-pi/web 与 pi-web 同时运行做实时对比验证
**Applied in**: `packages/web` dev server（已锁定）

**权威决策**：见 **ADR 0005 — 端口隔离（`@evo-pi/web` = 30041）**。

**本 entry 只作为索引**：

- 端口号列表 / 验证方式 / alternatives → 详见 ADR 0005
- 本 entry 不重复内容，避免双份维护

**Source**: 用户反馈（2026-09-28）→ 正式化为 ADR 0005

### PATTERN: Clean architecture

**Context**: P1 把 251 文件 / 54K LOC 拆到清晰边界
**Applied in**: 当前 packages/{domain,ports,app,infra,web} 布局

**权威决策**：见 **ADR 0003 — Clean Architecture Package Layout**。

**本 entry 只作为索引**：

- 4 包边界 / 依赖方向 / 验证机制 / alternatives → 详见 ADR 0004
- 本 entry 不重复内容，避免双份维护

**设计词汇**（per codebase-design skill）：

- 每个包是一个 **module**（interface + implementation）
- `ports` 包是 **deep module**（小接口 + 多 adapter）
- `domain` 包 zero dependency = **接口最小化**体现

**Source**: Uncle Bob, *Clean Architecture* (2017); Alistair Cockburn, *Hexagonal Architecture* (2005) → 正式化为 ADR 0003

### PATTERN: Use case = single public async function

**Context**: `packages/app` 不用 class，避免 hidden state
**Applied in**: 计划用于 `packages/app/src/use-cases/`
**Code example**:

```ts
export async function listSessions(
  input: ListSessionsInput,
  deps: { sessionStore: SessionStorePort }
): Promise<SessionInfo[]>
```

**Future benefit**: 易测试（直接调函数 + mock port）；易组合；无生命周期负担
**Cost**: 多个 use case 共享状态时需自己注入（vs class 单例）
**Source**: Clean Architecture Ch. 6 "Use Cases"

### PATTERN: Branded types for IDs

**Context**: domain 里 SessionId / ModelId / FilePath 等都是 string，类型系统无法区分
**Applied in**: 计划用于 `packages/domain/src/value-objects/`
**Code example**:

```ts
type SessionId = string & { readonly __brand: 'SessionId' }
function asSessionId(raw: string): SessionId { /* validate */ return raw as SessionId }
```

**Future benefit**: 编译期防 ID 误用（如把 FilePath 传给期望 SessionId 的参数）
**Cost** (verified 2026-09-28 T4a):

- 用 `unique symbol` branding（不是 `'SessionId'` literal）会让 branded type 与 string 零互通
- 每个内置常量（如 `BUILTIN_TOOL_NAMES.READ = "read"`）都要 `as ToolName` — `satisfies Record<string, ToolName>` 不够
- 调用方每处构造/转换都要走工厂或 `as` — 这是设计安全的真实成本
**Source**: TypeScript 社区最佳实践；Ryan Cavanaugh "TypeScript Branded Types"

### PATTERN: Discriminated unions for state

**Context**: agent session 状态、扩展 UI 状态等都是 enum-like
**Applied in**: 计划用于 `packages/domain/src/entities/session.ts`、`subagent.ts` 等
**Code example**:

```ts
type StreamingState =
  | { kind: 'idle' }
  | { kind: 'streaming', message: AgentMessage }
  | { kind: 'compacting', tokensBefore: number }
```

**Future benefit**: switch + assertNever 保证穷尽；编译期防止漏 case；流式状态可视化
**Cost**: type alias 多
**Source**: TypeScript Handbook "Discriminated Unions"; *Effective TypeScript* Item 32 (Dan Vanderkam)

### PATTERN: Pure functions in domain（Functional Core / Imperative Shell）

**Context**: domain 层零副作用，便于推理和测试
**Applied in**: 计划用于 `packages/domain/src/rules/` 和 `entities/` 的纯逻辑
**Code example**:

```ts
// domain（pure）
export function buildSessionTree(entries: SessionEntry[]): SessionTreeNode[]

// app（orchestrates IO + domain）
export async function getSessionTree(id: SessionId) {
  const entries = await sessionStore.read(id) // IO
  return buildSessionTree(entries)              // pure
}
```

**Future benefit**: domain 测试无需 mock；规则可独立验证；未来纯函数可移植到 worker
**Cost**: 需要在 app 层显式编排 IO；不能直接在 entity 里调 clock / fs
**Source**: Gary Bernhardt "Boundaries" talk; *Functional Core, Imperative Shell*

### PATTERN: Custom hooks for stateful UI logic

**Context**: React 组件不该持有复杂 stateful logic
**Applied in**: 计划用于 `packages/web/src/hooks/`
**Code example**:

```tsx
function ChatInput() {
  // 只渲染
  return <div>{...}</div>
}

function useChatInputState() {
  // state + effects
  return { value, setValue, submit, ... }
}
```

**Future benefit**: hook 可独立测试；UI 组件保持纯渲染；hook 可在多个组件复用
**Cost**: 多一层抽象
**Source**: React 官方 "Building Your Own Hooks"

### BEST_PRACTICE: Behavior testing over implementation testing

**Context**: 测试要测用户能看到的行为，不测内部状态
**Applied in**: 计划用于所有 package 测试
**Code example**:

```ts
// ❌ 测实现
expect(component.state.isStreaming).toBe(true)

// ✅ 测行为
expect(screen.getByRole('status')).toHaveTextContent(/streaming/i)
```

**Future benefit**: 重构不破坏测试；测试反映用户视角
**Cost**: 需要更细的 selector 设计
**Source**: Kent C. Dodds "Testing Implementation Details"; Testing Library docs

### BEST_PRACTICE: Barrel export + ESLint `no-restricted-imports`

**Context**: 包对外暴露要"刚好够用"，防止内部变化扩散
**Applied in**: 每个 `packages/*/src/index.ts` + monorepo root `.eslintrc`（或 biome equivalent）
**Future benefit**: pi-packages/* 只能通过 barrel 消费；包内重构不破坏外部消费者
**Cost**: 偶尔需要为新公共类型加 export
**Source**: TypeScript 最佳实践

### ANTI_PATTERN: God component / god hook（>2000 LOC）

**Context**: 单文件堆积多业务导致不可读、不可测、不可维护
**Applied to avoid**: 原 pi-web 6 个超大文件（ChatInput 2741、AppShell 2544、SessionSidebar 2478、useAgentSession 2463、ModelsConfig 2267、rpc-manager 2163）
**Code example**: 拆完后单文件 ≤800 LOC（per ADR 0004 + refactoring.md §10 拆解原则）
**Future benefit**: 易读、易测、易重构；多人协作不冲突
**Cost**: 文件数增加；需要明确子模块边界
**Source**: Martin Fowler, *Refactoring* Ch. 3 "Bad Smells in Code" — Long Method / Large Class

### ANTI_PATTERN: Direct SDK type leakage

**Context**: 把 pi-sdk 类型直接 export 给 web/app 层 → SDK 升级破坏 domain
**Applied to avoid**: `lib/pi-types.ts` 镜像 SDK 类型，web/app 只用 domain 类型
**Future benefit**: SDK 升级只影响 infra/adapters/* 内部；domain/app 稳定
**Cost**: 多一层类型映射（domain ↔ SDK）
**Source**: *Clean Architecture* Ch. 11 "Stable Abstractions Principle"

### BEST_PRACTICE: Tests as API design contract（2026-09-28）

**Context**: 测试代码是调用方对 API 形态的期望表达——不只是验证实现正确，也是设计 API
**Applied in**: T4a `tests/errors/domain-error.test.ts:40` — 测试期望 `cause` 被支持，但这股期望倒追到 API 设计
**Code example**:

```ts
// test 表达了调用方期望
new SessionCorruptedError("s1", "truncated", { cause: original })
expect(wrapped.cause).toBe(original)  // ❶ 期望背后 = API 应提供 cause 支持

// TypeScript 会告泺 (TS2554) — 如果实现不满足期望
// ❌ "Expected 2 arguments, but got 3"

// → 驱动实现添加 options 参数（tests pass 后实现才合法）
```

**Future benefit**:

- 调用方期望与实现对齐（TS 报错是闭环反馈）
- 测试同时是文档 + API spec 双重作用
- 避免“实现完成才发现不够用”的重复返工
**Cost**: 写测试时就要想清楚 API 形态（调用方视角，不是实现先功能）；测试可能赶超实现并报错——这是好事
**Source**: TDD（Kent Beck）；“Tests as Documentation” - <https://martinfowler.com/bliki/CodeAsDocumentation.html>

### PATTERN: Comments as AI context（2026-09-28 启动）

**Context**：在 AI 驱动开发里，注释是 agent 唯一能“读到的过去对话”——决定 agent 能否在不逆向推导的前提下快速理解代码。
**Applied in**：**所有未来代码与文档**——per `docs/conventions/code-comment-hygiene.md`。
**Code example**：

```ts
// ❌ 描述代码（重复信息）
// sum a and b
function add(a: number, b: number): number { return a + b }

// ✅ 设计意图（AI 决策上下文）
/**
 * 用 unique symbol 而非字面量 brand 的原因：
 * - 严格性更高：string 不能隐式转 Brand<string, "SessionId">
 * - 独立 module 隔离：不同 package 的 brand 互不冲突
 */
type Brand<T, B extends string> = T & { readonly [__brand]: B }
```

**Future benefit**：

- AI agent 能“从注释读懂代码”，逆向推导时间从 分钟→秒
- 跨会话保留设计意图（不只是代码：human / agent 重启都不会丢）
- PR review 可“代码 diff + 注释 diff 一起看”，减少误解
**Cost**：写代码额外花 1-2 分钟写注释；commit message 加 “comments updated” 标签
**Source**：用户反馈 2026-09-28（“注释就是 ai 驱动开发时最佳上下文”）；完整原则见 `docs/conventions/code-comment-hygiene.md`

---

## 何时更新本文档

| 触发 | 动作 |
|---|---|
| 应用了一个新的设计模式 / 约定 | 加 1 条 PATTERN / CONVENTION entry |
| 发现反模式（应避免的写法） | 加 1 条 ANTI_PATTERN entry（即使没遇到具体问题） |
| 已有 entry 落地后发现 cost > benefit | 标注为 "DEPRECATED" 或删除 |
| 用户给出新的项目规则 | 加 1 条 CONVENTION entry，标 "用户反馈 (date)" |
| 复盘时发现 best practice 没用上 | 标 "(计划中, T-X 落地)" 提醒后续 |

## 相关文档

- `docs/adr/` — 重大架构决策（更正式；本文件是模式库）

---

**版本**：v1.1（2026-09-28 +新 PATTERN + CONVENTION）
**下次更新**：每张 P1 PR 合并后增量更新
