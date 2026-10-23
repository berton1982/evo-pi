<!-- markdownlint-disable MD024 MD040 MD022 MD031 MD032 MD012 MD037 MD029 MD026 MD036 -->

# Dev Conventions — evo-pi monorepo

> 与 ADR 0001 (`docs/adr/0001-monorepo-toolchain.md`) 和 ADR 0002 (`docs/adr/0002-monorepo-package-structure.md`) 配套的 **日常 dev 约束**。ADR 解释"为什么这样选"; 本文档解释"日常怎么做"。

## 工具链固定 (引用 ADR 0001)

所有 dev 必须使用:

| 工具 | 命令 | 不要用 |
|---|---|---|
| **pnpm 9.15.0** | `pnpm install` / `pnpm add` | ❌ `npm install` / `yarn add` |
| **Turborepo 2.11.3** | `pnpm build` (= `turbo run build`) | ❌ 直接调 `pnpm -r build` |
| **Biome 2.5.14** | `pnpm lint` / `pnpm lint:fix` | ❌ 装 ESLint / Prettier |
| **vitest 5.0.1** | `pnpm test` / `pnpm test:watch` | ❌ 装 Jest / Mocha |
| **@playwright/test 1.63.0** | `pnpm e2e` / `pnpm e2e:list` | ❌ 装 Cypress / Puppeteer |
| **changesets 3.0.3** | `pnpm changeset` | ❌ 手动 bump version |
| **husky 9.1.7 + lint-staged 17.5.1** | (自动, commit 时) | ❌ 跳过 pre-commit hook |
| **TypeScript strict** | (通过 tsconfig.base 自动) | ❌ 写 `any` (warn) / 未声明变量 |

## 包结构约定 (引用 ADR 0002)

- 新包放 `packages/<name>/` (自有) 或 `pi-packages/<name>/` (pi 扩展)
- 包名: `@evo-pi/<name>`（核心）或 `@evo-pi-ext/<name>`（pi extension）
- 跨层 import: packages → pi-packages ✓; 反向 ❌
- 每个包需有 `package.json` + `tsconfig.json` (extends base)
- 占位包 (P0 阶段) 可只有 `package.json`, 真实包在 P1+ 补 `src/` + tests/

## Git 工作流

### Branch 命名

- `feat/<topic>` / `fix/<topic>` / `chore/<topic>` / `docs/<topic>` — 普通功能分支 (短期)
- `worktree/<topic>` — 长期独立工作时用 worktree 隔离 (absolute path + lock)

### Commit message style (conventional commits)

```text
<type>(<scope>): <description>

[body]

[footer: refs to issues / breaking changes]
```

`<type>` ∈ {feat, fix, refactor, perf, docs, test, build, ci, chore, style}
`<scope>` 是受影响的 layer (e.g., `core`, `web`, `cli`, `ci`, 或具体 ticket 编号)

**示例**:

- `feat(test): vitest 接入`
- `fix(core): handle empty changeset gracefully`
- `docs(adr 0001): clarify biome recommended → preset migration`

### Pre-commit hook 行为 (husky + lint-staged)

`git commit` 时:

1. husky pre-commit → `pnpm exec lint-staged`
2. lint-staged 跑 biome 在 **staged files** (根据 file glob):
   - `*.{ts,tsx,js,jsx,mjs,cjs}` → `biome check --write --no-errors-on-unmatched` (auto-fix safe issues; UNSAFE fix 不应用 — e.g., unused vars 不删除, any 不替换)
   - `*.{json,jsonc}` → `biome format --write --no-errors-on-unmatched`
3. 任何 lint **error** (非 warning) → commit 阻断
4. **warning** 不阻断 (但 biome `noExplicitAny` 在 P0 被显式升级到 error; 见 ADR 0001 §3)

**绕过** (仅 sanity check):

```sh
git commit --no-verify -m "..."
```

**严禁**: 长期 `--no-verify` (破坏 lint 闭环).

### 工作流

```text
worktree (worktree/<topic>) 实施
  ↓ commit (pre-commit 自动 lint)
  ↓ push (GH PR)
  ↓ CI (changesets action 自动 version + commit back to PR)
  ↓ PR review + merge → main (squash, 见 ADR 0001 §9)
```

## 反模式 (DO / DON'T)

### ❌ DON'T

| 反模式 | 原因 |
|---|---|
| 装 ESLint / Prettier / Jest / Cypress | 与 biome + vitest + playwright 重复 |
| 写 `any` 类型 | biome `noExplicitAny: warn` (升级到 error 时会 fail); strict TS 捕获 |
| 直接 `npm install` 装包 | 不用 pnpm 会破坏 lockfile 一致性 |
| 在顶层放散落 `.ts` / `.js` 文件 | 必须放 packages/ 或 pi-packages/ |
| pi-packages 依赖 packages | 违反依赖方向 (ADR 0002 §依赖方向) |
| commit 时 `--no-verify` 跳过 lint | 破坏 lint 闭环 |
| 跳过 `pnpm changeset` 直接 bump version | 破坏 changesets 工作流 |
| 改 biome.json 排除整个目录 | 范围蔓延; 应该用 `.my-idea` 等已 exclude 的目录 |
| 在 `.husky/_/` 内编辑 (husky v9 internal) | 该目录是 husky 自动管理的 |

