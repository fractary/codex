import { describe, it, expect } from 'vitest'
import {
  migrateConfig,
  validateMigratedConfig,
  generateMigrationReport,
  createEmptyModernConfig,
  DEFAULT_MIGRATION_OPTIONS,
} from '../../../src/migration/migrator.js'
import type { LegacyCodexConfig } from '../../../src/migration/types.js'

describe('migration/migrator', () => {
  describe('migrateConfig', () => {
    it('should migrate basic v2.x config', () => {
      const legacy: LegacyCodexConfig = {
        org: 'myorg',
        codexRepo: 'codex',
      }

      const result = migrateConfig(legacy)

      expect(result.success).toBe(true)
      expect(result.config?.version).toBe('3.0')
      expect(result.config?.organization.name).toBe('myorg')
      expect(result.config?.organization.codexRepo).toBe('codex')
    })

    it('should use defaultOrg if org is missing', () => {
      const legacy: LegacyCodexConfig = {
        defaultOrg: 'mydefault',
        codexRepo: 'codex',
      }

      const result = migrateConfig(legacy)

      expect(result.success).toBe(true)
      expect(result.config?.organization.name).toBe('mydefault')
    })

    it('should prefer org over defaultOrg', () => {
      const legacy: LegacyCodexConfig = {
        org: 'primary',
        defaultOrg: 'secondary',
        codexRepo: 'codex',
      }

      const result = migrateConfig(legacy)

      expect(result.config?.organization.name).toBe('primary')
      expect(result.warnings.some((w) => w.includes('defaultOrg'))).toBe(true)
    })

    it('should migrate autoSync patterns', () => {
      const legacy: LegacyCodexConfig = {
        org: 'myorg',
        codexRepo: 'codex',
        autoSync: [
          { pattern: 'docs/**', destination: 'documentation' },
          { pattern: 'specs/**', bidirectional: true },
        ],
      }

      const result = migrateConfig(legacy)

      expect(result.success).toBe(true)
      expect(result.config?.sync.patterns).toHaveLength(2)
      expect(result.config?.sync.patterns[0]?.pattern).toBe('docs/**')
      expect(result.config?.sync.patterns[0]?.target).toBe('documentation')
      expect(result.config?.sync.patterns[1]?.direction).toBe('bidirectional')
    })

    it('should migrate syncRules', () => {
      const legacy: LegacyCodexConfig = {
        org: 'myorg',
        codexRepo: 'codex',
        syncRules: {
          include: ['**/*.md', 'CLAUDE.md'],
          exclude: ['**/node_modules/**', '**/.git/**'],
        },
      }

      const result = migrateConfig(legacy)

      expect(result.success).toBe(true)
      expect(result.config?.sync.include).toEqual(['**/*.md', 'CLAUDE.md'])
      expect(result.config?.sync.exclude).toEqual(['**/node_modules/**', '**/.git/**'])
    })

    it('should use defaults when config is incomplete', () => {
      const result = migrateConfig({}, {
        defaultOrg: 'default-org',
        defaultCodexRepo: 'default-codex',
      })

      expect(result.success).toBe(true)
      expect(result.config?.organization.name).toBe('default-org')
      expect(result.config?.organization.codexRepo).toBe('default-codex')
    })

    it('should not modify v3.0 config', () => {
      const modern = {
        version: '3.0' as const,
        organization: { name: 'test', codexRepo: 'codex' },
        sync: {
          patterns: [],
          include: [],
          exclude: [],
          defaultDirection: 'to-codex' as const,
        },
      }

      const result = migrateConfig(modern)

      expect(result.success).toBe(true)
      expect(result.warnings.some((w) => w.includes('already'))).toBe(true)
    })

    it('should fail for invalid config', () => {
      const result = migrateConfig('invalid')

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should record changes', () => {
      const legacy: LegacyCodexConfig = {
        org: 'myorg',
        codexRepo: 'codex',
      }

      const result = migrateConfig(legacy)

      expect(result.changes.length).toBeGreaterThan(0)
      expect(result.changes.some((c) => c.type === 'renamed')).toBe(true)
      expect(result.changes.some((c) => c.path === 'version')).toBe(true)
    })

    it('should migrate environments', () => {
      const legacy: LegacyCodexConfig = {
        org: 'myorg',
        codexRepo: 'codex',
        environments: {
          staging: {
            codexRepo: 'codex-staging',
          },
          production: {
            codexRepo: 'codex-prod',
          },
        },
      }

      const result = migrateConfig(legacy)

      expect(result.success).toBe(true)
      expect(result.config?.environments).toBeDefined()
      expect(Object.keys(result.config?.environments ?? {})).toContain('staging')
      expect(Object.keys(result.config?.environments ?? {})).toContain('production')
    })

    it('should warn about multiple targets in pattern', () => {
      const legacy: LegacyCodexConfig = {
        org: 'myorg',
        codexRepo: 'codex',
        autoSync: [
          { pattern: 'docs/**', targets: ['repo1', 'repo2', 'repo3'] },
        ],
      }

      const result = migrateConfig(legacy)

      expect(result.warnings.some((w) => w.includes('multiple targets'))).toBe(true)
    })
  })

  describe('validateMigratedConfig', () => {
    it('should pass valid config', () => {
      const config = createEmptyModernConfig('test', 'codex')

      const errors = validateMigratedConfig(config)

      expect(errors).toEqual([])
    })

    it('should detect invalid version', () => {
      const config = createEmptyModernConfig('test', 'codex')
      // @ts-expect-error testing invalid version
      config.version = '2.0'

      const errors = validateMigratedConfig(config)

      expect(errors.some((e) => e.includes('version'))).toBe(true)
    })

    it('should detect missing organization', () => {
      const config = createEmptyModernConfig('test', 'codex')
      // @ts-expect-error testing missing organization
      delete config.organization

      const errors = validateMigratedConfig(config)

      expect(errors.some((e) => e.includes('organization'))).toBe(true)
    })

    it('should detect missing sync', () => {
      const config = createEmptyModernConfig('test', 'codex')
      // @ts-expect-error testing missing sync
      delete config.sync

      const errors = validateMigratedConfig(config)

      expect(errors.some((e) => e.includes('sync'))).toBe(true)
    })
  })

  describe('generateMigrationReport', () => {
    it('should generate success report', () => {
      const result = migrateConfig({
        org: 'test',
        codexRepo: 'codex',
      })

      const report = generateMigrationReport(result)

      expect(report).toContain('SUCCESS')
      expect(report).toContain('Changes')
    })

    it('should generate failure report', () => {
      const result = migrateConfig('invalid')

      const report = generateMigrationReport(result)

      expect(report).toContain('FAILED')
      expect(report).toContain('Errors')
    })

    it('should include warnings', () => {
      const result = migrateConfig({
        org: 'test',
        defaultOrg: 'other',
        codexRepo: 'codex',
      })

      const report = generateMigrationReport(result)

      expect(report).toContain('Warnings')
    })
  })

  describe('createEmptyModernConfig', () => {
    it('should create valid config', () => {
      const config = createEmptyModernConfig('myorg', 'codex')

      expect(config.version).toBe('3.0')
      expect(config.organization.name).toBe('myorg')
      expect(config.organization.codexRepo).toBe('codex')
      expect(config.sync.patterns).toEqual([])
      expect(config.sync.defaultDirection).toBe('to-codex')
    })

    it('should have sensible default patterns', () => {
      const config = createEmptyModernConfig('org', 'codex')

      expect(config.sync.include).toContain('**/*.md')
      expect(config.sync.exclude).toContain('**/node_modules/**')
    })
  })

  describe('DEFAULT_MIGRATION_OPTIONS', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_MIGRATION_OPTIONS.defaultOrg).toBeDefined()
      expect(DEFAULT_MIGRATION_OPTIONS.defaultCodexRepo).toBeDefined()
    })
  })
})
