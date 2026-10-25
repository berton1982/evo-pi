'use client'

import type { Clipboard } from '@evo-pi/core/chat'

/**
 * 剪贴板端口实现（P-C-04）。
 *
 * `navigator.clipboard` 不可用时（http、无权限、旧浏览器）退到
 * `execCommand('copy')`；两条都失败要如实返回失败——
 * "已复制"提示必须在真的写进去之后才出现。
 */
export function createBrowserClipboard(): Clipboard {
  return {
    async writeText(text: string): Promise<{ ok: boolean; error?: string }> {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
          return { ok: true }
        }
        if (typeof document === 'undefined') return { ok: false, error: 'no-clipboard' }
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.append(area)
        area.select()
        const copied = document.execCommand('copy')
        area.remove()
        return copied ? { ok: true } : { ok: false, error: 'copy-failed' }
      } catch (error) {
        return { ok: false, error: String(error) }
      }
    },
  }
}
