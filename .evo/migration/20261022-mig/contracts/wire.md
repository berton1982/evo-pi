# 对外承诺 — HTTP 命令 / SSE 事件 / 错误码

> 版本：**v1.0（2026-10-22 冻结）**。之后任何变更走 `CHG-` 变更单，写进能力 run 的 `contract-delta.md`。
> **抽取方式**：命令表由源码抽取（`export async function METHOD`），一条命令 = 一个 `METHOD /api/...`；按 `method+path` 去重，**不按路径去重**（历史上按路径去重吞掉过 `PATCH /api/skills`）。
> **核对**：`check-contracts.mjs` 会把 evo-pi 源码里的 fetch 命令与此表对账；`surface.json` 的 `api` 表面点必须全部出现在本表。

## 命令

| 命令 | 所属能力 | 证据 |
|---|---|---|
| `GET /api/agent/[id]` | C-A | `app/api/agent/[id]/route.ts:73` |
| `POST /api/agent/[id]` | C-A | `app/api/agent/[id]/route.ts:6` |
| `GET /api/agent/[id]/bash-output` | C-A | `app/api/agent/[id]/bash-output/route.ts:15` |
| `GET /api/agent/[id]/events` | C-A | `app/api/agent/[id]/events/route.ts:8` |
| `POST /api/agent/[id]/lease` | C-A | `app/api/agent/[id]/lease/route.ts:5` |
| `POST /api/agent/new` | C-A | `app/api/agent/new/route.ts:22` |
| `GET /api/agent/running` | C-A | `app/api/agent/running/route.ts:15` |
| `GET /api/app-update` | C-A | `app/api/app-update/route.ts:69` |
| `DELETE /api/auth/api-key/[provider]` | C-A | `app/api/auth/api-key/[provider]/route.ts:52` |
| `POST /api/auth/api-key/[provider]` | C-A | `app/api/auth/api-key/[provider]/route.ts:11` |
| `GET /api/auth/login/[provider]` | C-A | `app/api/auth/login/[provider]/route.ts:46` |
| `POST /api/auth/login/[provider]` | C-A | `app/api/auth/login/[provider]/route.ts:19` |
| `POST /api/auth/logout/[provider]` | C-A | `app/api/auth/logout/[provider]/route.ts:7` |
| `GET /api/auth/providers` | C-A | `app/api/auth/providers/route.ts:9` |
| `GET /api/cache-miss-notices` | C-B | `app/api/cache-miss-notices/route.ts:23` |
| `PUT /api/cache-miss-notices` | C-B | `app/api/cache-miss-notices/route.ts:31` |
| `GET /api/cwd/browse` | C-F | `app/api/cwd/browse/route.ts:15` |
| `POST /api/cwd/browse` | C-F | `app/api/cwd/browse/route.ts:56` |
| `POST /api/cwd/validate` | C-F | `app/api/cwd/validate/route.ts:17` |
| `POST /api/default-cwd` | C-B | `app/api/default-cwd/route.ts:8` |
| `GET /api/file-index` | C-F | `app/api/file-index/route.ts:110` |
| `GET /api/files/[...path]` | C-F | `app/api/files/[...path]/route.ts:449` |
| `POST /api/files/[...path]` | C-F | `app/api/files/[...path]/route.ts:152` |
| `GET /api/git/diff` | C-F | `app/api/git/diff/route.ts:27` |
| `GET /api/git/status` | C-F | `app/api/git/status/route.ts:6` |
| `GET /api/home` | C-F | `app/api/home/route.ts:4` |
| `GET /api/mcp` | C-G | `app/api/mcp/route.ts:112` |
| `POST /api/mcp` | C-G | `app/api/mcp/route.ts:592` |
| `POST /api/mcp/sign-in` | C-G | `app/api/mcp/sign-in/route.ts:23` |
| `DELETE /api/mcp/sign-in/[flowId]` | C-G | `app/api/mcp/sign-in/[flowId]/route.ts:52` |
| `GET /api/mcp/sign-in/[flowId]` | C-G | `app/api/mcp/sign-in/[flowId]/route.ts:26` |
| `POST /api/mcp/sign-in/[flowId]` | C-G | `app/api/mcp/sign-in/[flowId]/route.ts:34` |
| `POST /api/mcp/test` | C-G | `app/api/mcp/test/route.ts:26` |
| `GET /api/models` | C-H | `app/api/models/route.ts:104` |
| `GET /api/models-config` | C-H | `app/api/models-config/route.ts:7` |
| `PUT /api/models-config` | C-H | `app/api/models-config/route.ts:18` |
| `GET /api/models-config/catalog` | C-H | `app/api/models-config/catalog/route.ts:62` |
| `POST /api/models-config/discover` | C-H | `app/api/models-config/discover/route.ts:33` |
| `POST /api/models-config/test` | C-H | `app/api/models-config/test/route.ts:28` |
| `PUT /api/models/default` | C-H | `app/api/models/default/route.ts:48` |
| `GET /api/models/enabled` | C-H | `app/api/models/enabled/route.ts:93` |
| `PUT /api/models/enabled` | C-H | `app/api/models/enabled/route.ts:181` |
| `POST /api/models/refresh` | C-H | `app/api/models/refresh/route.ts:16` |
| `GET /api/open-in-explorer` | C-F | `app/api/open-in-explorer/route.ts:18` |
| `POST /api/open-in-explorer` | C-F | `app/api/open-in-explorer/route.ts:24` |
| `GET /api/plugins` | C-H | `app/api/plugins/route.ts:406` |
| `POST /api/plugins` | C-H | `app/api/plugins/route.ts:425` |
| `POST /api/plugins/check` | C-H | `app/api/plugins/check/route.ts:8` |
| `GET /api/project-trust` | C-B | `app/api/project-trust/route.ts:56` |
| `POST /api/project-trust` | C-B | `app/api/project-trust/route.ts:75` |
| `POST /api/provider-usage/query` | C-H | `app/api/provider-usage/query/route.ts:7` |
| `GET /api/push/config` | C-B | `app/api/push/config/route.ts:8` |
| `POST /api/push/subscribe` | C-B | `app/api/push/subscribe/route.ts:21` |
| `GET /api/sessions` | C-E | `app/api/sessions/route.ts:20` |
| `DELETE /api/sessions/[id]` | C-E | `app/api/sessions/[id]/route.ts:204` |
| `GET /api/sessions/[id]` | C-E | `app/api/sessions/[id]/route.ts:25` |
| `PATCH /api/sessions/[id]` | C-E | `app/api/sessions/[id]/route.ts:177` |
| `POST /api/sessions/[id]/auto-name` | C-E | `app/api/sessions/[id]/auto-name/route.ts:7` |
| `GET /api/sessions/[id]/context` | C-E | `app/api/sessions/[id]/context/route.ts:7` |
| `GET /api/sessions/[id]/entries/[entryId]/thinking` | C-E | `app/api/sessions/[id]/entries/[entryId]/thinking/route.ts:4` |
| `GET /api/sessions/[id]/entries/[entryId]/tool-result-image` | C-E | `app/api/sessions/[id]/entries/[entryId]/tool-result-image/route.ts:44` |
| `GET /api/sessions/[id]/export` | C-E | `app/api/sessions/[id]/export/route.ts:241` |
| `POST /api/sessions/[id]/fork` | C-E | `app/api/sessions/[id]/fork/route.ts:36` |
| `GET /api/sessions/[id]/state` | C-E | `app/api/sessions/[id]/state/route.ts:5` |
| `POST /api/sessions/delete` | C-E | `app/api/sessions/delete/route.ts:20` |
| `GET /api/sessions/search` | C-E | `app/api/sessions/search/route.ts:7` |
| `POST /api/sessions/stats` | C-E | `app/api/sessions/stats/route.ts:63` |
| `GET /api/sessions/ui-state` | C-E | `app/api/sessions/ui-state/route.ts:33` |
| `POST /api/sessions/ui-state` | C-E | `app/api/sessions/ui-state/route.ts:38` |
| `GET /api/skills` | C-H | `app/api/skills/route.ts:16` |
| `PATCH /api/skills` | C-H | `app/api/skills/route.ts:69` |
| `POST /api/skills/check` | C-H | `app/api/skills/check/route.ts:9` |
| `GET /api/skills/content` | C-H | `app/api/skills/content/route.ts:20` |
| `POST /api/skills/install` | C-H | `app/api/skills/install/route.ts:13` |
| `POST /api/skills/search` | C-H | `app/api/skills/search/route.ts:91` |
| `POST /api/skills/update` | C-H | `app/api/skills/update/route.ts:10` |
| `GET /api/subagents/[id]` | C-? | `app/api/subagents/[id]/route.ts:6` |
| `POST /api/subagents/[id]` | C-? | `app/api/subagents/[id]/route.ts:20` |
| `DELETE /api/subagents/profiles` | C-? | `app/api/subagents/profiles/route.ts:110` |
| `GET /api/subagents/profiles` | C-? | `app/api/subagents/profiles/route.ts:33` |
| `PATCH /api/subagents/profiles` | C-? | `app/api/subagents/profiles/route.ts:62` |
| `PUT /api/subagents/profiles` | C-? | `app/api/subagents/profiles/route.ts:43` |
| `GET /api/subagents/settings` | C-? | `app/api/subagents/settings/route.ts:12` |
| `PUT /api/subagents/settings` | C-? | `app/api/subagents/settings/route.ts:24` |
| `POST /api/terminal` | C-? | `app/api/terminal/route.ts:10` |
| `DELETE /api/terminal/[id]` | C-? | `app/api/terminal/[id]/route.ts:40` |
| `GET /api/terminal/[id]` | C-? | `app/api/terminal/[id]/route.ts:7` |
| `POST /api/terminal/[id]` | C-? | `app/api/terminal/[id]/route.ts:15` |
| `GET /api/terminal/[id]/events` | C-? | `app/api/terminal/[id]/events/route.ts:6` |
| `GET /api/tools/settings` | C-? | `app/api/tools/settings/route.ts:49` |
| `PUT /api/tools/settings` | C-? | `app/api/tools/settings/route.ts:57` |
| `DELETE /api/web-auth` | C-? | `app/api/web-auth/route.ts:109` |
| `GET /api/web-auth` | C-? | `app/api/web-auth/route.ts:51` |
| `POST /api/web-auth` | C-? | `app/api/web-auth/route.ts:67` |
| `DELETE /api/worktrees` | C-? | `app/api/worktrees/route.ts:81` |
| `GET /api/worktrees` | C-? | `app/api/worktrees/route.ts:18` |
| `POST /api/worktrees` | C-? | `app/api/worktrees/route.ts:57` |

