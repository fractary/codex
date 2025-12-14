import { describe, it, expect } from 'vitest'
import {
  ruleMatchesContext,
  ruleMatchesPath,
  ruleMatchesAction,
  evaluatePermission,
  isAllowed,
  hasPermission,
  evaluatePermissions,
  filterByPermission,
  validateRules,
  createRule,
  CommonRules,
} from '../../../src/permissions/evaluator.js'
import type { PermissionRule, PermissionConfig } from '../../../src/permissions/types.js'
import { DEFAULT_PERMISSION_CONFIG } from '../../../src/permissions/types.js'

describe('permissions/evaluator', () => {
  const defaultConfig: PermissionConfig = {
    ...DEFAULT_PERMISSION_CONFIG,
    enforced: true,
  }

  describe('ruleMatchesContext', () => {
    it('should match when rule has no scope constraints', () => {
      const rule: PermissionRule = {
        pattern: '**',
        actions: ['fetch'],
        level: 'read',
        scope: 'global',
        enabled: true,
      }

      expect(ruleMatchesContext(rule, {})).toBe(true)
      expect(ruleMatchesContext(rule, { org: 'test' })).toBe(true)
    })

    it('should not match when rule is disabled', () => {
      const rule: PermissionRule = {
        pattern: '**',
        actions: ['fetch'],
        level: 'read',
        scope: 'global',
        enabled: false,
      }

      expect(ruleMatchesContext(rule, {})).toBe(false)
    })

    it('should match org scope when org matches', () => {
      const rule: PermissionRule = {
        pattern: '**',
        actions: ['fetch'],
        level: 'read',
        scope: 'org',
        org: 'myorg',
        enabled: true,
      }

      expect(ruleMatchesContext(rule, { org: 'myorg' })).toBe(true)
      expect(ruleMatchesContext(rule, { org: 'other' })).toBe(false)
    })

    it('should match project scope when org and project match', () => {
      const rule: PermissionRule = {
        pattern: '**',
        actions: ['fetch'],
        level: 'read',
        scope: 'project',
        org: 'myorg',
        project: 'myproject',
        enabled: true,
      }

      expect(ruleMatchesContext(rule, { org: 'myorg', project: 'myproject' })).toBe(true)
      expect(ruleMatchesContext(rule, { org: 'myorg', project: 'other' })).toBe(false)
      expect(ruleMatchesContext(rule, { org: 'other', project: 'myproject' })).toBe(false)
    })
  })

  describe('ruleMatchesPath', () => {
    it('should match glob patterns', () => {
      const rule: PermissionRule = {
        pattern: 'docs/**',
        actions: ['fetch'],
        level: 'read',
        scope: 'global',
      }

      expect(ruleMatchesPath(rule, 'docs/file.md')).toBe(true)
      expect(ruleMatchesPath(rule, 'docs/nested/file.md')).toBe(true)
      expect(ruleMatchesPath(rule, 'src/file.ts')).toBe(false)
    })

    it('should match specific file patterns', () => {
      const rule: PermissionRule = {
        pattern: '*.md',
        actions: ['fetch'],
        level: 'read',
        scope: 'global',
      }

      expect(ruleMatchesPath(rule, 'README.md')).toBe(true)
      expect(ruleMatchesPath(rule, 'file.txt')).toBe(false)
    })
  })

  describe('ruleMatchesAction', () => {
    it('should match when action is in actions array', () => {
      const rule: PermissionRule = {
        pattern: '**',
        actions: ['fetch', 'cache'],
        level: 'read',
        scope: 'global',
      }

      expect(ruleMatchesAction(rule, 'fetch')).toBe(true)
      expect(ruleMatchesAction(rule, 'cache')).toBe(true)
      expect(ruleMatchesAction(rule, 'sync')).toBe(false)
    })
  })

  describe('evaluatePermission', () => {
    it('should return default when no rules match', () => {
      const result = evaluatePermission('file.md', 'fetch', {}, defaultConfig)

      expect(result.allowed).toBe(true)
      expect(result.level).toBe('read')
      expect(result.reason).toContain('default')
    })

    it('should match first matching rule by priority', () => {
      const config: PermissionConfig = {
        ...defaultConfig,
        rules: [
          createRule({
            pattern: '**',
            actions: ['fetch'],
            level: 'read',
            priority: 0,
          }),
          createRule({
            pattern: 'docs/**',
            actions: ['fetch'],
            level: 'admin',
            priority: 100,
          }),
        ],
      }

      const result = evaluatePermission('docs/file.md', 'fetch', {}, config)

      expect(result.level).toBe('admin')
    })

    it('should deny access when rule level is none', () => {
      const config: PermissionConfig = {
        ...defaultConfig,
        rules: [
          createRule({
            pattern: '**/.private/**',
            actions: ['fetch', 'cache', 'sync'],
            level: 'none',
          }),
        ],
      }

      const result = evaluatePermission('.private/secret.md', 'fetch', {}, config)

      expect(result.allowed).toBe(false)
      expect(result.level).toBe('none')
    })
  })

  describe('isAllowed', () => {
    it('should return true when action is allowed', () => {
      expect(isAllowed('file.md', 'fetch', {}, defaultConfig)).toBe(true)
    })

    it('should return false when denied', () => {
      const config: PermissionConfig = {
        ...defaultConfig,
        defaultAllow: false,
      }

      expect(isAllowed('file.md', 'fetch', {}, config)).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('should return true when level is sufficient', () => {
      expect(hasPermission('file.md', 'fetch', 'read', {}, defaultConfig)).toBe(true)
    })

    it('should return false when level is insufficient', () => {
      expect(hasPermission('file.md', 'fetch', 'admin', {}, defaultConfig)).toBe(false)
    })
  })

  describe('evaluatePermissions', () => {
    it('should evaluate multiple paths', () => {
      const paths = ['file1.md', 'file2.md', 'file3.md']

      const results = evaluatePermissions(paths, 'fetch', {}, defaultConfig)

      expect(results.size).toBe(3)
      expect(results.get('file1.md')?.allowed).toBe(true)
    })
  })

  describe('filterByPermission', () => {
    it('should filter paths by permission', () => {
      const config: PermissionConfig = {
        ...defaultConfig,
        rules: [
          createRule({
            pattern: 'private/**',
            actions: ['fetch'],
            level: 'none',
            priority: 100,
          }),
        ],
      }
      const paths = ['docs/file.md', 'private/secret.md', 'src/app.ts']

      const filtered = filterByPermission(paths, 'fetch', {}, config)

      expect(filtered).toEqual(['docs/file.md', 'src/app.ts'])
    })
  })

  describe('validateRules', () => {
    it('should return empty array for valid rules', () => {
      const rules: PermissionRule[] = [
        createRule({
          pattern: 'docs/**',
          actions: ['fetch'],
          level: 'read',
        }),
      ]

      const errors = validateRules(rules)

      expect(errors).toEqual([])
    })

    it('should detect empty pattern', () => {
      const rules: PermissionRule[] = [
        {
          pattern: '',
          actions: ['fetch'],
          level: 'read',
          scope: 'global',
        },
      ]

      const errors = validateRules(rules)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]).toContain('empty')
    })

    it('should detect empty actions', () => {
      const rules: PermissionRule[] = [
        {
          pattern: '**',
          actions: [],
          level: 'read',
          scope: 'global',
        },
      ]

      const errors = validateRules(rules)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]).toContain('actions')
    })

    it('should detect org scope without org', () => {
      const rules: PermissionRule[] = [
        {
          pattern: '**',
          actions: ['fetch'],
          level: 'read',
          scope: 'org',
        },
      ]

      const errors = validateRules(rules)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]).toContain('org')
    })

    it('should detect project scope without project', () => {
      const rules: PermissionRule[] = [
        {
          pattern: '**',
          actions: ['fetch'],
          level: 'read',
          scope: 'project',
        },
      ]

      const errors = validateRules(rules)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]).toContain('project')
    })
  })

  describe('createRule', () => {
    it('should create rule with defaults', () => {
      const rule = createRule({
        pattern: 'docs/**',
        actions: ['fetch'],
        level: 'read',
      })

      expect(rule.pattern).toBe('docs/**')
      expect(rule.actions).toEqual(['fetch'])
      expect(rule.level).toBe('read')
      expect(rule.scope).toBe('global')
      expect(rule.priority).toBe(0)
      expect(rule.enabled).toBe(true)
    })

    it('should override defaults', () => {
      const rule = createRule({
        pattern: 'docs/**',
        actions: ['fetch'],
        level: 'admin',
        scope: 'org',
        org: 'myorg',
        priority: 100,
        description: 'Test rule',
      })

      expect(rule.scope).toBe('org')
      expect(rule.org).toBe('myorg')
      expect(rule.priority).toBe(100)
      expect(rule.description).toBe('Test rule')
    })
  })

  describe('CommonRules', () => {
    it('should create allowDocs rule', () => {
      const rule = CommonRules.allowDocs()

      expect(rule.pattern).toBe('docs/**')
      expect(rule.level).toBe('read')
    })

    it('should create denyPrivate rule', () => {
      const rule = CommonRules.denyPrivate()

      expect(rule.pattern).toBe('**/.private/**')
      expect(rule.level).toBe('none')
      expect(rule.priority).toBe(100)
    })

    it('should create readOnlySpecs rule', () => {
      const rule = CommonRules.readOnlySpecs()

      expect(rule.pattern).toBe('specs/**')
      expect(rule.actions).toContain('fetch')
      expect(rule.actions).toContain('cache')
      expect(rule.actions).not.toContain('sync')
    })

    it('should create adminManage rule', () => {
      const rule = CommonRules.adminManage()

      expect(rule.pattern).toBe('**')
      expect(rule.level).toBe('admin')
      expect(rule.actions).toContain('manage')
      expect(rule.actions).toContain('invalidate')
    })
  })
})
