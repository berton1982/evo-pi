---
type: architecture
title: 表现层基础设施：自实现 i18n、主题与 shadcn/Tailwind 配置
description: 说明自实现 i18n 的三层结构（locale 注册表、三级翻译回退与 {name} 插值、浏览器语言解析与 localStorage 持久化）、首帧避免 hydration mismatch 的策略、next-themes 主题 store 的接线，以及 components.json 与 globals.css 构成的 shadcn + Tailwind v4 token 基础。
tags: [web, i18n, theme, tailwind-v4, shadcn, zustand, tokens]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T09:08:25.607Z
sources:
  - id: openwiki-source-634aecb9fec2891ac87a7294
    resource: repo://packages/web/components.json
  - id: openwiki-source-7f39523fff6e6293a2f73d22
    resource: repo://packages/web/src/app/globals.css
  - id: openwiki-source-fbd727984d8425110f20fed2
    resource: repo://packages/web/src/components/sidebar/session-tree.tsx
  - id: openwiki-source-d55eeac48e3791bec2b36d9e
    resource: repo://packages/web/src/i18n-provider.tsx
  - id: openwiki-source-36a58b8302e15745be2124fb
    resource: repo://packages/web/src/lib/i18n/format.ts
  - id: openwiki-source-c90c98e5f432b335a99b798a
    resource: repo://packages/web/src/lib/i18n/locale-registry.ts
  - id: openwiki-source-b160328d91c12b74a2db7ceb
    resource: repo://packages/web/src/lib/i18n/messages/en.ts
  - id: openwiki-source-029ed9ac34b457f53ac6a391
    resource: repo://packages/web/src/lib/i18n/types.ts
  - id: openwiki-source-745568a5c19d837107ed385a
    resource: repo://packages/web/src/lib/stores/use-locale-store.ts
  - id: openwiki-source-81bbcbda0287b37f0ecb9f34
    resource: repo://packages/web/src/lib/stores/use-sidebar-prefs-store.ts
  - id: openwiki-source-3ed8798d1ff894ed0630fe55
    resource: repo://packages/web/src/lib/stores/use-theme-store.ts
  - id: openwiki-source-adab5d18af3f8fafc1cda4ef
    resource: repo://packages/web/src/providers.tsx
generated: { by: "pi", at: "2026-10-17T09:08:25.607Z" }
---

# 表现层基础设施

## 自实现 i18n（不用 react-i18next）

`package.json` 里**确实装了** `i18next` 与 `react-i18next`，但代码没有用它们。`i18n-provider.tsx` 的注释记录了这个决定：Phase 0 阶段先写了自实现的 `translateMessage` + `getMessagesByLocale`，保持一致性；等 Phase 1+ 真需要 lazy load / namespaces 时再切换——而且标注了"切换成本很低"。

### 三层结构

| 层 | 文件 | 职责 |
|---|---|---|
| 类型 | `lib/i18n/types.ts` | `Locale = 'en' \| 'zh-CN' \| 'zh-TW'`、`LocalePlugin`、`TranslationParams` |
| 注册表 | `lib/i18n/locale-registry.ts` | 语言包数组、`SUPPORTED_LOCALES`、浏览器语言解析、一次性收集全部 messages |
| 格式化 | `lib/i18n/format.ts` | `translateMessage`（回退链）与 `interpolateMessage`（插值） |

用字符串字面量联合而不是 `enum`，注释解释了原因：与参考实现一致，且 `enum` 会引入运行时开销并与 `noUncheckedIndexedAccess` 不友好。

注册顺序即语言切换菜单的显示顺序：**en → zh-CN → zh-TW**。

### 三级回退

```ts
const message = messages[locale]?.[key] ?? messages.en?.[key] ?? key
```

当前 locale → en → **key 本身**。最后一级兜底的设计意图是"让缺译可见"——UI 会显示 `center.detail.retry` 这样的原始 key，而不是一片空白。缺译因此在开发期很容易被发现。

### 插值语法

`{name}` 的简单字符串替换，**无嵌套、无转义**。正则 `/\{([\w.-]+)\}/g` 允许 key 里含 `.` 与 `-`，未提供的参数保持占位符原样。注释指出未来若需要 plural / nested，应迁移到 ICU MessageFormat。

### 浏览器语言解析

`resolveBrowserLocale(navigatorLanguages)` 按顺序匹配第一个命中的：

| 匹配 | 结果 |
|---|---|
| `en` 或 `en-*` | `en` |
| `zh` / `zh-cn*` / `zh-sg*` / `zh-hans*` | `zh-CN` |
| `zh-tw*` / `zh-hk*` / `zh-mo*` / `zh-hant*` | `zh-TW` |
| 其他 `zh-*` | `zh-CN` |
| 都不匹配 | `en` |

