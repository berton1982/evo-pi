<!-- TODO-init-scaffold（由 state.mjs init 从 references/templates/frontend-arch.md 铺底）
     1. 逐节把占位符换成真实内容（不要留 <...>）
     2. 填完后删掉这段注释——留着的 TODO 就是没做完
-->

# 前端架构约定 — `<program>/arch/frontend.md`

> P2.5 门 `frontendArch` 检查：**8 个精确标题** + 整篇 ≥600 字 + `arch/rules.json#frontend`（`layers` ≥3、`stateClasses` ≥3 且每项有 `rule`/`forbidden`、`forbidden` ≥1 条、`budgets` 有正数、`doc` 指向本文件）。
>
> 为什么单独一份：后端已经有 Clean Architecture 的既有约束（`layerOrder`/`forbiddenEdges`），前端过去只有"用 shadcn、状态放 zustand"这种口头默契。这份文档把前端同样变成可判定的约定，供 D6/D10/D12 与 C5 质量门引用。

## 1. 分层与目录

| 层 | 目录 | 可以 import | 不许 import |
| --- | --- | --- | --- |
| ui（页面/路由） | `apps/web/app/**` | features、shared | 直接 import core adapters |
| features（能力 UI） | `apps/web/features/20261024-web-recal/**` | shared、core use-cases | 另一 feature 的内部文件 |
| shared（原语/工具） | `apps/web/shared/**` | 无（只能依赖第三方） | features、core |

规矩：**跨 feature 复用只能进 shared 并在此登记**；不允许 `features/a → features/b`。

## 2. 状态的分类与归属

| 类 | 存在哪 | 判据（什么时候必须归这一类） | 典型写错 |
| --- | --- | --- | --- |
| server | 服务端缓存（query 层） | 数据来自后端、需要失效与重取 | 拷进 store 再手动同步 |
| url | URL / search params | 可分享、刷新要还原 | 放 store 导致刷新丢失 |
| store | 客户端全局 store | 跨组件共享、非服务端派生 | 组件局部状态放全局 |
| local | 组件 `useState` | 只影响本组件渲染 | 提升到全局造成无谓重渲染 |

规矩：一个状态**只有一个持有者**，其余全部派生（D3/D12 会判）。

## 3. 数据获取与缓存

| 问题 | 约定 |
| --- | --- |
| 谁发起请求 | feature 的 hook 通过 core use-case，**组件不直接 fetch** |
| 在哪失效 | 写操作成功后按 key 精确失效，不做全局刷新 |
| loading 表达 | 首次加载 `isLoading`；重取 `isFetching`（两者不能混） |
| 取消 | 切换主体时取消在途请求（避免旧响应覆盖新状态） |

## 4. 三态与错误

三态必须分别建模：`loading` / `empty`（成功但无数据）/ `error`。
错误按"用户能不能修"分类：可重试（网络）/ 用户可修（输入非法、未授权）/ 需上报（未知）。

## 5. 组件与 props

- 容器组件（取数据、编排）与展示组件（只渲染）分开；展示组件不读 store。
- props 上限 6 个；超过就是"这个组件该拆"。
- 回调命名 `onXxx`，且**不许把 setter 往下传**（传语义化回调）。

## 6. 样式与 token

- 唯一来源是 `globals.css` 的 `--` 变量族；**禁止组件内写 hex/px 魔法值**。
- 断点集中在 `tailwind.config`（或等价物），不散落在组件里。
- pi-web 与 evo-pi 的 token 名差异在此登记映射（如 `bg-panel` → `--color-bg-panel`）。

## 7. 可访问性与键盘

- `role`/`aria-*` 由 shared 原语承担，页面层不手写（避免遗漏与不一致）。
- 焦点管理：打开浮层焦点进入、关闭回到触发器；Tab 顺序 = 视觉顺序。
- 快捷键必须有作用域（输入框内不触发），并在 `contracts/interaction.md` 登记。

## 8. 测试与预算

| 层 | 范围 | 判据 |
| --- | --- | --- |
| L1 单元 | 纯函数/算法（排序、解析、reducer） | 决策表每条规则一个用例 |
| L3 组件 | 三态与交互（headless 渲染 + a11y 锚点） | 无快照大图，只断言锚点 |
| L5 联调 | 真实后端（桩已替换） | `integration.md` 有证据 |

预算（写进 `rules.json#frontend.budgets`，由质量门判）：首屏可交互 < 2s；会话切换 < 300ms；流式更新不掉帧。
