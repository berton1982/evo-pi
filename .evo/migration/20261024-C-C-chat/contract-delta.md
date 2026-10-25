# 契约对齐（C-C 会话面）

> 逐项说明本能力用到的命令 / 事件 / URL / i18n / token 在冻结契约里的位置，以及需要改契约的地方。
> 依据：`ref_projects/pi-web/components/{ChatWindow,MessageView}.tsx`（4,443 行）+ 表面枚举 126 点。

## 对齐表

| 类别 | 本能力用什么 | 契约位置 | 状态 |
|---|---|---|---|
| HTTP | `GET /api/app-update`（`ChatWindow.tsx:106` 的 `checkAppUpdate`） | `contracts/wire.md` 命令表 `GET /api/app-update`（证据 `app/api/app-update/route.ts:69`） | 一致 |
| 事件 | 消息增量与工具结果来自 agent 事件流 | `contracts/wire.md` v0.3「RPC 命令」表（`message_start`/`message_update`/`tool_execution_*`/`agent_end`，CHG-002 登记） | 一致（消费，不新增） |
| 命令 | `prompt`/`abort`/`set_model`/`set_thinking_level`/`set_tools`/`set_auto_compaction` | `contracts/wire.md` v0.3「RPC 命令」表同名行 | 一致 |
| URL | 本能力不改 URL；会话 id 由 C-B 管 | `contracts/routes.md`（深链矩阵：`/sessions?session=<id>&cwd=<path>`） | 一致（只读，不改） |
| i18n | 66 个键：`chat.` 32 / `i18n.` 30 / `codemode.` 2 / `subagent.` 1 / `appUpdate.` 1 | `contracts/i18n.md` 命名空间冻结表（**`i18n.` 经 CHG-003 新增登记并规定归并到 `common.`**） | **已改契约（CHG-003，已应用）** |
| token | 无（本能力不写 `var(--…)`；Markdown 用现有类名） | `contracts/design-system.md` | 不适用 |

## 外部依赖

| 模块 | 出处 | 干什么 | 要不要改 |
|---|---|---|---|
| `lib/file-upload-client.ts` | 经 `ChatInput` 间接引入（深度 2） | 拖拽上传（`/api/files`、`/api/files/[id]`） | **不改**：走 C-F 文件能力的端口；C-C 只接收 `onFilesUploaded` 回调 |
| `components/ChatInput.tsx` | 直接 import | 输入区本体（`/api/skills`、`/api/file-index`） | **不改**：`ChatInput` 属 C-D 输入区能力，C-C 只提供容器与回调 |
| `hooks/useAgentSession.ts` | 直接 import（props 依赖） | agent 事件与命令（`/api/agent`、`/api/sessions`、`/api/agent/new`、`/api/models`、`/api/models/default`） | **必须改**：C-A 正在迁它（停在 C4），C-C 只能通过端口/回调消费，不许直接 import pi-web 的 hook |
| `lib/agent-client.ts` | 经 `useAgentSession` 间接引入 | agent 客户端（`/api/agent/[id]`、`/api/agent`） | 同上一行：随 C-A 一起迁，C-C 不直接用 |
| `lib/session-stats.ts` | 间接引入 | 会话统计（`/api/sessions/stats`） | **不改**：属壳级统计条，C-C 只接收 `onSessionStatsChange` |
| `@/components/MarkdownBody`（`MessageView.tsx:111` `SafeMarkdownBody` 包装） | 直接 import | 渲染 Markdown | 沿用，不新增渲染管线（CHARTER 不做清单 3） |

**这五个模块是这一轮最重要的发现**：本文件自身只有 1 个 `fetch`（`/api/app-update`），但沿 import 追两层就有 **5 个模块、12 个 HTTP 端点**。若只看表面枚举（126 点里 `api` 仅 1 个），契约分母就是空的——`externalIo` 门第二次把"分母为空 ⇒ 永远达标"挡了下来。

## 差异与处置

| 编号 | 差异 | 处置 |
|---|---|---|
| D-01 | pi-web 用 `i18n.*` 装通用 UI 文案（close/copy/collapse/largeMessageReveal…），evo-pi 统一 `common.*` | 提 **CHG-003** 并在 `contracts/i18n.md` 登记（已应用）；迁入时按键意改名，不新增命名空间 |
| D-02 | `codemode.callCount` / `codemode.callCountOne` 属 Code mode 面板文案，而 Code mode 已在 C-G 被用户决定不迁 | 不迁；本能力渲染工具调用时只显示调用次数，不带 Code mode 链接 |
| D-03 | `subagent.openTab` 指向子代理标签页，属 C-A 的子代理能力 | 本能力只回调 `onOpenSubagent`，标签页由 C-A 实现 |
| D-04 | `appUpdate.releaseNotes` 属壳级更新横幅（`checkAppUpdate`） | 本能力不渲染更新横幅，登记给壳（D-2 文件区同批处理完壳后仍未覆盖，见 shell-baseline） |

结论：**变更单 CHG-003 已应用**（`contracts/i18n.md` v0.2）；其余三条为"不迁/归别的能力"，不需改契约。
