/**
 * @design D-A-03 列表与映射的极简解析（tools / disallowedTools / denials）
 *
 * 只认两种形状：`- item` 列表与 `key: [a, b]` 行内列表。
 * 遇到不认识的形状**抛错而不是忽略**——静默忽略会让"配了 8 个工具却只生效 3 个"。
 */
export function parseListValue(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[') && trimmed.endsWith(']'))
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean)
  return [trimmed.replace(/^["']|["']$/g, '')]
}

export function parseBlockList(lines: readonly string[]): string[] {
  const out: string[] = []
  for (const line of lines) {
    const m = /^\s*-\s*(.+)$/.exec(line)
    if (m && m[1] !== undefined) out.push(m[1].trim().replace(/^["']|["']$/g, ''))
  }
  return out
}

/** denials：`tool: reason` 形状，reason 可缺省。 */
export function parseDenials(raw: unknown): { tool: string; reason: string | null }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => String(item))
    .map((line) => {
      const [tool, ...rest] = line.split(':')
      const reason = rest.join(':').trim()
      return { tool: (tool ?? '').trim(), reason: reason || null }
    })
    .filter((d) => d.tool)
}
