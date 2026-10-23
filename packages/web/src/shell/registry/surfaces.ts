'use client'

/**
 * 壳的表面目录（shell 自己的"有哪些可及元素"清单）。
 *
 * 为什么壳也需要一份目录：P7 保真快照能告诉我们"和 pi-web 差哪些元素"，但拍不到
 * "我们本来打算有哪些"——没有目录时，漏掉一个区域谁也不会发现（e2e 只测已存在的）。
 * 这份目录是 `harness/snapshot/fidelity` 的对照物，也是 `shell` 流程覆盖率的分子。
 *
 * 规矩：
 * - `id` 与 DOM 上的 `data-section` / `data-component` 对齐，改一处要改两处（测试会盯）。
 * - 只登记**壳**自己的表面（区域、页签、对话框容器）；能力内部的元素由能力自己负责。
 */

export type SurfaceKind = 'zone' | 'tab' | 'dialog' | 'chrome'

export interface ShellSurface {
  id: string
  kind: SurfaceKind
  /** 可读名（i18n key 或字面量） */
  label: string
  /** 建议的 DOM 挂点，供测试与快照脚本核对 */
  hook: 'data-section' | 'data-component' | 'data-testid'
}

export const SHELL_SURFACES: readonly ShellSurface[] = [
  { id: 'sidebar-footer', kind: 'zone', label: 'sidebar.footer', hook: 'data-component' },
  { id: 'sidebar-tabs', kind: 'tab', label: 'sidebar.tabs', hook: 'data-component' },
  { id: 'top-bar', kind: 'chrome', label: 'topbar', hook: 'data-component' },
  { id: 'settings-dialog', kind: 'dialog', label: 'settings.title', hook: 'data-section' },
  { id: 'mcp-settings', kind: 'tab', label: 'mcp.title', hook: 'data-component' },
] as const

export const surfacesOf = (kind: SurfaceKind): ShellSurface[] =>
  SHELL_SURFACES.filter((s) => s.kind === kind)

/** shell 流程的覆盖率分子：目录里每个 id 都必须在 DOM 上被 hook 到（测试里断言一次） */
export const surfaceIds = (): string[] => SHELL_SURFACES.map((s) => s.id)
