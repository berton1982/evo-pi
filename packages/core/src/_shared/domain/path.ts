/**
 * Path branded type.
 *
 * 跨 capability 共享的 filesystem path 标识（per capability-boundary-final §5.1）。
 * 在 TS 类型系统中区分 Path 与裸 string，防止 path / cwd / sessionId 等
 * 互相误用。
 *
 * 实际编码规则（path → safe dir name）由 SDK `getDefaultSessionDirPath`
 * 负责（ref_projects/pi/packages/coding-agent/src/core/session-manager.ts:589）；
 * 这里只做 brand wrapping，不做 encoding。
 */

export type Path = string & { readonly __brand: 'Path' }

/**
 * 将 string 提升为 Path branded type。
 * 空字符串会抛错——空路径会导致下游静默 bug（如 readFileSync('', …) 抛 ENOENT）。
 */
export function path(value: string): Path {
  if (value.length === 0) {
    throw new Error('Path must be a non-empty string')
  }
  return value as Path
}

/**
 * 运行时类型守卫。Branded types 在 runtime 就是 string；这个 guard 用来在
 * 不受信的入口（如 API 边界）验证输入确实是 string。
 */
export function isPath(value: unknown): value is Path {
  return typeof value === 'string'
}
