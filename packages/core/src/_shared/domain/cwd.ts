/**
 * Cwd branded type.
 *
 * Current Working Directory，**绝对路径**（per capability-boundary-final §5.1）。
 * 与 Path 不同：Path 可以是任意字符串（含相对路径），Cwd 必须先 resolve
 * 成绝对路径再 brand。
 */

export type Cwd = string & { readonly __brand: 'Cwd' }

/**
 * 将 string 提升为 Cwd branded type。
 * 调用方需自行保证已 resolve 成绝对路径。
 */
export function cwd(value: string): Cwd {
  if (value.length === 0) {
    throw new Error('Cwd must be a non-empty string')
  }
  return value as Cwd
}
