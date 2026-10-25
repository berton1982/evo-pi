/**
 * @design P-A-04
 * 子代理档案端口：枚举 / 保存 / 删除。
 *
 * 档案是文件（frontmatter + 正文），端口只暴露语义操作，不暴露 YAML 细节——
 * 上层不该知道"元信息写在 `---` 之间"这种格式。
 */
export interface SubagentProfile {
  name: string
  description?: string
  model?: string
  body: string
}

export interface SubagentProfiles {
  list(opts?: { cwd?: string }): Promise<SubagentProfile[]>
  save(profile: SubagentProfile, opts?: { cwd?: string }): Promise<void>
  remove(name: string, opts?: { cwd?: string }): Promise<boolean>
}
