/**
 * @design D-U-02
 * @design D-S-01
 * 用户可见文案（对应 pi-web `McpConfig.tsx` L174-L294 的文本函数）。
 *
 * 为什么这些函数在 core 而不是 web：它们只依赖「翻译函数 + 数据」，不碰 DOM。
 * pi-web 里它们和 2258 行的组件混在一起，导致「换一个词」也要读组件；
 * 拆到 core 后可以按 i18n 键逐条断言（behaviors B-006 / B-008，测试 T-01 / T-02 / T-03）。
 */

import type { McpServerSummary } from './mcp-types'

/** 翻译函数的最小形状：只要 key + 可选参数。web 侧传 `useI18n().t` */
export type Translate = (key: string, params?: Record<string, string | number>) => string

export function displayPath(input: string, home: string, root: string): string {
  if (!input) return ''
  if (root && input.startsWith(`${root}/`)) return input.slice(root.length + 1)
  if (home && input === home) return '~'
  if (home && input.startsWith(`${home}/`)) return `~/${input.slice(home.length + 1)}`
  return input
}

/** 添加成功后的提示文案：带名字与作用域，避免"已添加"却不知道加到了哪个作用域 */
export function addedNotice(added: McpServerSummary, t: Translate): string {
  return t('mcp.addedNotice', {
    name: added.name,
    scope: added.scope === 'project' ? t('mcp.inProject') : t('mcp.userScope'),
  })
}

/** 失败文案：按错误码分类，未知码退化成通用失败（不把服务端原文丢给用户） */
export function failureText(
  error: { code?: string; message?: string; timedOut?: boolean },
  t: Translate,
): string {
  if (error.timedOut) return t('mcp.failure.timeout')
  switch (error.code) {
    case 'trust-not-required':
      return t('mcp.failure.trustNotRequired')
    case 'untrusted':
    case 'trust_required':
      return t('mcp.failure.untrusted')
    case 'not-found':
      return t('mcp.failure.notFound')
    case 'invalid-name':
      return t('mcp.failure.invalidName')
    default:
      return error.message
        ? t('mcp.failure.genericWithReason', { reason: error.message })
        : t('mcp.failure.generic')
  }
}
