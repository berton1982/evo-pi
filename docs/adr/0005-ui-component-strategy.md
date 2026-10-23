<!-- markdownlint-disable MD024 MD040 MD022 MD031 MD032 MD012 MD037 -->

# ADR 0005：UI 组件策略（shadcn/ui + Tailwind v4 + motion）

**状态**：已接受
## **日期**：2026-10-04
---

## 背景

pi-web 当前 UI 实现问题：
- 30+ inline SVG（散落在各组件）
- 803 行 `SettingsUi.tsx`（手写 ConfigButton/ConfigSwitch 等）
- 5+ `@keyframes` + setTimeout 140ms（手写动画）
- 内联样式（`style={{ ... }}`）泛滥
- 缺少 a11y 支持（Escape / focus trap / ARIA）

## 决策

引入 **shadcn/ui**（Radix 底层）+ **Tailwind v4** + **motion**（前 framer-motion）+ **lucide-react** + **react-resizable-panels**：

### 角色分工

| 库 | 角色 | 替换什么 |
|---|---|---|
| **shadcn/ui** | 基础 primitive 库（copy-paste 源码到 repo）| SettingsUi 803 行 + 30+ inline SVG + 全部 modal/dialog |
| **Tailwind v4** | utility-first CSS（已有 pi-web globals.css）| 内联 style + @theme tokens 标准化 |
| **motion** | 声明式 React 动画（手势 / 布局 / AnimatePresence）| 5+ @keyframes + setTimeout 140ms |
| **lucide-react** | 图标库（1500+ 图标，tree-shakeable）| 30+ inline SVG path |
| **react-resizable-panels** | 拖拽面板（autoSaveId + a11y）| `useResizablePanel` 291 行 + `lib/panel-layout` |

### shadcn/ui 集成方式

```bash
## 初始化（一次）
pnpm dlx shadcn@latest init

## 添加 primitive（按需）
pnpm dlx shadcn@latest add button switch dialog sheet tabs tooltip command
```

shadcn **不引入 npm 依赖**——复制组件源码到 `packages/web/components/ui/`。可定制、无版本锁定。

### Tailwind v4 tokens 策略

**复用 pi-web `app/globals.css` 的 `@theme` 指令**作为 shadcn design tokens：

```css
@theme {
  --color-bg: var(--bg);
  --color-text: var(--text);
  --color-accent: var(--accent);
  /* ... */
}
```

shadcn CLI 初始化时指定 globals.css 作为 base → 自动桥接 CSS 变量。

### motion 使用模式

```tsx
import { motion, AnimatePresence } from 'motion/react'

<AnimatePresence mode="popLayout">
  {activeTopPanel && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      ...
    </motion.div>
  )}
</AnimatePresence>
```

**何时用 motion / 何时用 CSS**：
- 简单 hover / focus → CSS transitions
- 进入 / 退出动画 → motion + AnimatePresence
- 拖拽 / 手势 → motion `drag` prop
- 布局动画（list reorder）→ motion `layout` prop


## 备选方案

### A. Material UI（MUI）

**否定**：
- Bundle 体积过大（~100 KB）
- 样式覆盖 Tailwind v4 难
- 与 design tokens 冲突

### B. Mantine

**否定**：比 shadcn 重；CSS-in-JS 倾向；a11y 不如 Radix。

### C. Chakra UI

**否定**：类似 MUI 问题。

### D. 仅 Radix UI primitives（无 shadcn 包装）

**否定**：Radix 是 unstyled primitives——需要手写样式。shadcn 提供开箱即用样式 + 完全可定制。

### E. 仅 Tailwind 无 shadcn

**否定**：需自建 Button/Dialog/Switch 等 components——重复劳动


## 影响

| 维度 | 影响 |
|---|---|
| **Bundle** | +20 KB（motion 12 + react-resizable-panels 8 + lucide 0-8 按需）|
| **代码量** | SettingsUi 803 行 → ~50 行（用 shadcn primitives）|
| **拖拽代码** | `useResizablePanel` 291 行 → 删除 |
| **a11y** | Radix 默认 WAI-ARIA（focus trap / escape / roving tabindex）|
| **样式一致性** | 内联 style 0 处；全部 Tailwind utility + design tokens |

---

## 何时重新评估

- shadcn primitive 数量 > 30 个时（考虑是否过度依赖）
- 需要复杂数据表格 / 图表（考虑 @tanstack/react-table / recharts）

## History

- **2026-10-04**：提议（shadcn/ui + Tailwind v4 + motion + lucide-react + react-resizable-panels UI 栈）
- **2026-10-06**：已接受

## 安装位置

所有本 ADR 引入的库安装到 **`packages/web/package.json`**（Phase 0 创建时）：

```jsonc
// packages/web/package.json
{
  "dependencies": {
    "motion": "^11.11.0",
    "lucide-react": "^0.460.0",
    "react-resizable-panels": "^2.1.7",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.0",
    "class-variance-authority": "^0.7.0"
  }
}
```

shadcn/ui 本身**不安装**——通过 CLI `pnpm dlx shadcn@latest add <comp>` copy-paste 组件源码到 `packages/web/components/ui/`。

**根 `package.json` 不放**——仅 monorepo 编排（per ADR 0001）。
