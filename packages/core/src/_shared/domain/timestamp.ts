/**
 * Timestamp branded type.
 *
 * ISO 8601 时间戳（per capability-boundary-final §5.1）。
 * JSONL 中所有 created / modified 字段都是 ISO 8601 字符串。
 */

export type Timestamp = string & { readonly __brand: 'Timestamp' }

/**
 * 将 string 提升为 Timestamp branded type。
 * 不做格式校验——具体格式由 ISO 8601 标准保证，下游 reader
 * (parseJsonlDate 等) 做严格校验。
 */
export function timestamp(value: string): Timestamp {
  return value as Timestamp
}
