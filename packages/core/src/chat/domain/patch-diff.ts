/**
 * @design D-B-05
 * @design D-U-15
 * Codex 风格 `apply_patch` 的解析与"可渲染行"生成。
 *
 * 移植自 `ref_projects/pi-web/lib/apply-patch.ts`。为什么领域层要持有它：
 * 这类工具的入参是**自由文本 V4A 补丁**，不是统一 diff；把它当纯文本塞给组件，
 * 就等于让每个渲染点各写一遍解析（pi-web 里正因如此在 MessageView 里又写了一份）。
 */

export type DiffRow =
  | { type: 'line'; left: DiffCell; right: DiffCell }
  | { type: 'header'; text: string }

export interface DiffCell {
  lineNo: number | null
  text: string
  type: 'context' | 'removed' | 'added' | 'empty'
}

export interface PatchFile {
  filePath: string
  movePath?: string
  operation: 'add' | 'update' | 'delete'
  rows: DiffRow[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 补丁文本里被操作的文件，按出现顺序去重。 */
export function extractPatchPaths(patchText: string): string[] {
  const paths: string[] = []
  for (const match of patchText.matchAll(/^\*\*\* (?:Add|Delete|Update) File: (.+)$/gm)) {
    const filePath = (match[1] ?? '').trim()
    if (filePath && !paths.includes(filePath)) paths.push(filePath)
  }
  return paths
}

/** 从工具调用入参里取出补丁正文（`input` 字段优先，其次原始输入）。 */
export function getPatchInputText(input: unknown, rawInput?: string): string {
  if (isRecord(input)) {
    const value = input.input
    if (typeof value === 'string' && value.length > 0) return value
  }
  return typeof rawInput === 'string' ? rawInput : ''
}

/**
 * `pi-apply-patch` 把逐文件失败放在正常结果的 `details.result.failures` 里，
 * 而不是置 `isError`——只看 `isError` 会把"部分文件没写进去"显示成成功。
 */
export function patchResultHasFailures(details: unknown): boolean {
  if (!isRecord(details) || !isRecord(details.result)) return false
  const failures = details.result.failures
  return Array.isArray(failures) && failures.length > 0
}

/** 扩展报告"确实落地"的文件；字段缺失返回 null，让调用方回退到 preview/入参解析。 */
export function getAppliedFiles(details: unknown): string[] | null {
  if (!isRecord(details) || !isRecord(details.result)) return null
  const applied = details.result.appliedFiles
  if (!Array.isArray(applied)) return null
  return applied.filter((p): p is string => typeof p === 'string' && p.length > 0)
}

/**
 * 把 V4A 补丁拆成"按文件的左右行"。
 *
 * 规则只覆盖渲染需要的部分：`*** X File:` 起新文件、`*** Move to:` 记录重命名、
 * 行首 `+/-/ ` 分别是新增/删除/上下文，`@@` 与其它 `***` 行当分隔丢掉。
 * 行号留 null：V4A 不保证给出真实行号，编一个假的会让人以为能点跳转。
 */
export function splitPatch(patchText: string): PatchFile[] {
  const files: PatchFile[] = []
  let current: PatchFile | null = null
  const push = () => {
    if (current && current.rows.length > 0) files.push(current)
    current = null
  }
  for (const raw of patchText.split('\n')) {
    const op = raw.match(/^\*\*\* (Add|Update|Delete) File: (.+)$/)
    if (op) {
      push()
      const operation = (op[1] ?? '').toLowerCase() as PatchFile['operation']
      current = { filePath: (op[2] ?? '').trim(), operation, rows: [] }
      continue
    }
    if (/^\*\*\* (Begin Patch|End Patch)/.test(raw)) {
      push()
      continue
    }
    const file = current
    if (!file) continue
    const move = raw.match(/^\*\*\* Move to: (.+)$/)
    if (move) {
      file.movePath = (move[1] ?? '').trim()
      continue
    }
    if (raw.startsWith('@@')) continue
    const marker = raw[0]
    const text = raw.slice(1)
    if (marker === '+' || marker === '-' || marker === ' ') {
      const cell: DiffCell = {
        lineNo: null,
        text,
        type: marker === '+' ? 'added' : marker === '-' ? 'removed' : 'context',
      }
      // 上下文行两边同文；新增只出现在右、删除只出现在左
      file.rows.push({
        type: 'line',
        left: cell.type === 'added' ? { lineNo: null, text: '', type: 'empty' } : cell,
        right: cell.type === 'removed' ? { lineNo: null, text: '', type: 'empty' } : cell,
      })
    }
  }
  push()
  return files
}
