import { describe, expect, it } from 'vitest'

import { path } from '../../_shared/domain/path'

import { EVICTION_THRESHOLD, ScanIndexCache } from './scan-index-cache'

function entry(id: string, mtimeMs = 100, size = 100) {
  return {
    id,
    filePath: path(`/sessions/${id}.jsonl`),
    mtimeMs,
    size,
  }
}

describe('ScanIndexCache', () => {
  it('starts empty', () => {
    const cache = new ScanIndexCache()
    expect(cache.size).toBe(0)
    expect(cache.getAll().size).toBe(0)
  })

  it('stores and retrieves entries', () => {
    const cache = new ScanIndexCache()
    cache.set('/a.jsonl', entry('a'))
    expect(cache.size).toBe(1)
    expect(cache.get('/a.jsonl')?.id).toBe('a')
  })

  it('overwrites existing entry', () => {
    const cache = new ScanIndexCache()
    cache.set('/a.jsonl', entry('a', 100, 100))
    cache.set('/a.jsonl', entry('a', 200, 200))
    expect(cache.size).toBe(1)
    expect(cache.get('/a.jsonl')?.mtimeMs).toBe(200)
  })

  it('invalidate(path) removes one entry', () => {
    const cache = new ScanIndexCache()
    cache.set('/a.jsonl', entry('a'))
    cache.set('/b.jsonl', entry('b'))
    cache.invalidate('/a.jsonl')
    expect(cache.size).toBe(1)
    expect(cache.get('/a.jsonl')).toBeUndefined()
    expect(cache.get('/b.jsonl')?.id).toBe('b')
  })

  it('invalidate() clears everything', () => {
    const cache = new ScanIndexCache()
    cache.set('/a.jsonl', entry('a'))
    cache.set('/b.jsonl', entry('b'))
    cache.invalidate()
    expect(cache.size).toBe(0)
  })

  it('evictStale drops entries not in present set', () => {
    const cache = new ScanIndexCache()
    cache.set('/a.jsonl', entry('a'))
    cache.set('/b.jsonl', entry('b'))
    cache.set('/c.jsonl', entry('c'))
    cache.evictStale(new Set(['/a.jsonl', '/c.jsonl']))
    expect(cache.size).toBe(2)
    expect(cache.get('/b.jsonl')).toBeUndefined()
  })

  it('evictIfMemoryPressure triggers when size > EVICTION_THRESHOLD', () => {
    const cache = new ScanIndexCache()
    // Insert EVICTION_THRESHOLD + 1 entries
    const total = EVICTION_THRESHOLD + 1
    for (let i = 0; i < total; i++) {
      cache.set(`/s${i}.jsonl`, entry(`s${i}`))
    }
    // Should have evicted some
    expect(cache.size).toBeLessThan(total)
    expect(cache.size).toBeGreaterThan(EVICTION_THRESHOLD * 0.5)
  })

  it('evictIfMemoryPressure does NOT trigger when size <= EVICTION_THRESHOLD', () => {
    const cache = new ScanIndexCache()
    for (let i = 0; i < EVICTION_THRESHOLD; i++) {
      cache.set(`/s${i}.jsonl`, entry(`s${i}`))
    }
    expect(cache.size).toBe(EVICTION_THRESHOLD)
  })

  it('get() refreshes LRU recency (entry stays after eviction)', () => {
    const cache = new ScanIndexCache()
    // Fill cache exactly to threshold
    for (let i = 0; i < EVICTION_THRESHOLD; i++) {
      cache.set(`/s${i}.jsonl`, entry(`s${i}`))
    }
    // Touch s0 (oldest) so it becomes newest
    cache.get('/s0.jsonl')
    // Now overflow — oldest non-touched should evict
    cache.set('/overflow.jsonl', entry('overflow'))
    // s0 should survive (was touched)
    expect(cache.get('/s0.jsonl')).toBeDefined()
  })
})