### 首帧策略（避免 hydration mismatch）

```text
SSR            → zustand store 默认 'en'（服务端没有 navigator）
浏览器首帧 effect → 读 localStorage['evo-pi-locale']
                    → 无则 resolveBrowserLocale(navigator.languages)
                    → setLocale(next) + document.documentElement.lang = next
```

这是刻意的两阶段：服务端与客户端首帧都用 `en` 保证 HTML 一致，挂载后再切到用户语言。代价是首帧可能闪一下英文。

localStorage 键名硬编码为 `evo-pi-locale`，只接受 `en` / `zh-CN` / `zh-TW` 三个值，其余一律走浏览器语言解析。

## 主题

`next-themes` 管 DOM，`zustand` 管偏好：

- `ThemeProvider` 以 `attribute="class"` + `enableSystem` 挂载，`defaultTheme` 取自 `useThemeStore.getState().theme`。
- `useThemeStore` 是 `'light' | 'dark' | 'system'` 三态，默认 `'system'`，**Phase 0 不持久化**（每次启动跟随系统）。注释标注后续加 `persist` 中间件，键名参考 `pi-theme`。
- 注意 `getState()` 是在 render 期间直接读的——用于初始化 Provider 的 prop，不订阅变化。

## 持久化现状

`zustand/persist` 当前**只用在 `use-sidebar-prefs-store`**（键名 `evo-pi-sidebar-prefs`，字段 `pinned` / `showIgnored`）。其余 store 全是内存态：

| store | 持久化 | 说明 |
|---|---|---|
| `use-locale-store` | ❌ | 注释说明 SSR hydration 处理留待后续；实际持久化由 `I18nProvider` 手写 localStorage 完成 |
| `use-theme-store` | ❌ | Phase 0 不持久化 |
| `use-sidebar-store` | ❌ | 面板宽度与开关，按 ADR 0004「持久化 prefs 单独 store」拆分 |
| `use-sidebar-prefs-store` | ✅ | `persist` 中间件 + localStorage |
| `use-selected-session-store` | ❌ | 已不再消费（选中态改由 URL 承担） |

`use-sidebar-prefs-store` 的注释提醒 SSR 场景需要 `skipHydration: true`，当前 Phase 0 仅客户端渲染所以没处理——这是一条已知的待办。

## shadcn + Tailwind v4 的 token 桥接

`components.json` 是 shadcn CLI 的配置：

| 字段 | 值 | 含义 |
|---|---|---|
| `style` | `base-nova` | 组件风格 |
| `tailwind.css` | `src/app/globals.css` | token 定义所在 |
| `cssVariables` | `true` | 用 CSS 变量而非 tailwind.config 色板 |
| `iconLibrary` | `lucide` | 图标库 |
| `aliases` | `@/components`、`@/lib`、`@/hooks`… | 与 tsconfig paths 对齐 |

`globals.css` 完成 Tailwind v4 到 shadcn 变量的桥接：

```css
@import 'tailwindcss';
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-sidebar: var(--sidebar);
  --color-primary: var(--primary);
  /* …把 shadcn 变量映射成 Tailwind color token */
}
```

也就是：shadcn 定义 `--sidebar` / `--primary` 等语义变量，`@theme inline` 把它们映射为 `--color-*` token，Tailwind v4 才能生成 `bg-sidebar` / `text-primary` 这类 utility。`@custom-variant dark` 配合 `<html class="dark">` 实现暗色模式——这正是 `next-themes` 用 `attribute="class"` 的原因。

`tw-animate-css` 提供 shadcn 需要的动画，`motion` 则用于手势与布局动画（ADR 0005 的分工）。

## 语言包现状

三个语言包各 10 个 key，命名按区域前缀分组（`common.*` / `sidebar.*` / `center.*` / `topbar.*` / `rightzone.*` / `settings.*` / `app.*`）。`en.ts` 的注释标注"Phase 0 占位，后续渐进补全"——目前覆盖的正是三区布局与 CenterZone 状态机的文案。

**已知缺口**：`SessionTree` 的空态（"No sessions yet"）是硬编码英文，没走 i18n；组件注释也承认"PR.A 用硬编码英文，Phase 2+ 接入 useI18n"。

## 相关页面

- [应用外壳](./app-shell.md) — Provider 栈中 Theme 与 I18n 的位置
- [Session 浏览 UI](./session-browsing-ui.md) — 哪些文案走了 i18n，哪些没有
- [决策记录与交付纪律](../process/decision-records-and-delivery.md) — ADR 0004 状态分层与 ADR 0005 组件策略
