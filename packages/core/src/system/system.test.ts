import { describe, expect, it } from 'vitest'

import { cwd } from '../_shared/domain/cwd'
import { createInMemorySystemAdapter, makeCheckProjectTrust, makeGetSystemConfig } from './index'

describe('system capability (PR.C.1: minimal subset)', () => {
  describe('createInMemorySystemAdapter', () => {
    it('getConfig returns cwd from process.cwd() and agentDir from env or default', () => {
      const adapter = createInMemorySystemAdapter()
      const config = adapter.getConfig()
      expect(config.defaultCwd).toBe(process.cwd())
      // agentDir depends on env; either env override or default
      expect(typeof config.agentDir).toBe('string')
      expect(config.agentDir.length).toBeGreaterThan(0)
    })

    it('checkTrust always returns trusted=true (Phase 1 minimum)', () => {
      const adapter = createInMemorySystemAdapter()
      const status = adapter.checkTrust(cwd('/Users/foo/proj'))
      expect(status.trusted).toBe(true)
      expect(status.requiresTrust).toBe(false)
      expect(status.decision).toBeNull()
      expect(status.inherited).toBe(false)
    })

    it('checkTrust ignores cwd value (Phase 1 always trusted)', () => {
      const adapter = createInMemorySystemAdapter()
      const a = adapter.checkTrust(cwd('/Users/foo/proj'))
      const b = adapter.checkTrust(cwd('/Users/bar/other'))
      expect(a.trusted).toBe(b.trusted)
      expect(a.trusted).toBe(true)
    })
  })

  describe('makeGetSystemConfig', () => {
    it('returns a function that delegates to the injected port', () => {
      const fakePort = {
        getConfig: () => ({
          defaultCwd: cwd('/test/cwd'),
          agentDir: '/test/agent',
        }),
      }
      const getSystemConfig = makeGetSystemConfig({ config: fakePort })
      const cfg = getSystemConfig()
      expect(cfg.defaultCwd).toBe('/test/cwd')
      expect(cfg.agentDir).toBe('/test/agent')
    })

    it('can be called multiple times (no state pollution)', () => {
      let callCount = 0
      const fakePort = {
        getConfig: () => {
          callCount += 1
          return {
            defaultCwd: cwd('/test'),
            agentDir: '/agent',
          }
        },
      }
      const getSystemConfig = makeGetSystemConfig({ config: fakePort })
      getSystemConfig()
      getSystemConfig()
      expect(callCount).toBe(2)
    })
  })

  describe('makeCheckProjectTrust', () => {
    it('delegates to the injected trust port', () => {
      const fakeTrustPort = {
        checkTrust: (inputCwd: ReturnType<typeof cwd>) => ({
          requiresTrust: true,
          trusted: false,
          decision: false,
          inherited: false,
          decisionPath: inputCwd,
        }),
      }
      const checkProjectTrust = makeCheckProjectTrust({ trust: fakeTrustPort })
      const status = checkProjectTrust(cwd('/untrusted/proj'))
      expect(status.trusted).toBe(false)
      expect(status.decision).toBe(false)
      expect(status.decisionPath).toBe('/untrusted/proj')
    })
  })
})
