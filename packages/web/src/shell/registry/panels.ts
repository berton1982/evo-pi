'use client'

/**
 * 设置分区的契约（shell 与 feature 之间唯一的耦合面）。
 *
 * 为什么要这一层：shell 不能 import features（否则加一个能力就要改壳），
 * 但设置弹窗又必须能渲染各能力的表单。做法是壳只认 `SettingsPanelSpec`，
 * 由装配点（`app/**`）把 feature 提供的 spec 传进来——静态装配 + 类型契约，
 * 不用运行期全局注册表（后者会让"谁注册了什么"变成隐式副作用，难调试）。
 *
 * 规矩：
 * - `features/*` **可以** import 本文件的类型（这是允许的方向）；
 * - `shell/*` **不可以** import `features/*`；
 * - 装配只发生在 `app/**`。
 */

import type { ComponentType } from 'react'

export type SettingsSection = 'general' | 'models' | 'skills' | 'mcp' | 'plugins'

/** 分区组件统一签名：壳提供 cwd/sessionId，组件自己不读 URL */
export interface SettingsPanelProps {
  cwd: string | null
  sessionId: string | null
}

export interface SettingsPanelSpec {
  id: SettingsSection
  /** i18n key 或字面量（字面量给还没进 i18n 的分区用） */
  label: string
  /** 升序；同值按 id 兜底，保证渲染顺序稳定 */
  order: number
  /** 有实现的分区才给组件；占位分区只显示 label + 提示 */
  Component?: ComponentType<SettingsPanelProps>
}

/** 恒等函数：只为拿到类型检查与 grep 落点，不是行为包装 */
export const defineSettingsPanel = (spec: SettingsPanelSpec): SettingsPanelSpec => spec

export const sortPanels = (list: readonly SettingsPanelSpec[]): SettingsPanelSpec[] =>
  [...list].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
