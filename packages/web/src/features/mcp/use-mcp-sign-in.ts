'use client'
// 客户端组件/钩子：这里用 state、effect、事件处理器。显式声明比靠父层推导安全——
// 一旦有人把它 import 进服务端组件，Next 会在构建期报错，而不是运行时才炸。
/**
 * @design H-03
 *
 * 签到轮询（行为 B-027 / B-028 / B-029）。
 *
 * 三条语义都来自 pi-web 的真实行为，不是设计想象：
 * - 每轮结果用**轮次号**比对，旧轮次的答案直接丢（`McpConfig.tsx:538` 的 version 比对）；
 * - 卸载只停轮询，**不**发 DELETE——那会把用户在浏览器里正在做的授权掐掉；
 * - 失败保留 `flowId`，重试续同一流程。
 */

import type { McpServerSummary, McpSignInFlowPort, Outcome } from '@evo-pi/core/mcp'
import { createSignInFlow, mergeRound, type SignInSession } from '@evo-pi/core/mcp'

export interface SignInDeps {
  flow: McpSignInFlowPort
  cwd: string | null
  /** 注入调度器，测试里用假定时器代替 */
  setTimer?: (fn: () => void, ms: number) => number
  clearTimer?: (id: number) => void
  intervalMs?: number
}

export function createMcpSignIn(deps: SignInDeps) {
  const flow = createSignInFlow({ flow: deps.flow })
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms) as unknown as number)
  const clearTimer = deps.clearTimer ?? ((id) => clearTimeout(id))
  const state: SignInState = {
    current: null,
    timer: null,
    stopped: false,
    interval: deps.intervalMs ?? 1500,
  }

  const stopTimer = () => {
    if (state.timer === null) return
    clearTimer(state.timer)
    state.timer = null
  }
  const pollOnce = createPollOnce(flow, state)
  const schedule = createScheduler({ state, stopTimer, setTimer, pollOnce })
  const actions = createActions({ flow, cwd: deps.cwd, state, stopTimer, schedule })

  return {
    start: actions.start,
    /** 一轮轮询：返回新状态；旧轮次（外部传入的 session 不是当前轮）返回 undefined */
    pollRound: pollOnce,
    /** 卸载：只停轮询，不 cancel */
    unmount: () => {
      state.stopped = true
      stopTimer()
    },
    /** 用户显式取消：才是真的终止流程 */
    cancel: actions.cancel,
    get session() {
      return state.current
    },
    get polling() {
      return state.timer !== null && !state.stopped
    },
    _scheduleForTest: schedule,
  }
}

/** 轮询状态（闭包里只有它需要被多个 helper 共享） */
interface SignInState {
  current: SignInSession | null
  timer: number | null
  stopped: boolean
  interval: number
}

/**
 * 单轮轮询：旧轮次的答案直接丢。
 * 抽成模块级函数是因为"判定这一轮还算不算数"和"定时器生命周期"是两件事，
 * 混在一个 78 行的工厂里，两种 bug 会互相掩盖。
 */
function createPollOnce(flow: ReturnType<typeof createSignInFlow>, state: SignInState) {
  return async (session: SignInSession): Promise<SignInSession | undefined> => {
    const res = await flow.poll(session)
    if (!res.ok || !res.value) return undefined
    const previous = state.current
    // 轮次没有前进 = 这一轮的答案已被更新的那轮取代（或服务端重复回了上一次），不落库
    if (previous && res.value.round <= previous.round) return undefined
    state.current = previous ? mergeRound(previous, res.value) : res.value
    return state.current
  }
}

function createScheduler(input: {
  state: SignInState
  stopTimer: () => void
  setTimer: (fn: () => void, ms: number) => number
  pollOnce: (session: SignInSession) => Promise<SignInSession | undefined>
}) {
  const { state, stopTimer, setTimer, pollOnce } = input
  return function schedule() {
    stopTimer()
    state.timer = setTimer(async () => {
      state.timer = null
      if (state.stopped || !state.current) return
      await pollOnce(state.current)
      if (!state.stopped && state.current?.state === 'pending') schedule()
    }, state.interval)
  }
}

function createActions(input: {
  flow: ReturnType<typeof createSignInFlow>
  cwd: string | null
  state: SignInState
  stopTimer: () => void
  schedule: () => void
}) {
  const { flow, cwd, state, stopTimer, schedule } = input
  return {
    async start(server: McpServerSummary): Promise<Outcome<SignInSession>> {
      state.stopped = false
      const res = await flow.start({ scope: server.scope, name: server.name }, cwd)
      if (res.ok && res.value) {
        state.current = res.value
        schedule()
      }
      return res
    },
    async cancel(): Promise<Outcome<void>> {
      state.stopped = true
      stopTimer()
      if (!state.current) return { ok: true }
      const res = await flow.cancel(state.current)
      state.current = null
      return res
    },
  }
}