## 事件

SSE 事件类型（`/api/agent/[id]/events` 与 terminal 事件流共用）。数据形状见 `data-format.md`；契约测试是 `lib/agent-event-wire.test.mjs`。

| 事件 | 语义 | 证据 |
|---|---|---|
| `message_start` | 一条 assistant 消息开始 | `lib/agent-event-wire.test.mjs` |
| `message_update` | 消息增量（文本/思考） | 同上 |
| `message_end` | 消息结束（含 usage） | 同上 |
| `text_delta` | 纯文本增量 | 同上 |
| `thinking` | 思考块增量 | 同上 |
| `toolcall_start` | 工具调用开始 | 同上 |
| `toolcall_delta` | 工具调用参数增量 | 同上 |
| `toolcall_end` | 工具调用结束 | 同上 |
| `tool_execution_start` | 工具开始执行 | 同上 |
| `tool_execution_update` | 工具执行输出增量 | 同上 |
| `tool_execution_end` | 工具执行结束（含 exit code） | 同上 |
| `turn_start` | 一轮对话开始 | 同上 |
| `turn_end` | 一轮对话结束 | 同上 |
| `entry_appended` | 会话文件追加了一条 entry | 同上 |
| `agent_end` | agent 结束（stopReason） | 同上 |
| `custom` | 扩展自定义事件（透传） | 同上 |

