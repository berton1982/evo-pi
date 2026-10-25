import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateProjectPath } from './use-projects'

/**
 * T-41 校验手输路径能不能当项目根。
 * 只测"判据对不对"：空、相对路径、读不到、读得到四种输入。
 */
describe('validateProjectPath', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('空串与相对路径不请求后端', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    return Promise.all([validateProjectPath('   '), validateProjectPath('repo')]).then(
      ([empty, relative]) => {
        expect(empty).toBe('EMPTY')
        expect(relative).toBe('NOT_ABSOLUTE')
        expect(fetchSpy).not.toHaveBeenCalled()
      },
    )
  })

  it('能读目录 → 通过；读不到 → UNREADABLE', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('broken')) {
        return {
          ok: true,
          json: async () => ({ entries: [], error: { message: 'EACCES' } }),
        } as unknown as Response
      }
      return { ok: true, json: async () => ({ entries: [{ name: 'a' }] }) } as unknown as Response
    })
    vi.stubGlobal('fetch', fetchMock)
    expect(await validateProjectPath('/repo')).toBeNull()
    expect(await validateProjectPath('/repo/broken')).toBe('UNREADABLE')
  })
})
