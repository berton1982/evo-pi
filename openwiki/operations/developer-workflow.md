---
type: operations
title: 开发工作流：命令面、任务图、Git hook 与 CI
description: 汇总 evo-pi 的日常命令与自动化边界——turbo 任务图与跨包调度约定、biome 单二进制的 lint/format 规则与排除范围、changesets 版本流程、husky + lint-staged 提交拦截，以及 changesets 与 openwiki-update 两个 GitHub Actions workflow 的触发条件与权限。
tags: [toolchain, turbo, biome, changesets, husky, github-actions, workflow]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T09:08:25.607Z
sources:
  - id: openwiki-source-c707fc248bc179630434a5e3
    resource: repo://.changeset/config.json
  - id: openwiki-source-61ca4608288b9032a2b5349b
    resource: repo://.github/workflows/changesets.yml
  - id: openwiki-source-6d4b4e707b8d60b6ccfa3425
    resource: repo://.github/workflows/openwiki-update.yml
  - id: openwiki-source-43c41f18d49c25a86be5e9ae
    resource: repo://.husky/pre-commit
  - id: openwiki-source-59f729b67c0a733dbed55b7f
    resource: repo://biome.json
  - id: openwiki-source-0075953b265fd90570cbc8d4
    resource: repo://docs/conventions/dev.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-40275cb92c3610938f16ade3
    resource: repo://pnpm-workspace.yaml
  - id: openwiki-source-440ae1e215cb02721dda855c
    resource: repo://turbo.json
generated: { by: "pi", at: "2026-10-17T09:08:25.607Z" }
---

# 开发工作流

工具链的选择理由记录在 [ADR 0001](../process/decision-records-and-delivery.md)；本页只记录**实际可执行的命令面与自动化边界**，以及两处当前存在的不一致。

## 包管理器与前置要求

- `packageManager` 锁定 `pnpm@12.10.1`，`engines.node >= 22.19.0`。
- workspace 由 `pnpm-workspace.yaml` 定义为 `packages/*` 与 `pi-packages/*` 两层。
- 该文件同时承载 pnpm 12 的供应链策略：`minimumReleaseAge: 0`（默认 1440 分钟会挡住 agent/CI 环境的正常安装）与 `allowBuilds` 白名单（`@google/genai`、`@parcel/watcher`、`@swc/core`、`esbuild`、`protobufjs`）。
- 根 `.npmrc` 只有一行注释：pnpm 12 已把这些键迁到 YAML，在 `.npmrc` 里配置会报 `ERR_PNPM_CONFIG_SET_UNSUPPORTED_YAML_CONFIG_KEY`。

## 命令面

根 `package.json` 的 scripts：

| 命令 | 实际执行 | 备注 |
|---|---|---|
| `pnpm build` / `pnpm dev` / `pnpm clean` | `turbo run <task>` | 跨包调度 |
| `pnpm lint` / `pnpm check` | `biome check .` | 同一个命令 |
| `pnpm lint:fix` | `biome check --write .` | |
| `pnpm format` | `biome format --write .` | 只格式化不 lint |
| `pnpm test` | `vitest run --passWithNoTests` | 测试集中在根跑 |
| `pnpm test:coverage` | `vitest run --coverage --passWithNoTests` | |
| `pnpm e2e` / `pnpm e2e:list` | `playwright test` / `--list` | 需手动起 dev server |
| `pnpm changeset` / `changeset:version` | changesets CLI | |
| `pnpm prepare` | `husky` | install 时自动装 hook |

子包的 `test` script 只是 `echo 'packages/core tests run via root vitest'` 这类提示——**测试不在子包跑**。

## turbo 任务图

`turbo.json` 定义 5 个 task：

| task | 依赖 | 缓存 | outputs |
|---|---|---|---|
| `build` | `^build`（上游包的 build） | 缓存 | `dist/**` |
| `lint` | — | 缓存 | — |
| `test` | — | 缓存 | `coverage/**` |
| `dev` | — | `cache: false` + `persistent: true` | — |
| `clean` | — | `cache: false` | — |

`globalEnv` 只有 `PLAYWRIGHT_BASE_URL` 与 `CI`——这两个变量参与 e2e 行为与缓存键，改动它们会让缓存失效。

**约定：跨包任务必须走 `pnpm <script>`（即 turbo），不要用 `pnpm -r`**。`docs/conventions/dev.md` 把这条列为硬约束，理由是绕开 turbo 会丢掉依赖图与缓存。

## biome：单一二进制的 lint + format

