<!-- markdownlint-disable MD024 MD040 MD022 MD031 MD032 MD012 MD037 -->

# ADR 0004：状态管理策略（zustand + tanstack-query）

**状态**：已接受
## **日期**：2026-10-04
---

## 背景

pi-web 当前**完全缺乏统一的状态管理抽象**：
- 50+ `useState` 散落在 god components
- 18-22 个 props drilling（AppShell → ChatWindow / SessionSidebar）
- 命令式 Ref 通信（`branchLeafChangeFnRef`, `systemInfoLoaderRef`）
- 数据获取 3 通道（polling 2.5s + fetch on-demand + SSE）手工协调
- `runningPollAuthoritativeRef` 等手工 race condition 防御

## 决策

引入 **zustand（UI 状态）** + **@tanstack/react-query（服务端状态）** + **zod（运行时校验）** 三层抽象：

### 分层规则

| 状态类型 | 用什么 | 例 |
|---|---|---|
| **跨页面 UI 状态** | zustand store | sidebar 宽度、right panel 开关、active session、locale、theme |
| **服务端状态**（server 是真值源）| @tanstack/react-query | session 列表、agent running、model 目录 |
| **流式状态**（SSE 双向）| 自研 streamReducer | agent streaming messages（保留）|
| **组件局部状态** | useState | dropdown open、input value |
| **持久化偏好** | zustand persist middleware | theme、locale、quoteSelectionEnabled |

### 关键约束

1. **zustand 不放服务端数据** —— 避免双源真相（server vs cache）
2. **tanstack-query 不放 UI 偏好** —— 避免 query cache 污染
3. **SSE 保留自研** —— tanstack-query 不适合双向长连接
4. **zod 在 API 边界** —— 任何外部数据进入 domain 前必须 parse

### zod 使用模式

| 位置 | 用途 | 例 |
|---|---|---|
| **`app/api/*/route.ts`** 边界 | parse 外部响应 | `const data = SessionInfoSchema.parse(await res.json())` |
| **`adapters/`** 层入口 | parse SDK 响应 | `const model = ModelSchema.parse(sdkModel)` |
| **持久化恢复** | validate localStorage 反序列化 | `const prefs = PrefsSchema.parse(JSON.parse(raw))` |

**为什么不是手写类型守卫**：
- pi-coding-agent SDK 内部已用 zod（zod-to-ts 生成类型）—— **单一真值源**
- 编译时类型 + 运行时校验**同源**——避免手写两份
- 替代 18+ `as` 类型断言 + 防止 SDK 版本漂移

### 虚拟化分工（与 ADR 0005 配合）

| 场景 | 库 | 原因 |
|---|---|---|
| **固定行高列表**（SessionSidebar 54px）| `@tanstack/react-virtual` | 通用、轻量 |
| **聊天 / feed**（ChatWindow 变高 + 反向）| `react-virtuoso` | 场景原生，~700 行自研代码替换 |
| **拖拽面板**（AppShell / SessionSidebar 分割）| `react-resizable-panels` | 替换 291 行 `useResizablePanel` |

---

## 备选方案

### A. Redux Toolkit + RTK Query

**否定**：
- 4 KB（zustand）vs 10+ KB（Redux Toolkit）
- Provider 包裹（zustand 无）
- 模板代码多
- RTK Query 与 tanstack-query 功能重叠

### B. Jotai（原子化状态）

**否定**：原子化适合复杂派生状态；evo-pi 状态大多是简单 select/useStore，无需原子。

### C. SWR

**否定**：与 tanstack-query 功能重叠；tanstack-query 生态更完整（React Query → TanStack Query）。

### D. 全部 zustand（不分层）

**否定**：服务端数据走 zustand 需要手写 polling + cache + 失效逻辑——重复造轮子


## 影响

| 维度 | 影响 |
|---|---|
| **包大小** | +18 KB（zustand 4 + react-query 14）|
| **god component** | 50+ useState → 5-10 个 zustand stores |
| **API 路由** | 从 `lib/` 函数调用 → `useQuery({ queryKey, queryFn })` |
| **polling** | 3 通道并行 → `useQuery({ refetchInterval: 2_500 })` |
| **race condition** | `runningPollAuthoritativeRef` → query key + staleTime |

---

## 何时重新评估

- 当 zustand stores > 15 个时（考虑拆分或迁移到 Redux Toolkit）
- 当 server state 出现高频 mutation（考虑引入 websocket-based subscription）

## History

- **2026-10-04**：提议（zustand + tanstack-query + zod 三层状态管理抽象）
- **2026-10-06**：已接受

## 安装位置

所有本 ADR 引入的库安装到 **`packages/web/package.json`**（Phase 0 创建时）：

```jsonc
// packages/web/package.json
{
  "dependencies": {
    "zustand": "^5.0.1",
    "@tanstack/react-query": "^5.59.0",
    "@tanstack/react-virtual": "^3.10.0",
    "react-virtuoso": "^4.10.0",
    "zod": "^3.23.0"
  }
}
```

**根 `package.json` 不放**——仅 monorepo 编排（per ADR 0001）。
