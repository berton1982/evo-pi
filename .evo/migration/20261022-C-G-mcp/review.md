# C-G（MCP 设置）代码评审

> 12 项固定清单（`reviewkit` 会自己量落点文件，量出来的超限必须在对应项写 fix 并点名文件）。
> 度量口径：25 个落点文件、阈值 文件 400 / 函数 60 / useState 4 / useEffect 3 / 嵌套 4 / any 0。

## 检查清单

| 检查项 | 结论 | 证据 |
|---|---|---|
| 单一职责 | fix | `packages/web/src/features/mcp/mcp-panel-view.tsx:44` 原来一个 65 行函数混了"三态渲染 + 列表 + 详情 + 空态"，已拆出 `PanelNotice` 与 `DetailSlot`；壳只拼装 |
| 文件体量 | pass | 最大 `packages/web/src/features/mcp/mcp-server-list.tsx:1`（151 行，阈值 400）；25 个落点平均 78 行 |
| 函数体量 | fix | `packages/web/src/features/mcp/use-mcp-sign-in.ts:44` 78 行工厂拆成 `createPollOnce` / `createScheduler` / `createActions`，最长 35 行；`mcp-server-list.tsx:104` 抽出 `McpServerRow`（62 → 37 行） |
| 嵌套深度 | fix | `packages/web/src/features/mcp/mcp-server-list.tsx:63` 一层 map 里嵌 section/header/ul/li/input/button，控制流嵌套 3 层、JSX 7 层；抽 `McpServerRow` + `McpGroupToggle` 后为 1 层 |
| 参数与 props | pass | `McpPanelView` 14 个 props 分三组读（三态 / 列表 / 详情），没有把 setter 往下传 |
| 依赖方向 | pass | 能力只 import `@evo-pi/core/mcp` 包导出；`placement` 门报 `18/18 个元素落点都在已声明层里`，客户端文件无 `node:*`、无 `@evo-pi/core/src/**` |
| 错误处理 | pass | 适配器把非 2xx 转 `ApiError`；用例一律返回 `Outcome` 结果对象（`packages/core/src/mcp/domain/mcp-types.ts:18`），不抛业务错误 |
| 命名与注释 | pass | `use-mcp-sign-in.ts:60` 注释写"为什么抽出来"（两种 bug 会互相掩盖），不是"做了什么"；`any` 计数 0 |
| 测试覆盖 | fix | `packages/core/src/mcp/use-cases/actions.test.ts:41` 补"部分成功不回滚已成功项"用例；`use-mcp-sign-in.ts` 重构后由 `use-mcp-sign-in.test.ts:88` 的轮次号用例覆盖 |
| 可访问性与交互态 | pass | `mcp-server-list.tsx:120` 用 `aria-pressed` / `aria-current`，开关是原生 `input[type=checkbox]`；三态（loading/empty/error）各有 testid 与 role |
| 副作用与竞态 | pass | 加载走 `createLatestOnly`（旧响应丢弃）；签到轮次号比对在 `use-mcp-sign-in.ts:96`；卸载只停轮询不发 DELETE |
| 死代码与重复 | fix | `packages/web/src/features/mcp/use-mcp-actions.ts:44` 删掉 Code mode 的 `saveBudget` 与整套端口/用例/路由，`cut-list.md` 记 1 处砍单 |

## 结论

- 本轮 5 项 fix 全部在同一切片内关闭：`reviewkit` 复跑 **0 个文件超限**（25 个落点）。
- 未关闭项：0。
- 剩余已知偏差（不在本清单范围，属人工仲裁）：与 pi-web 的布局保真度仍有差距（用户 m04806 已记录"后期再调整"）。

## 双轴补充

- **Standards**：与 `packages/web/ARCHITECTURE.md` 一致（壳不 import 能力、能力不互相 import、装配只在 `app/**`）；`packages/web/scripts/check-boundaries.mjs` 94 文件全绿。
- **Spec**：`spec.md` 6 条用户故事全部有对应行为；`parity.md` 27 条逐条对账（18 条 `一致`、9 条 `blocked` 带解除条件）。
