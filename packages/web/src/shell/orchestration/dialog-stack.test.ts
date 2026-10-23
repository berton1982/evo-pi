import { beforeEach, describe, expect, it } from 'vitest'
import { topDialog, useDialogStack } from './dialog-stack'

describe('T-39 对话框栈', () => {
  beforeEach(() => useDialogStack.setState({ stack: [] }))

  it('同 id 再次打开是置顶而不是叠两份', () => {
    const { push } = useDialogStack.getState()
    push({ id: 'settings', payload: { section: 'general' } })
    push({ id: 'confirm' })
    push({ id: 'settings', payload: { section: 'mcp' } })
    const { stack } = useDialogStack.getState()
    expect(stack.map((e) => e.id)).toEqual(['confirm', 'settings'])
    expect(topDialog(stack)?.payload?.section).toBe('mcp')
  })

  it('Esc 只关最上面一层（不是全关）', () => {
    const { push, pop } = useDialogStack.getState()
    push({ id: 'a' })
    push({ id: 'b' })
    pop()
    expect(topDialog(useDialogStack.getState().stack)?.id).toBe('a')
  })

  it('close 按 id 移除，空栈时 topDialog 为 null', () => {
    const { push, close } = useDialogStack.getState()
    push({ id: 'a' })
    push({ id: 'b' })
    close('a')
    expect(useDialogStack.getState().stack.map((e) => e.id)).toEqual(['b'])
    useDialogStack.getState().closeAll()
    expect(topDialog(useDialogStack.getState().stack)).toBeNull()
  })
})
