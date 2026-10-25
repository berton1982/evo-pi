'use client'

import type { FileOpener } from '@evo-pi/core/chat'

/**
 * 文件打开端口实现（P-C-03）：走服务端 `/api/cwd/open`。
 *
 * 为什么不在浏览器里直接改 URL：打开文件要落到宿主（编辑器/面板）上，
 * 这个能力只负责"请求打开"，落到哪里由宿主决定（本仓库接成打开右栏文件面板）。
 */
export function createHttpFileOpener(
  options: { fetchImpl?: typeof fetch; baseUrl?: string } = {},
): FileOpener {
  const doFetch = options.fetchImpl ?? fetch
  return {
    async open(input): Promise<{ ok: boolean; error?: string }> {
      try {
        const response = await doFetch(`${options.baseUrl ?? ''}/api/cwd/open`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        })
        if (response.ok) return { ok: true }
        const body = (await response.json().catch(() => null)) as {
          error?: { code?: string }
        } | null
        return { ok: false, error: body?.error?.code ?? `http-${response.status}` }
      } catch (error) {
        return { ok: false, error: String(error) }
      }
    },
  }
}
