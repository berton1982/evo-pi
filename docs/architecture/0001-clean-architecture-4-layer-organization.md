# Architecture 0001: Clean Architecture 4 层代码组织规范

**状态**：Accepted
**日期**：2026-10-07
**替代**：无
**相关**：[Architecture index](./README.md) | [ADR-0003 clean-architecture-package-layout](../adr/0003-clean-architecture-package-layout.md) | [Architecture Patterns skill](../../../skills/architecture-patterns/SKILL.md)

## Context (背景)

ADR-0003 定义了 **macro architecture**——monorepo 里有哪些包（`core/`、`web/`、`pi-packages/`）以及它们的高级职责。

本文件定义 **micro architecture**——每个 `core/src/<capability>/` 目录必须遵循的精确目录结构和 import 规则。

**问题**：如果没有唯一权威来源，新建 capability 容易：

- 把代码放到错误的层（例如 business logic 进 `adapters/`、infrastructure code 进 `domain/`）
- 在 `adapters/` 目录里放 port interface（反过来了！）
- 跨层 import 具体实现（违反 Dependency Inversion）

我们需要一个标准模式，加具体示例，让每个新 capability 都能复制。

## Decision (决策)

每个 `packages/core/src/<capability>/` 遵循 **4 层 Clean Architecture**（per Uncle Bob）**plus ports-in-domain** 变体（per Hexagonal）：

```text
packages/core/src/<capability>/
├── domain/                          # 1. Entities (Layer 1)
│   ├── ports/                      # 1b. Port interfaces (Hexagonal: input/output contracts)
│   │   ├── <capability>-repository.ts
│   │   └── <storage>-port.ts
│   ├── <aggregate>.ts              # 1c. Domain entities, value objects, errors
│   ├── <value-object>.ts
│   └── <domain-error>.ts
├── use-cases/                       # 2. Application Business Rules (Layer 2)
│   ├── create-<aggregate>.ts
│   ├── get-<aggregate>.ts
│   └── ...
├── adapters/                        # 3. Interface Adapters (Layer 3 — port impls)
│   ├── <infrastructure>-<capability>-repository.ts
│   └── <infrastructure>-<storage>.ts
└── infrastructure/                  # 4. Frameworks & Drivers (Layer 4 — SDK wrapper + caches)
    ├── <cache>.ts
    └── __fixtures__/
```

`packages/web/`（= Uncle Bob 定义里的 Layer 5，最外层 "Frameworks & Drivers for the web UI"）

## Layer Responsibilities (各层职责)

