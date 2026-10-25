# 质量预算与测试策略 — C-C 会话面

## 1. 预算

| 项 | 上限 | 依据 |
|---|---|---|
| 单文件行数 | 400 | `arch/rules.json#maxFileLines` |
| 单函数行数 | 60 | reviewkit 阈值 |
| 组件 props | 6 | reviewkit 阈值 |
| useState/文件 | 4 | 超过说明状态该进 store |

## 2. 五层测试策略

| 层 | 写在哪 | 挡什么错 | 不挡什么 |
|---|---|---|---|
| L1 纯函数 | `packages/core/src/chat/domain/*.test.ts` | 最终回答判定、patch 解析、requestId 丢弃 | UI 是否真的渲染 |
| L2 用例 | `packages/core/src/chat/use-cases/*.test.ts` | 发送幂等、中断保留内容、压缩可取消 | 滚动与布局 |
| L3 组件 | `packages/web/src/features/chat/*.test.tsx` | 三态、时间戳去重、复制反馈 | 真实 agent 行为 |
| L4 e2e | `e2e/chat/s-0xx.spec.ts`（46 条） | 两条渲染路径一致、工具/diff 端到端 | 像素级外观 |
| L5 手工 | L6 验收清单 | 长会话滚动手感、真实模型输出可读性 | 回归自动化 |

## 3. 三态与无障碍

| 边界 | 加载中 | 空 | 错误 |
|---|---|---|---|
| 消息列表 | 骨架 | 空态引导 | 错误 + 重试 |
| 流式 | 光标/占位 | 不渲染节点 | 降级完整消息并标错 |
| 历史分页 | 底部 loading | 隐藏入口 | 保留内容 + 可重试 |
| 工具调用 | spinner + 参数摘要 | 不渲染 | 错误原文 + 参数 |
