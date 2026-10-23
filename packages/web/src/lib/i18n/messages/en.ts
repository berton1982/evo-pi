import type { LocalePlugin } from '@/lib/i18n/types'

/**
 * Phase 0 占位英文语言包（10 keys）。后续 phase 渐进补全。
 *
 * key 命名约定（per pi-web messages/en.ts）：
 *   - common.X: 通用 UI（OK / Cancel / Close / Loading ...）
 *   - sidebar.X: sidebar 区域
 *   - center.X: CenterZone
 *   - topbar.X: TopBar
 *   - rightzone.X: RightZone
 *   - settings.X: SettingsPanel
 *   - app.X: 应用级
 */
export const enLocale: LocalePlugin = {
  id: 'en',
  label: 'English',
  messages: {
    'sidebar.new': 'New session',
    'sidebar.search': 'Search sessions',
    'topbar.toggleSidebar': 'Toggle sidebar',
    'topbar.toggleRightPanel': 'Toggle right panel',
    'sidebar.region': 'Sessions',
    'files.region': 'Files',
    'sidebar.tab.sessions': 'Sessions',
    'sidebar.tab.files': 'Files',
    'center.placeholder.selectOrCreate': 'Select or create a session',
    'center.placeholder.selectedStub':
      'Selected session (detail panel stub — Phase 2+ renders full context):',
    'center.detail.loading': 'Loading messages…',
    'center.detail.error': 'Failed to load messages',
    'center.detail.retry': 'Retry',
    'topbar.placeholder': 'TopBar (placeholder)',
    'rightzone.placeholder': 'Right zone (placeholder)',
    'settings.title': 'Settings',
    'settings.models': 'Models',
    'settings.skills': 'Skills',
    'settings.closeButton': 'Close',
    'app.title': 'evo-pi',
    'mcp.title': 'MCP servers',
    'mcp.loading': 'Loading…',
    'mcp.empty.title': 'No MCP server configured yet',
    'mcp.empty.hint': 'Add one below, or edit the config files directly:',
    'mcp.empty.userConfig': 'user config',
    'mcp.empty.projectConfig': 'project config',
    'mcp.add.name': 'name',
    'mcp.add.scope': 'scope',
    'mcp.add.transport': 'transport',
    'mcp.add.command': 'command (stdio)',
    'mcp.add.url': 'url (http)',
    'mcp.add.submit': 'Add server',
    'mcp.add.submitting': 'Adding…',
    'mcp.add.failed': 'Could not add the server',
    'mcp.empty': 'No MCP servers configured',
    'mcp.selectPrompt': 'Select a server to see details',
    'mcp.row.on': 'enabled',
    'mcp.row.off': 'disabled',
    'mcp.scope.global': 'global',
    'mcp.scope.project': 'project',
    'mcp.enableGroup': 'Enable all',
    'mcp.refresh': 'Refresh',
    'mcp.add': 'Add MCP server',
    'mcp.remove': 'Remove',
    'mcp.row.toggleOn': 'Enable {name}',
    'mcp.row.toggleOff': 'Disable {name}',
    'mcp.row.untested': 'not tested',
    'mcp.row.testedOk': 'connected when tested',
    'mcp.row.testedFail': 'test failed',
    'mcp.enableGroupAll': 'Enable all servers in {scope}',
    'mcp.disableGroupAll': 'Disable all servers in {scope}',
    'mcp.disableGroup': 'Disable all',
    'mcp.groupStatus': '{enabled}/{total} enabled',
    'mcp.status.showLog': 'Show log',
    'mcp.status.hideLog': 'Hide log',
    'mcp.detail.config': 'Config file',
    'mcp.test.button': 'Test connection',
    'mcp.test.running': 'Testing…',
    'mcp.test.ok': 'Connected',
    'mcp.failure.timeout': 'Timed out',
    'mcp.codemode.mode': 'Code mode',
    'mcp.codemode.inlineBudget': 'Inline budget (tokens)',
    'mcp.userScope': 'User-level',
    'mcp.inProject': 'This project',
    'mcp.codemode.save': 'Save',
    'mcp.codemode.saved': 'Saved',
    'mcp.failure.network': 'Network error',
    'mcp.failure.untrusted': 'Project not trusted',
    'mcp.add.open': 'Add server',
    'mcp.undo': 'Undo',
    'mcp.undo.removed': 'Removed {name}',
  },
}
