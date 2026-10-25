# C-C 实施计划（任务级）

| 任务 | 内容 | 设计元素 | 行为 | 验收命令 | 测试 ID |
|---|---|---|---|---|---|
|T-01|域：最终回答判定 + 消息块判别|D-U-03, D-B-04|B-007、B-008、B-037、B-038|`npx --no-install vitest run packages/core/src/chat/domain`|T-01|
|T-02|域：patch 解析与降级|D-U-15, D-B-05|B-028、B-031|`npx --no-install vitest run packages/core/src/chat/domain`|T-05|
|T-03|用例：发送一轮（幂等 + 运行态守卫）|D-B-01|B-009|`npx --no-install vitest run packages/core/src/chat/use-cases`|T-01|
|T-04|用例：中断与压缩|D-B-02, D-B-03|B-010、B-014|`npx --no-install vitest run packages/core/src/chat/use-cases`|T-02|
|T-05|组件：ChatSurface + 滚动 hook|D-U-05, H-01|B-002、B-003、B-004、B-005、B-006、B-042、B-043、B-054、B-055、B-056、B-057|`npx --no-install vitest run packages/web/src/features/chat`|T-03|
|T-06|组件：流式节点|D-U-08, H-02|B-045|`npx --no-install vitest run packages/web/src/features/chat`|T-03|
|T-07|组件：消息与工具块|D-U-10, D-U-11, D-U-13|B-028、B-029、B-030、B-032、B-033、B-034、B-035、B-039、B-041、B-044|`npx --no-install vitest run packages/web/src/features/chat`|T-04|
|T-08|组件：diff 渲染|D-U-14, C-05|B-031|`npx --no-install vitest run packages/web/src/features/chat`|T-05|
|T-09|组件：输入工具条 12 控件|D-U-06, H-03|B-009、B-010、B-011、B-012、B-013、B-014、B-015、B-016、B-017、B-018、B-019、B-020、B-023、B-024、B-047、B-048、B-049、B-050、B-051、B-052、B-053|`npx --no-install vitest run packages/web/src/features/chat`|T-06|
|T-10|通知与容错|D-U-07|B-021、B-022|`npx --no-install vitest run packages/web/src/features/chat`|T-07|
|T-11|扩展 UI 边界提示|D-U-07|B-021、B-022、B-024|`npx --no-install vitest run packages/web/src/features/chat`|T-07|
|T-12|e2e：46 条脚本落地|D-U-05|B-001、B-002、B-003、B-004、B-005、B-006、B-042、B-043、B-054、B-055、B-056、B-057|`npx --no-install playwright test e2e/chat`|T-08|
|T-13|域：共享类型与常量（`MessageBlock` 判别联合、展示常量）|D-S-01, D-S-02|B-025、B-039、B-046|`npx --no-install vitest run packages/core/src/chat/domain`|T-01|
|T-14|域：更新提示文案（app-update 横幅）|D-U-02|B-001|`npx --no-install vitest run packages/core/src/chat/domain`|T-01|
|T-15|域：工具块视图与通知条模型|D-U-09, D-U-12|B-026、B-027、B-036、B-040|`npx --no-install vitest run packages/core/src/chat/domain`|T-05|
|T-16|用例：扩展 UI 边界提示|D-B-06|B-035|`npx --no-install vitest run packages/core/src/chat/use-cases`|T-02|
|T-17|端口：传输 / 会话读 / 打开文件 / 剪贴板（契约测试）|P-C-01, P-C-02, P-C-03, P-C-04|B-009|`npx --no-install vitest run packages/core/src/chat/use-cases`|T-01|
|T-18|组件：消息列表与行（含滚动锚定）|C-01, C-02, H-04, ST-01|B-003|`npx --no-install vitest run packages/web/src/features/chat`|T-03|
|T-19|组件：消息详情与重试条|C-03, C-04, ST-02, ST-03|B-028|`npx --no-install vitest run packages/web/src/features/chat`|T-04|
|T-20|组件：输入工具条 / 队列 / 会话信息面板|C-06, C-07, C-08|B-011|`npx --no-install vitest run packages/web/src/features/chat`|T-06|
