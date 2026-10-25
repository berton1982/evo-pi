# 能力立项 — C-G MCP（`McpConfig.tsx`）

## 1. 范围

| 项 | 内容 |
|---|---|
| 能力 | C-G MCP（`CAPABILITIES.md` 第 C-G 行） |
| R 级 | **R2**（2,258 行；数据 + 复杂界面 + 多次异步动作） |
| god 文件 | `ref_projects/pi-web/components/McpConfig.tsx` |
| 指纹 | sha1 `f739593`，**2258 行** |
| 同能力其他 god | `mcp-config-helpers.ts`（R1，1515 行）、`mcp-import-core.ts`（R1，1229 行）——本 run 只做 `McpConfig.tsx`，另两个另开 run |
| 用户可见结果 | 设置页 MCP 面板：看服务器列表与状态、开关/移除/登出、逐个测试、添加、codemode 模式与内联预算、分组批量操作与撤销 |

## 2. 基线指纹

| 项 | 值 |
|---|---|
| 文件 | `ref_projects/pi-web/components/McpConfig.tsx` |
| sha1（前 7 位） | `f739593` |
| 行数 | **2258** |
| 顶层函数 | 24 个（2 个导出的容器/presenter + 22 个内部组件与纯函数） |
| `useState` 调用 | 20 处（容器 `McpConfig` 内 19 处 + `McpConfigView` 1 处） |
| 直接 `fetch` | **0 处**（全部经 `@/lib/api-types` 的类型化调用与上层 props） |
| i18n 键引用 | 93 处，全部在 `mcp.` 命名空间 |
| 共享原语 | 20 个 `Config*`（来自 `@/components/config/*`） |

## 3. 不做清单（本能力范围外）

1. **不做 MCP 协议实现**（stdio/SSE 客户端、工具调用）——在 `@earendil-works/pi-coding-agent` 里，本能力只消费它。
2. **不做 `mcp.json` 的读写细节**——`mcp-import-core.ts` / core 的 mcp-host 负责；本能力只调端口。
3. **不做设置页的框架**（侧栏、路由、tab 容器）——那是底盘 H1/H2。
4. **不做 20 个 `Config*` 原语的改造**——底盘 H1 的共享原语，本能力只消费。
5. **不迁 `McpConfigView` 的旧 props 形状**——按 C4 的组件设计重写，旧形状只作为行为证据。

## 3. 验收门（本能力"做完了"的定义）

| 门 | 判据 | 谁签 |
|---|---|---|
| C1 结构对账 | 2258 行区间无缝、符号全集（tsserver 采集 + meta）全部对账、表面点全部认领 | 机器 |
| C2 契约对齐 | 用到的命令/事件/i18n/token 全在 program 契约里，或提 CHG | 机器 |
| C3 行为规格 | 每条行为带 `path:line` 证据 + 脚本 ID，双向绑定零孤儿 | 机器 |
| C4 设计 | D1–D18 全绿；`plans/*.md` 任务可追踪 | 机器 + 用户签字 |
| C5 实现 | `lines landed`：每个特性文件带 `@design`；`quality` 预算不超；单测/组件测绿 | 机器 + review.md 双轴 |
| C6 行为对账 | 18 条以上行为脚本通过（L4）；parity 一致 | 机器 |
| C7 收割 | 回灌清单核对、`godStatus` 更新、`acceptance.md` L6 由人签 | **人** |

## 4. 已知风险

| 风险 | 为什么是风险 | 应对 |
|---|---|---|
| 20+ 个 `useState` 挤在容器里 | 容器 `McpConfig`（L295–L831）约 537 行，19 个 state，直接照搬会把"大组件"搬成"大 hook" | C4 按"一次交互一组状态"切 store，用状态图定生命周期 |
| 异步动作多且并发（测试、登出、签到、批量、加载） | 源码有 `requestRef`/`controllerRef`/`testRequestsRef`/`signInsRef` 四套并发控制，容易在迁移中丢语义 | `dynamics.md` 逐条画"取消与竞态"，行为表逐条给证据 |
| 轮询签到流程 | `pollRound` + 定时器，迁到 evo-pi 后定时器生命周期容易错 | 单独一条行为 + 一个 store，状态图上标 `polling` 超时退出 |
| `mcp-config-helpers.ts`（1515 行）未迁 | 本能力依赖它的 `mcpVariableChips`/`mcpServerTarget` 等纯函数 | C4 把依赖项列为"外部前置"，C5 先做纯函数再接线 |
| 2258 行 / 表面点多 | 工件体量可能到 3000+ 行 | `volume` 门守 5000 行上限；文档只交三份（components/dynamics/quality） |

## 渲染边界

| 区域 | 宿主 | 说明 |
|---|---|---|
| 设置弹窗的 MCP 分区本体 | self | 本能力唯一拥有的一屏（工具栏 / 列表 / 详情 / 状态行 / 空态表单） |
| 设置弹窗的壳（标题、分区导航、关闭） | shell | evo-pi 的 `SettingsPanel`，不归本能力 |
| 左侧区、顶栏 | other:C-B | 会话编排的 chrome；`ui.md` 只标位置，不画入口 |
