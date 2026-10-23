---
type: architecture
title: 应用外壳：三区布局、Provider 栈与面板状态
description: 说明 AppProviders 的 Provider 嵌套顺序（theme → i18n → react-query）及其理由、react-resizable-panels v4 下用 PanelImperativeHandle 命令式同步折叠状态的做法、三区面板的尺寸约束，以及 /sessions 页面如何组装各 slot 并把选中会话同步到 URL。
tags: [web, layout, providers, zustand, resizable-panels, nextjs]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T09:08:25.607Z
sources:
  - id: openwiki-source-4f8351f838ef502008ce1775
    resource: repo://packages/web/src/app/page.tsx
  - id: openwiki-source-5228d044130638e29a3d4ef0
    resource: repo://packages/web/src/app/sessions/page.tsx
  - id: openwiki-source-2cd38d4346ab7760d9e1ef07
    resource: repo://packages/web/src/components/app-shell/Layout.tsx
  - id: openwiki-source-6cca66430ba06bdd9472ec9b
    resource: repo://packages/web/src/components/sidebar/Sidebar.tsx
  - id: openwiki-source-21eb42e9a4fdcd2cc3d0cb57
    resource: repo://packages/web/src/lib/layout-constants.ts
  - id: openwiki-source-69cf2b8699eb4130a9460007
    resource: repo://packages/web/src/lib/stores/use-sidebar-store.ts
  - id: openwiki-source-adab5d18af3f8fafc1cda4ef
    resource: repo://packages/web/src/providers.tsx
generated: { by: "pi", at: "2026-10-17T09:08:25.607Z" }
---

# 应用外壳

整个 web 应用只有一个页面路由 `/sessions`（`/` 会重定向过去）。它由三层构成：根 layout 提供 Provider 栈、`SessionsPage` 组装三区 slot、`Layout` 负责可拖拽面板。

## Provider 栈

`app/layout.tsx` 最外层是 `<html lang="en" className="font-sans ...">`，内部包一层 `AppProviders`。Provider 的嵌套顺序是刻意的：

```text
<html>
└── ThemeProvider (next-themes, attribute="class")
    └── I18nProvider (zustand locale + translateMessage)
        └── QueryClientProvider (@tanstack/react-query, 5min staleTime)
            └── children
```

顺序的理由写在 `providers.tsx` 里：

- **Theme 必须在最外层**——`next-themes` 通过 `<html>` 上的 class 生效，而 layout 阶段就需要。
- **I18n 紧跟 Theme**——locale 切换可能影响所有子树的文案。
- **QueryClientProvider 在内**——只服务业务逻辑，与 DOM 解耦。

`QueryClient` 用 `useMemo` 绑定在 Provider 实例上，注释说明是为了避免 SSR 共享 client 时的请求串扰。默认配置是 `staleTime: 5min`、`refetchOnWindowFocus: false`（后者标注为 Phase 0 占位）。

**一条明确的既有约定**：`providers.tsx` 的注释写死"不要把 useState / URL sync / event bus 塞进 AppProviders，AppShell 是 presentational，所有状态走 zustand"。

## 三区布局

`Layout` 是纯展示组件，接收 `top` / `center` / `left` / `right` 四个 slot，内部用 `react-resizable-panels` v4 的 `Group` / `Panel` / `Separator` 组装。

### 面板尺寸

| 面板 | default | min | max | collapsed | 可折叠 |
|---|---|---|---|---|---|
| left（sidebar + footer） | `20%` | `10%` | `35%` | `0%` | ✅ |
| center（top + 中心区） | `60%` | `40%` | — | — | ❌ 始终存在 |
| right（文件 / 终端） | `20%` | `20%` | `50%` | `0%` | ✅ |

v4 的尺寸 API 接受数字或带单位字符串——**数字按像素解释，无单位字符串按百分比解释**。这里统一用带 `%` 的字符串。

每个 slot 容器都带 `data-zone="left|center|right"`，这是 e2e 断言三区布局的锚点。

