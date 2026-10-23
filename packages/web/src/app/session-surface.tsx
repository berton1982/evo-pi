'use client'

import { mcpSettingsPanel } from '@/features/mcp/panel-spec'
import { MessageView } from '@/features/sessions/message-view'
import { Layout } from '@/shell/layout/app-layout'
import { CenterZone } from '@/shell/layout/center-pane'
import { RightZone } from '@/shell/layout/detail-pane'
import { SettingsPanel } from '@/shell/layout/settings-panel'
import { TopBar } from '@/shell/layout/top-bar'
import { useSessionsPage } from '@/shell/orchestration/use-sessions-page'
import { useShellCommands } from '@/shell/orchestration/use-shell-commands'
import { LeftZone } from './left-zone'

/**
 * 会话壳的装配点（`/` 与 `/sessions` 共用）。
 *
 * 为什么不各自写一份：pi-web 是单路由应用，入口就是壳本身；如果 `/` 只做
 * `redirect('/sessions')`，入口形态就变成了"另一个名字的二级路由"，URL 里
 * 的 `cwd`/选中态语义也没人定义（D-1，见 `.evo/migration/20261024-web-recal/PROGRAM.md`）。
 * 装配只允许写一次，两条路由都渲染它。
 *
 * 这里是唯一允许 `shell/** + features/**` 同时出现的地方（装配层）。
 * 规矩见 `packages/web/ARCHITECTURE.md`：壳不认能力，能力不互相认，
 * 谁跟谁拼在一起只写在这一个文件里。
 *
 * Next.js 要求 `useSearchParams` 包在 `<Suspense>` 里（否则 CSR bailout 报错）。
 */
export function SessionSurface(): React.JSX.Element {
  const page = useSessionsPage()

  // 壳级快捷键：Esc 只关最上面一层对话框（栈在 dialog-stack，命令在 registry/commands）。
  // 不写成各组件 onKeyDown：同一个键在不同面板行为不同，是最容易漏迁的一类逻辑。
  useShellCommands(
    page.settingsOpen
      ? [
          {
            id: 'dialog.close',
            label: 'settings.close',
            keys: ['escape'],
            scope: 'global',
            run: page.closeSettings,
          },
        ]
      : [],
  )

  return (
    <>
      <Layout
        top={<TopBar onSettingsSection={page.openSection} />}
        center={
          <CenterZone
            selectedSessionId={page.selectedSessionId}
            renderMessages={(messages, entryIds) => (
              <MessageView
                messages={messages}
                entryIds={entryIds.filter((id): id is string => Boolean(id))}
              />
            )}
          />
        }
        left={<LeftZone page={page} />}
        right={<RightZone tabs={[{ id: 'files', label: 'Files' }]} />}
      />

      {page.settingsOpen ? (
        <SettingsPanel
          cwd={page.cwd}
          sessionId={null}
          initialSection={page.initialSection}
          onClose={page.closeSettings}
          panels={[mcpSettingsPanel]}
        />
      ) : null}
    </>
  )
}
