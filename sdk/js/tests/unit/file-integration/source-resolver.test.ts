import { describe, it, expect, beforeEach } from 'vitest'
import { FileSourceResolver } from '../../../src/file-integration/source-resolver.js'
import type { UnifiedConfig, FileSource } from '../../../src/schemas/config.js'

describe('file-integration/source-resolver', () => {
  function createFileSource(overrides?: Partial<FileSource>): FileSource {
    return {
      type: 's3',
      bucket: 'test-bucket',
      prefix: 'test/',
      region: 'us-east-1',
      local: {
        base_path: '.fractary/test',
      },
      push: {
        compress: false,
        keep_local: true,
      },
      auth: {
        profile: 'default',
      },
      ...overrides,
    }
  }

  function createUnifiedConfig(fileSources?: Record<string, FileSource>): UnifiedConfig {
    return {
      file: fileSources
        ? {
            schema_version: '2.0',
            sources: fileSources,
          }
        : undefined,
      codex: {
        schema_version: '2.0',
        organization: 'test-org',
        project: 'test-project',
        dependencies: {},
      },
    }
  }

  describe('constructor', () => {
    it('should initialize with empty sources when no file config', () => {
      const config = createUnifiedConfig()
      const resolver = new FileSourceResolver(config)

      expect(resolver.hasSources()).toBe(false)
      expect(resolver.getAvailableSources()).toEqual([])
    })

    it('should initialize sources from config', () => {
      const config = createUnifiedConfig({
        specs: createFileSource({
          local: { base_path: '.fractary/specs' },
          prefix: 'specs/',
        }),
        logs: createFileSource({
          local: { base_path: '.fractary/logs' },
          prefix: 'logs/',
        }),
      })
      const resolver = new FileSourceResolver(config)

      expect(resolver.hasSources()).toBe(true)
      expect(resolver.getAvailableSources()).toHaveLength(2)
    })

    it('should build remote path for S3 sources', () => {
      const config = createUnifiedConfig({
        specs: createFileSource({
          type: 's3',
          bucket: 'test-bucket',
          prefix: 'specs/',
          local: { base_path: '.fractary/specs' },
        }),
      })
      const resolver = new FileSourceResolver(config)

      const source = resolver.resolveSource('specs')
      expect(source?.remotePath).toBe('s3://test-bucket/specs/')
    })

    it('should build remote path for R2 sources', () => {
      const config = createUnifiedConfig({
        assets: createFileSource({
          type: 'r2',
          bucket: 'r2-bucket',
          prefix: 'assets/',
          local: { base_path: '.fractary/assets' },
        }),
      })
      const resolver = new FileSourceResolver(config)

      const source = resolver.resolveSource('assets')
      expect(source?.remotePath).toBe('r2://r2-bucket/assets/')
    })

    it('should build remote path for GCS sources', () => {
      const config = createUnifiedConfig({
        data: createFileSource({
          type: 'gcs',
          bucket: 'gcs-bucket',
          prefix: 'data/',
          local: { base_path: '.fractary/data' },
        }),
      })
      const resolver = new FileSourceResolver(config)

      const source = resolver.resolveSource('data')
      expect(source?.remotePath).toBe('gcs://gcs-bucket/data/')
    })

    it('should not build remote path for local sources', () => {
      const config = createUnifiedConfig({
        local: createFileSource({
          type: 'local',
          bucket: undefined,
          prefix: undefined,
          local: { base_path: '.fractary/local' },
        }),
      })
      const resolver = new FileSourceResolver(config)

      const source = resolver.resolveSource('local')
      expect(source?.remotePath).toBeUndefined()
      expect(source?.bucket).toBeUndefined()
    })

    it('should handle sources without prefix', () => {
      const config = createUnifiedConfig({
        root: createFileSource({
          type: 's3',
          bucket: 'root-bucket',
          prefix: undefined,
          local: { base_path: '.fractary/root' },
        }),
      })
      const resolver = new FileSourceResolver(config)

      const source = resolver.resolveSource('root')
      expect(source?.remotePath).toBe('s3://root-bucket')
      expect(source?.prefix).toBeUndefined()
    })
  })

  describe('getAvailableSources', () => {
    it('should return empty array when no sources configured', () => {
      const config = createUnifiedConfig()
      const resolver = new FileSourceResolver(config)

      expect(resolver.getAvailableSources()).toEqual([])
    })

    it('should return all configured sources', () => {
      const config = createUnifiedConfig({
        specs: createFileSource({ local: { base_path: '.fractary/specs' } }),
        logs: createFileSource({ local: { base_path: '.fractary/logs' } }),
        assets: createFileSource({ local: { base_path: '.fractary/assets' } }),
      })
      const resolver = new FileSourceResolver(config)

      const sources = resolver.getAvailableSources()
      expect(sources).toHaveLength(3)

      const names = sources.map((s) => s.name)
      expect(names).toContain('specs')
      expect(names).toContain('logs')
      expect(names).toContain('assets')
    })

    it('should include all source properties', () => {
      const config = createUnifiedConfig({
        specs: createFileSource({
          type: 's3',
          bucket: 'test-bucket',
          prefix: 'specs/',
          local: { base_path: '.fractary/specs' },
        }),
      })
      const resolver = new FileSourceResolver(config)

      const sources = resolver.getAvailableSources()
      const specsSource = sources[0]

      expect(specsSource).toBeDefined()
      expect(specsSource.name).toBe('specs')
      expect(specsSource.type).toBe('file-plugin')
      expect(specsSource.localPath).toBe('.fractary/specs')
      expect(specsSource.isCurrentProject).toBe(true)
      expect(specsSource.bucket).toBe('test-bucket')
      expect(specsSource.prefix).toBe('specs/')
      expect(specsSource.remotePath).toBe('s3://test-bucket/specs/')
      expect(specsSource.config).toBeDefined()
    })
  })

  describe('resolveSource', () => {
    let resolver: FileSourceResolver

    beforeEach(() => {
      const config = createUnifiedConfig({
        specs: createFileSource({ local: { base_path: '.fractary/specs' } }),
        logs: createFileSource({ local: { base_path: '.fractary/logs' } }),
      })
      resolver = new FileSourceResolver(config)
    })

    it('should resolve source by name', () => {
      const source = resolver.resolveSource('specs')

      expect(source).not.toBeNull()
      expect(source?.name).toBe('specs')
      expect(source?.localPath).toBe('.fractary/specs')
    })

    it('should return null for non-existent source', () => {
      const source = resolver.resolveSource('nonexistent')

      expect(source).toBeNull()
    })

    it('should be case-sensitive for source names', () => {
      const source = resolver.resolveSource('SPECS')

      expect(source).toBeNull()
    })
  })

  describe('isFilePluginPath', () => {
    let resolver: FileSourceResolver

    beforeEach(() => {
      const config = createUnifiedConfig({
        specs: createFileSource({ local: { base_path: '.fractary/specs' } }),
        logs: createFileSource({ local: { base_path: '.fractary/logs' } }),
      })
      resolver = new FileSourceResolver(config)
    })

    it('should return true for paths within a source', () => {
      expect(resolver.isFilePluginPath('.fractary/specs/SPEC-001.md')).toBe(true)
      expect(resolver.isFilePluginPath('.fractary/logs/session-001.md')).toBe(true)
    })

    it('should return true for exact source path', () => {
      expect(resolver.isFilePluginPath('.fractary/specs')).toBe(true)
      expect(resolver.isFilePluginPath('.fractary/logs')).toBe(true)
    })

    it('should return false for paths outside sources', () => {
      expect(resolver.isFilePluginPath('.fractary/other/file.md')).toBe(false)
      expect(resolver.isFilePluginPath('src/index.ts')).toBe(false)
    })

    it('should handle paths without leading dot', () => {
      expect(resolver.isFilePluginPath('fractary/specs/SPEC-001.md')).toBe(false)
    })

    it('should handle paths with leading slash', () => {
      expect(resolver.isFilePluginPath('/.fractary/specs/SPEC-001.md')).toBe(true)
    })

    it('should handle paths with trailing slash', () => {
      expect(resolver.isFilePluginPath('.fractary/specs/')).toBe(true)
    })

    it('should be case-insensitive for path matching', () => {
      expect(resolver.isFilePluginPath('.FRACTARY/SPECS/SPEC-001.md')).toBe(true)
    })
  })

  describe('getSourceForPath', () => {
    let resolver: FileSourceResolver

    beforeEach(() => {
      const config = createUnifiedConfig({
        specs: createFileSource({ local: { base_path: '.fractary/specs' } }),
        logs: createFileSource({ local: { base_path: '.fractary/logs' } }),
      })
      resolver = new FileSourceResolver(config)
    })

    it('should return source for matching path', () => {
      const source = resolver.getSourceForPath('.fractary/specs/SPEC-001.md')

      expect(source).not.toBeNull()
      expect(source?.name).toBe('specs')
    })

    it('should return null for non-matching path', () => {
      const source = resolver.getSourceForPath('.fractary/other/file.md')

      expect(source).toBeNull()
    })

    it('should handle nested paths', () => {
      const source = resolver.getSourceForPath('.fractary/specs/nested/deep/SPEC-001.md')

      expect(source).not.toBeNull()
      expect(source?.name).toBe('specs')
    })

    it('should use longest match strategy for overlapping paths', () => {
      const config = createUnifiedConfig({
        fractary: createFileSource({ local: { base_path: '.fractary' } }),
        specs: createFileSource({ local: { base_path: '.fractary/specs' } }),
      })
      const overlapResolver = new FileSourceResolver(config)

      const source = overlapResolver.getSourceForPath('.fractary/specs/SPEC-001.md')

      expect(source).not.toBeNull()
      expect(source?.name).toBe('specs') // Should match the more specific path
    })

    it('should normalize paths before matching', () => {
      // With leading ./
      expect(resolver.getSourceForPath('./fractary/specs/SPEC-001.md')?.name).toBe('specs')

      // With leading /
      expect(resolver.getSourceForPath('/.fractary/specs/SPEC-001.md')?.name).toBe('specs')

      // With trailing /
      expect(resolver.getSourceForPath('.fractary/specs/')?.name).toBe('specs')

      // With different case
      expect(resolver.getSourceForPath('.FRACTARY/SPECS/SPEC-001.md')?.name).toBe('specs')
    })

    it('should handle exact source path', () => {
      const source = resolver.getSourceForPath('.fractary/specs')

      expect(source).not.toBeNull()
      expect(source?.name).toBe('specs')
    })
  })

  describe('getSourceNames', () => {
    it('should return empty array when no sources', () => {
      const config = createUnifiedConfig()
      const resolver = new FileSourceResolver(config)

      expect(resolver.getSourceNames()).toEqual([])
    })

    it('should return all source names', () => {
      const config = createUnifiedConfig({
        specs: createFileSource({ local: { base_path: '.fractary/specs' } }),
        logs: createFileSource({ local: { base_path: '.fractary/logs' } }),
        assets: createFileSource({ local: { base_path: '.fractary/assets' } }),
      })
      const resolver = new FileSourceResolver(config)

      const names = resolver.getSourceNames()
      expect(names).toHaveLength(3)
      expect(names).toContain('specs')
      expect(names).toContain('logs')
      expect(names).toContain('assets')
    })
  })

  describe('hasSources', () => {
    it('should return false when no sources configured', () => {
      const config = createUnifiedConfig()
      const resolver = new FileSourceResolver(config)

      expect(resolver.hasSources()).toBe(false)
    })

    it('should return true when sources are configured', () => {
      const config = createUnifiedConfig({
        specs: createFileSource({ local: { base_path: '.fractary/specs' } }),
      })
      const resolver = new FileSourceResolver(config)

      expect(resolver.hasSources()).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty sources object', () => {
      const config: UnifiedConfig = {
        file: {
          schema_version: '2.0',
          sources: {},
        },
        codex: {
          schema_version: '2.0',
          organization: 'test-org',
          project: 'test-project',
          dependencies: {},
        },
      }
      const resolver = new FileSourceResolver(config)

      expect(resolver.hasSources()).toBe(false)
      expect(resolver.getAvailableSources()).toEqual([])
    })

    it('should handle missing file config section', () => {
      const config: UnifiedConfig = {
        codex: {
          schema_version: '2.0',
          organization: 'test-org',
          project: 'test-project',
          dependencies: {},
        },
      }
      const resolver = new FileSourceResolver(config)

      expect(resolver.hasSources()).toBe(false)
    })

    it('should handle empty path strings', () => {
      const config = createUnifiedConfig({
        specs: createFileSource({ local: { base_path: '.fractary/specs' } }),
      })
      const resolver = new FileSourceResolver(config)

      expect(resolver.isFilePluginPath('')).toBe(false)
      expect(resolver.getSourceForPath('')).toBeNull()
    })

    it('should handle source with empty prefix', () => {
      const config = createUnifiedConfig({
        root: createFileSource({
          type: 's3',
          bucket: 'test-bucket',
          prefix: '',
          local: { base_path: '.fractary/root' },
        }),
      })
      const resolver = new FileSourceResolver(config)

      const source = resolver.resolveSource('root')
      expect(source?.prefix).toBe('')
      expect(source?.remotePath).toBe('s3://test-bucket')
    })
  })
})
