# 数据格式与兼容 — 会话文件 / 消息 / 事件载荷

> **为什么这份要冻结**：evo-pi 与 pi-web 读的是**同一批 `~/.pi/agent` 会话文件**。格式一旦理解错，两边会各写各的：pi-web 写的行 evo-pi 看不懂就丢，evo-pi 写回的行 pi-web 也不懂。数据格式是唯一"错了不会报错、只会悄悄丢数据"的契约。
> **核对**：`contracts/schema.ts` 是它的机器版本；`fixtures/session-minimal.jsonl` 是真实样本（双读验证：schema 能吃、后端解析器也能吃）。

## 1. 路径与命名

| 对象 | 规则 | 证据 |
|---|---|---|
| 会话根 | `$PI_CODING_AGENT_DIR`（默认 `~/.pi/agent`） | `lib/session-id-helper.ts` |
| 会话文件 | `<agentDir>/sessions/<cwd-slug>/<sessionId>.jsonl` | `lib/session-storage.ts` |
| cwd slug | 绝对路径 → 把 `/` 与非字母数字换成 `-`，去首尾 `-` | 同上 |
| 会话 id | 时间戳前缀 + 随机后缀；**只允许 `[A-Za-z0-9_-]`** | 同上 |

## 2. 会话文件是 JSONL，首行是 header

| 行类型 | 必填字段 | 说明 |
|---|---|---|
| `session`（首行） | `type`、`version`、`cwd`、`id`、`timestamp` | 可选 `parentSession`（分支/子代理） |
| `message` | `role`、`content`、`timestamp` | `content` 可以是字符串或块数组 |
| `custom` | `customType`、`data` | 扩展自定义数据，读取方**必须原样保留** |
| `custom_message` | `customType`、`content` | 扩展注入的用户可见消息 |
| `model_change` | `provider`、`modelId` | 切换模型 |
| `session_info` | `name`（可选 `color`） | 会话重命名 |
| `thinking_level_change` | `thinkingLevel` | 思考级别 |
| `compaction` | `summary`、`tokensBefore` | 压缩标记 |

**兼容硬约束**（违反任一即数据丢失）：
1. 未知 `type` **必须跳过不抛错**，并在重写时**原样保留**该行。
2. 未知字段**必须保留**（`...rest` 透传），不许重建对象把字段洗掉。
3. 追加写只允许"末尾追加一行"，不许整文件重写（并发下会互相覆盖）。
4. `version` 只做单调递增；读到更高版本时按"只读"处理，不写入。
5. 空行与 BOM 忽略；行尾 `\r` 允许。

## 3. 消息内容块

| 块 | 字段 | 备注 |
|---|---|---|
| 文本 | `{type:'text', text}` | |
| 思考 | `{type:'thinking', thinking}` | 渲染为可折叠 |
| 工具调用 | `{type:'toolCall', id, name, arguments}` | `arguments` 是对象，**不是** JSON 字符串 |
| 工具结果 | `{type:'toolResult', toolCallId, content, isError?}` | |

## 4. 事件载荷

SSE 每条 `data:` 是一个 JSON 对象，含 `type`（见 `wire.md` 事件表）与 `payload`；`payload` 里 `sessionId` 必须有（多标签页时用于丢弃过期流）。

## 5. fixture

`fixtures/session-minimal.jsonl`：10 行，覆盖上表 7 种行类型 + 一条未知类型（验证"跳过并保留"）。它是 P1 `fixtures` 门的证据，也是 C6 双读验证的输入。
