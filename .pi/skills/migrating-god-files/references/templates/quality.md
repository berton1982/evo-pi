# 质量预算与测试策略 — `<capability>/design/quality.md`

> 这份文件同时给开发和测试看：**预算**告诉开发别写超，**测试策略**告诉测试在哪一层下手、每层挡什么错。
> 机器判据：D9（预算必须是数字，且不许出现模糊词）、C5 的 `lines landed`（代码里要留 `@design <元素ID>`）。

## 1. 预算（全给数字，不给形容词）

| 项 | 数字 | 谁来验 |
|---|---|---|
| 单文件行数 | 400 | `arch/rules.json#maxFileLines` |
| 单元素行数 | 容器 ≤400 / 展示 ≤220 / 纯函数 ≤120 | review |
| props 数量 | ≤6 | review |
| 圈复杂度 | ≤12 | lint |
| 首屏 | ≤2000ms | harness 快照 |
| 交互响应 | ≤300ms | harness 快照 |

## 2. 测试策略（每层挡什么错）

| 层 | 写在哪 | 挡什么错 | 不挡什么 |
|---|---|---|---|
| L1 域函数（纯） | `packages/core/src/<cap>/domain/*.test.ts` | 排序/合并/解析算错 | 渲染、请求 |
| L2 用例 | `packages/core/src/<cap>/use-cases/*.test.ts` | 端口调用参数、错误映射 | 真实网络 |
| L3 组件 | `packages/web/src/<cap>/ui/*.test.tsx` | props → 渲染、交互回调 | 真实后端 |
| L4 端到端 | `e2e/<cap>/*.spec.ts` | 真实链路、快照对比 | 极端并发 |
| L5 手工 | 验收清单 | 手感、动画、可访问性 | —— |

## 3. 三态清单

每个数据面都要有 loading / error / empty，且三者互斥。缺哪个就在这里点名，C6 会逐条对账。

| 数据面 | loading | error | empty |
|---|---|---|---|
| | | | |
