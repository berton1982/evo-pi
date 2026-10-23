# 骨架贯通报告 — 一条真路径通电

> P2 门的要求：`harness/report/skeleton.md`（本文件）+ `gates/P2.json`（真跑过的命令与退出码）。**报告不能替代证据**：本文件里每条断言都能在 `gates/P2.json` 里找到对应命令。

## 硬门

| 硬门 | 状态 | 证据 |
|---|---|---|
| route 不在模块顶层做组合根 | ✅ 已修 | `packages/web/src/app/api/sessions/[id]/context/route.ts`：改为按 `agentDir` 记忆化的 `readSessionContextFor()`；修前该目录 5 个用例 404 |
| route → use-case → port → adapter 四层可注入 | ✅ | `npx --no-install vitest run packages/web/src/app/api/sessions` 23/23 通过 |
| core 读侧链路（use-case + adapter）可独立验证 | ✅ | `npx --no-install vitest run packages/core/src/session packages/core/src/system` 通过 |
| 数据源单点（`PI_CODING_AGENT_DIR`） | ✅ | 测试用 env 指向复制出来的 fixture，不碰 `~/.pi/agent` |

## 走通的路径

1. **列表**：`GET /api/sessions` → `makeListSessions` → `JsonlSessionRepository` → `FileSystemSessionStorage` + `ScanIndexStore`。测试用 fixture 目录，返回真实 JSONL 索引结果。
2. **读单个会话上下文**：`GET /api/sessions/[id]/context` → `makeReadSessionContext` → repo。`SessionContextSchema.parse()` 守在出口，契约为 `contracts/schema.ts`。
3. **404/400 分支**：未知 id → `SessionNotFoundError` → 404 `session_not_found`；`tail > 10000` → 400。错误码与 `contracts/wire.md` 错误码表一致。

## 已知缺口（不属 P2 硬门：能力 C5 的实现内容）

| 缺口 | 归属 | 为什么不算 P2 硬门 |
|---|---|---|
| URL ↔ 选中态同步 | C-B 的 C5 | P2 早于任何能力，前端交互由能力实现 |
| 发送 + 流式 | C-A 的 C5 | 需要 rpc 端口，属能力实现 |
| 落盘（写会话文件） | C-A 的 C5 | 同上 |

## 没通电的部分（不许装作通了）

- **发送 + 流式**：`/api/agent/*` 在 evo-pi 还没有 route，属 C-A 的 C5。
- **落盘**：evo-pi 目前只读不写，写路径要等 C-A 的 rpc 端口。
- **URL 同步**：前端交互未接，C-B 的 C5 才有。

这三条不影响 P2 的"一条路径通电"判据（列表 → 读上下文已经走通），但会挡住 C6 的行为对账，已记入 `harness/registry.json` 的 `pending` 行为。
