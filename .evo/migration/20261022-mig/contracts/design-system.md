# 设计系统契约 — token / 原语 / 尺寸

> **为什么冻结**：pi-web 用自己的 CSS 变量（`--color-bg-panel` 等），evo-pi 用 shadcn 的主题 token。两边名字不同，映射错就"看起来都灰、但灰得不一样"。
> **核对**：C4 的 D2（表面点认领）会抓到 token 使用点；C6 视觉对照以 `harness/snapshot/<flow>/dom.json` 里的 computed style 为准。

## 1. Token 族（pi-web → evo-pi）

| 语义 | pi-web 变量 | evo-pi token | 备注 |
|---|---|---|---|
| 页面底 | `--color-bg` | `background` | |
| 面板底 | `--color-bg-panel` | `card` | **不是** `bg-bg-panel`（历史错名） |
| 次级底 | `--color-bg-subtle` | `muted` | |
| 悬停底 | `--color-bg-hover` | `accent`（hover 变体） | |
| 选中底 | `--color-bg-selected` | `accent` + ring | |
| 边框 | `--color-border` | `border` | |
| 正文 | `--color-text` | `foreground` | |
| 次级文字 | `--color-text-muted` | `muted-foreground` | |
| 更弱文字 | `--color-text-dim` | `muted-foreground/70` | 不新增 token |
| 强调 | `--color-accent` | `primary` | |
| 用户消息底 | `--color-user-bg` | `secondary` | |
| 助手消息底 | `--color-assistant-bg` | `background` | |
| 工具块底 | `--color-tool-bg` | `muted/40` | |

**规则**：evo-pi 侧**不许出现 `--color-*` 前缀**（那是 pi-web 的命名空间）；映射一律走 shadcn token，颜色差异靠 `globals.css` 的 `:root` 值对齐，而不是在组件里写死 `rgb()`。

## 2. 原语复用（不许重复造）

| 场景 | 必须用 | 禁写 |
|---|---|---|
| 按钮 | `components/ui/button.tsx` | 裸 `<button className="rounded-md bg-...">` |
| 开关 | `components/ui/switch.tsx`（`aria-checked` 由它承担） | 自绘 div 开关 |
| 对话框 / 侧滑 | `dialog.tsx` / `sheet.tsx` | 自写 portal + overlay |
| 下拉 / 弹层 | `dropdown-menu.tsx` / `popover.tsx` | 绝对定位 div |
| 输入 | `input.tsx` / `select.tsx` / `slider.tsx` | 裸 `<input>` 带自定义样式 |
| 加载骨架 | `skeleton.tsx` | "Loading..." 文本 |
| 空态 | `card.tsx` + 文案 | 空白 div |

evo-pi 现有 16 个原语：`badge button card dialog dropdown-menu input popover scroll-area select separator sheet skeleton slider switch tabs tooltip`。**缺少的原语先补 `ui/`，不在能力里写局部实现**。

## 3. 布局尺寸（三区壳）

| 区域 | 尺寸 | 行为 |
|---|---|---|
| 左栏 | 280px（可拖 200–480） | 折叠时 0，宽度记忆在 `localStorage` |
| 中栏 | 弹性 | 最小 480px，消息内容最宽 860px |
| 右栏 | 420px（可拖 320–720） | 无内容时不占位 |
| 断点 | `<768` 单栏 | 左栏变抽屉，右栏变 sheet |

## 4. 排版

| 用途 | 字号/行高 | 字体 |
|---|---|---|
| 正文 | 14/22 | UI 字体（可配） |
| 代码/终端 | 13/20 | 等宽（可配，默认 Noto Sans Mono） |
| 标题 | 16/24 semibold | UI 字体 |

字号与字体可用户配置（`settings.chatContentFontSize` / `uiFontFamily`），但**间距与圆角不可配**（否则每人的界面都不一样）。

## CHG-001（2026-10-22，C-H 的 C2 提出并应用）

`SkillsConfig.tsx` 用到 `var(--font-mono)`（`:450` 的等宽字体族），但本契约原先只冻结了色族与尺寸，**没有登记字体族 token**。

- 变更：新增一行 `--font-mono`（Next font loader 注入，`ref_projects/pi-web/app/globals.css:24` 有 `--font-mono-font: var(--font-mono)` 的派生变量；`:614`/`:668`/`:682`/`:722`/`:860` 处使用）。
- 影响：需要等宽字体处必须用 `--font-mono`，不许写 `font-family: monospace`（否则换字体时漂移）。
- 提出方：`20261022-C-H-skills` 的 C2；受理：program run `20261022-mig`。
