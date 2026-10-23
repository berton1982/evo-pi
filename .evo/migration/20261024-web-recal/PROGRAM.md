# 纲领：既有代码校准（web 范式归位）

> 这个 run 不迁移新文件，它要修的是"迁移过程中积累的债"。
> 每条债都必须**有判据**，写不出判据的债不进本纲领（它属于"想做但还没定义"）。

## 1. 成功定义

1. `/` 直接渲染壳（不是 `redirect('/sessions')`）：入口形态与 pi-web 一致，选中态仍以 URL 为唯一事实源。
2. 壳对自己的表面点有量化覆盖率：P7 保真快照里 flow `shell` 的覆盖率 ≥70%。
3. 已迁能力（先 MCP）的 `ownership.md` / `symbol-map.md` / `design/manifest.json` 与**当前目录**完全一致：`lines`、`drift`、`placement` 三档全绿。
4. 纲领产物的目录引用不再陈旧：`ARCHITECTURE.md`/`CAPABILITIES.md` 里出现的路径全部在仓库存在（新增目录级引用检查）。
5. `extract-conventions` 重生成的 `arch/conventions.json` 与 `arch/rules.json#layerPaths` 一致（`conventions` 门）。

## 1.1 反面判据

- 只把 `redirect` 换成一行 `return <SessionsPage/>` 就算完 —— 那样 `/` 仍然是"另一个名字的 /sessions"，URL/选中态语义没定义。
- 用"我看了没问题"代替快照覆盖率。
- 为了过 `volume`/`budget` 把说明删掉而不是把债修掉。

## 2. 不做清单

- 不迁移新 god 文件（`SkillsConfig`/`SessionSidebar` 等仍留在原 run 之外，另行立项）。
- 不重做视觉设计（只对齐 pi-web 的**结构**与可及元素，不追像素）。
- 不改 `packages/core` 的领域模型（校准只动 web 壳与能力切片）。

## 3. 容量假设

| 项 | 假设 | 依据 |
|---|---|---|
| 每条债的修复 | 0.5–1.5 天 | MCP 那次"补 5 个缺口 + 保真到 77%"实测 1 天；本轮债更小 |
| D-1 + D-2（壳） | 0.5 天 | 壳已是 125/53/78/94 行的小文件，只缺入口形态与快照 |
| D-3（MCP 校准） | 1 天 | 枚举与对账都有脚本，主要成本是人工复核 ownership |
| D-4 + D-5 | 0.5 天 | 重新生成 + 改文档引用 |
| 全部五条 | 2–3 天 | 无并行，单 agent + 用户签 L6 |

## 4. 五条债（各自绑判据）

| # | 债 | 现状证据 | 判据（机器可查） |
|---|---|---|---|
| D-1 | 首页被重定向 | `packages/web/src/app/page.tsx` = `redirect('/sessions')`（11 行） | 新门 `shellMount`：根路由必须渲染壳，不得只做 redirect |
| D-2 | 壳缺表面点覆盖率 | 无任何度量 | `fidelity` flow `shell` ≥70% + 未对齐项登记 |
| D-3 | 已迁能力基线陈旧 | `20261022-C-G-mcp` 的 ownership/symbol-map 基于重构前路径 | `check-phase --phase C1` 三档 + `drift`/`placement` |
| D-4 | 纲领产物目录引用陈旧 | `20261022-mig/ARCHITECTURE.md`、`CAPABILITIES.md` 写 `components/mcp/` | 新增 `stalePaths` 门：`.evo/**/*.md` 里 `packages/**` 路径必须存在 |
| D-5 | 分层事实过期 | `20261022-mig/arch/conventions.json` 生成于 web 重构前 | `extract-conventions` 重生成 + `conventions` 门 |

## 5. 里程碑

- M0：D-1 + D-2 的壳基线（`/` 渲染壳、快照拍一次）
- M1：D-4 + D-5（纲领产物与事实源回写）
- M2：D-3 用 MCP 做样板，跑通"校准套路"
- M3：把套路套到 sessions/files/sidebar/chat
