/**
 * @design D-U-02 initialChoices / loadSession
 *
 * 为什么要单独一步：界面要先知道"有哪些选项"才能画出来（模型、推理级别、工具预设），
 * 而这些选项来自会话状态而不是硬编码。缺一个默认值的后果不是报错，是**下拉框空白**——
 * C-C 里就是这样：模型名显示为空，用户以为功能坏了。
 */
export interface InitialChoices {
  model: string | null
  models: readonly string[]
  thinkingLevel: string | null
  thinkingLevels: readonly string[]
  tools: readonly string[]
}

export const DEFAULT_THINKING_LEVELS = ['off', 'low', 'medium', 'high'] as const

/** 会话状态里既可能给 `model` 也可能给 `modelId`；两种都认，但只输出一个字段。 */
export function initialChoices(raw: unknown): InitialChoices {
  const rec = (raw ?? {}) as Record<string, unknown>
  const pickString = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = rec[k]
      if (typeof v === 'string' && v.trim()) return v
    }
    return null
  }
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  const models = list(rec.models)
  const model = pickString('model', 'modelId')
  return {
    // 当前模型不在列表里（后端被换过）时保留原值，但列表兜底成 [model]，
    // 否则下拉框会"没有任何选中项"
    model,
    models: models.length ? models : model ? [model] : [],
    thinkingLevel: pickString('thinkingLevel', 'thinking'),
    thinkingLevels: list(rec.thinkingLevels).length
      ? list(rec.thinkingLevels)
      : [...DEFAULT_THINKING_LEVELS],
    tools: list(rec.tools),
  }
}
