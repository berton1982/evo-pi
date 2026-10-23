---
id: 0002
title: monorepo-package-structure
status: Accepted
date: 2026-09-23
deciders: Berton
consulted: -
informed: -
supersedes: -
superseded_by: -

# ADR 0002 — monorepo 包结构 (双层 `packages/` + `pi-packages/`)

## Context

双层结构 (`packages/` + `pi-packages/`) 区分 "evo-pi 自有内容" vs "pi 生态扩展层".

## Decision

monorepo 顶层采用 **双层结构**:

```text
evo-pi/
├── packages/       # 核心 evo-pi 自有内容
│   └── <name>/     # workspace glob: packages/*
└── pi-packages/    # pi 生态扩展层
    └── <name>/     # workspace glob: pi-packages/*
```

### `packages/*` (核心自有)

- evo-pi 自有的功能模块
- examples/ / experiments/ / playbooks/ / sources/ / tooling/ 等 placeholder 内容目录**不算** packages (它们是 root-level docs)
- workspace glob 匹配 (`pnpm-workspace.yaml: 'packages/*'`)
- **可被外部依赖** (发布后, 通过 changesets 上 npm)

### `pi-packages/*` (pi 生态扩展)

- pi-coding-agent / pi-ai / pi-agent-core / pi-tui / pi-telemetry / chord 等的 wrappers 或 adapters
- workspace glob 匹配 (`pnpm-workspace.yaml: 'pi-packages/*'`)

### 命名约定

| 层 | 命名空间 | 示例 |
|---|---|---|
| `packages/*` | `@evo-pi/<name>` | `@evo-pi/foo`, `@evo-pi/web`, `@evo-pi/core` |
| `pi-packages/*` | `@evo-pi-ext/<name>` | `@evo-pi-ext/foo`, `@evo-pi-ext/agent-wrapper` |

**为什么分两个命名空间**:

- 心理模型清晰: 自有 vs pi 扩展
- 工具/服务可选择性 import (deps 树更清晰)
- 将来若需不同发布策略 (e.g., pi-packages 跟随 pi 上游版本号) 可独立

### 共享规则 (跨双层)

- 双层都用 pnpm workspace (T01)
- 双层都通过 biome lint (T02a scope 不 exclude 任一层)
- 双层都可用 vitest test (T09 include glob covers both)
- 双层 `tsconfig.json` 必须 `extends: "../../tsconfig.base.json"` (T02a)
- 双层 `package.json` 都用 `@biomejs/biome` lint script (T02a 调整)

### 依赖方向

**单向**: `packages/` 可以依赖 `pi-packages/`; 反之**禁止**.

```text
packages/* ─depends-on─→ pi-packages/* ─depends-on─→ pi 外部 (@earendil-works/*)
       └─────────────────depends-on─────────────────────────┘ (允许)
                                       ↑
                                       └──── 禁止反向依赖
```

理由: pi-packages 是 "pi 适配层", 应该是叶子; 自有功能 `packages/*` 是核心, 依赖适配层是合理的. 反向 (pi-packages 依赖 packages) 会让 pi 适配层"知道"自家功能, 失去适配的本质.

例外: 跨 package 共享 types 可在 `tsconfig.base.json` 集中定义; 不构成依赖方向问题.

## Consequences

### 正面

- 双层清晰分离: 自有 vs pi 扩展; 心理模型清晰
- 命名空间区分让 import 路径自带语义
- 依赖方向强制避免循环

### 负面 / 风险

- 双层导致 `pnpm-workspace.yaml` 多 1 行; 维护成本低
- 若某包"既是自有又调 pi" → 应在 `packages/` (核心), 通过 `pi-packages/` 调用 pi (单向依赖)
- 若未来需要"私有"内部包 (e.g., types-only) → 暂用 `packages/_internal/` 或推到 `pi-packages/`

### 后续约束

- 新 package 必须放 `packages/` 或 `pi-packages/` 之一; 禁止 `src/` / `lib/` / 顶层散文件
- 命名遵循 `@evo-pi/<name>` 或 `@evo-pi-ext/<name>`
- 跨层 import 只能 packages → pi-packages; 反向禁止
- 发布到 npm 时, packages/ 是公开 API; pi-packages/ 跟随 pi 上游版本号 (或私有, 视决策)

## References

- `pnpm-workspace.yaml` (workspace globs 实现)
- ADR 0001 (`docs/adr/0001-monorepo-toolchain.md`) — 工具链锁定版本

## History

- 2026-09-23: Accepted
