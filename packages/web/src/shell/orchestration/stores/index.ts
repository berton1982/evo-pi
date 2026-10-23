/**
 * Stores 公共导出（zustand）。
 *
 * 命名约定：所有 store 以 `use-` 前缀导出，遵循 React Hooks 规则；
 * store 内部用 `create<T>()(...)` 工厂式 API 以支持 middleware type inference。
 */

export { useLocaleStore } from '@/shell/orchestration/stores/use-locale-store'
export { useSelectedSessionStore } from '@/shell/orchestration/stores/use-selected-session-store'
export { useSidebarPrefsStore } from '@/shell/orchestration/stores/use-sidebar-prefs-store'
export { useSidebarStore } from '@/shell/orchestration/stores/use-sidebar-store'
export type { ThemePreference } from '@/shell/orchestration/stores/use-theme-store'
export { useThemeStore } from '@/shell/orchestration/stores/use-theme-store'
