# UI / UX 原型（C-A 代理运行时）

## 不适用

本能力是运行时基础设施：**不渲染任何界面、不产生 CSS、不新增 i18n 键**。
证据：`hooks/useAgentSession.ts:342` 的 `useAgentSession` 只返回状态与动作对象（无 JSX）；
`lib/rpc-manager.ts:843` 是命令分发 `switch`；`lib/mcp-host.ts:180`、`lib/subagents.ts:529` 是纯函数与文件操作。
界面由消费方负责（壳 `packages/web/src/shell/layout/app-layout.tsx` 与 C-B/C-C 的会话面），
它们各自的原型在本能力之外；本能力只保证"命令进、事件出"两个方向的契约（见 `dynamics.md`）。
