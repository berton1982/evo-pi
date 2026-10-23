# web 包的架构约定

> 这份文档是**可执行约定**的说明，判据由 `scripts/check-boundaries.mjs` 强制。
> 改这里要先改脚本，否则约定会变成"文档里的话"。
> 后端分层（domain / use-cases / ports / adapters / infrastructure）见
> `docs/architecture/` 与 `packages/core/src/session/{domain,use-cases,adapters,infrastructure}`。

## 1. 分层与目录

```
packages/web/src/
  app/                 路由与装配点（唯一允许同时 import shell 与 features）
  shell/
    frame/             providers、i18n、错误边界（换掉任何能力它都在）
    layout/            三区骨架、分隔条、区域槽位、设置弹窗宿主
    orchestration/     应用级状态机：URL、选中会话、对话框/搜索、跨能力编排
    registry/          壳与能力之间唯一的契约（spec 类型，无实现）
  features/<slice>/    一个能力：container / presenter / hook / store / dto
  components/ui/       shadcn 原语（无业务）
  lib/                 纯工具：i18n、format、api-client、types
```

## 2. 依赖方向（违反即构建失败）

| 从 | 允许 import | 禁止 import |
|---|---|---|
| `app/**` | 全部（装配） | — |
| `shell/**` | `shell/**`、`components/ui`、`lib`、`shell/registry` 的类型 | `features/**` |
| `features/a/**` | 自己、`components/ui`、`lib`、`shell/registry` 的类型 | `features/b/**`、`shell/**` 的实现 |
| `lib/**`、`components/ui/**` | 各自与更低层 | `features/**`、`shell/**` |

三条背后的理由：

1. **壳不认识能力**：加一个能力只改装配点（`app/**`），不动壳。设置分区就是这么做的
   （`shell/registry/panels.ts` 的类型 + `features/mcp/panel-spec.tsx` 的实现 + `app/sessions/page.tsx` 里一行 `panels={[mcpSettingsPanel]}`）。
2. **能力之间不互相 import**：共用逻辑下沉到 `lib/` 或 `components/ui/`，否则两个能力会暗中耦合成一个。
3. **地基层不认识上层**：`lib/i18n` 一旦 import 了某个 store，i18n 就不能被 core 侧或测试复用。

## 3. 一个能力切片长什么样

```
features/<slice>/
  <slice>-panel.tsx      container：读 hook、拼 presenter，不写业务分支
  <slice>-panel-view.tsx presenter：只接收 props 渲染
  use-<slice>.ts         状态与动作（端口装配、乐观更新、错误映射）
  stores/*-store.ts      跨组件共享的状态（一个 store 一类状态，不混）
  dto.ts                 wire ↔ 视图类型的映射（zod 校验放这里）
```

判断"该不该进 feature"的三问：

1. 有自己的领域数据/用例？→ feature
2. 被 ≥2 个能力共用且不含业务语义？→ `components/ui` 或 `lib`
3. 只回答"放在哪、多大"？→ `shell/layout`

## 4. god 组件的拆法（AppShell 这类）

四类职责必须分家，一个文件同时出现 ≥3 类就必然长成 god：

| 职责 | 归属 | 判据 |
|---|---|---|
| 框架/壳 | `shell/frame` | 换掉任何 feature 它都要在 |
| 布局 | `shell/layout` | 只回答位置与尺寸，无业务分支 |
| 应用编排 | `shell/orchestration` | 持应用级状态（URL、选中会话、对话框栈、键盘作用域） |
| 特性实现 | `features/<slice>` | 有自己的数据、用例、store |

装配方式二选一：

- **槽位（slot）**：布局固定、装配点唯一 → 传 ReactNode（`Layout` 的 `top/center/left/right`）
- **契约注册（spec）**：动态可插拔、触发点分散 → 传 spec 数组（`SettingsPanel` 的 `panels`）

不要给布局顺序做运行期注册表：那会把"谁先谁后"变成隐式副作用。

## 5. 预算与 god 迹象（机器判据）

| 判据 | 阈值 | 超了说明什么 |
|---|---|---|
| `shell/**` 单文件 | ≤200 行 | 壳又长出业务了 |
| `app/**` 单文件 | ≤100 行，且**不许** `useState/useEffect` | 逻辑没下沉（`app:no-logic`） |
| `features/**` 单文件 | ≤200 行 | 一个文件承担了多个视图 |
| 单文件 `useState/useReducer` | ≤4 | 状态归属错了，该进 store 或用例 |
| 单文件 `useEffect` | ≤3 | 副作用没被 hook 收口 |
| 单文件分支 | ≤15 | 多个视图挤在一个组件里 |
| 单文件 props | ≤8 | 在往下传不该传的东西 |

## 6. 命名

- 文件名 kebab-case（`mcp-settings-client.tsx`），语言包文件用 locale 码（`zh-CN.ts`）
- 组件 PascalCase 导出，hook `use-*.ts`，store `*-store.ts`
- 能力目录里不放 `index.tsx` 组件（会藏起真实组件名）

## 7. 怎么跑

```bash
node scripts/check-boundaries.mjs        # 6 条判据，违反即 exit 1
npx tsc -p tsconfig.json --noEmit        # 类型边界
npx vitest run src                       # 单测
npx next build                           # 运行期边界（node:fs 进浏览器 chunk 会在这里炸）
```

`next build` 那条不是可选项：C-G 试点里 6 个适配器被写进 web，直到 `next build`
报 `the chunking context does not support external modules (request: node:fs)` 才暴露。

## 8. 壳的三件基础设施（命令 / 对话框栈 / 表面目录）

| 设施 | 位置 | 解决什么问题 | 判据 |
|---|---|---|---|
| 命令注册表 | `shell/registry/commands.ts` | 快捷键散落在各组件 `onKeyDown` 里，同键不同面板行为不同，迁移必漏 | 同键同作用域冲突 → `findConflicts` 在单测里判红；输入框聚焦不抢键 |
| 对话框栈 | `shell/orchestration/dialog-stack.ts` | `settingsOpen`+`confirmOpen` 这类布尔会长成 2^n；Esc 该关一层还是全关说不清 | 同 id 再次打开 = 置顶；`pop` 只关顶层；`topDialog` 是唯一可见者 |
| 表面目录 | `shell/registry/surfaces.ts` | 保真快照能拍"差什么"，拍不到"我们本来打算有什么" | 目录里每个 `id` 必须在源码里有对应 `data-*` 挂点（`surfaces.test.ts`） |

用法：`useShellCommands([...])` 在装配点登记命令；弹窗开合走 `pushDialog`/`popDialog`；新增壳区域时**同时**改目录与 DOM 挂点。
