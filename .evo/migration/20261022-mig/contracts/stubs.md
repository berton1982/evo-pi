# 桩清单 — `20261022-mig/contracts/stubs.md`

> P1 门 `stubPlan` 检查：契约（`wire.md` 命令表 + 事件表）里**每一条**在这里有一行；状态只有 `ready|blocked`；`blocked` 必须写 ≥10 字理由；`ready` 的 `桩实现`/`夹具` 必须真实存在。
> C5 门 `stub` 只复查**本能力**用到的命令——别的能力的桩延期不该拖住你。
>
> **当前状态**：全部 `blocked`，理由都指向具体的解除时机（哪个能力的哪个前置）。这是真实状态：program 级还没有任一能力进 C5。

**统计**：97 条命令 + 16 条事件 = 113 行，0 ready / 113 blocked。

| 契约命令/事件 | 状态 | 桩实现 | 夹具 | 理由 |
|---|---|---|---|---|
| `GET /api/agent/[id]` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `POST /api/agent/[id]` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/agent/[id]/bash-output` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/agent/[id]/events` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `POST /api/agent/[id]/lease` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `POST /api/agent/new` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/agent/running` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/app-update` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `DELETE /api/auth/api-key/[provider]` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `POST /api/auth/api-key/[provider]` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/auth/login/[provider]` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `POST /api/auth/login/[provider]` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `POST /api/auth/logout/[provider]` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/auth/providers` | blocked | C-A 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/cache-miss-notices` | blocked | C-B 的 mock 服务 | 见该能力 C5 产出 | 随 C-B（会话编排）在 C5 落地：失效广播通道要先在 H2 就绪 |
| `PUT /api/cache-miss-notices` | blocked | C-B 的 mock 服务 | 见该能力 C5 产出 | 随 C-B（会话编排）在 C5 落地：失效广播通道要先在 H2 就绪 |
| `GET /api/cwd/browse` | blocked | C-F 的 mock 服务 | 见该能力 C5 产出 | 随 C-F（文件）在 C5 落地：路径越界校验属于该能力用例 |
| `POST /api/cwd/browse` | blocked | C-F 的 mock 服务 | 见该能力 C5 产出 | 随 C-F（文件）在 C5 落地：路径越界校验属于该能力用例 |
| `POST /api/cwd/validate` | blocked | C-F 的 mock 服务 | 见该能力 C5 产出 | 随 C-F（文件）在 C5 落地：路径越界校验属于该能力用例 |
| `POST /api/default-cwd` | blocked | C-B 的 mock 服务 | 见该能力 C5 产出 | 随 C-B（会话编排）在 C5 落地：失效广播通道要先在 H2 就绪 |
| `GET /api/file-index` | blocked | C-F 的 mock 服务 | 见该能力 C5 产出 | 随 C-F（文件）在 C5 落地：路径越界校验属于该能力用例 |
| `GET /api/files/[...path]` | blocked | C-F 的 mock 服务 | 见该能力 C5 产出 | 随 C-F（文件）在 C5 落地：路径越界校验属于该能力用例 |
| `POST /api/files/[...path]` | blocked | C-F 的 mock 服务 | 见该能力 C5 产出 | 随 C-F（文件）在 C5 落地：路径越界校验属于该能力用例 |
| `GET /api/git/diff` | blocked | C-F 的 mock 服务 | 见该能力 C5 产出 | 随 C-F（文件）在 C5 落地：路径越界校验属于该能力用例 |
| `GET /api/git/status` | blocked | C-F 的 mock 服务 | 见该能力 C5 产出 | 随 C-F（文件）在 C5 落地：路径越界校验属于该能力用例 |
| `GET /api/home` | blocked | C-F 的 mock 服务 | 见该能力 C5 产出 | 随 C-F（文件）在 C5 落地：路径越界校验属于该能力用例 |
| `GET /api/mcp` | blocked | C-G 的 mock 服务 | 见该能力 C5 产出 | 随 C-G（MCP）在 C5 落地：MCP 表单文案与状态机未冻结 |
| `POST /api/mcp` | blocked | C-G 的 mock 服务 | 见该能力 C5 产出 | 随 C-G（MCP）在 C5 落地：MCP 表单文案与状态机未冻结 |
| `POST /api/mcp/sign-in` | blocked | C-G 的 mock 服务 | 见该能力 C5 产出 | 随 C-G（MCP）在 C5 落地：MCP 表单文案与状态机未冻结 |
| `DELETE /api/mcp/sign-in/[flowId]` | blocked | C-G 的 mock 服务 | 见该能力 C5 产出 | 随 C-G（MCP）在 C5 落地：MCP 表单文案与状态机未冻结 |
| `GET /api/mcp/sign-in/[flowId]` | blocked | C-G 的 mock 服务 | 见该能力 C5 产出 | 随 C-G（MCP）在 C5 落地：MCP 表单文案与状态机未冻结 |
| `POST /api/mcp/sign-in/[flowId]` | blocked | C-G 的 mock 服务 | 见该能力 C5 产出 | 随 C-G（MCP）在 C5 落地：MCP 表单文案与状态机未冻结 |
| `POST /api/mcp/test` | blocked | C-G 的 mock 服务 | 见该能力 C5 产出 | 随 C-G（MCP）在 C5 落地：MCP 表单文案与状态机未冻结 |
| `GET /api/models` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `GET /api/models-config` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `PUT /api/models-config` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `GET /api/models-config/catalog` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `POST /api/models-config/discover` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `POST /api/models-config/test` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `PUT /api/models/default` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `GET /api/models/enabled` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `PUT /api/models/enabled` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `POST /api/models/refresh` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `GET /api/open-in-explorer` | blocked | C-F 的 mock 服务 | 见该能力 C5 产出 | 随 C-F（文件）在 C5 落地：路径越界校验属于该能力用例 |
| `POST /api/open-in-explorer` | blocked | C-F 的 mock 服务 | 见该能力 C5 产出 | 随 C-F（文件）在 C5 落地：路径越界校验属于该能力用例 |
| `GET /api/plugins` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `POST /api/plugins` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `POST /api/plugins/check` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `GET /api/project-trust` | blocked | C-B 的 mock 服务 | 见该能力 C5 产出 | 随 C-B（会话编排）在 C5 落地：失效广播通道要先在 H2 就绪 |
| `POST /api/project-trust` | blocked | C-B 的 mock 服务 | 见该能力 C5 产出 | 随 C-B（会话编排）在 C5 落地：失效广播通道要先在 H2 就绪 |
| `POST /api/provider-usage/query` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `GET /api/push/config` | blocked | C-B 的 mock 服务 | 见该能力 C5 产出 | 随 C-B（会话编排）在 C5 落地：失效广播通道要先在 H2 就绪 |
| `POST /api/push/subscribe` | blocked | C-B 的 mock 服务 | 见该能力 C5 产出 | 随 C-B（会话编排）在 C5 落地：失效广播通道要先在 H2 就绪 |
| `GET /api/sessions` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `DELETE /api/sessions/[id]` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `GET /api/sessions/[id]` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `PATCH /api/sessions/[id]` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `POST /api/sessions/[id]/auto-name` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `GET /api/sessions/[id]/context` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `GET /api/sessions/[id]/entries/[entryId]/thinking` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `GET /api/sessions/[id]/entries/[entryId]/tool-result-image` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `GET /api/sessions/[id]/export` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `POST /api/sessions/[id]/fork` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `GET /api/sessions/[id]/state` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `POST /api/sessions/delete` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `GET /api/sessions/search` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `POST /api/sessions/stats` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `GET /api/sessions/ui-state` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `POST /api/sessions/ui-state` | blocked | C-E 的 mock 服务 | 见该能力 C5 产出 | 随 C-E（会话库）在 C5 落地：会话列表查询与分页契约要一起提交 |
| `GET /api/skills` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `PATCH /api/skills` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `POST /api/skills/check` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `GET /api/skills/content` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `POST /api/skills/install` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `POST /api/skills/search` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `POST /api/skills/update` | blocked | C-H 的 mock 服务 | 见该能力 C5 产出 | 随 C-H（设置）在 C5 落地：设置页布局先在 H1 完成 |
| `GET /api/subagents/[id]` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `POST /api/subagents/[id]` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `DELETE /api/subagents/profiles` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/subagents/profiles` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `PATCH /api/subagents/profiles` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `PUT /api/subagents/profiles` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/subagents/settings` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `PUT /api/subagents/settings` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `POST /api/terminal` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `DELETE /api/terminal/[id]` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/terminal/[id]` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `POST /api/terminal/[id]` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/terminal/[id]/events` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/tools/settings` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `PUT /api/tools/settings` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `DELETE /api/web-auth` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/web-auth` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `POST /api/web-auth` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `DELETE /api/worktrees` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `GET /api/worktrees` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `POST /api/worktrees` | blocked | C-? 的 mock 服务 | 见该能力 C5 产出 | 随 C-A（代理运行时）在 C5 落地：依赖 rpc-manager 端口先定型 |
| `message_start` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `message_update` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `message_end` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `text_delta` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `thinking` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `toolcall_start` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `toolcall_delta` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `toolcall_end` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `tool_execution_start` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `tool_execution_update` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `tool_execution_end` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `turn_start` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `turn_end` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `entry_appended` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `agent_end` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
| `custom` | blocked | SSE 回放器（harness 侧） | fixtures/session-minimal.jsonl | 事件流依赖 C-A 的 rpc-manager 端口，随其一起解除 |
