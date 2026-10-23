# tooling/

**Status**: placeholder (按需填充)
**Filled in**: ongoing

Project-specific tooling — scripts, codegen, helper CLIs — that aren't part
of the monorepo's published API but are useful for working on evo-pi itself.

## Intent

- Tools that help maintain the repo (changelog builders, schema validators,
  dependency auditors, etc.)
- Scripts that wrap or extend the monorepo's own tooling (e.g. a wrapper
  around `pnpm` that also updates `MEMORY.md`)
- Codegen for boilerplate (new package scaffolds, new ADR templates)

## What lives here

| Path | Stage | Purpose |
|---|---|---|
| `check-wiki-diagrams.mjs` | active | 校验 `openwiki/` 下 Mermaid 图是否会被 OpenWiki 降级成文本块 |

## check-wiki-diagrams.mjs

**做什么**：扫描 `openwiki/**/*.md`（跳过生成的 `index.md`），逐个 ` ```mermaid `
围栏检查三类问题：

1. OpenWiki 的降级启发式（与 `src/mermaid/validate.ts` 的 `heuristicError()` 逐字对齐）——**零依赖，永远执行**。
2. 残留的 `openwiki: mermaid parse failed` 注释——意味着图已被降级且没人恢复。
3. `mermaid.parse()`——仅当能解析到 `mermaid` + `jsdom` 时执行（查找顺序：仓库
   `node_modules` → 环境变量 `OPENWIKI_MERMAID_MODULES` → `npm root -g`）。
   找不到就跳过并提示，**不算失败**。

**何时跑**：

```bash
pnpm wiki:check                                  # 提交前手动跑
node tooling/check-wiki-diagrams.mjs <dir>...    # 检查其它目录
```

已挂在 `.husky/pre-push`（仓库级不变量检查，不是逐文件格式化，所以放 pre-push 而不是
已经跑 lint-staged 的 pre-commit）。CI 里 `openwiki-update.yml` 已全局安装 mermaid +
jsdom，因此那里会走完整模式。

**为什么需要它**：OpenWiki 在缺少可选依赖 `mermaid` / `jsdom` 时会退回保守启发式，
把**合法**的图改写成 ` ```text `。本地写图时最容易踩的三类标签：
`<br/>` 换行、`{...}` 判据里的 `>`（如 `>= 30`）、以及 `<T>` 泛型
（写成 `&lt;` 反而会触发分号规则）。

**如何扩展**：若 OpenWiki 上游改了启发式，同步更新本文件顶部的三个正则常量——
它们必须与上游逐字一致，否则本地放行的图在没装 mermaid 的 CI 上仍会被降级。

## Conventions

- Tools should be small and single-purpose
- Prefer reuse of monorepo tooling (`biome`, `turbo`, `changesets`) over
  new dependencies
- Each tool gets a `README.md` explaining what it does, when to run it,
  and how to extend it
- Tools run via `pnpm` or `node` directly; no shell scripts with hidden state

## What's explicitly NOT here

- **Monorepo-wide linting / formatting / build** — handled by `biome` +
  `turbo` + `changesets` at root
- **Test framework** — root `vitest` config (when added in P1+)
- **CI workflows** — `.github/workflows/*`
