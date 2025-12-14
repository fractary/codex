import { describe, it, expect } from 'vitest'
import {
  detectVersion,
  isModernConfig,
  isLegacyConfig,
  needsMigration,
  getMigrationRequirements,
} from '../../../src/migration/detector.js'

describe('migration/detector', () => {
  describe('detectVersion', () => {
    it('should detect v3.0 by explicit version field', () => {
      const config = {
        version: '3.0',
        organization: { name: 'test', codexRepo: 'codex' },
        sync: { patterns: [], include: [], exclude: [], defaultDirection: 'to-codex' },
      }

      const result = detectVersion(config)

      expect(result.version).toBe('3.0')
      expect(result.confidence).toBe('high')
    })

    it('should detect v3.0 by structure', () => {
      const config = {
        organization: { name: 'test', codexRepo: 'codex' },
        sync: { patterns: [], include: [], exclude: [], defaultDirection: 'to-codex' },
      }

      const result = detectVersion(config)

      expect(result.version).toBe('3.0')
      expect(result.confidence).toBe('medium')
    })

    it('should detect v2.x by org field', () => {
      const config = {
        org: 'test-org',
        codexRepo: 'codex',
      }

      const result = detectVersion(config)

      expect(result.version).toBe('2.x')
      expect(result.confidence).toBe('high')
    })

    it('should detect v2.x by defaultOrg field', () => {
      const config = {
        defaultOrg: 'test-org',
        codexPath: 'codex-repo',
      }

      const result = detectVersion(config)

      expect(result.version).toBe('2.x')
    })

    it('should detect v2.x by autoSync array', () => {
      const config = {
        autoSync: [{ pattern: '*.md' }],
      }

      const result = detectVersion(config)

      expect(result.version).toBe('2.x')
    })

    it('should detect v2.x by syncRules', () => {
      const config = {
        syncRules: {
          include: ['docs/**'],
          exclude: ['node_modules/**'],
        },
      }

      const result = detectVersion(config)

      expect(result.version).toBe('2.x')
    })

    it('should return unknown for invalid config', () => {
      const result1 = detectVersion(null)
      const result2 = detectVersion('string')
      const result3 = detectVersion({})

      expect(result1.version).toBe('unknown')
      expect(result2.version).toBe('unknown')
      expect(result3.version).toBe('unknown')
    })
  })

  describe('isModernConfig', () => {
    it('should return true for valid modern config', () => {
      const config = {
        organization: { name: 'test', codexRepo: 'codex' },
        sync: { patterns: [] },
      }

      expect(isModernConfig(config)).toBe(true)
    })

    it('should return false for missing organization', () => {
      const config = {
        sync: { patterns: [] },
      }

      expect(isModernConfig(config)).toBe(false)
    })

    it('should return false for missing sync', () => {
      const config = {
        organization: { name: 'test', codexRepo: 'codex' },
      }

      expect(isModernConfig(config)).toBe(false)
    })

    it('should return false for missing patterns array', () => {
      const config = {
        organization: { name: 'test', codexRepo: 'codex' },
        sync: {},
      }

      expect(isModernConfig(config)).toBe(false)
    })

    it('should return false for non-object', () => {
      expect(isModernConfig(null)).toBe(false)
      expect(isModernConfig('string')).toBe(false)
    })
  })

  describe('isLegacyConfig', () => {
    it('should return true for config with org', () => {
      expect(isLegacyConfig({ org: 'test' })).toBe(true)
    })

    it('should return true for config with defaultOrg', () => {
      expect(isLegacyConfig({ defaultOrg: 'test' })).toBe(true)
    })

    it('should return true for config with codexRepo', () => {
      expect(isLegacyConfig({ codexRepo: 'codex' })).toBe(true)
    })

    it('should return true for config with autoSync', () => {
      expect(isLegacyConfig({ autoSync: [] })).toBe(true)
    })

    it('should return true for config with syncRules', () => {
      expect(isLegacyConfig({ syncRules: { include: [] } })).toBe(true)
    })

    it('should return false for non-object', () => {
      expect(isLegacyConfig(null)).toBe(false)
      expect(isLegacyConfig('string')).toBe(false)
    })
  })

  describe('needsMigration', () => {
    it('should return true for v2.x config', () => {
      expect(needsMigration({ org: 'test' })).toBe(true)
    })

    it('should return false for v3.0 config', () => {
      const config = {
        version: '3.0',
        organization: { name: 'test', codexRepo: 'codex' },
        sync: { patterns: [] },
      }

      expect(needsMigration(config)).toBe(false)
    })

    it('should return false for unknown config', () => {
      expect(needsMigration({})).toBe(false)
    })
  })

  describe('getMigrationRequirements', () => {
    it('should require org if missing', () => {
      const reqs = getMigrationRequirements({ codexRepo: 'codex' })

      expect(reqs.some((r) => r.includes('org'))).toBe(true)
    })

    it('should require codex repo if missing', () => {
      const reqs = getMigrationRequirements({ org: 'test' })

      expect(reqs.some((r) => r.includes('codex') || r.includes('repo'))).toBe(true)
    })

    it('should return empty for complete config', () => {
      const reqs = getMigrationRequirements({ org: 'test', codexRepo: 'codex' })

      expect(reqs).toEqual([])
    })

    it('should handle invalid config', () => {
      const reqs = getMigrationRequirements(null)

      expect(reqs.length).toBeGreaterThan(0)
    })
  })
})
