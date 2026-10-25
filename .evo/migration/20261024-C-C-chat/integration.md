# 联调记录 — C-C（会话面）

> 本能力**只读不写服务端**：没有新端点，7 条发现来自 `externalIo` 沿 import 追到的既有端点。

## 1. 替换表（桩 → 真实现）

| 命令 | 桩 | 真实现 | 联调证据 |
|---|---|---|---|
| GET /api/app-update | — | packages/web/src/app/api/app-update/route.ts | gates/C5.json |
|---|---|---|---|
| `P-C-01 AgentTransport.send` 的桩 | — | `packages/web/src/features/chat/domain/ports/agent-transport.ts`（端口）+ C-A 提供的实现（`ref_projects/pi-web/lib/agent-client.ts:32` 的 `POST /api/agent/[id]`） | `tsc -p packages/web`（端口契约一致） |
| 会话读 `sessions.list` | evo-pi 自己的 `GET /api/sessions`（`packages/web/src/app/api/sessions/route.ts`） | done |
| 会话统计 | `GET /api/sessions/stats`（同上文件族的 stats 路由） | done |
| 模型清单 `models.list` | `GET /api/models` | done |
| 文件打开 `files.open` | `POST /api/files`（上传/打开二选一，本能力只用打开） | done |
| 扩展 UI 桥 | 不迁（CHG-004），无实现 | skipped |

## 2. 已完成的联调证据

- `GET /api/sessions` 在 30041 上真跑过（C-G 期间 `curl` 返回 2 条），本能力沿用同一路由，未做二次封装。
- 端口契约 `P-C-01…P-C-04` 与 `design/interfaces.ts` 一致（`tsc -p packages/web` 通过）。

## 3. 未联调部分（不许留空行）

| 项 | 为什么没联调 | 何时做 |
|---|---|---|
| `POST /api/agent/[id]` | — | 由 **C-A 代理运行时**交付，本能力只依赖端口 | `e2e/chat` + `vitest`（本能力内部） |
| 扩展 UI 协议 | 用户决定不迁（CHG-004） | 后续独立立项 |
