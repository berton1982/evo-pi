# 端到端链路 3：MCP 生命周期与子代理档案

### 端到端链路

| 步骤 | 发生什么 | 代码位置 | 可观察结果 |
|---|---|---|---|---|
| 1 | prompt 前准备 MCP | `lib/mcp-host.ts:668` `prepareForPrompt` | 可选等待连接；超时带警告继续，不阻塞发送 | `lib/mcp-host.ts:668` |
| 2 | 未受信任项目的条目被剔除 | `lib/mcp-host.ts:145` | 运行时配置里看不到该项目的 server | `lib/mcp-host.ts:145` |
| 3 | codemode 不可用时降级 exposure | `lib/mcp-host.ts:180` | 该 server 仍连接但工具不可见 | `lib/subagents.ts:486` |
| 4 | 连接监视只回调一次 | `lib/mcp-host.ts:219` | ready/closed 各触发一次，重连不会刷屏 | `lib/subagents.ts:529` |
| 5 | 子代理档案按 用户 < 项目 合并 | `lib/subagents.ts:486` | 项目同名档案覆盖用户档案 | `lib/mcp-host.ts:668` |
| 6 | 保存/删除档案 | `lib/subagents.ts:529` / `:627` | 文件名取名字且拒绝路径穿越；删不存在的名字不报错 | `lib/mcp-host.ts:145` |

### 决策表

| 决策 | 取值 | 被否方案 | 若判错的代价 | 证据 |
|---|---|---|---|---|
| MCP 等待策略 | 可配置等待，超时降级 | 无限等 | 一个坏 server 让整个会话发不出消息 | `lib/subagents.ts:486` |
| 受信任判定 | 以 `trust.json` 为准 | 以"目录里有配置"为准 | 未审代码的 server 自动获得执行权 | `lib/subagents.ts:529` |
| exposure 降级 | codemode 不可用则工具隐藏 | 保留调用入口 | 用户点了必然失败，且错误信息误导 | `lib/mcp-host.ts:668` |
| 档案合并 | 项目覆盖用户（同名） | 用户优先 | 项目里写的代理被全局同名覆盖，行为不可预期 | `lib/mcp-host.ts:145` |

### 落点

| 单元 | 文件 | 说明 |
|---|---|---|
| MCP 准备 | `packages/core/src/mcp/use-cases/prepare-for-prompt.ts` | 复用 C-G 的端口，不重写协议 |
| 信任判定 | `packages/core/src/mcp/domain/trust.ts` | 与 `project-trust` 端口一致 |
| 子代理档案 | `packages/core/src/agents/use-cases/profile-store.ts` | 读写走端口 |


### 测试

测试 ID：`T-03`（C5 落地，C6 对账时校验存在性）。
