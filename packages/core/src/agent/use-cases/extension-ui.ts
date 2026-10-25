/**
 * @design D-U-05 extension UI 请求的边界
 *
 * 本能力**不迁扩展 UI 宿主**（`cut-list.md`：`ChatWindow.tsx:1665-2282` 617 行）。
 * 但协议不能沉默：pi SDK 会发 `extension_ui_request`，不回就等于让插件卡住。
 * 所以这里的职责只有一条——**明确拒绝并说明原因**，而不是假装支持。
 */
export type ExtensionUiDecision =
  | {
      kind: 'reject'
      reason: string
      respond: { type: 'extension_ui_response'; id: string; cancelled: true }
    }
  | { kind: 'ignore'; reason: string }

export interface ExtensionUiRequest {
  id: string
  method?: string
}

export function decideExtensionUi(request: ExtensionUiRequest): ExtensionUiDecision {
  const method = request.method ?? 'unknown'
  if (!request.id) return { kind: 'ignore', reason: '请求没有 id，回了也对不上' }
  return {
    kind: 'reject',
    reason: `扩展 UI（${method}）本轮未迁移，见 cut-list`,
    // 必须带 cancelled：插件侧据此结束等待，不会一直挂着
    respond: { type: 'extension_ui_response', id: request.id, cancelled: true },
  }
}
