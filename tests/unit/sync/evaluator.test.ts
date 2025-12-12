import { describe, it, expect } from 'vitest'
import {
  evaluatePath,
  evaluatePaths,
  filterSyncablePaths,
  createRulesFromPatterns,
  mergeRules,
  summarizeEvaluations,
  validateRules,
} from '../../../src/sync/evaluator.js'
import type { SyncRule } from '../../../src/sync/types.js'

describe('sync/evaluator', () => {
  describe('evaluatePath', () => {
    it('should include path by default', () => {
      const result = evaluatePath('docs/file.md', [], 'to-codex')

      expect(result.shouldSync).toBe(true)
      expect(result.reason).toContain('default')
    })

    it('should exclude path matching exclude rule', () => {
      const rules: SyncRule[] = [{ pattern: 'node_modules/**', include: false }]

      const result = evaluatePath('node_modules/package/index.js', rules, 'to-codex')

      expect(result.shouldSync).toBe(false)
      expect(result.matchedRule).toBeDefined()
    })

    it('should include path matching include rule', () => {
      const rules: SyncRule[] = [{ pattern: 'docs/**', include: true }]

      const result = evaluatePath('docs/api.md', rules, 'to-codex')

      expect(result.shouldSync).toBe(true)
      expect(result.matchedRule).toBeDefined()
    })

    it('should respect rule priority', () => {
      const rules: SyncRule[] = [
        { pattern: 'docs/**', include: true, priority: 50 },
        { pattern: 'docs/private/**', include: false, priority: 100 },
      ]

      const result = evaluatePath('docs/private/secret.md', rules, 'to-codex')

      expect(result.shouldSync).toBe(false)
    })

    it('should exclude default patterns', () => {
      const defaultExcludes = ['**/.git/**', '**/node_modules/**']

      const result1 = evaluatePath('.git/config', [], 'to-codex', defaultExcludes)
      const result2 = evaluatePath('node_modules/pkg/index.js', [], 'to-codex', defaultExcludes)

      expect(result1.shouldSync).toBe(false)
      expect(result2.shouldSync).toBe(false)
    })

    it('should respect direction-specific rules', () => {
      const rules: SyncRule[] = [
        { pattern: 'logs/**', include: false, direction: 'to-codex' },
        { pattern: 'logs/**', include: true, direction: 'from-codex' },
      ]

      const resultToCodex = evaluatePath('logs/app.log', rules, 'to-codex')
      const resultFromCodex = evaluatePath('logs/app.log', rules, 'from-codex')

      expect(resultToCodex.shouldSync).toBe(false)
      expect(resultFromCodex.shouldSync).toBe(true)
    })
  })

  describe('evaluatePaths', () => {
    it('should evaluate multiple paths', () => {
      const rules: SyncRule[] = [{ pattern: 'node_modules/**', include: false }]
      const paths = ['docs/file.md', 'node_modules/pkg/index.js', 'src/app.ts']

      const results = evaluatePaths(paths, rules, 'to-codex')

      expect(results.size).toBe(3)
      expect(results.get('docs/file.md')?.shouldSync).toBe(true)
      expect(results.get('node_modules/pkg/index.js')?.shouldSync).toBe(false)
      expect(results.get('src/app.ts')?.shouldSync).toBe(true)
    })
  })

  describe('filterSyncablePaths', () => {
    it('should return only syncable paths', () => {
      const rules: SyncRule[] = [
        { pattern: 'node_modules/**', include: false },
        { pattern: '.git/**', include: false },
      ]
      const paths = ['docs/file.md', 'node_modules/pkg/index.js', '.git/config', 'src/app.ts']

      const filtered = filterSyncablePaths(paths, rules, 'to-codex')

      expect(filtered).toEqual(['docs/file.md', 'src/app.ts'])
    })

    it('should return all paths when no rules match', () => {
      const paths = ['file1.md', 'file2.md']

      const filtered = filterSyncablePaths(paths, [], 'to-codex')

      expect(filtered).toEqual(paths)
    })
  })

  describe('createRulesFromPatterns', () => {
    it('should create rules from patterns', () => {
      const rules = createRulesFromPatterns(['docs/**'], ['node_modules/**'])

      expect(rules).toHaveLength(2)
      expect(rules.find((r) => r.pattern === 'docs/**')?.include).toBe(true)
      expect(rules.find((r) => r.pattern === 'node_modules/**')?.include).toBe(false)
    })

    it('should set higher priority for exclude rules', () => {
      const rules = createRulesFromPatterns(['**/*'], ['secret/**'])

      const includeRule = rules.find((r) => r.include)
      const excludeRule = rules.find((r) => !r.include)

      expect((excludeRule?.priority ?? 0) > (includeRule?.priority ?? 0)).toBe(true)
    })
  })

  describe('mergeRules', () => {
    it('should merge multiple rule sets', () => {
      const rules1: SyncRule[] = [{ pattern: 'docs/**', include: true }]
      const rules2: SyncRule[] = [{ pattern: 'node_modules/**', include: false }]

      const merged = mergeRules(rules1, rules2)

      expect(merged).toHaveLength(2)
    })

    it('should handle empty rule sets', () => {
      const merged = mergeRules([], [], [])

      expect(merged).toEqual([])
    })
  })

  describe('summarizeEvaluations', () => {
    it('should summarize evaluation results', () => {
      const results = new Map([
        ['file1.md', { path: 'file1.md', shouldSync: true, reason: 'default' }],
        ['file2.md', { path: 'file2.md', shouldSync: true, reason: 'default' }],
        ['node_modules/x', { path: 'node_modules/x', shouldSync: false, reason: 'excluded' }],
      ])

      const summary = summarizeEvaluations(results)

      expect(summary.total).toBe(3)
      expect(summary.included).toBe(2)
      expect(summary.excluded).toBe(1)
      expect(summary.byReason['default']).toBe(2)
      expect(summary.byReason['excluded']).toBe(1)
    })
  })

  describe('validateRules', () => {
    it('should return empty array for valid rules', () => {
      const rules: SyncRule[] = [
        { pattern: 'docs/**', include: true },
        { pattern: 'node_modules/**', include: false },
      ]

      const errors = validateRules(rules)

      expect(errors).toEqual([])
    })

    it('should detect empty patterns', () => {
      const rules: SyncRule[] = [{ pattern: '', include: true }]

      const errors = validateRules(rules)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]).toContain('empty')
    })

    it('should detect invalid directions', () => {
      const rules: SyncRule[] = [
        { pattern: 'docs/**', include: true, direction: 'invalid' as any },
      ]

      const errors = validateRules(rules)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]).toContain('direction')
    })
  })
})
