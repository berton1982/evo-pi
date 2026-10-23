# 质量预算与测试策略 — C-G / `McpConfig.tsx`

> 校验：`design-gate.mjs --run .evo/migration/20261022-C-G-mcp --design-only`（D9 预算非空、D18 实践落地）；C5 由 `check-lines --mode landed` 与 `quality` 门继续盯。

## 1. 预算（数字，进 C5 门）

| 项 | 上限 | 现状（pi-web 2258 行 → evo-pi 目标） |
|---|---|---|
| 单文件行数 | 400（presenter 250） | 容器 C-01 预算 380 行；C-03 210 行；C-04 240 行 |
| 圈复杂度 | 12 | `McpConfig` 原文件的 `render` 分支按 §3 拆到 6 个组件后每个 ≤12 |
| props 个数 | 6 | C-04 有 5 个；C-03 有 3 个 |
| 每组件 hook 数 | 4 | C-01 用 3 个（H-01/H-02/H-03） |
| 首屏 import 体积 | 不超过 `McpPanel` 之外再引入 Code mode 面板 | C-06 走 `dynamic import` |
| 一次加载的请求数 | 1（GET /api/mcp） | 测试只在用户点按时发起 |

## 2. 五层测试策略

| 层 | 写在哪 | 挡什么错 | 不挡什么 |
|---|---|---|---|
| L1 域函数 | `packages/core/src/mcp/domain/*.test.ts` | 文案映射、分组排序、`displayPath` 边界 | 组件渲染、HTTP 形状 |
| L2 用例 | `packages/core/src/mcp/application/*.test.ts` | 降级语义、按 key 去重、字段级幂等、部分成功记账 | DOM 事件、真实网络 |
| L3 组件 | `packages/web/src/capabilities/mcp/*.test.tsx` | 三态渲染、aria 状态、键盘可达、props 边界 | 服务端行为 |
| L4 e2e（headless） | `e2e/mcp/*.spec.ts`（对应 `harness/registry.json` 的 s-001…s-030） | 端到端链路：切换目录重载、测试冒烟、签到轮询 | 视觉细节、文案全量 |
| L5 手工 | `acceptance.md` 的 L6 行 | 视觉与交互手感、真实 provider 环境的签到 | 回归细节（交 L4） |

## 3. 关键路径的三态

| 路径 | 加载 | 空 | 错误 |
|---|---|---|---|
| 服务器清单 | 骨架占位（保持布局高度） | "还没有添加服务器" + 添加入口 | 降级卡片：错误码 + 重试 + 保留上一次清单 |
| 单条测试 | 状态行 `aria-busy` + 计时 | 未测试（中性文案） | `aria-invalid` + 失败原因 + 重试 |
| 签到 | "等待浏览器完成授权" + 取消按钮 | 不适用（必须从某台服务器发起） | 失败原因 + 重新发起 |
| Code mode 保存 | 输入禁用 + 保存按钮 loading | 不适用 | 该字段下方内联错误，另一字段不受影响 |