### 折叠状态：命令式同步

v4 移除了 `onCollapse` / `onExpand` 属性，折叠改为通过 ref 调用。因此 `Layout` 用两个 `useEffect` 把 store 状态翻译成命令：

```ts
const leftPanelRef = useRef<PanelImperativeHandle>(null)
useEffect(() => {
  if (sidebarOpen) leftPanelRef.current?.expand()
  else leftPanelRef.current?.collapse()
}, [sidebarOpen])
```

right 面板同理。`Layout` 自身**不持有业务状态**，只从 `useSidebarStore` 读两个布尔值。

### 尺寸回写

```ts
onLayoutChange={(layout) => {
  if (onSidebarResize && typeof window !== 'undefined' && layout[0]) {
    onSidebarResize(Math.round((layout[0] / 100) * window.innerWidth))
  }
}}
```

把百分比乘 `window.innerWidth` 反算成像素回传给上层。store 里另有一组 clamp：`setSidebarWidth` 会把宽度夹在 `[200, 480]`，默认 260。

> ⚠️ 两处宽度常量并存：`lib/layout-constants.ts` 定义 `MIN/MAX/DEFAULT_SIDEBAR_WIDTH = 200/480/260`，而 `use-sidebar-store.ts` 内部**又写了一遍**同值的私有常量（`DEFAULT_WIDTH` / `MIN_WIDTH` / `MAX_WIDTH`）。注释说常量放在 `lib/` 是为了 Layout 与 Sidebar 共用，但 store 并没有 import 它们。

## 页面组装

`/` 是一个只做 `redirect('/sessions')` 的 server component。`SessionsPage` 是 `'use client'`，并且被 `<Suspense fallback={null}>` 包住——这是 Next.js 的硬性要求：组件里用了 `useSearchParams`（CSR bailout），不包 Suspense 会导致构建报错。

页面把五个组件装进 `Layout` 的四个 slot：

```text
Layout
├── top    → TopBar（sidebar 开关 + 工具栏占位）
├── center → CenterZone（选中会话的上下文或消息视图）
├── left   → Sidebar + SidebarFooter（flex column，footer 固定在底部）
└── right  → RightZone（tabs + 占位内容）
```

`SettingsPanel` 是浮在上面的 modal，由两个入口打开：`SidebarFooter` 的三个按钮（models / skills / settings）与 `TopBar` 的设置按钮。两者通过 `onSection` / `onSettingsSection` 回传 section id，页面用一张映射表把 footer 的 section 归一化（`settings → 'general'`）后再交给 panel。

## 选中会话的真值源

选中态存在 **URL query** 里（`/sessions?session=<id>`），不是组件 state 也不是 store：

```ts
const selectedSessionId = searchParams.get('session') ?? undefined
```

- Sidebar 点击 → `router.replace(...)`，用 `replace` 而非 `push`，避免每次点击堆积历史记录；`scroll: false` 避免跳转滚动。
- 刷新 / 深链 → `useSearchParams` 自动还原。
- 浏览器前进后退 → Next.js 保留 query 状态，天然可用。

`useSelectedSessionStore` 仍然存在（并被 `Sidebar.tsx` import），但页面与 Sidebar 都不再消费它——注释说明是为兼容潜在的外部读取方而保留。**新增代码不要往这个 store 里写选中态。**

## 相关页面

- [客户端数据获取](./data-fetching.md) — QueryClient 配置与三个取数 hook、URL 选中态的消费端
- [Session 浏览 UI](./session-browsing-ui.md) — Sidebar / SessionTree / CenterZone 的内部实现
- [i18n 与主题](./i18n-and-theme.md) — `I18nProvider` 与 theme store 的细节
- [端到端测试](../testing/e2e-playwright.md) — `data-zone` 契约的消费者
- [决策记录与交付纪律](../process/decision-records-and-delivery.md) — ADR 0004 的状态分层与 ADR 0005 的组件策略
