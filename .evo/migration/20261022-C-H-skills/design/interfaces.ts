/**
 * C-H / SkillsConfig 的接口骨架（C4 产物，C5 照此实现）。
 *
 * 只写类型与签名，不写实现：目的是让 `tsc --strict` 在**设计阶段**就能发现
 * "谁依赖了谁的不该暴露的东西"。D3/D12 的归属结论在这里变成类型约束。
 */

export type SkillScope = 'global' | 'project'

/** 技能视图值对象（D-U-01）。source 是来源分类，scope 是作用域。 */
export interface Skill {
  readonly filePath: string
  readonly name: string
  readonly description: string
  readonly source: 'local' | 'market' | 'plugin'
  readonly scope: SkillScope
  readonly enabled: boolean
  readonly lastUsedAt?: number
  readonly install?: { readonly pkg: string; readonly version: string }
}

/** 端口返回的错误语义：不抛业务错误，靠 code 分支（PR-01..08）。 */
export type PortResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly code: SkillErrorCode; readonly message: string }

export type SkillErrorCode =
  | 'skill_not_found'
  | 'skill_content_missing'
  | 'market_unavailable'
  | 'install_failed'
  | 'invalid_argument'

/** P-S-01：技能仓库（PR-01..05）。 */
export interface SkillRepositoryPort {
  list(input: { cwd: string }): Promise<PortResult<readonly Skill[]>>
  setEnabled(input: { filePath: string; enabled: boolean }): Promise<PortResult<void>>
  setEnabledMany(input: {
    filePaths: readonly string[]
    enabled: boolean
  }): Promise<PortResult<readonly SkillToggleResult[]>>
  checkUpdates(input: { filePaths: readonly string[] }): Promise<PortResult<readonly SkillUpdateResult[]>>
  update(input: { filePath: string }): Promise<PortResult<SkillUpdateResult>>
}

/** P-S-02：技能原文（PR-06，必须支持取消）。 */
export interface SkillContentPort {
  read(input: {
    filePath: string
    signal?: AbortSignal
  }): Promise<PortResult<{ readonly markdown: string; readonly documents: readonly string[] }>>
}

/** P-S-03：技能市场（PR-07/08）。 */
export interface SkillMarketPort {
  search(input: { query: string; cwd: string }): Promise<PortResult<readonly SkillSearchResult[]>>
  install(input: {
    pkg: string
    scope: SkillScope
    cwd: string
  }): Promise<PortResult<{ readonly skill: Skill }>>
}

export interface SkillToggleResult {
  readonly filePath: string
  readonly ok: boolean
  readonly error?: string
}

export interface SkillUpdateResult {
  readonly filePath: string
  readonly status: 'up-to-date' | 'updated' | 'failed' | 'unknown'
  readonly version?: string
  readonly error?: string
}

export interface SkillSearchResult {
  readonly pkg: string
  readonly name: string
  readonly description: string
  readonly stars?: number
}

/** 域函数（D-U-02 / D-U-03 / D-U-04），纯函数，不认识 store。 */
export declare function orderSkillsByDormancy(skills: readonly Skill[]): readonly Skill[]
export declare function skillsToSwitch(input: {
  skills: readonly Skill[]
  group: string
  enabled: boolean
}): readonly string[]
export declare function applySkillToggleResults(input: {
  skills: readonly Skill[]
  results: readonly SkillToggleResult[]
}): readonly Skill[]
export declare function resolveSkillLink(markdown: string, href: string): { readonly heading: string } | null
export declare function skillInstructionsBody(markdown: string): string

/** 视图状态（C-01/C-02/C-03 的 hook 返回形状，逐一对应 ST-01..05）。 */
export interface SkillsView {
  readonly skills: readonly Skill[]
  readonly loading: boolean
  readonly error: string | null
  readonly selected: string | null
  readonly addMode: boolean
  readonly toggle: (skill: Skill) => void
  readonly setGroup: (group: string, enabled: boolean) => void
  readonly checkUpdates: (skill?: Skill) => void
  readonly updateSkill: (skill: Skill) => void
  readonly select: (filePath: string | null) => void
  readonly openAdd: () => void
  readonly closeAdd: () => void
}

export interface SkillDetailView {
  readonly instructions: string | null
  readonly instructionsError: string | null
  readonly documents: readonly string[]
  readonly scrollToAnchor: (href: string) => void
}

export interface SkillAddView {
  readonly query: string
  readonly results: readonly SkillSearchResult[]
  readonly searching: boolean
  readonly searchError: string | null
  readonly installing: string | null
  readonly installError: string | null
  readonly scope: SkillScope
  readonly setQuery: (q: string) => void
  readonly setScope: (s: SkillScope) => void
  readonly install: (pkg: string) => void
}
