---
type: testing
title: 端到端测试：Playwright 配置、用例与运行前置条件
description: 说明 playwright.config.ts 的关键取舍——testDir 指向根 e2e/、复用系统 Chrome 而非下载浏览器、baseURL 默认 30041、webServer 段被注释掉因此不会自动拉起 dev server——以及三个 spec 依赖的 data-* DOM 契约与“磁盘无会话则 skip”的模式。
tags: [testing, playwright, e2e, configuration, dom-contract]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T09:08:25.607Z
sources:
  - id: openwiki-source-f697ea09de96045aeeb76091
    resource: repo://e2e/sessions/detail.spec.ts
  - id: openwiki-source-f9b5d36d54f27875a8a37f28
    resource: repo://e2e/sessions/list-sessions.spec.ts
  - id: openwiki-source-16f4ef2531effd9ed2e97a20
    resource: repo://e2e/sessions/search.spec.ts
  - id: openwiki-source-5e753d9d77984cb67aae1517
    resource: repo://playwright.config.ts
generated: { by: "pi", at: "2026-10-17T09:08:25.607Z" }
---

# 端到端测试：Playwright

三个 spec、13 个用例，全部打真实 dev server + 真实磁盘会话。它们的价值不在"测 core"（那由 vitest 负责），而在**验证 UI 与后端契约真的接上了**——这也是交付六道门中"门 2 · 浏览器功能测试"的自动化部分。

## 配置取舍

| 配置 | 值 | 原因 |
|---|---|---|
| `testDir` | `./e2e` | 与 `packages/` 平级；包内的 e2e 目录由 workspace glob 发现 |
| `testMatch` | `/.*\.spec\.ts$/` | 只认 `.spec.ts` |
| `fullyParallel` | `true` | 本地并行；CI 下 `workers: 1` + `retries: 2` |
| `forbidOnly` | `!!process.env.CI` | CI 里禁止 `.only` |
| `reporter` | 本地 `list`；CI `list` + `html` | CI 产出 HTML 报告 |
| `baseURL` | `PLAYWRIGHT_BASE_URL ?? http://localhost:30041` | evo-pi 的专用端口 |
| `trace` / `screenshot` | `on-first-retry` / `only-on-failure` | 失败时才留证据 |
| `projects` | 仅 chromium（Desktop Chrome） | 其余浏览器推迟 |

### 复用系统 Chrome

```ts
launchOptions: {
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
}
```

不走 Playwright 自带的 chromium-headless-shell，避免额外下载约 150MB 浏览器；Chrome 不在默认路径时用 `PLAYWRIGHT_CHROMIUM_PATH` 覆盖。`--no-sandbox` 是容器/CI 环境下的常规需要。

### webServer 被注释掉

```ts
// webServer: {
//   command: 'pnpm dev',
//   url: 'http://localhost:3000',
//   reuseExistingServer: !process.env.CI,
// },
```

**这意味着 `pnpm e2e` 不会自动拉起 dev server。** 必须先自己在 30041 启动 `@evo-pi/web`，否则全部用例都会因为连不上页面而失败。

### 两处 baseURL 默认值不同

config 里是 `http://localhost:30041`，而三个 spec 各自在模块顶层写了：

```ts
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:30041'
```

spec 用的是**自己的** `BASE_URL` 拼 `page.goto(BASE_URL + '/sessions')`，config 的 `baseURL` 只在用到相对 URL 时才生效。两个默认值一个 `localhost` 一个 `127.0.0.1`，只有显式设置 `PLAYWRIGHT_BASE_URL` 时两者才一致。

## DOM 契约

e2e 全部通过 `data-*` 属性定位元素，因此**改这些属性等于改 e2e**：

