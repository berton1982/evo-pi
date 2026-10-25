# 行为规格（C-A 代理运行时）

> 每条行为 = 一句可判定的话 + 源码出处 + 一条会失败的脚本（C5 落地，C6 对账）。
> 命令/事件名与 `contracts/wire.md` v0.3 的 `## RPC 命令` 表逐条对应。

## 行为清单

| id | 行为 | 证据 | script_id |
|---|---|---|---|
| B-001 | prompt 命令：先申请准入，再按 generation 判定是否仍然有效，最后才发一次 run | `lib/rpc-manager.ts:844` | `s-001` |
| B-002 | abort 命令：中断当前 run 但保留队列，不清会话状态 | `lib/rpc-manager.ts:971` | `s-002` |
| B-003 | get_state 回包必须带 model/thinkingLevel/queue，缺字段按默认值补齐 | `lib/rpc-manager.ts:991` | `s-003` |
| B-004 | set_model 失败时回滚到原模型并回错误，不留半切换状态 | `lib/rpc-manager.ts:1027` | `s-004` |
| B-005 | fork 与 fork_branch 走同一替换路径，替换期间新命令被拒 | `lib/rpc-manager.ts:779` | `s-005` |
| B-006 | clone 复制当前分支并把选中项重置到新会话 | `lib/rpc-manager.ts:1123` | `s-006` |
| B-007 | navigate_tree 保留工具选择（导航不改工具开关） | `lib/rpc-manager.ts:659` | `s-007` |
| B-008 | set_thinking_level 只接受具体档位，非法值按 null 处理 | `lib/rpc-manager.ts:1158` | `s-008` |
| B-009 | compact 结束必须回读压缩结果，读不出就当失败而不是静默成功 | `lib/rpc-manager.ts:1171` | `s-009` |
| B-010 | set_tools 只改传入的条目，未传的保持原状（部分更新语义） | `lib/rpc-manager.ts:1271` | `s-010` |
| B-011 | extension_ui_response 只对未关闭的请求生效，重复回包被忽略 | `lib/rpc-manager.ts:1309` | `s-011` |
| B-012 | bash 命令与 abort_bash 成对：能起也能停，停后不产生第二批输出 | `lib/rpc-manager.ts:1324` | `s-012` |
| B-013 | get_commands 按 generation 丢弃过期结果，旧 generation 直接返回空 | `lib/rpc-manager.ts:1242` | `s-013` |
| B-014 | 等待扩展绑定完成期间不接受 prompt（waitForExtensionsBound） | `lib/rpc-manager.ts:606` | `s-014` |
| B-015 | connected 事件把连接态置为已连接，并清掉上一次的连接错误 | `hooks/useAgentSession.ts:1455` | `s-015` |
| B-016 | agent_start 记录开始时刻并清空上一轮的结束标记 | `hooks/useAgentSession.ts:1461` | `s-016` |
| B-017 | message_start 建一条新消息占位，带 role 与 id | `hooks/useAgentSession.ts:1536` | `s-017` |
| B-018 | message_update 以增量合并进同一条消息，不新建条目 | `hooks/useAgentSession.ts:1537` | `s-018` |
| B-019 | message_end 用最终内容覆盖增量累积结果（以终态为准） | `hooks/useAgentSession.ts:1575` | `s-019` |
| B-020 | tool_execution_start 记录工具调用起点，同名工具并发调用不互相覆盖 | `hooks/useAgentSession.ts:1613` | `s-020` |
| B-021 | queue_update 用整份队列覆盖本地队列，不做增量拼接 | `hooks/useAgentSession.ts:1684` | `s-021` |
| B-022 | auto_compaction_start 标记压缩中，期间禁止发送新 prompt | `hooks/useAgentSession.ts:1696` | `s-022` |
| B-023 | extension_ui_request 四种交互（confirm/select/editor/input）各自独立呈现 | `hooks/useAgentSession.ts:1713` | `s-023` |
| B-024 | agent_end 收尾：落库最终消息、解除排队、刷新统计 | `hooks/useAgentSession.ts:1463` | `s-024` |
| B-025 | 通知最多 3 条，超出时最旧一条进入 exiting 并延迟移除 | `hooks/useAgentSession.ts:254` | `s-025` |
| B-026 | 通知 reducer 只处理 add/exit/remove 三类动作，未知动作原样返回 | `hooks/useAgentSession.ts:276` | `s-026` |
| B-027 | 流式 chunk 只更新 ref，不进 React state（避免每帧重渲染） | `hooks/useAgentSession.ts:364` | `s-027` |
| B-028 | 乱序回包只应用更高 request id，低 id 回包丢弃 | `hooks/useAgentSession.ts:387` | `s-028` |
| B-029 | 会话读 single-flight：同一会话并发读合并成一次请求 | `hooks/useAgentSession.ts:458` | `s-029` |
| B-030 | 切换会话时旧会话的在途结果不再写入新会话 | `hooks/useAgentSession.ts:2597` | `s-030` |
| B-031 | navigate 之后等一次 idle 再收尾，避免读到半新状态 | `lib/rpc-manager.ts:640` | `s-031` |
| B-032 | 读取会话失败返回错误状态，不保留半份数据 | `hooks/useAgentSession.ts:643` | `s-032` |
| B-033 | MCP 空闲超时读环境变量，缺省值与非法值都回落到默认 | `lib/mcp-host.ts:81` | `s-033` |
| B-034 | 未受信任项目里的 MCP 条目不加载进运行时配置 | `lib/mcp-host.ts:145` | `s-034` |
| B-035 | codemode 不可用时把该 server 的 exposure 降级为不可达 | `lib/mcp-host.ts:180` | `s-035` |
| B-036 | 连接监视只回调一次 ready/closed，重复事件被忽略 | `lib/mcp-host.ts:219` | `s-036` |
| B-037 | 传输层断开要触发重连并在重连期间拒绝新工具调用 | `lib/mcp-host.ts:307` | `s-037` |
| B-038 | prompt 前准备 MCP：可选等待连接就绪，超时则带警告继续 | `lib/mcp-host.ts:668` | `s-038` |
| B-039 | 解析 frontmatter 的工具名列表时容忍空值与非法形状 | `lib/subagents.ts:276` | `s-039` |
| B-040 | 子代理档案按 用户 < 项目 的优先级合并（项目覆盖用户） | `lib/subagents.ts:486` | `s-040` |
| B-041 | 解析不到名字时返回 undefined，不抛异常 | `lib/subagents.ts:495` | `s-041` |
| B-042 | 保存档案按 scope 选目录，文件名取名字且拒绝路径穿越 | `lib/subagents.ts:529` | `s-042` |
| B-043 | 删除档案只删自己的文件，名字不存在时不报错 | `lib/subagents.ts:627` | `s-043` |
| B-044 | 会话里的子代理资源快照缺失时按空集合处理 | `lib/subagents.ts:669` | `s-044` |

## 表面点覆盖

| 表面点类别 | 条数 | 由哪些行为覆盖 |
|---|---|---|
| command（43） | 43 | B-001…B-014 逐条对应命令名；`setStatus`/`notify`/`setTitle`/`setWidget`/`set_editor_text`/`mark_oldest_exiting`/`copy`/`name`/`remove`/`add` 归入扩展 UI 与队列行为（B-023/B-025/B-021） |
| api（11） | 11 | B-029/B-030/B-032 覆盖会话读；`/api/agent/*` 的 lease 与 new 归入命令分发（B-001/B-005） |

## 未实测声明

本表全部来自源码静态阅读（`readlog.md` 的 5 条隐式契约已并入 B-027/B-028/B-029/B-030/B-031），**没有一条跑过 e2e**——C6 的对账表会逐条写 `blocked（脚本未落地）`，不写"已验证"。