仓库禁止引入 ESLint / Prettier（ADR 0001 的显式决策）。关键规则：

| 规则 | 级别 |
|---|---|
| `noExplicitAny` | **error** |
| `useNodejsImportProtocol`（必须写 `node:fs` 而不是 `fs`） | **error** |
| `useImportType`（纯类型导入写 `import type`） | warn |
| preset | `recommended` |

格式化规则：2 空格缩进、行宽 100、LF、单引号（JSX 用双引号）、无分号、trailing commas all。

`files.includes` 的排除清单值得记住：`node_modules`、`dist`、`**/.turbo`、`**/.next`、`**/next-env.d.ts`、`**/globals.css`、`**/coverage`、`**/build`、`.my-idea`、**`ref_projects`**。最后一条意味着 vendored 的参考项目即使被 biome 扫到也不会被检查。

## Git hook：husky + lint-staged

`.husky/pre-commit` 只有一行 `pnpm exec lint-staged`。lint-staged 的配置**内联在根 package.json**：

```json
"*.{ts,tsx,js,jsx,mjs,cjs}": "biome check --write --no-errors-on-unmatched",
"*.{json,jsonc}":              "biome format --write --no-errors-on-unmatched"
```

两个后果：

1. **Markdown 不在处理范围内**——提交时不会自动 lint/format `.md`（`.markdownlint.json` 存在，但没有接到 hook 上）。
2. `--write` 意味着 biome 可能在提交时**修改你的文件**；被修改的文件会留在工作区，需要自己检查并再次提交。

`--no-errors-on-unmatched` 保证没有匹配文件时不报错。

## changesets

`.changeset/config.json` 的关键设置：

- `baseBranch: "main"`、`access: "restricted"`、`commit: false`。
- `privatePackages: { tag: true, version: true }`——虽然两个包都是 `private: true`，仍然参与版本与 tag。
- `updateInternalDependencies: "patch"`。

## 两个 GitHub Actions workflow

### `changesets.yml` — PR 上直接 bump 版本

触发条件：`pull_request` 的 `opened` / `reopened` / `synchronize`（**不需要 push 到 main**）。行为是在 PR 上跑 `@changesets/action@v2`，执行 `changeset version`，把版本改动、lockfile 与 CHANGELOG **提交回 PR 分支**。并发组带 `cancel-in-progress: true`，新 commit 会取消旧运行。权限是最小化的 `contents: write` + `pull-requests: write`。

注释里记录了一个易错点：changesets CLI v3 必须配 action **v2**（v1 对应 CLI v2），且 v2 把输入名从 `publish` 改成了 `publish-script` / `version-script`。

> ⚠️ **不一致**：`baseBranch` 写的是 `main`，而当前本地分支是 `master`。在推送前需要先确认远端默认分支到底是哪个。

### `openwiki-update.yml` — 每日自动更新本 wiki

- 触发：`schedule` 每天 `08:00 UTC` + 手动 `workflow_dispatch`。
- `fetch-depth: 0` 是必需的——注释说明浅克隆会让 update 拿到空的变更摘要。
- 全局安装 `openwiki@0.7.2`（另加 `mermaid` + `jsdom` 用于高保真校验 Mermaid 图），跑 `openwiki code --update --print`，模型由 `OPENWIKI_MODEL_ID` 指定。
- 该步骤带 `continue-on-error: true`：即使 OpenWiki 失败，后续步骤仍会执行。
- 收尾时 `rm -f -- openwiki/.run.json` 清理瞬态 run 状态，然后用 `peter-evans/create-pull-request` 开 PR。
- **失败语义是刻意设计的**：PR 正文写明当结果为 `failure` 时，该 PR 会有意保留失败前已完成的页面，合并它即可把那些进度作为下次运行的基线。最后一步再把失败状态向上传播让 job 变红。

> ⚠️ **当前风险**：`fetch-depth: 0` 依赖完整 git 历史，而本仓 `master` 分支**尚无任何 commit**。在首个 commit 之前，这个 workflow 的变更摘要会是空的。

## 相关页面

- [单元与集成测试](../testing/unit-tests.md) — `pnpm test` / vitest 的实际状态
- [端到端测试](../testing/e2e-playwright.md) — `pnpm e2e` 的前置条件
- [系统全景](../overview/system-map.md) — workspace 与包结构
- [本地隔离与 live 数据](./local-isolation-and-live-data.md) — 开发时的端口与数据目录纪律
- [决策记录与交付纪律](../process/decision-records-and-delivery.md) — ADR 全文与交付流程
