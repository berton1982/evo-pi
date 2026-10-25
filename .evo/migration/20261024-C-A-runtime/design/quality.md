# 质量预算与测试策略（C-A）

## 预算（机器可核对）

| 维度 | 上限 | 现状 | 判据 |
|---|---|---|---|
| 单文件行数 | 400 | 待测（C5） | `check-boundaries` / `reviewkit` |
| 单函数行数 | 60 | 待测 | `reviewkit` |
| 控制流嵌套 | 4 | 待测 | `reviewkit` |
| `useState` 数 | 0（本能力无组件） | 0 | `reviewkit` |
| 参数个数 | 5 | 待测 | `reviewkit` |
| `any` | 0 | 待测 | `biome` + `reviewkit` |

## 测试策略（五层，各挡什么错）

| 层 | 写在哪 | 挡什么错 | 不挡什么 |
|---|---|---|---|
| L1 领域纯函数 | `packages/core/src/agent/domain/*.test.ts` | 归约错误、乱序保护、通知溢出 | IO 行为 |
| L2 用例 + 假端口 | `packages/core/src/agent/use-cases/*.test.ts` | 准入串行、命令分发、失败分支 | 真实传输 |
| L3 适配器 | `packages/core/src/agent/adapters/*.test.ts` | 帧解析、错误码映射 | 服务端真实行为 |
| L4 端到端 | `e2e/c-a-runtime/*.spec.ts` | 冻结契约（wire v0.3）与真实进程协作 | 竞态的极端时序 |
| L5 手工 | 人工 | 长会话下的可用性 | 回归 |

## 三态（读会话）

| 面 | loading | empty | error |
|---|---|---|---|
| readSession | 读盘中（保留上一份内容，不闪空） | 会话为空（显示"还没有消息"） | 读失败要给出路径与原因 |
