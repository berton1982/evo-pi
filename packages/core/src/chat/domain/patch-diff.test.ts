import { describe, expect, it } from 'vitest'

import {
  extractPatchPaths,
  getAppliedFiles,
  getPatchInputText,
  patchResultHasFailures,
  splitPatch,
} from './patch-diff'

const PATCH = [
  '*** Begin Patch',
  '*** Update File: src/a.ts',
  '*** Move to: src/b.ts',
  '@@ ctx',
  ' keep',
  '-old',
  '+new',
  '*** Delete File: src/gone.ts',
  '-dead',
  '*** Add File: src/new.ts',
  '+fresh',
  '*** End Patch',
].join('\n')

describe('T-05 apply_patch 解析（D-U-15 / B-031）', () => {
  it('按出现顺序列出被操作文件', () => {
    expect(extractPatchPaths(PATCH)).toEqual(['src/a.ts', 'src/gone.ts', 'src/new.ts'])
  })

  it('入参优先取 input.input，其次原始输入', () => {
    expect(getPatchInputText({ input: 'P' }, 'raw')).toBe('P')
    expect(getPatchInputText({}, 'raw')).toBe('raw')
    expect(getPatchInputText(null)).toBe('')
  })

  it('拆成按文件的左右行，并保留重命名', () => {
    const files = splitPatch(PATCH)
    expect(files.map((f) => [f.filePath, f.operation, f.movePath])).toEqual([
      ['src/a.ts', 'update', 'src/b.ts'],
      ['src/gone.ts', 'delete', undefined],
      ['src/new.ts', 'add', undefined],
    ])
    const update = files[0]
    expect(update?.rows).toHaveLength(3)
    // rows 是判别联合：header 行没有 left/right，读之前先确认形态
    const row1 = update?.rows[1]
    const row2 = update?.rows[2]
    if (row1 && row1.type === 'line') {
      expect(row1.left).toMatchObject({ type: 'removed', text: 'old' })
      expect(row1.right).toMatchObject({ type: 'empty', text: '' })
    }
    if (row2 && row2.type === 'line')
      expect(row2.right).toMatchObject({ type: 'added', text: 'new' })
  })

  it('没有可渲染行时不产出文件（流式期间的半截补丁）', () => {
    expect(splitPatch('*** Begin Patch\n*** Update File: x.ts\n*** End Patch')).toEqual([])
  })

  it('失败挂在 details.result.failures 而不是 isError', () => {
    expect(patchResultHasFailures({ result: { failures: ['a'] } })).toBe(true)
    expect(patchResultHasFailures({ result: { failures: [] } })).toBe(false)
    expect(patchResultHasFailures(null)).toBe(false)
  })

  it('appliedFiles 缺失时返回 null 让调用方回退', () => {
    expect(getAppliedFiles({ result: {} })).toBeNull()
    expect(getAppliedFiles({ result: { appliedFiles: ['a', '', 3] } })).toEqual(['a'])
  })
})
