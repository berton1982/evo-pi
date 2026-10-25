# C-A 代理运行时迁移计划

> 四个源文件 7,669 行 → 6 个模块。任务列必须是纯 `T-xx`（`check-trace` 按它对齐）。

| 任务 | 内容 | 设计元素 | 行为 | 验收命令 | 测试 ID |
| --- | --- | --- | --- | --- | --- |
| T-01 | 领域纯函数：消息键、会话状态机、会话状态类型 | D-B-05,D-U-11,D-U-16 | B-033,B-034,B-035,B-036,B-037,B-038 | npx --no-install vitest run packages/core/src/agent/domain | T-01 |
| T-02 | 四个端口契约（传输/会话读/MCP 运行时/子代理档案） | P-A-01,P-A-02,P-A-03,P-A-04 | — | npx --no-install vitest run packages/core/src/agent | T-02 |
| T-03 | 命令分发、事件归约、串行准入、single-flight 读会话、MCP 准备、档案读写 | D-B-01,D-B-06,D-U-06,D-U-12 | B-001,B-002,B-003,B-004,B-005,B-006,B-007,B-008,B-009,B-010,B-011,B-012,B-013,B-014,B-015,B-016,B-017,B-018,B-019,B-020,B-021,B-022,B-023,B-024,B-027,B-039,B-040,B-041,B-042,B-043,B-044 | npx --no-install vitest run packages/core/src/agent/use-cases | T-03 |
| T-04 | 会话编排：初值/飞行中/新会话/扩展 UI/发送/压缩/流式/滚动意图 | D-B-02,D-B-03,D-B-04,D-U-01,D-U-02,D-U-03,D-U-04,D-U-05,D-U-07,D-U-08,D-U-09,D-U-10,D-U-13,D-U-14,D-U-15 | B-001,B-022,B-025,B-026,B-028,B-029,B-030,B-031,B-032 | npx --no-install vitest run packages/core/src/agent/use-cases | T-04 |
| T-05 | MCP Host 与子代理档案的落盘实现 | D-A-01,D-A-02,D-A-03,D-M-01,D-M-03,D-M-04 | — | npx --no-install vitest run packages/core/src/agent/infrastructure | T-05 |
| T-06 | HTTP/SSE 传输与子代理存储适配器 | D-A-04,D-M-02 | — | npx --no-install vitest run packages/core/src/agent/adapters | T-06 |
| T-07 | 端到端：命令往返（prompt → 事件流 → 会话落盘） | D-B-01,D-B-02 | B-001,B-002 | npx playwright test e2e/agent | T-07 |
| T-08 | 端到端：MCP 准备失败降级 + 子代理档案读写 | D-B-05,D-B-06 | B-020,B-021 | npx playwright test e2e/agent | T-08 |
