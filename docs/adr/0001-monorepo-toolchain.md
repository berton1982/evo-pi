---
id: 0001
title: monorepo-toolchain
status: Accepted
date: 2026-09-23
deciders: Berton
consulted: -
informed: -
supersedes: -
superseded_by: -

# ADR 0001 — monorepo 工具链

## Context

P0 (monorepo 启动, 2026-09-22 → 2026-09-23) 需要选择 monorepo 工具链以支持:

- `packages/` + `pi-packages/` 双层 workspace
- 多包协调 (build/lint/test/dev/clean 跨包调度)
- 现代 lint + format (替代 ESLint + Prettier 二元配置)
- Test framework (unit + e2e)
- 版本管理与 changelog
- Git hook automation (pre-commit 拦截)
- TypeScript strict mode

已锁定主要工具 (pnpm + Turborepo + biome + changesets + vitest + playwright);

## Decision

锁定以下 9 件工具 (version pin 在 `package.json:devDependencies`):

### 1. pnpm 9.15.0 (package manager)

- **vs 替代品**: npm 7+ (workspaces 弱 + peer 严格性低) / yarn classic (过时) / yarn PnP (复杂) / bun (newer)
- **理由**: monorepo workspaces 一等公民; hardlink symlinks 节省 disk; strict peer deps 减少"幻影依赖"; 主流 monorepo 选择
- **锁定位置**: `package.json:packageManager = "pnpm@9.15.0"` + `engines.node = ">=22.19.0"`
- **影响**: 所有 dev 必须用 pnpm; lockfile = `pnpm-lock.yaml`; 不允许混用 npm/yarn

### 2. Turborepo 2.11.3 (task orchestrator)

- **vs 替代品**: Nx (功能多但配置重) / Lerna (维护模式, 被 Nx 收购) / 直接 pnpm scripts
- **理由**: Vercel 维护活跃; task graph + remote caching; `turbo.json` 配置轻量; 与 pnpm 协作好
- **锁定位置**: `turbo.json` (5 tasks: build / lint / test / dev / clean)
- **影响**: monorepo build/lint/test/dev/clean 走 turbo 调度; 不允许直接调 `pnpm -r`

### 3. @biomejs/biome 2.5.14 (lint + format)

- **vs 替代品**: ESLint + Prettier (2 个 tool, 配置成本高) / dprint (类似 Biome 但生态小)
- **理由**: 一个 binary 包含 lint + format; Rust 编写极快; zero-config 起步; TypeScript / JSON native;
- **锁定位置**: `biome.json` (formatter + linter recommended; `noExplicitAny: error`; scope excludes `.my-idea`, `ref_projects`, `**/.turbo`, `**/coverage`)
- **影响**: 严禁装 ESLint/Prettier; lint 走 `pnpm lint` (= `biome check .`); auto-fix 走 `pnpm lint:fix`

### 4. vitest 5.0.1 (unit test framework)

- **vs 替代品**: Jest (ESM 痛苦 + 体积大) / Mocha (low-level) / Node:test (内置但 API 简陋)
- **理由**: Vite 生态; ESM/TS native; JSDoc-style API; 与 biome 风格一致;
- **锁定位置**: `vitest.config.ts` (workspace root; single-root strategy; include glob `packages/**/*.test.ts` + `pi-packages/**/*.test.ts`)
- **影响**: unit test 走 vitest; `pnpm test` = `vitest run` (root); 子包 `scripts.test` 仅信息 echo (vitest 集中 root 跑)

### 5. @playwright/test 1.63.0 (e2e test framework)

- **vs 替代品**: Cypress (DX 友好但 multi-browser 弱) / Puppeteer (仅 chromium)
- **理由**: 多 browser 支持 (chromium/firefox/webkit); wait-for-network 成熟; trace viewer 强;
- **锁定位置**: `playwright.config.ts` (testDir `./e2e`; chromium only for P0; baseURL placeholder)
- **影响**: e2e 走 playwright;
- **注意**: 真实 e2e 跑前 `pnpm exec playwright install chromium`

### 6. @changesets/cli 3.0.3 + @changesets/action@v2 (versioning + release)

