import { describe, expect, it } from 'vitest'

import { createToggleServer } from './toggle-server'

describe('T-31 信任后重试原动作', () => {
  it('第一次被拒（untrusted），拿到信任后重试同一 ref 成功', async () => {
    let trusted = false
    const repository = {
      list: async () => ({ ok: true, value: [] }),
      write: async () =>
        trusted ? { ok: true } : { ok: false, error: { code: 'untrusted', message: 'need trust' } },
      add: async () => ({ ok: true, value: { servers: [] } }),
      remove: async () => ({ ok: true }),
    }
    const toggle = createToggleServer({ repository })
    const first = await toggle({ scope: 'project', name: 'a' }, true, '/proj')
    expect(first).toMatchObject({ ok: false, trustRequired: true })
    trusted = true
    const retry = await toggle({ scope: 'project', name: 'a' }, true, '/proj')
    expect(retry.ok).toBe(true)
  })
})
