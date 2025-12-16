import { describe, it, expect, beforeEach } from 'vitest'
import {
  TypeRegistry,
  createDefaultRegistry,
  BUILT_IN_TYPES,
  TTL,
} from '../../../src/types/index.js'

describe('TypeRegistry', () => {
  let registry: TypeRegistry

  beforeEach(() => {
    registry = createDefaultRegistry()
  })

  describe('constructor', () => {
    it('loads built-in types by default', () => {
      expect(registry.has('docs')).toBe(true)
      expect(registry.has('specs')).toBe(true)
      expect(registry.has('logs')).toBe(true)
      expect(registry.has('standards')).toBe(true)
    })

    it('can exclude built-in types', () => {
      const emptyRegistry = new TypeRegistry({ includeBuiltIn: false })
      expect(emptyRegistry.has('docs')).toBe(false)
      expect(emptyRegistry.size).toBe(0)
    })

    it('can load custom types', () => {
      const customRegistry = new TypeRegistry({
        customTypes: {
          research: {
            description: 'Research notes',
            patterns: ['research/**'],
            defaultTtl: TTL.ONE_WEEK,
          },
        },
      })
      expect(customRegistry.has('research')).toBe(true)
    })
  })

  describe('get', () => {
    it('returns built-in types', () => {
      const docsType = registry.get('docs')
      expect(docsType).toBeDefined()
      expect(docsType?.name).toBe('docs')
      expect(docsType?.patterns).toContain('docs/**')
    })

    it('returns undefined for unknown types', () => {
      expect(registry.get('unknown')).toBeUndefined()
    })
  })

  describe('register', () => {
    it('registers new types', () => {
      registry.register({
        name: 'custom',
        description: 'Custom type',
        patterns: ['custom/**'],
        defaultTtl: 3600,
        archiveAfterDays: null,
        archiveStorage: null,
      })
      expect(registry.has('custom')).toBe(true)
    })

    it('can override built-in types', () => {
      const originalDocs = registry.get('docs')
      registry.register({
        name: 'docs',
        description: 'Overridden docs',
        patterns: ['documentation/**'],
        defaultTtl: 1000,
        archiveAfterDays: null,
        archiveStorage: null,
      })
      const overriddenDocs = registry.get('docs')
      expect(overriddenDocs?.description).toBe('Overridden docs')
      expect(overriddenDocs?.defaultTtl).toBe(1000)
    })
  })

  describe('unregister', () => {
    it('removes types', () => {
      expect(registry.has('docs')).toBe(true)
      const result = registry.unregister('docs')
      expect(result).toBe(true)
      expect(registry.has('docs')).toBe(false)
    })

    it('returns false for unknown types', () => {
      expect(registry.unregister('unknown')).toBe(false)
    })
  })

  describe('list', () => {
    it('returns all types', () => {
      const types = registry.list()
      expect(types.length).toBeGreaterThan(0)
      expect(types.some((t) => t.name === 'docs')).toBe(true)
    })
  })

  describe('listNames', () => {
    it('returns all type names', () => {
      const names = registry.listNames()
      expect(names).toContain('docs')
      expect(names).toContain('specs')
      expect(names).toContain('logs')
    })
  })

  describe('detectType', () => {
    it('detects docs type', () => {
      expect(registry.detectType('docs/oauth.md')).toBe('docs')
      expect(registry.detectType('README.md')).toBe('docs')
      expect(registry.detectType('CLAUDE.md')).toBe('docs')
    })

    it('detects specs type', () => {
      expect(registry.detectType('specs/SPEC-001.md')).toBe('specs')
      expect(registry.detectType('SPEC-00024-codex-sdk.md')).toBe('specs')
    })

    it('detects logs type', () => {
      expect(registry.detectType('.fractary/plugins/faber/logs/session.md')).toBe('logs')
      expect(registry.detectType('logs/debug.log')).toBe('logs')
    })

    it('detects state type', () => {
      expect(registry.detectType('.fractary/plugins/faber/state.json')).toBe('state')
    })

    it('returns default for unknown paths', () => {
      expect(registry.detectType('random/file.xyz')).toBe('default')
    })

    it('handles Windows-style paths', () => {
      expect(registry.detectType('docs\\oauth.md')).toBe('docs')
    })

    it('caches detection results', () => {
      // First call
      const result1 = registry.detectType('docs/test.md')
      // Second call should use cache
      const result2 = registry.detectType('docs/test.md')
      expect(result1).toBe(result2)
    })
  })

  describe('getTtl', () => {
    it('returns type-specific TTL', () => {
      expect(registry.getTtl('docs/file.md')).toBe(TTL.ONE_WEEK)
      expect(registry.getTtl('specs/SPEC-001.md')).toBe(TTL.TWO_WEEKS)
      expect(registry.getTtl('.fractary/logs/session.log')).toBe(TTL.ONE_DAY)
    })

    it('respects override', () => {
      expect(registry.getTtl('docs/file.md', 1000)).toBe(1000)
    })

    it('returns default TTL for unknown types', () => {
      expect(registry.getTtl('unknown/file.xyz')).toBe(TTL.ONE_WEEK)
    })
  })

  describe('getArchiveConfig', () => {
    it('returns archive config for types with archiving', () => {
      const config = registry.getArchiveConfig('docs/file.md')
      expect(config).not.toBeNull()
      expect(config?.afterDays).toBe(365)
      expect(config?.storage).toBe('cloud')
    })

    it('returns null for types without archiving', () => {
      const config = registry.getArchiveConfig('specs/SPEC-001.md')
      expect(config).toBeNull()
    })
  })

  describe('filterByType', () => {
    it('filters files by type patterns', () => {
      const files = [
        'docs/oauth.md',
        'docs/api.md',
        'specs/SPEC-001.md',
        'src/index.ts',
      ]
      const docsFiles = registry.filterByType('docs', files)
      expect(docsFiles).toContain('docs/oauth.md')
      expect(docsFiles).toContain('docs/api.md')
      expect(docsFiles).not.toContain('specs/SPEC-001.md')
    })

    it('returns empty array for unknown types', () => {
      const files = ['docs/file.md']
      expect(registry.filterByType('unknown', files)).toEqual([])
    })
  })

  describe('isBuiltIn', () => {
    it('identifies built-in types', () => {
      expect(registry.isBuiltIn('docs')).toBe(true)
      expect(registry.isBuiltIn('specs')).toBe(true)
    })

    it('returns false for custom types', () => {
      registry.register({
        name: 'custom',
        description: 'Custom',
        patterns: ['custom/**'],
        defaultTtl: 3600,
        archiveAfterDays: null,
        archiveStorage: null,
      })
      expect(registry.isBuiltIn('custom')).toBe(false)
    })
  })

  describe('size', () => {
    it('returns correct count', () => {
      const initialSize = registry.size
      registry.register({
        name: 'new-type',
        description: 'New',
        patterns: ['new/**'],
        defaultTtl: 3600,
        archiveAfterDays: null,
        archiveStorage: null,
      })
      expect(registry.size).toBe(initialSize + 1)
    })
  })

  describe('clearCache', () => {
    it('clears the pattern cache', () => {
      // Detect to populate cache
      registry.detectType('docs/test.md')
      // Clear cache
      registry.clearCache()
      // Should still work after clearing
      expect(registry.detectType('docs/test.md')).toBe('docs')
    })
  })
})

describe('BUILT_IN_TYPES', () => {
  it('has expected types', () => {
    expect(BUILT_IN_TYPES.docs).toBeDefined()
    expect(BUILT_IN_TYPES.specs).toBeDefined()
    expect(BUILT_IN_TYPES.logs).toBeDefined()
    expect(BUILT_IN_TYPES.standards).toBeDefined()
    expect(BUILT_IN_TYPES.templates).toBeDefined()
    expect(BUILT_IN_TYPES.state).toBeDefined()
  })

  it('has valid TTL values', () => {
    for (const type of Object.values(BUILT_IN_TYPES)) {
      expect(type.defaultTtl).toBeGreaterThan(0)
    }
  })
})
