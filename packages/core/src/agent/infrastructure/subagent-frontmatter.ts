/**
 * @design D-A-02 frontmatter 解析
 *
 * 只支持子代理档案实际用到的子集（`key: value` + 简单列表），
 * 不引 YAML 库：pi-web 的档案格式固定，多一个解析器就多一处"两边解析不一样"。
 */
export interface Frontmatter {
  values: Record<string, string>
  body: string
}

export function parseFrontmatter(text: string): Frontmatter {
  const normalized = text.replace(/^\uFEFF/, '')
  if (!normalized.startsWith('---')) return { values: {}, body: normalized }
  const end = normalized.indexOf('\n---', 3)
  // 没有闭合就是坏档案：明确抛错比"当正文处理"安全（后者会把元数据当提示词发给模型）
  if (end < 0) throw new Error('缺 frontmatter 结束标记 ---')
  const head = normalized.slice(3, end).trim()
  const body = normalized.slice(end + 4).replace(/^\n/, '')
  const values: Record<string, string> = {}
  for (const line of head.split('\n')) {
    const m = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line.trim())
    // noUncheckedIndexedAccess 下 m[1]/m[2] 可能是 undefined，显式兜底
    if (m && m[1] !== undefined) values[m[1]] = (m[2] ?? '').trim()
  }
  return { values, body }
}

export function formatFrontmatter(values: Record<string, string>, body: string): string {
  const head = Object.entries(values)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  return `---\n${head}\n---\n${body}`
}
