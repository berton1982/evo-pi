# 规格 S-03：扩展 UI 的边界（本次明确不迁）

### 端到端链路

1. agent 发出扩展请求（`extension_ui_request`，见 `contracts/wire.md` v0.3 的「RPC 命令」表）
2. **本次实现的行为：不渲染**。容器收到后只在通知区显示一条"扩展 UI 暂未支持"的提示，并把请求标记为未处理
3. 用户看到提示后可继续对话；不会出现"弹窗转圈"
4. 该请求**不阻塞**消息流：后续 `message_*` 事件照常渲染
5. C-A 完成后再立 C-C-EXT：届时按 `dialog-stack` 呈现，且必须复用同一份协议（不另写解析）
6. 验收口径：本能力内不存在任何 `ExtensionDialog` / `ExtensionCustomPanel` 的等价实现，`grep -r "extension"` 只命中这一条提示与类型

### 决策表

| 选项 | 结论 | 被否方案 | 判错代价 | 证据 |
|---|---|---|---|
| 本次是否迁扩展 UI | 不迁，显式提示 | 先迁一半（只做 select/confirm） | 用户遇到 editor/custom 类型仍卡住，且我们会以为"已支持" | `ref_projects/pi-web/components/ChatWindow.tsx:1698` |
| 提示位置 | 通知区（notice） | 消息流里的假消息 | 假的助手消息会污染会话与后续对账 | `ref_projects/pi-web/components/ChatWindow.tsx:1698` |
| 阻塞策略 | 不阻塞 | 阻塞直到响应 | 一个扩展请求能把整个会话卡死 | `ref_projects/pi-web/components/ChatWindow.tsx:1698` |
| 未来实现 | `dialog-stack` + 共享协议 | 各能力各自解析协议 | 同一协议三份实现，必然漂移 | `ref_projects/pi-web/components/ChatWindow.tsx:1698` |

### 落点

- `packages/web/src/features/chat/extension-notice.tsx`：唯一一处扩展相关 UI（一行提示）
- 类型来自 `@evo-pi/core/chat` 的 `ExtensionRequestSummary`（只含 `id`/`method`/`summary`，不含渲染细节）
- 砍单条目见 `cut-list.md`（`ref_projects/pi-web/components/ChatWindow.tsx:1665-2282`）

## 测试

本规格的验收测试：T-07、T-08（对应 `behaviors.md` 的脚本，C5 落 `e2e/chat/`；证据 `ref_projects/pi-web/components/ChatWindow.tsx:1698`）
