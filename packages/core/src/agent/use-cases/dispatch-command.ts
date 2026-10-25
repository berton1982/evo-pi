/**
 * @design D-U-12 命令字面量与事件名集合
 * @design D-B-01 dispatchCommand：把界面意图翻成传输命令
 *
 * 为什么命令表在这儿而不是散在调用点：`rpc-manager.ts` 有 24 个 rpc 命令，
 * 散写的结果是"某个命令没人发、某个拼错没人知道"。这里只做两件事——认名字、给默认值。
 */
import type {
  AgentTransport,
  StreamMode,
  TransportCommand,
  TransportOutcome,
} from '../domain/ports/agent-transport'

/** pi SDK 的 rpc 命令全集（与 `contracts/wire.md` 的「## RPC 命令」表一一对应） */
export const RPC_COMMANDS = [
  'mcp',
  'message_start',
  'auto_compaction_start',
  'auto_compaction_end',
  'extension_ui_closed',
  'set_model',
  'set_thinking_level',
  'get_state',
  'set_tools',
  'set_auto_compaction',
  'set_auto_retry',
  'bash',
  'steer',
  'follow_up',
  'clear_queue',
  'abort',
  'abort_compaction',
  'abort_bash',
  'fork',
  'fork_branch',
  'get_commands',
  'get_session_stats',
  'get_tools',
  'get_last_assistant_text',
  'prompt',
  'extension_ui_response',
  'extension_ui_input',
  'set_session_name',
  'navigate_tree',
] as const

export type RpcCommand = (typeof RPC_COMMANDS)[number]

/** 命令 → 传输行为。未登记的命令直接拒绝，而不是"发出去看看"。 */
const TRANSPORT_OF: Partial<Record<RpcCommand, TransportCommand>> = {
  prompt: 'prompt',
  steer: 'prompt',
  follow_up: 'prompt',
  abort: 'abort',
  auto_compaction_start: 'compact',
}

export function isRpcCommand(name: string): name is RpcCommand {
  return (RPC_COMMANDS as readonly string[]).includes(name)
}

export interface DispatchRequest {
  command: RpcCommand
  text?: string
  mode?: StreamMode
  clientRequestId?: string
  /** 其它命令的载荷原样透传（set_model 之类不在这里解释语义） */
  payload?: unknown
}

export function createDispatchCommand({ transport }: { transport: AgentTransport }): {
  dispatch: (req: DispatchRequest) => Promise<TransportOutcome>
} {
  return {
    dispatch: async (req) => {
      if (!isRpcCommand(req.command))
        return { ok: false, error: { code: 'unknown-command', message: req.command } }
      const asTransport = TRANSPORT_OF[req.command]
      if (asTransport) {
        // prompt/steer/followUp 都走同一个传输命令，差别在 mode——
        // 传输层按 mode 决定"本轮投递"还是"下一轮投递"，这是 B-047/B-048 的分界
        return transport.send(asTransport, {
          text: req.text ?? '',
          mode: req.mode ?? (req.command === 'follow_up' ? 'followUp' : 'steer'),
          clientRequestId: req.clientRequestId,
        })
      }
      // 其余 rpc 命令暂时无对应传输通道：如实返回 unsupported，不假装成功
      return { ok: false, error: { code: 'unsupported', message: `${req.command} 还没有传输通道` } }
    },
  }
}
