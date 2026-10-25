# 能力规格（C-A 代理运行时）

> 本能力是**基础设施**：不渲染界面、不产出 CSS、不新增 i18n 键。
> 它把 pi 的会话运行时（RPC 命令 + 事件流 + MCP 生命周期 + 子代理档案）搬进 `packages/core`，
> 供 C-B/C-C 等界面能力消费。契约层见 `contract-delta.md`（wire v0.3 / CHG-002）。

## 用户故事

| 编号 | 用户故事 | 角色 | 触发 | 期望 |
|---|---|---|---|---|
| US-01 | 我要在输入框发一条消息并看到逐字输出 | 使用者 | 在会话里敲回车 | 消息立即出现在流里，文本逐段增长，不闪烁不重复 |
| US-02 | 我要能中途打断一次回答 | 使用者 | 点「停止」或按 Esc | 已生成内容保留，队列不被清空，可以继续追问 |
| US-03 | 我要切换模型与思考档位 | 使用者 | 在顶栏下拉里选 | 下一条消息用新模型；切换失败要回到原模型并提示 |
| US-04 | 我要在长上下文里压缩历史 | 使用者 | 点「压缩」 | 压缩期间不许新人排队；完成后能看到压缩摘要 |
| US-05 | 我要让对话分叉/克隆后不影响原分支 | 使用者 | 选「分叉」「克隆」 | 新会话独立落盘，原会话内容不变 |
| US-06 | 我的项目里配了 MCP server，工具要能用 | 使用者 | 发一条会用工具的消息 | 已连接的 server 工具可见；未受信任项目的 server 不加载 |
| US-07 | 我要为项目定义子代理 | 使用者 | 写一份带 frontmatter 的档案 | 项目档案覆盖同名用户档案，删掉后回落 |

## 源码覆盖

| 文件 | 行区间 | 说明 |
|---|---|---|
| `hooks/useAgentSession.ts` | L1-342 | 类型与常量：状态形状、通知模型、队列归一化 |
| `hooks/useAgentSession.ts` | L342-1130 | 主 hook：命令发送、会话读、事件注册与乱序防护 |
| `hooks/useAgentSession.ts` | L1130-1430 | 命令/事件分发的入口 switch 与 notice reducer |
| `hooks/useAgentSession.ts` | L1430-1960 | 事件归约：message/tool/queue/compaction/extension_ui/agent_end |
| `hooks/useAgentSession.ts` | L1960-2805 | 模型切换、会话替换、收尾与对外 API |
| `lib/rpc-manager.ts` | L1-300 | 类型、常量、工具白名单与 idle 配置 |
| `lib/rpc-manager.ts` | L300-843 | `AgentSessionWrapper`：准入、会话替换、扩展绑定等待 |
| `lib/rpc-manager.ts` | L843-1400 | 命令分发 switch（prompt/abort/fork/clone/compact/tools…） |
| `lib/rpc-manager.ts` | L1400-2080 | 其余命令、bash 控制、错误映射 |
| `lib/rpc-manager.ts` | L2080-2757 | 传输与重连、收尾 |
| `lib/mcp-host.ts` | L1-668 | 配置解析、受信任判定、exposure 降级、连接监视 |
| `lib/mcp-host.ts` | L668-1105 | `prepareForPrompt` 与生命周期收尾 |
| `lib/subagents.ts` | L1-478 | 类型与 frontmatter 解析 |
| `lib/subagents.ts` | L478-1105 | 档案枚举/保存/删除、会话资源快照 |

覆盖合计 **7,669 / 7,669 行（100%）**，区间与 `ownership.md` 的 24 段一一对应。

## 交互与导航

机制：`none`（本能力不产出界面）。
依据：`hooks/useAgentSession.ts:342` 是 `export function useAgentSession`，返回状态与动作对象，**没有 JSX**；
`lib/rpc-manager.ts:843` 是命令分发 `switch`；`lib/mcp-host.ts:180`、`lib/subagents.ts:529` 都是纯函数/文件操作。
消费方在壳与能力层（`packages/web/src/shell/layout/app-layout.tsx`、C-B/C-C 的会话面），
它们各自负责键盘与焦点；本能力只提供「命令 + 事件」两个方向。

## 与 pi-web 的布局映射

本能力不占布局区域，映射表只有"消费点"：

| pi-web 区域 | evo-pi 目标区域 | 说明 |
|---|---|---|
| `hooks/useAgentSession.ts` 的返回对象 | `packages/web/src/shell/orchestration/` 的会话编排 | 状态与动作签名不变 |
| `lib/rpc-manager.ts` 的 wrapper | `packages/core/src/agent/infrastructure/` | 传输与重连留在基础设施层 |
| `lib/mcp-host.ts` | `packages/core/src/mcp/`（复用 C-G 端口） | 不重复实现 MCP 协议 |
| `lib/subagents.ts` | `packages/core/src/agents/` | 档案读写走端口 |

## 人工决策

| 决策项 | 结论 | 依据 |
|---|---|---|
| 交互形态 | 不涉及（无界面） | 见上节 `机制：none` |
| 保真度 | 命令/事件契约 100% 覆盖，状态形状按 zod 冻结 | `schema.ts` 15 字段全命中 |
| 不迁范围 | 不迁 JSX；不迁子代理面板 UX；不做多租户 | `CHARTER.md §3` |
| CHG 批准权 | CHG-002（RPC 命令表）由用户批准 | 本轮已获批 |
| R 级 | R3（四文件 7,669 行） | `GODS.md:38-41` |
| 运行时边界 | 命令/事件走 core；fetch 在 adapters；`node:fs` 在 infrastructure | `ARCHITECTURE.md §1.4` |
| 新依赖 | 不新增 | `packages/core` 依赖不变 |
| i18n | 不新增键（本能力不渲染文案） | 对齐表实测键集合为空 |
| 预算 | 单文件 ≤400 行、单函数 ≤60 行、props ≤6 | `design/quality.md`（C4 落地） |
| 割接与回滚 | 按 feature flag 双写：新运行时先并行跑，再切壳 | `cutover/PLAN.md`（X0 细化） |
| 检查点 | C3 规格、C4 设计、C6 对账 三次人工签 | 本表即第一处 |