- **vs 替代品**: Release Please (基于 conventional commits, 与 changesets 不兼容) / Lerna changes (老) / semantic-release
- **理由**: monorepo-native; PR-time version proposal; monorepo-friendly versioning (independent or fixed)
- **锁定位置**: `.changeset/config.json` (`access: restricted`; `privatePackages.tag/version: true`; `commit: false`; `updateInternalDependencies: patch`); `.github/workflows/changesets.yml` (uses action@v2)
- **影响**: user-facing 改动必须 `pnpm changeset`; version 在 PR 时由 action 自动 bump; v3 CLI 必须配 v2 action (v1 是 CLI v2 配套)
- **警告**: 严禁 `@changesets/action@v1` (CLI v2 配套); v1 inputs 名称不同 (`publish` vs `publish-script`)

### 7. husky 9.1.7 + lint-staged 17.5.1 (git hook automation)

- **vs 替代品**: simple-git-hooks (轻量但功能少) / lefthook (Go, 强大但生态小) / pre-commit.com (需 Python)
- **理由**: 主流; 单一 binary + 单一 config; `prepare` script 自动 setup
- **锁定位置**: `.husky/pre-commit` = `pnpm exec lint-staged`; root `package.json:scripts.prepare = "husky"`; `lint-staged` 配置:

```text
  "*.{ts,tsx,js,jsx,mjs,cjs}": "biome check --write --no-errors-on-unmatched",
  "*.{json,jsonc}": "biome format --write --no-errors-on-unmatched"
```

- **影响**: commit 自动跑 biome 在 staged files; lint error 会阻断 commit (T02b 设计); `--no-verify` 可绕过 (sanity check 用)
- **注意**: `.husky/_/` 是 husky v9 internal scaffolding; `.gitignore` 必须排除

### 8. TypeScript strict (tsconfig.base.json)

- **vs 替代品**: 宽松 TS / JS only / Flow
- **理由**: 现代 JS target (ES2022); bundler moduleResolution (与 Vite/Turborepo 一致); strict 全开
- **锁定位置**: `tsconfig.base.json` (target: ES2022, module: ESNext, moduleResolution: bundler, strict: true, noUncheckedIndexedAccess: true, isolatedModules: true)
- **影响**: 所有 TS 代码必须 strict; 子包 `tsconfig.json` 必须 `extends: "../../tsconfig.base.json"`; 禁止 any (警告级) / 禁止未声明变量
- **注意**: root `package.json: "type": "module"` 必备 (清 vite configLoader 'native' ESM warning on `vitest.config.ts`)

### 9. pnpm workspace 双层 + git worktree 隔离（按需）

- **vs 替代品**: yarn workspaces / Lerna / npm workspaces
- **理由**: 见 §1 (pnpm); git worktree 是 superpowers standard，按需使用（≥3 天独立工作或多分支并行时）
- **锁定位置**: `pnpm-workspace.yaml` (`packages/*` + `pi-packages/*`); worktree 路径建议绝对路径 + 锁
- **影响**: 所有 dev 必须 `pnpm install` (而不是 npm); worktree 内的工作走 PR 流程 squash merge 到 main

## Consequences

### 正面

- 工具链锁定 → dev 不再讨论"用哪个"; 一致体验
- 各工具现代 + 维护活跃; 不会快速过时
- Biome 一个 tool 替代 ESLint+Prettier → 配置成本减半
- pnpm 严格性 + Turborepo caching → install/build 时间可控
- Husky pre-commit 自动拦截 lint error → 防止坏代码进 commit

### 负面 / 风险

- **biome `recommended: true` 是 deprecated** (warn); 升级 biome v3 时需 migrate to `preset`
- **vite configLoader 'native' ESM warning** — 已 fix via `package.json: "type": "module"`; vite 7 plan to make 'native' default, 我们的 config 已是 ESM = future-proof
- **playwright browsers ~300MB** — 真实 e2e 跑前需 install (P1+ ticket scope)
- *(2026-10-10 cleanup: T02a AC-4 demo state removed along with `packages/foo` and `docs/conventions/lint-state.md`)*

### 后续约束

- 严禁引入 ESLint/Prettier/Jest/Cypress 等重复工具
- Toolchain 升级走 ADR 修订流程：本 ADR 修改 + 在 §History 记录变更 + 同步更新 `package.json` 等配置 (示例: vitest 5 → 6, biome 2 → 3)
- 新 package 必须符合本 ADR 的 TypeScript strict + biome lint + vitest test 三件套
- 任何"我不用 biome, 用 ESLint"的提议需先 amend 本 ADR (rare)

## References

- `MEMORY.md §4.1` (current state — 项目记忆)
- `package.json` (实际 pinned versions)
- 各工具官方文档 (pnpm.io / turbo.build / biomejs.dev / vitest.dev / playwright.dev / changesets.dev)

## History

- 2026-09-23: Accepted (通过 squash merge 到 main)