**未登记事件必须忽略，不许抛错**（旧前端连新后端时的唯一兼容保证）。

## 错误码

| 错误码 | HTTP | 何时 | 前端处理 |
|---|---|---|---|
| `session_not_found` | 404 | 会话 id 不存在 | 清空当前会话，回列表 |
| `cwd_invalid` | 400 | 工作目录不存在/不可读 | 提示重选目录，不清会话 |
| `model_unavailable` | 409 | 模型或 provider 未配置 | 打开设置面板 |
| `provider_auth_required` | 401 | 需要登录/授权 | 走登录流程，保留输入草稿 |
| `internal` | 500 | 未分类失败 | 显示可复制的错误 ID，不做静默重试 |

未知错误码按 `internal` 处理，dev 下 `console.warn` 一次（不重复刷屏）。

## RPC 命令

> 这一层不是 HTTP：`lib/rpc-manager.ts` 把 pi SDK 的 rpc 命令名分发给 `AgentSessionWrapper`，
> `hooks/useAgentSession.ts` 处理对应事件。C-A 迁移必须先有这张表，否则"命令分发"没有契约可对。
> `类型` 列现在由表面枚举的 `command` 点人工归类，C3 行为规格里要逐条核。

| 命令 | 类型 | 证据 |
|---|---|---|
| `mcp` | RPC 命令 | `ref_projects/pi-web/hooks/useAgentSession.ts:2229` |
| `message_start` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1536` |
| `auto_compaction_end` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1702` |
| `auto_compaction_start` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1696` |
| `extension_ui_closed` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1716` |
| `connected` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1431` |
| `confirm` | 扩展 UI | `ref_projects/pi-web/hooks/useAgentSession.ts:1156` |
| `copy` | RPC 命令 | `ref_projects/pi-web/hooks/useAgentSession.ts:2243` |
| `add` | RPC 命令 | `ref_projects/pi-web/hooks/useAgentSession.ts:278` |
| `message_update` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1537` |
| `editor` | 扩展 UI | `ref_projects/pi-web/hooks/useAgentSession.ts:1158` |
| `auto_retry_start` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1690` |
| `notify` | 扩展 UI | `ref_projects/pi-web/hooks/useAgentSession.ts:1161` |
| `reload` | RPC 命令 | `ref_projects/pi-web/hooks/useAgentSession.ts:2199` |
| `tool_execution_update` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1627` |
| `set_editor_text` | 扩展 UI | `ref_projects/pi-web/hooks/useAgentSession.ts:1188` |
| `remove` | RPC 命令 | `ref_projects/pi-web/hooks/useAgentSession.ts:291` |
| `auto-compact` | RPC 命令 | `ref_projects/pi-web/hooks/useAgentSession.ts:2180` |
| `extension_ui_request` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1713` |
| `auto_retry_end` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1693` |
| `prompt_error` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1527` |
| `clone` | RPC 命令 | `ref_projects/pi-web/hooks/useAgentSession.ts:2252` |
| `message_end` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1575` |
| `name` | RPC 命令 | `ref_projects/pi-web/hooks/useAgentSession.ts:2211` |
| `setTitle` | 扩展 UI | `ref_projects/pi-web/hooks/useAgentSession.ts:1185` |
| `compaction_end` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1703` |
| `input` | 扩展 UI | `ref_projects/pi-web/hooks/useAgentSession.ts:1157` |
| `mark_oldest_exiting` | 扩展 UI | `ref_projects/pi-web/hooks/useAgentSession.ts:289` |
| `queue_update` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1684` |
| `agent_end` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1463` |
| `compaction_start` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1697` |
| `agent_settled` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1492` |
| `tool_execution_start` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1613` |
| `agent_start` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1451` |
| `setWidget` | 扩展 UI | `ref_projects/pi-web/hooks/useAgentSession.ts:1177` |
| `custom` | 扩展 UI | `ref_projects/pi-web/hooks/useAgentSession.ts:1191` |
| `setStatus` | 扩展 UI | `ref_projects/pi-web/hooks/useAgentSession.ts:1169` |
| `select` | 扩展 UI | `ref_projects/pi-web/hooks/useAgentSession.ts:1155` |
| `extension_error` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1530` |
| `tool_execution_end` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1666` |
| `compact` | RPC 命令 | `ref_projects/pi-web/hooks/useAgentSession.ts:2166` |
| `prompt_done` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:1507` |
| `session` | 事件 | `ref_projects/pi-web/hooks/useAgentSession.ts:2219` |
| `set_model` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1027` |
| `set_thinking_level` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1158` |
| `get_state` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:991` |
| `set_tools` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1271` |
| `set_auto_compaction` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1200` |
| `bash` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1324` |
| `set_auto_retry` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1319` |
| `steer` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1211` |
| `clear_queue` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1205` |
| `abort` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:971` |
| `fork` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1045` |
| `abort_compaction` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1304` |
| `extension_ui_response` | 扩展 UI | `ref_projects/pi-web/lib/rpc-manager.ts:1309` |
| `abort_bash` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1348` |
| `fork_branch` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1100` |
| `get_commands` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1242` |
| `extension_ui_input` | 扩展 UI | `ref_projects/pi-web/lib/rpc-manager.ts:1314` |
| `prompt` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:844` |
| `get_session_stats` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1189` |
| `set_session_name` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1181` |
| `get_tools` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1223` |
| `follow_up` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1217` |
| `navigate_tree` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1151` |
| `get_last_assistant_text` | RPC 命令 | `ref_projects/pi-web/lib/rpc-manager.ts:1196` |
