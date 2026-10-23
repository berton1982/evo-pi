'use client'
/**
 * @design D-U-04
 * @design C-03
 *
 * 空态：告诉用户"配置在哪、怎么写、现在就能加一条"。
 *
 * 为什么不是一句 `No MCP servers configured`：新用户看到那句话之后没有任何可做的事——
 * 既不知道文件在哪，也不知道格式，更不知道下一步点哪里（2026-10-23 实测反馈）。
 * 所以这里给三样东西：两份配置的绝对路径、一份可直接抄的示例、一个就地添加的表单。
 */
import type { Translate } from '@evo-pi/core/mcp'
import { useState } from 'react'

export interface AddServerInput {
  name: string
  scope: 'user' | 'project'
  command?: string
  url?: string
}

export function McpEmptyState({
  t,
  userPath,
  projectPath,
  onAdd,
  pending,
  error,
}: {
  t: Translate
  userPath: string
  projectPath: string | null
  onAdd: (input: AddServerInput) => void
  pending: boolean
  error: string | null
}): React.JSX.Element {
  return (
    <section
      data-testid="mcp-empty"
      className="space-y-4 rounded-lg border border-border bg-card p-4 text-sm"
    >
      <div>
        <h2 className="font-semibold">{t('mcp.empty.title')}</h2>
        <p className="mt-1 text-muted-foreground">{t('mcp.empty.hint')}</p>
      </div>

      <dl className="space-y-1 font-mono text-xs">
        <div>
          <dt className="inline text-muted-foreground">{t('mcp.empty.userConfig')}: </dt>
          <dd className="inline" data-testid="mcp-empty-user-path">
            {userPath}
          </dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">{t('mcp.empty.projectConfig')}: </dt>
          <dd className="inline" data-testid="mcp-empty-project-path">
            {projectPath}
          </dd>
        </div>
      </dl>

      <pre className="overflow-x-auto rounded bg-muted p-3 font-mono text-xs">{`{
  "mcpServers": {
    "memory": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-memory"] }
  }
}`}</pre>

      <McpAddForm error={error} onAdd={onAdd} pending={pending} t={t} />
    </section>
  )
}

/**
 * 添加表单（空态与「添加 MCP」按钮共用）。
 *
 * 为什么要抽出来：pi-web 的两个入口（空态引导 + 工具栏按钮）用的是**同一张表单**；
 * 各写一份必然漂移（C-G 试点里空态表单与后来的按钮展开就字段顺序不一致）。
 */
export function McpAddForm({
  t,
  onAdd,
  pending,
  error,
}: {
  t: Translate
  onAdd: (input: AddServerInput) => void
  pending: boolean
  error: string | null
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [scope, setScope] = useState<'user' | 'project'>('user')
  const [transport, setTransport] = useState<'stdio' | 'http'>('stdio')
  const [command, setCommand] = useState('npx -y @modelcontextprotocol/server-memory')
  const [url, setUrl] = useState('http://localhost:9001/mcp')
  const canSubmit = name.trim().length > 0 && !pending
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        onAdd({
          name: name.trim(),
          scope,
          ...(transport === 'stdio' ? { command: command.trim() } : { url: url.trim() }),
        })
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{t('mcp.add.name')}</span>
          <input
            data-testid="mcp-add-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="memory"
            className="w-40 rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{t('mcp.add.scope')}</span>
          <select
            data-testid="mcp-add-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as 'user' | 'project')}
            className="rounded border border-border bg-background px-2 py-1"
          >
            <option value="user">user</option>
            <option value="project">project</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{t('mcp.add.transport')}</span>
          <select
            data-testid="mcp-add-transport"
            value={transport}
            onChange={(e) => setTransport(e.target.value as 'stdio' | 'http')}
            className="rounded border border-border bg-background px-2 py-1"
          >
            <option value="stdio">stdio</option>
            <option value="http">http</option>
          </select>
        </label>
        {transport === 'stdio' ? (
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t('mcp.add.command')}</span>
            <input
              data-testid="mcp-add-command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs"
            />
          </label>
        ) : (
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t('mcp.add.url')}</span>
            <input
              data-testid="mcp-add-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs"
            />
          </label>
        )}
        <button
          type="submit"
          data-testid="mcp-add-submit"
          disabled={!canSubmit}
          className="rounded border border-border bg-primary px-3 py-1 text-primary-foreground disabled:opacity-50"
        >
          {pending ? t('mcp.add.submitting') : t('mcp.add.submit')}
        </button>
      </div>
      {error ? (
        <p data-testid="mcp-add-error" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </form>
  )
}