### ✅ DO

| 习惯 | 原因 |
|---|---|
| 用 `pnpm` 命令 | 与 ADR 0001 一致 |
| 用 `pnpm add -D -w` 装 root dep | 显式标记 workspace root |
| 用 `pnpm changeset` 描述 user-facing 改动 | changesets 工作流 |
| tsconfig.json 始终 `extends: "../../tsconfig.base.json"` | 共享 strict 配置 |
| biome `--write` 自动 fix 后, commit 前 review diff | safe fix 可能改了预期外的内容 |
| 任何工具链变更先 amend ADR 0001 | ADRs 是 source of truth |
| 新增 lint rule 前先 brainstorm 是否 false positive | 维护 lint 闭环可信度 |

## 验证清单 (每次 commit 前自检)

按 `verification-before-completion` skill 精神:

1. `pnpm install` exit 0
2. `pnpm build` exit 0
3. `pnpm test` exit 0
4. `pnpm lint` exit 0
5. `pnpm e2e:list` exit 0 (playwright config parse OK)
6. pre-commit hook 不被 `--no-verify` 绕过
7. commit message 符合 conventional commits style

## Worktree 工作流纪律

> **v1.4 强化（sprint 视角）**：每个 **milestone（H#）一个 worktree**，而非每个 sprint 一个 worktree。

### 策略对比

| 策略 | worktree 数 | 适用 |
|---|---|---|
| 每个 sprint 一个 worktree | 21+ | ❌ 过度切换 context，小团队不可行 |
| 每个 milestone 一个 worktree | 5 | ✅ 推荐 |
| 单 worktree 21 周 | 1 | ❌ 单分支积累，难回滚 |

### 策略对比

| 策略 | worktree 数 | 适用 |
|---|---|---|
| 每个 milestone 一个 worktree | 5 | ✅ 推荐（H1: monorepo + Hello Sessions / H2: project + file / ...）|
| 单 worktree 21 周 | 1 | ❌ 单分支积累，难回滚 |

**DO**:
- 在 worktree 工作期间，**只**修改当前 worktree 分支（`worktree/<topic>`）内的文件
- 修改主分支文档（MEMORY.md / ADR / conventions）时，等到 worktree merge 时再处理
- 新开 worktree 后，第一件事 `git status` 确认在工作分支上
- handoff 写到 `docs/handoffs/<YYYYMMDD>-<N>-handoff.md`或 MEMORY.md（小型变更）
- 每**完整能力或特性**完成后 → handoff + commit → 主动建议 close session）
- bash 操作 worktree：用 `git -C <worktree-path> ...` 或链式 `cd <path> && cmd`（cwd 不跨调用保留）

**DON'T**:
- ❌ 在 worktree 工作期间编辑 main 分支的文件
- ❌ "顺手" 把 MEMORY / ADR 的更新 commit 到 main
- ❌ 跳过 handoff 直接 close session
- ❌ 单 session 持续累积多张 ticket（context 会膨胀）
- ❌ 实现迁移 ticket 前不读 pi-web 源码 + 画依赖图（per PATTERN migration refactor discipline）
- ❌ 起草 ADR 前未验证 pi-web 源码（per 用户 2026-09-28 ADR 先行约束）
- ❌ close session 提示词缺 worktree 路径（per session-prompt.md）
- ❌ 频繁 commit：每反馈一次 commit 一次（应完整任务 + 用户验证后 1 commit）

**例外**:
- 用户**显式**要求修改其他分支（如 "恢复 main 的 MEMORY.md"）→ 允许

**何时更新本节**:
- 新增 worktree 工作流规则 → 加 DO/DON'T 条目
- 新增迁移 ticket 流程约束 → 在 PATTERN migration refactor discipline 中加条目
- 用户新反馈 → 同步更新 refactor-patterns + 相关 conventions

## pi-web 上游追踪纪律（v1.2 新增，per Mirror P）

**DO**:
- 定期 `git fetch <pi-web-remote>` 监测 pi-web 上游 commit（建议每周）
- 上游有 commit → 比对已迁移 capability 的相关文件 → 评估影响（业务逻辑变更 / 仅实现细节）
- 业务逻辑变更 → 触发 `L2 UPSTREAM_TRACK` 操作 → 评估重规划
- 仅实现细节变更 → 仅记录到 `_replan-log.md`，不重做

**DON'T**:
- ❌ 上游变化不评估影响直接忽略 —— Mirror Fidelity 下降
- ❌ 业务逻辑变更但按"仅细节"处理 —— 实质内容被掩盖


## 何时更新本文件

- dev 反馈 + 3 次同问题 → 提升为规则

## 交叉引用

**架构决策 (ADR)**：
- ADR 0001: `docs/adr/0001-monorepo-toolchain.md` — 工具链锁定 + 选择理由
- ADR 0002: `docs/adr/0002-monorepo-package-structure.md` — 包结构

**领域文档与设计**：
- 多 context 布局: `CONTEXT-MAP.md` + per-package `CONTEXT.md`
