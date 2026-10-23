# 实施计划 — C-G / `McpConfig.tsx`

> 任务级计划：一个任务一个可验证进展，必须绑到设计元素、行为与验收命令。
> 校验：`check-trace.mjs --run .evo/migration/20261022-C-G-mcp`

| 任务 | 内容 | 设计元素 | 行为 | 验收命令 | 测试 ID |
|---|---|---|---|---|---|
| T-01 | 域文案与分组函数 | D-S-01 | B-006 | `npx --no-install vitest run packages/core/src/mcp/domain` | T-01 |
| T-02 | 状态文案与失败文案 | D-U-01 | B-008 | `npx --no-install vitest run packages/core/src/mcp/domain` | T-02 |
| T-03 | 动作失败分类 | D-U-02 | B-012 | `npx --no-install vitest run packages/core/src/mcp/domain` | T-03 |
| T-04 | 端口定义与桩 | P-S-01 | B-001 | `npx --no-install vitest run packages/core/src/mcp/ports` | T-04 |
| T-05 | load-overview 用例 | D-B-01 | B-002 | `npx --no-install vitest run packages/core/src/mcp` | T-05 |
| T-06 | 后到响应丢弃 | D-B-01 | B-003 | `npx --no-install vitest run packages/core/src/mcp` | T-06 |
| T-07 | toggle 用例与回滚 | D-B-03 | B-011 | `npx --no-install vitest run packages/core/src/mcp` | T-07 |
| T-08 | 批量用例逐条记账 | D-B-04 | B-020 | `npx --no-install vitest run packages/core/src/mcp` | T-08 |
| T-09 | 测试用例按 key 去重 | D-B-02 | B-030 | `npx --no-install vitest run packages/core/src/mcp` | T-09 |
| T-10 | 签到用例与轮询 | D-B-05 | B-028 | `npx --no-install vitest run packages/core/src/mcp` | T-10 |
| T-12 | useMcpOverview | D-U-03 | B-004 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-12 |
| T-13 | useMcpActions | D-U-03 | B-017 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-13 |
| T-14 | 容器组件 | D-U-03 | B-001 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-14 |
| T-15 | 展示组件与分组列表 | D-U-04 | B-007 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-15 |
| T-16 | 列表与组头 | D-U-05 | B-019 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-16 |
| T-17 | 服务器详情 | D-U-06 | B-015 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-17 |
| T-18 | 测试状态视图 | D-U-07 | B-030 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-18 |
| T-19 | 状态行无障碍 | D-U-08 | B-031 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-19 |
| T-21 | 端到端：加载与降级 | D-B-01 | B-001 | `npx --no-install playwright test e2e/mcp` | T-21 |
| T-22 | 端到端：签到轮询 | D-B-05 | B-027 | `npx --no-install playwright test e2e/mcp` | T-22 |
| T-23 | 空态与添加入口 | D-U-05 | B-005 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-23 |
| T-24 | 选中项持久化 | D-U-06 | B-009 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-24 |
| T-25 | 选中项跨刷新 | D-U-06 | B-010 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-25 |
| T-26 | 信任请求与重试 | D-B-04 | B-013 | `npx --no-install vitest run packages/core/src/mcp` | T-26 |
| T-27 | 项目内覆盖开关 | D-U-06 | B-014 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-27 |
| T-28 | 添加草稿保护 | D-U-06 | B-016 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-28 |
| T-29 | 撤销条到期清理 | D-U-03 | B-018 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-29 |
| T-30 | 密码变量跳过 | D-B-04 | B-021 | `npx --no-install vitest run packages/core/src/mcp` | T-30 |
| T-31 | 信任后重试原动作 | D-B-04 | B-022 | `npx --no-install vitest run packages/core/src/mcp` | T-31 |
| T-34 | 发起签到 | D-B-05 | B-027 | `npx --no-install vitest run packages/core/src/mcp` | T-34 |
| T-35 | 取消签到 | D-B-05 | B-029 | `npx --no-install vitest run packages/core/src/mcp` | T-35 |
| T-36 | 移除与撤销 | D-U-06 | B-017 | `npx --no-install vitest run packages/web/src/features/mcp packages/core/src/mcp` | T-36 |
| T-37 | 移除一个 server（用例 + 详情按钮 + DELETE 路由） | D-B-07 / D-U-07 | B-032 | `npx --no-install vitest run packages/core/src/mcp/use-cases/remove-server.test.ts packages/web/src` | T-37 |