| Layer | Path | Owns | Examples | Anti-examples (forbidden) |
|---|---|---|---|---|
| **1. Entities (Domain)** | `domain/` | Value objects, entities, domain errors, brand types | `SessionInfo`、`SessionId` (brand)、`DomainError` (abstract)、`ThemePreference` | ❌ React hooks、❌ fs operations、❌ HTTP、❌ React context |
| **1b. Ports** (Hexagonal extension) | `domain/ports/` | Abstract interfaces (input/output contracts) | `SessionRepositoryPort` | ❌ Concrete classes、❌ SDK imports、❌ I/O |
| **2. Use Cases** | `use-cases/` | Application business rules；orchestrate entities + ports | `CreateSessionUseCase`、`GetSystemConfigUseCase` | ❌ Direct DB/file access、❌ React hooks、❌ HTTP handling |
| **3. Interface Adapters** | `adapters/` | Concrete port implementations；translate between domain ↔ infrastructure | `JsonlSessionRepository` (uses SDK + caches) | ❌ Pure domain logic、❌ UI rendering、❌ Port interface definitions |
| **4. Frameworks & Drivers** | `infrastructure/` | SDK wrappers、low-level data structures、OS-level | `FileSessionStorage` (wraps SDK SessionManager)、`ScanIndexCache`、`SMCache` | ❌ Domain types、❌ Port interfaces、❌ Use case logic |
| **5. Web UI** (Uncle Bob's outermost) | `web/src/{app,components,hooks}/` | React components、Next.js routes、UI hooks | `app/layout.tsx`、`components/app-shell/*`、`hooks/useIsMobile` | ❌ Domain types from other capabilities、❌ Port interface implementations |

## Import Rules (strict — enforced by `pnpm-workspace.yaml` + tsconfig + CI)

### Allowed (单向向内，inner layers know nothing about outer)

```text
✅ domain/ports → domain/         (port types import domain value objects)
✅ use-cases/ → domain/ports/     (use case consumes port interface)
✅ use-cases/ → domain/           (use case uses domain types)
✅ adapters/ → domain/ports/      (adapter implements port, needs its types)
✅ adapters/ → domain/            (adapter uses domain types)
✅ adapters/ → infrastructure/    (adapter composes infrastructure; composition over inheritance)
✅ infrastructure/ → domain/      (low-level data structure uses domain types where applicable)
✅ web/ → core/domain/             (web reads domain types)
✅ web/ → core/domain/ports/      (web depends on port interface)
```

### Forbidden

```text
❌ domain/ → anything outside domain/        (domain is the innermost; pure business)
❌ use-cases/ → adapters/                    (use case must not know concrete impl)
❌ use-cases/ → infrastructure/              (use case must not do I/O directly)
❌ adapters/ → use-cases/                    (adapter should be port impl; use case calls it)
❌ infrastructure/ → use-cases/              (infra is lower than use case)
❌ web/ → core/adapters/                     (web must not import concrete impls)
❌ web/ → core/infrastructure/               (web must not import infra impls)
❌ core/ → web/                               (core is a library; web is an application)
```

## Naming Conventions (命名约定)

### Files

| Element | Convention | Example |
|---|---|---|
| Port interface | `<noun>-port.ts` (with `Port` suffix) | `session-repository-port.ts` |
| Adapter implementation | `<infrastructure>-<port-name>.ts` (without `Port` suffix) | `jsonl-session-repository.ts`、`file-session-storage.ts` |
| Use case | `<verb>-<noun>.ts` (PascalCase class) | `create-session.ts`、`append-message.ts` |
| Domain entity | `<noun>.ts` (PascalCase interface + functions) | `session-info.ts`、`session-header.ts` |
| Domain error | `<noun>-error.ts` (class extends `DomainError`) | `session-error.ts` |
| Port file location | `domain/ports/` | `domain/ports/session-repository.ts` |
| Adapter file location | `adapters/` | `adapters/jsonl-session-repository.ts` |
| Infrastructure file location | `infrastructure/` | `infrastructure/scan-index-cache.ts` |
| Test file | `<source-file>.test.ts` (colocated) | `session-info.test.ts` |

### Branded types (品牌类型)

| Type | Pattern | Example |
|---|---|---|
| Brand primitive | `string & { readonly __brand: 'Foo' }` | `SessionId`、`Path` |
| Brand constructor | `function sessionId(value: string): SessionId` | `path(s: string): Path` |
| Brand guard | `function isSessionId(value: unknown): value is SessionId` | `isPath(value: unknown)` |

## Concrete Examples (per actual evo-pi modules)

### Example 1: S4 `session` (newest, applied this spec strictly)

```text
packages/core/src/session/
├── domain/
│   ├── agent-message.ts            # entity: AgentMessage + content blocks
│   ├── ports/
│   │   ├── session-repository.ts   # port: SessionRepositoryPort (11 methods)
│   │   └── session-storage.ts      # port: SessionStoragePort (5 methods)
│   ├── session-info.ts             # entity: SessionInfo + sessionInfo() guard
│   ├── session-header.ts
│   ├── session-entry.ts            # entity: SessionEntry (11 variants union)
│   ├── session-context.ts
│   ├── session-family.ts
│   ├── session-tree-node.ts
│   ├── relation-kind.ts
│   ├── subagent-session-status.ts
│   ├── session-search-response.ts
│   ├── session-change-event.ts
│   └── session-error.ts
├── use-cases/
│   ├── create-session.ts          # use case: CreateSessionUseCase (1-line pass-through)
│   ├── list-sessions.ts
│   ├── get-session.ts
│   ├── list-session-summaries.ts
│   └── append-message.ts           # use case: AppendMessageUseCase (F-11 transient check)
├── adapters/
│   ├── jsonl-session-repository.ts # adapter: implements SessionRepositoryPort via SDK
│   └── file-session-storage.ts     # adapter: implements SessionStoragePort
└── infrastructure/
    ├── scan-index-cache.ts        # cache: in-memory
    ├── sm-cache.ts                 # cache: in-memory
    └── __fixtures__/sessions/      # test .jsonl fixtures
```

### Example 2: S3 `system`

```text
packages/core/src/system/
├── domain/
│   ├── system-config.ts            # entity: SystemConfig + DEFAULT + helpers
│   └── ports/
│       └── system-config.ts        # port: SystemConfigPort (renamed from system-config-port.ts)
├── use-cases/
│   ├── get-system-config.ts
│   └── update-system-config.ts
├── adapters/                       # (empty — no adapter yet; future work)
└── infrastructure/
    └── in-memory-system-config-adapter.ts
```

## How to Apply to a New Capability (新建 capability checklist)

新建 `core/src/<capability>/`（例如 `mcp`、`file-ref`、`agent`）时：

1. [ ] 创建 `domain/` 目录
   - [ ] 添加 entity types（PascalCase interfaces + factory functions）
   - [ ] 如需要添加 brand types（例如 `McpId`、`AgentId`）
   - [ ] 添加 domain errors（继承 `DomainError`）
   - [ ] 添加 `domain/ports/` 子目录用于 port interfaces
2. [ ] 创建 `use-cases/` 目录
   - [ ] 添加 `<verb>-<noun>.ts` 文件（例如 `create-mcp.ts`）
   - [ ] Constructor 接受 `port: PortInterface`（不是 concrete impl）
   - [ ] Class 是 1 行 pass-through，除非需要 domain logic
3. [ ] 创建 `adapters/` 目录
   - [ ] 添加 concrete port implementations（例如 `jsonl-mcp-repository.ts`）
   - [ ] Implements `domain/ports/` interfaces
   - [ ] 使用 `infrastructure/` 用于 SDK wrappers
4. [ ] 创建 `infrastructure/` 目录
   - [ ] 添加 SDK wrappers（如使用第三方 SDK）
   - [ ] 添加 low-level data structures（caches 等）
   - [ ] No domain types、no port interfaces here
5. [ ] 运行 verification
   - [ ] `pnpm exec tsc -p packages/core/tsconfig.json --noEmit` → clean
   - [ ] `pnpm exec biome check packages/core/src/<capability>/` → clean
   - [ ] `pnpm test` → 所有新 tests pass
6. [ ] Web integration（如果 capability 是 web-facing）
   - [ ] 添加 `web/src/lib/adapters/<web>-<capability>-<storage>-adapter.ts`
   - [ ] Implements port 来自 `core/src/<capability>/domain/ports/`
   - [ ] Web adapter **不** import concrete impls 来自 `core/.../adapters/` 或 `core/.../infrastructure/`

## Verification Checklist (existing modules should pass all of these)

运行以下检查以确认合规：

```bash
## 1. 不存在 `adapters/` 目录（port interfaces 应该在 domain/ports/）
find packages/core/src/<capability> -type d -name adapters -o -name 'adapters/'

## 2. 不存在 domain/ports/ 之外的 port interfaces
grep -rln "export interface.*Port\|export type.*Port" packages/core/src/<capability>/ --include="*.ts" \
  | grep -v "domain/ports/"

## 3. 不存在 use-cases import adapters/ 或 infrastructure/
grep -rln "from '.*/adapters/\|from '.*/infrastructure/" packages/core/src/<capability>/use-cases/

## 4. 不存在 web import core's adapters/ 或 infrastructure/
grep -rln "from '.*core/.*/adapters/\|from '.*core/.*/infrastructure/" packages/web/src/

## 5. 所有 checks pass
pnpm exec tsc -p packages/core/tsconfig.json --noEmit
pnpm exec biome check packages/core/src/<capability>/
pnpm test
```

任何 check 失败，则模块**不**符合本规范。请在 merge 前修复。

## How to Fix Common Violations (常见 violation 修复指南)

| Violation | Fix |
|---|---|
| Port interface in `adapters/` | 移到 `domain/ports/<name>-port.ts`（per Uncle Bob + Hexagonal）|
| Port interface 在 `use-cases/` 直接 import `adapters/` | 更新到 `domain/ports/` path |
| Web import concrete impl 来自 `core/.../adapters/` 或 `infrastructure/` | 在 `web/src/lib/adapters/` 创建 web-specific adapter implements port |
| Use case 直接做 I/O | Inject port；use case 编排；I/O 由 adapter 处理 |
| Business logic 在 `adapters/` | 抽到 `use-cases/` 或 `domain/` |
| Use case import `infrastructure/` for SDK | Use case 只应知道 port；让 adapter 处理 SDK details |

## Examples of Common Mistakes (per past evo-pi issues)

### Issue: web 直接 import `InMemorySystemConfigAdapter` 来自 core

**Before** (anti-pattern, used in S3 sprint):

```ts
// packages/web/src/lib/system-config-storage.ts
import { InMemorySystemConfigAdapter } from '../../../core/src/system/infrastructures/in-memory-system-config-adapter'
const adapter = new InMemorySystemConfigAdapter(initial)  // ← violation
```

**After** (correct, per Step 2 commit `d96cfbf`):

```ts
// packages/web/src/lib/adapters/local-storage-system-config-adapter.ts
export class LocalStorageSystemConfigAdapter implements SystemConfigPort {
  // ← implements port, not imports concrete impl
  private readonly inner: InMemorySystemConfigAdapter  // composition OK
  async read() { return this.inner.read() }
  // ...
}
```

### Issue: Port interface 在 `adapters/` 目录

**Before** (S3 original):

```ts
// packages/core/src/system/adapters/system-config-port.ts
export interface SystemConfigPort { ... }  // ← wrong directory
```

**After** (per commit `6437a08`):

```ts
// packages/core/src/system/domain/ports/system-config.ts
export interface SystemConfigPort { ... }  // ← correct location
```

## How to Use This Spec (使用指南)

**Before creating any new `core/src/<capability>/`**: read §Layer Responsibilities + §Naming Conventions + §How to Apply to a New Capability。

**Before creating any new `web/src/lib/adapters/`**: read §Layer Responsibilities + §Import Rules。

**Before merging any PR that touches package boundaries**: run §Verification Checklist。

**If you encounter a clean architecture violation**: check §How to Fix Common Violations + §Examples of Common Mistakes。

## References (参考)

- [Architecture index](./README.md) — full specs index
- [ADR-0003 clean-architecture-package-layout](../adr/0003-clean-architecture-package-layout.md) — macro architecture (what packages to create)
- [Architecture Patterns skill](../../../skills/architecture-patterns/SKILL.md) — Uncle Bob + Hexagonal + DDD
- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — original 4-layer definition
- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/) — Ports and Adapters pattern
- [Domain-Driven Design (Eric Evans)](https://martinfowler.com/bliki/DomainDrivenDesign.html) — Tactical patterns

## Version History (修订历史)

- **v1.0 (2026-10-07)**: 初版
  - 建立了 4-layer + ports-in-domain pattern
  - 以 S4 `session` + S3 `system` 作为具体示例进行记录
  - 为新建 capability 创建了 application checklist
  - 为现有 module 创建了 verification checklist
  - 记录了常见 violations 和修复方法
  - 增加了 "How to Use This Spec" 章节 + "References" 章节
