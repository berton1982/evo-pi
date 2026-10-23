import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, fetchApi } from '@/lib/api-client'

// jsdom's fetch is undefined by default — install a fake in beforeEach.
const fetchMock = vi.fn()

afterEach(() => {
  fetchMock.mockReset()
  // Restore globals stubbed by vi.stubGlobal (vitest 3.x API).
  if (typeof vi.unstubAllGlobals === 'function') {
    vi.unstubAllGlobals()
  }
})

function stubFetch(impl: typeof fetch): void {
  vi.stubGlobal('fetch', impl ?? fetchMock)
}

describe('fetchApi', () => {
  it('returns parsed JSON on 2xx response', async () => {
    stubFetch(
      vi.fn(
        async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
      ) as typeof fetch,
    )
    const result = await fetchApi<{ ok: boolean }>('/api/test')
    expect(result.ok).toBe(true)
  })

  it('returns typed data (generic T preserved)', async () => {
    stubFetch(
      vi.fn(
        async () => new Response(JSON.stringify({ id: 'sess-1', name: 'Test' }), { status: 200 }),
      ) as typeof fetch,
    )
    interface Session {
      id: string
      name: string
    }
    const result = await fetchApi<Session>('/api/sessions/abc')
    expect(result.id).toBe('sess-1')
    expect(result.name).toBe('Test')
  })

  it('throws ApiError with status on non-2xx response', async () => {
    stubFetch(
      vi.fn(
        async () => new Response(JSON.stringify({ error: 'not_found' }), { status: 404 }),
      ) as typeof fetch,
    )
    await expect(fetchApi('/api/missing')).rejects.toThrow(ApiError)
  })

  it('ApiError carries the HTTP status code', async () => {
    stubFetch(
      vi.fn(
        async () => new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
      ) as typeof fetch,
    )
    try {
      await fetchApi('/api/forbidden')
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).status).toBe(403)
    }
  })

  it('throws ApiError when fetch itself rejects (network failure)', async () => {
    stubFetch(
      vi.fn(async () => {
        throw new Error('network down')
      }) as typeof fetch,
    )
    await expect(fetchApi('/api/x')).rejects.toThrow(ApiError)
  })

  it('throws ApiError with status 0 on network failure (no HTTP status available)', async () => {
    stubFetch(
      vi.fn(async () => {
        throw new Error('network down')
      }) as typeof fetch,
    )
    try {
      await fetchApi('/api/x')
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).status).toBe(0)
    }
  })

  it('throws ApiError when response body is not valid JSON', async () => {
    stubFetch(
      vi.fn(
        async () =>
          new Response('<html>not json</html>', {
            status: 200,
            headers: { 'content-type': 'text/html' },
          }),
      ) as typeof fetch,
    )
    await expect(fetchApi('/api/x')).rejects.toThrow(ApiError)
  })

  it('forwards init options (method, headers, body) to fetch', async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    stubFetch(spy as unknown as typeof fetch)
    await fetchApi('/api/x', {
      method: 'POST',
      headers: { 'X-Test': '1' },
      body: JSON.stringify({ x: 1 }),
    })
    expect(spy).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-Test': '1' },
        body: JSON.stringify({ x: 1 }),
      }),
    )
  })
})

describe('ApiError', () => {
  it('is an Error subclass', () => {
    const e = new ApiError('server failure', 500)
    expect(e).toBeInstanceOf(Error)
    expect(e.name).toBe('ApiError')
    expect(e.message).toBe('server failure')
    expect(e.status).toBe(500)
  })
})
