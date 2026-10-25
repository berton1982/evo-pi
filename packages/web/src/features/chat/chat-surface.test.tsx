// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ChatSurface } from './chat-surface'
import { createFakeTransport } from './dev-fake-transport'

afterEach(cleanup)

describe('ChatSurface 运行态（注入传输）', () => {
  it('运行中发送位让位给「引导/追加」，结束后恢复「发送」', async () => {
    const transport = createFakeTransport({ chunkDelayMs: 40, reply: ['a', 'b'] })
    render(<ChatSurface sessionId="s-test" cwd={null} transport={transport} />)

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: '第一句' } })
    fireEvent.click(screen.getByTestId('chat-send'))

    // 运行中：引导/追加出现，发送消失
    await waitFor(() => expect(screen.getByTestId('chat-steer')).toBeTruthy())
    expect(screen.getByTestId('chat-follow-up')).toBeTruthy()
    expect(screen.queryByTestId('chat-send')).toBeNull()

    // 结束：回到发送
    await waitFor(() => expect(screen.queryByTestId('chat-steer')).toBeNull(), { timeout: 3000 })
    expect(screen.getByTestId('chat-send')).toBeTruthy()
  })
})
