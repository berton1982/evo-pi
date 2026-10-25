/**
 * @design D-B-06
 * 复制消息：只复制"最终回答"的文本块（含 markdown 原文），不复制思考与工具日志。
 *
 * 为什么是规则不是基础设施：复制什么内容由领域决定；怎么落到剪贴板由端口决定。
 * pi-web 的 `MessageView.tsx:242` 里这段判断和 `navigator.clipboard` 写在一起，
 * 搬出来之后，桌面端换实现不需要改这段。
 */
import type { Clipboard } from '../domain/ports/clipboard'

export interface CopyableBlock {
  type: string
  text?: string
}

/** 拼接可复制文本：text 块用原文，其它块跳过（思考、工具、图表不可复制成文本） */
export function copyableText(blocks: readonly CopyableBlock[]): string {
  return blocks
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text?.trim() ?? '')
    .filter((text) => text.length > 0)
    .join('\n\n')
}

export function createCopyMessage({ clipboard }: { clipboard: Clipboard }): {
  copy(blocks: readonly CopyableBlock[]): Promise<{ ok: boolean; copied: number; error?: string }>
} {
  return {
    async copy(blocks) {
      const text = copyableText(blocks)
      // 空内容不写剪贴板：写了会清掉用户原有剪贴板，这是"顺手毁数据"
      if (!text) return { ok: false, copied: 0, error: 'empty' }
      const result = await clipboard.writeText(text)
      return result.ok
        ? { ok: true, copied: blocks.filter((b) => b.type === 'text').length }
        : { ok: false, copied: 0, error: result.error ?? 'clipboard-failed' }
    },
  }
}