| 选择器 | 出处 | 用途 |
|---|---|---|
| `[data-component="session-tree-row"]` | `SessionTree` | 会话行，也是判断"磁盘上有几个会话"的依据 |
| `[data-component="session-tree-empty"]` | `SessionTree` | 空态 |
| `[data-component="message-view"]` | `MessageView` | 消息视图容器 |
| `[data-component="message-row"]` + `[data-message-role]` | `MessageView` | 单条消息与角色 |
| `[data-component="message-fallback"]` | `MessageView` | 非 user/assistant 角色的兜底渲染 |
| `[data-component="center-zone-error"]` / `-loading` | `CenterZone` | 中心区状态机 |
| `[data-testid="sidebar-search-input"]` | `SidebarSearchInput` | 搜索输入框 |
| `[data-action="search-toggle"]` | Sidebar header | 搜索开关 |
| `[data-zone="left|center|right"]` | `Layout` | 三区布局 |
| `[data-section="models|skills|settings"]` | `SidebarFooter` | 底部按钮 |
| `[aria-current="true"]` | `SessionTreeRow` | 选中态 |

## skip 模式：磁盘决定用例是否真的跑

三个 spec 都有同一个前置模式：

```ts
const rowCount = await page.locator('[data-component="session-tree-row"]').count()
test.skip(rowCount === 0, 'No sessions on disk for this cwd — skip click test')
```

`detail.spec.ts` 里还有一个 `rowCount < 2` 的双会话用例 skip。**这意味着在空的 agentDir 上跑 e2e，大部分用例会静默 skip**——通过数好看，但核心的"点击行 → 渲染真实消息"路径其实没被验证。判断 e2e 是否真的有效，要看 skip 数量而不只是通过率。

## 三个 spec 分别验证什么

### `list-sessions.spec.ts`（3 个用例）

- 3 区布局与 footer 按钮在 `/sessions` 渲染（Phase 0 的 smoke 契约）。
- 至少发生 1 次 `GET /api/sessions`，且 URL 精确等于 `/api/sessions`（无多余查询参数）。
- 行数断言是**区间**而非定值：`0 ≤ rowCount ≤ 30`（30 ≈ 视口 17 行 + overscan），因为真实后端的行数取决于磁盘状态。
- 点击行后 `aria-current` 恰好为 1，并出现 message-view / error / loading 三者之一。

### `detail.spec.ts`（4 个用例）

- 点击行 → 网络面板出现 `/api/sessions/{id}/context` 请求。
- **`expect(firstContextCall).toContain('tail=50')`** —— 客户端 hook 总是显式传 `tail=50`，与 route 侧"不传则用默认 10000"是两条不同路径（见 [HTTP API 层](../web/api-routes.md)）。
- 消息存在时，断言 `userCount + assistantCount + fallbackCount > 0`——只验证"消息管线渲染出了东西"，不校验具体角色数量，因为活跃分支的尾部窗口可能只有 toolResult。
- 点第二行时 sessionId 必须不同。

### `search.spec.ts`（5 个用例）

- 搜索输入初始不存在，点击 `[data-action="search-toggle"]` 后出现且**未 disabled**（Phase 0 时它是禁用的占位）。
- 输入后确实发出带 `q=agent` 的 `/api/sessions/search` 请求。
- 清空输入后行数恢复。
- 匹配查询后的断言是弱断言（`filteredCount >= 0`），因为真实后端下"the"这类高频词可能匹配几乎全部会话。

## 运行

```bash
# 1. 先起 dev server（另开一个终端）
pnpm --filter @evo-pi/web dev

# 2. 再跑
pnpm e2e

# 只想列出用例不执行（不需要浏览器）
pnpm e2e:list

# 指定单个文件
pnpm exec playwright test e2e/sessions/detail.spec.ts
```

跑之前建议先 `lsof -i:30041` 确认端口状态（见[本地隔离与 live 数据](../operations/local-isolation-and-live-data.md)）。

## 相关页面

- [Session 浏览 UI](../web/session-browsing-ui.md) — 这些 `data-*` 契约的生产者
- [客户端数据获取](../web/data-fetching.md) — `tail=50` 的来源
- [单元与集成测试](./unit-tests.md) — vitest 与 e2e 的分工
- [本地隔离与 live 数据](../operations/local-isolation-and-live-data.md) — 端口纪律
