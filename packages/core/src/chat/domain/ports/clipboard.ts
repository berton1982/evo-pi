/**
 * @design P-C-04
 * 剪贴板：浏览器与将来的桌面端实现不同，`copy-message` 用例只依赖这个契约。
 */
export interface Clipboard {
  writeText(text: string): Promise<{ ok: boolean; error?: string }>
}
