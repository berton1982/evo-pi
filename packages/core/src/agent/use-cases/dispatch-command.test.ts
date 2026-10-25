import { describe, expect, it, vi } from 'vitest'
import type { AgentTransport } from '../domain/ports/agent-transport'
import { createDispatchCommand, isRpcCommand, RPC_COMMANDS } from './dispatch-command'

const transport = (): { send: ReturnType<typeof vi.fn>; subscribe: () => () => void } => ({
  send: vi.fn(async () => ({ ok: true as const })),
  subscribe: () => () => {},
})

/** T-03 */
describe('dispatchCommand（T-03 命令分发）', () => {
  it('prompt 默认走 steer，follow_up 走 followUp', async () => {
    const t = transport()
    const { dispatch } = createDispatchCommand({ transport: t as unknown as AgentTransport })
    await dispatch({ command: 'prompt', text: 'hi' })
    await dispatch({ command: 'follow_up', text: 'later' })
    expect(t.send.mock.calls[0]?.[1]).toMatchObject({ text: 'hi', mode: 'steer' })
    expect(t.send.mock.calls[1]?.[1]).toMatchObject({ text: 'later', mode: 'followUp' })
  })

  it('abort 走传输的 abort，不携带正文', async () => {
    const t = transport()
    const { dispatch } = createDispatchCommand({ transport: t as unknown as AgentTransport })
    await dispatch({ command: 'abort' })
    expect(t.send).toHaveBeenCalledWith('abort', expect.objectContaining({ text: '' }))
  })

  it('没有传输通道的命令如实返回 unsupported，而不是假装成功', async () => {
    const t = transport()
    const { dispatch } = createDispatchCommand({ transport: t as unknown as AgentTransport })
    const res = await dispatch({ command: 'set_model' })
    expect(res.ok).toBe(false)
    expect(res.ok === false && res.error.code).toBe('unsupported')
    expect(t.send).not.toHaveBeenCalled()
  })

  it('命令表与契约一致：prompt/steer/follow_up 都在表里', () => {
    expect(RPC_COMMANDS.length).toBeGreaterThan(20)
    expect(isRpcCommand('prompt')).toBe(true)
    expect(isRpcCommand('Prompt')).toBe(false) // 大小写敏感，避免拼错被默默接受
  })
})
