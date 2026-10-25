'use client'

/**
 * 会话上下文：给深层的思考块提供 `sessionId`，避免把 sessionId 从容器一路
 * 透传到 `BlockView`（那是 6 层 props 打洞）。
 */
import { createContext, useContext } from 'react'

const ChatSessionContext = createContext<string | null>(null)

export const ChatSessionProvider = ChatSessionContext.Provider

export function useChatSessionId(): string | null {
  return useContext(ChatSessionContext)
}
