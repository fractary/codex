import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  PermissionManager,
  PermissionDeniedError,
  createPermissionManager,
  getDefaultPermissionManager,
  setDefaultPermissionManager,
} from '../../../src/permissions/manager.js'
import { createRule } from '../../../src/permissions/evaluator.js'

describe('permissions/manager', () => {
  describe('PermissionManager', () => {
    describe('constructor', () => {
      it('should create with default config', () => {
        const manager = new PermissionManager()

        expect(manager.isEnforced()).toBe(false)
        expect(manager.getRules()).toEqual([])
      })

      it('should accept custom config', () => {
        const manager = new PermissionManager({
          config: {
            enforced: true,
            defaultAllow: false,
          },
        })

        expect(manager.isEnforced()).toBe(true)
        expect(manager.getConfig().defaultAllow).toBe(false)
      })

      it('should accept default context', () => {
        const manager = new PermissionManager({
          defaultContext: { org: 'myorg' },
        })

        expect(manager.getDefaultContext()).toEqual({ org: 'myorg' })
      })
    })

    describe('isAllowed', () => {
      it('should allow everything when not enforced', () => {
        const manager = new PermissionManager()

        expect(manager.isAllowed('any/path.md', 'fetch')).toBe(true)
      })

      it('should evaluate rules when enforced', () => {
        const manager = new PermissionManager({
          config: { enforced: true },
        })
        manager.addRule(
          createRule({
            pattern: 'private/**',
            actions: ['fetch'],
            level: 'none',
          })
        )

        expect(manager.isAllowed('docs/file.md', 'fetch')).toBe(true)
        expect(manager.isAllowed('private/secret.md', 'fetch')).toBe(false)
      })
    })

    describe('hasPermission', () => {
      it('should check required permission level', () => {
        const manager = new PermissionManager({
          config: { enforced: true },
        })

        // Default level is read
        expect(manager.hasPermission('file.md', 'fetch', 'read')).toBe(true)
        expect(manager.hasPermission('file.md', 'fetch', 'admin')).toBe(false)
      })
    })

    describe('evaluate', () => {
      it('should return full permission result', () => {
        const manager = new PermissionManager({
          config: { enforced: true },
        })

        const result = manager.evaluate('file.md', 'fetch')

        expect(result.allowed).toBe(true)
        expect(result.level).toBe('read')
        expect(result.reason).toBeDefined()
      })
    })

    describe('filterAllowed', () => {
      it('should filter paths by permission', () => {
        const manager = new PermissionManager({
          config: { enforced: true },
        })
        manager.addRule(
          createRule({
            pattern: 'private/**',
            actions: ['fetch'],
            level: 'none',
            priority: 100,
          })
        )

        const paths = ['docs/file.md', 'private/secret.md', 'src/app.ts']
        const filtered = manager.filterAllowed(paths, 'fetch')

        expect(filtered).toEqual(['docs/file.md', 'src/app.ts'])
      })

      it('should return all paths when not enforced', () => {
        const manager = new PermissionManager()

        const paths = ['docs/file.md', 'private/secret.md']
        const filtered = manager.filterAllowed(paths, 'fetch')

        expect(filtered).toEqual(paths)
      })
    })

    describe('addRule', () => {
      it('should add valid rule', () => {
        const manager = new PermissionManager()
        const rule = createRule({
          pattern: 'docs/**',
          actions: ['fetch'],
          level: 'read',
        })

        manager.addRule(rule)

        expect(manager.getRules()).toHaveLength(1)
      })

      it('should throw for invalid rule', () => {
        const manager = new PermissionManager()
        const invalidRule = {
          pattern: '',
          actions: [],
          level: 'read' as const,
          scope: 'global' as const,
        }

        expect(() => manager.addRule(invalidRule)).toThrow()
      })
    })

    describe('removeRule', () => {
      it('should remove rule by id', () => {
        const manager = new PermissionManager()
        const rule = createRule({
          pattern: 'docs/**',
          actions: ['fetch'],
          level: 'read',
        })
        rule.id = 'test-rule'
        manager.addRule(rule)

        const removed = manager.removeRule('test-rule')

        expect(removed).toBe(true)
        expect(manager.getRules()).toHaveLength(0)
      })

      it('should return false for non-existent rule', () => {
        const manager = new PermissionManager()

        const removed = manager.removeRule('non-existent')

        expect(removed).toBe(false)
      })
    })

    describe('setRules', () => {
      it('should replace all rules', () => {
        const manager = new PermissionManager()
        manager.addRule(
          createRule({
            pattern: 'old/**',
            actions: ['fetch'],
            level: 'read',
          })
        )

        manager.setRules([
          createRule({
            pattern: 'new/**',
            actions: ['fetch'],
            level: 'admin',
          }),
        ])

        expect(manager.getRules()).toHaveLength(1)
        expect(manager.getRules()[0]?.pattern).toBe('new/**')
      })

      it('should throw for invalid rules', () => {
        const manager = new PermissionManager()

        expect(() =>
          manager.setRules([
            {
              pattern: '',
              actions: [],
              level: 'read',
              scope: 'global',
            },
          ])
        ).toThrow()
      })
    })

    describe('clearRules', () => {
      it('should remove all rules', () => {
        const manager = new PermissionManager()
        manager.addRule(
          createRule({
            pattern: 'docs/**',
            actions: ['fetch'],
            level: 'read',
          })
        )

        manager.clearRules()

        expect(manager.getRules()).toHaveLength(0)
      })
    })

    describe('updateConfig', () => {
      it('should update config properties', () => {
        const manager = new PermissionManager()

        manager.updateConfig({
          enforced: true,
          defaultAllow: false,
        })

        expect(manager.isEnforced()).toBe(true)
        expect(manager.getConfig().defaultAllow).toBe(false)
      })
    })

    describe('enable/disable', () => {
      it('should toggle enforcement', () => {
        const manager = new PermissionManager()

        manager.enable()
        expect(manager.isEnforced()).toBe(true)

        manager.disable()
        expect(manager.isEnforced()).toBe(false)
      })
    })

    describe('context management', () => {
      it('should set and get default context', () => {
        const manager = new PermissionManager()

        manager.setDefaultContext({ org: 'myorg', project: 'myproject' })

        expect(manager.getDefaultContext()).toEqual({
          org: 'myorg',
          project: 'myproject',
        })
      })

      it('should merge context with defaults', () => {
        const manager = new PermissionManager({
          config: { enforced: true },
          defaultContext: { org: 'myorg' },
        })
        manager.addRule(
          createRule({
            pattern: '**',
            actions: ['fetch'],
            level: 'admin',
            scope: 'org',
            org: 'myorg',
          })
        )

        const result = manager.evaluate('file.md', 'fetch')

        expect(result.level).toBe('admin')
      })
    })

    describe('assertPermission', () => {
      it('should not throw when permission is granted', () => {
        const manager = new PermissionManager({
          config: { enforced: true },
        })

        expect(() => manager.assertPermission('file.md', 'fetch', 'read')).not.toThrow()
      })

      it('should throw PermissionDeniedError when denied', () => {
        const manager = new PermissionManager({
          config: { enforced: true },
        })

        expect(() => manager.assertPermission('file.md', 'fetch', 'admin')).toThrow(
          PermissionDeniedError
        )
      })

      it('should include path and action in error', () => {
        const manager = new PermissionManager({
          config: { enforced: true },
        })

        try {
          manager.assertPermission('secret.md', 'sync', 'admin')
          expect.fail('Should have thrown')
        } catch (error) {
          if (error instanceof PermissionDeniedError) {
            expect(error.path).toBe('secret.md')
            expect(error.action).toBe('sync')
            expect(error.result).toBeDefined()
          }
        }
      })
    })
  })

  describe('PermissionDeniedError', () => {
    it('should have correct name', () => {
      const error = new PermissionDeniedError('Test', 'path', 'fetch', {
        allowed: false,
        level: 'none',
        reason: 'Test',
      })

      expect(error.name).toBe('PermissionDeniedError')
    })

    it('should store path, action, and result', () => {
      const result = {
        allowed: false,
        level: 'none' as const,
        reason: 'Denied',
      }
      const error = new PermissionDeniedError('Permission denied', '/secret', 'fetch', result)

      expect(error.path).toBe('/secret')
      expect(error.action).toBe('fetch')
      expect(error.result).toBe(result)
    })
  })

  describe('createPermissionManager', () => {
    it('should create manager with config', () => {
      const manager = createPermissionManager({
        config: { enforced: true },
      })

      expect(manager).toBeInstanceOf(PermissionManager)
      expect(manager.isEnforced()).toBe(true)
    })
  })

  describe('default manager', () => {
    let originalManager: PermissionManager | null = null

    beforeEach(() => {
      // Save original manager
      try {
        originalManager = getDefaultPermissionManager()
      } catch {
        originalManager = null
      }
    })

    afterEach(() => {
      // Restore original manager
      if (originalManager) {
        setDefaultPermissionManager(originalManager)
      }
    })

    it('should create default manager on first access', () => {
      const manager = getDefaultPermissionManager()

      expect(manager).toBeInstanceOf(PermissionManager)
    })

    it('should return same instance', () => {
      const manager1 = getDefaultPermissionManager()
      const manager2 = getDefaultPermissionManager()

      expect(manager1).toBe(manager2)
    })

    it('should allow setting custom default manager', () => {
      const customManager = createPermissionManager({
        config: { enforced: true },
      })

      setDefaultPermissionManager(customManager)

      expect(getDefaultPermissionManager()).toBe(customManager)
    })
  })
})
