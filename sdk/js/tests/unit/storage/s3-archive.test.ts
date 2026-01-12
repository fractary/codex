import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { S3ArchiveStorage } from '../../../src/storage/s3-archive.js'
import type { ResolvedReference } from '../../../src/references/index.js'
import * as execFileModule from '../../../src/utils/execFileNoThrow.js'

// Mock execFileNoThrow
vi.mock('../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: vi.fn(),
}))

describe('storage/s3-archive', () => {
  let storage: S3ArchiveStorage
  const mockExecFileNoThrow = vi.mocked(execFileModule.execFileNoThrow)

  beforeEach(() => {
    storage = new S3ArchiveStorage({
      projects: {
        'fractary/auth-service': {
          enabled: true,
          handler: 's3',
          bucket: 'test-bucket',
          patterns: ['specs/**', 'docs/**'],
        },
        'fractary/api-gateway': {
          enabled: true,
          handler: 'r2',
          bucket: 'api-archives',
        },
      },
    })

    mockExecFileNoThrow.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  function createReference(overrides: Partial<ResolvedReference>): ResolvedReference {
    return {
      uri: 'codex://fractary/auth-service/specs/WORK-123.md',
      org: 'fractary',
      project: 'auth-service',
      path: 'specs/WORK-123.md',
      cachePath: '.fractary/codex/cache/fractary/auth-service/specs/WORK-123.md',
      isCurrentProject: true,
      localPath: 'specs/WORK-123.md',
      ...overrides,
    }
  }

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(storage).toBeInstanceOf(S3ArchiveStorage)
      expect(storage.name).toBe('s3-archive')
      expect(storage.type).toBe('s3-archive')
    })

    it('should use default fractary CLI path', () => {
      const defaultStorage = new S3ArchiveStorage()
      expect(defaultStorage).toBeInstanceOf(S3ArchiveStorage)
    })

    it('should accept custom fractary CLI path', () => {
      const customStorage = new S3ArchiveStorage({
        fractaryCli: '/custom/path/to/fractary',
      })
      expect(customStorage).toBeInstanceOf(S3ArchiveStorage)
    })
  })

  describe('canHandle', () => {
    it('should handle current project with archive enabled', () => {
      const ref = createReference({})
      expect(storage.canHandle(ref)).toBe(true)
    })

    it('should not handle non-current project', () => {
      const ref = createReference({
        isCurrentProject: false,
      })
      expect(storage.canHandle(ref)).toBe(false)
    })

    it('should not handle project without archive config', () => {
      const ref = createReference({
        org: 'fractary',
        project: 'unknown-project',
      })
      expect(storage.canHandle(ref)).toBe(false)
    })

    it('should not handle project with archive disabled', () => {
      const disabledStorage = new S3ArchiveStorage({
        projects: {
          'fractary/auth-service': {
            enabled: false,
            handler: 's3',
          },
        },
      })

      const ref = createReference({})
      expect(disabledStorage.canHandle(ref)).toBe(false)
    })

    it('should match patterns when specified', () => {
      const ref1 = createReference({ path: 'specs/WORK-123.md' })
      const ref2 = createReference({ path: 'docs/api.md' })
      const ref3 = createReference({ path: 'other/file.md' })

      expect(storage.canHandle(ref1)).toBe(true) // matches specs/**
      expect(storage.canHandle(ref2)).toBe(true) // matches docs/**
      expect(storage.canHandle(ref3)).toBe(false) // no match
    })

    it('should handle all files when no patterns specified', () => {
      const noPatternStorage = new S3ArchiveStorage({
        projects: {
          'fractary/api-gateway': {
            enabled: true,
            handler: 's3',
          },
        },
      })

      const ref = createReference({
        org: 'fractary',
        project: 'api-gateway',
        path: 'any/file.md',
      })

      expect(noPatternStorage.canHandle(ref)).toBe(true)
    })
  })

  describe('fetch', () => {
    it('should fetch content from archive via fractary-file', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        stdout: '# Archive Content\n\nThis is archived.',
        stderr: '',
        exitCode: 0,
      })

      const ref = createReference({})
      const result = await storage.fetch(ref)

      expect(result.content.toString()).toBe('# Archive Content\n\nThis is archived.')
      expect(result.contentType).toBe('text/markdown')
      expect(result.source).toBe('s3-archive')
      expect(result.size).toBe(36) // Actual length of the test string
      expect(result.metadata).toMatchObject({
        archivePath: 'archive/specs/fractary/auth-service/specs/WORK-123.md',
        bucket: 'test-bucket',
        handler: 's3',
      })
    })

    it('should call fractary-file with correct arguments', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        stdout: 'content',
        stderr: '',
        exitCode: 0,
      })

      const ref = createReference({})
      await storage.fetch(ref)

      expect(mockExecFileNoThrow).toHaveBeenCalledWith(
        'fractary',
        [
          'file',
          'read',
          '--remote-path',
          'archive/specs/fractary/auth-service/specs/WORK-123.md',
          '--handler',
          's3',
          '--bucket',
          'test-bucket',
        ],
        expect.any(Object)
      )
    })

    it('should handle different artifact types', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        stdout: 'content',
        stderr: '',
        exitCode: 0,
      })

      // Test specs
      await storage.fetch(createReference({ path: 'specs/WORK-123.md' }))
      expect(mockExecFileNoThrow).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.arrayContaining([
          '--remote-path',
          'archive/specs/fractary/auth-service/specs/WORK-123.md',
        ]),
        expect.any(Object)
      )

      // Test docs
      await storage.fetch(createReference({ path: 'docs/api.md' }))
      expect(mockExecFileNoThrow).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.arrayContaining([
          '--remote-path',
          'archive/docs/fractary/auth-service/docs/api.md',
        ]),
        expect.any(Object)
      )

      // Test logs
      await storage.fetch(createReference({ path: '.fractary/logs/session/2025/01/log.md' }))
      expect(mockExecFileNoThrow).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.arrayContaining([
          '--remote-path',
          'archive/logs/fractary/auth-service/.fractary/logs/session/2025/01/log.md',
        ]),
        expect.any(Object)
      )

      // Test misc
      await storage.fetch(createReference({ path: 'other/file.txt' }))
      expect(mockExecFileNoThrow).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.arrayContaining([
          '--remote-path',
          'archive/misc/fractary/auth-service/other/file.txt',
        ]),
        expect.any(Object)
      )
    })

    it('should throw error when fractary-file fails', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        stdout: '',
        stderr: 'File not found in S3',
        exitCode: 1,
      })

      const ref = createReference({})

      await expect(storage.fetch(ref)).rejects.toThrow(/fractary-file read failed/)
    })

    it('should throw error when exec fails', async () => {
      mockExecFileNoThrow.mockRejectedValue(new Error('Command not found'))

      const ref = createReference({})

      await expect(storage.fetch(ref)).rejects.toThrow(/Failed to fetch from archive/)
    })

    it('should throw error for project without config', async () => {
      const ref = createReference({
        org: 'fractary',
        project: 'unknown',
      })

      await expect(storage.fetch(ref)).rejects.toThrow(/No archive config for project/)
    })

    it('should use R2 handler when configured', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        stdout: 'content',
        stderr: '',
        exitCode: 0,
      })

      const ref = createReference({
        org: 'fractary',
        project: 'api-gateway',
        path: 'specs/TEST.md',
      })

      await storage.fetch(ref)

      expect(mockExecFileNoThrow).toHaveBeenCalledWith(
        'fractary',
        expect.arrayContaining(['--handler', 'r2']),
        expect.any(Object)
      )
    })
  })

  describe('exists', () => {
    it('should return true when file exists in archive', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        stdout: 'content',
        stderr: '',
        exitCode: 0,
      })

      const ref = createReference({})
      const result = await storage.exists(ref)

      expect(result).toBe(true)
    })

    it('should return false when file does not exist', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        stdout: '',
        stderr: 'Not found',
        exitCode: 1,
      })

      const ref = createReference({})
      const result = await storage.exists(ref)

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockExecFileNoThrow.mockRejectedValue(new Error('Network error'))

      const ref = createReference({})
      const result = await storage.exists(ref)

      expect(result).toBe(false)
    })
  })

  describe('pattern matching', () => {
    it('should match glob patterns correctly', () => {
      const testCases = [
        { path: 'specs/WORK-123.md', pattern: 'specs/**', expected: true },
        { path: 'specs/nested/file.md', pattern: 'specs/**', expected: true },
        { path: 'docs/api.md', pattern: 'docs/**', expected: true },
        { path: 'other/file.md', pattern: 'specs/**', expected: false },
        { path: 'file.md', pattern: '*.md', expected: true },
        { path: 'file.txt', pattern: '*.md', expected: false },
        { path: 'docs/api.md', pattern: 'docs/*.md', expected: true },
        { path: 'docs/nested/api.md', pattern: 'docs/*.md', expected: false },
      ]

      for (const { path, pattern, expected } of testCases) {
        const storage = new S3ArchiveStorage({
          projects: {
            'fractary/test': {
              enabled: true,
              handler: 's3',
              patterns: [pattern],
            },
          },
        })

        const ref = createReference({
          org: 'fractary',
          project: 'test',
          path,
        })

        expect(storage.canHandle(ref)).toBe(expected)
      }
    })
  })

  describe('archive path calculation', () => {
    it('should calculate correct paths for different types', () => {
      // This tests the internal calculateArchivePath method indirectly
      const testCases = [
        {
          path: 'specs/WORK-123.md',
          expected: 'archive/specs/fractary/auth-service/specs/WORK-123.md',
        },
        {
          path: 'docs/api-guide.md',
          expected: 'archive/docs/fractary/auth-service/docs/api-guide.md',
        },
        {
          path: '.fractary/logs/session.md',
          expected: 'archive/logs/fractary/auth-service/.fractary/logs/session.md',
        },
        {
          path: 'README.md',
          expected: 'archive/misc/fractary/auth-service/README.md',
        },
      ]

      mockExecFileNoThrow.mockResolvedValue({
        stdout: 'content',
        stderr: '',
        exitCode: 0,
      })

      for (const { path, expected } of testCases) {
        const ref = createReference({ path })
        storage.fetch(ref)

        expect(mockExecFileNoThrow).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.arrayContaining(['--remote-path', expected]),
          expect.any(Object)
        )

        mockExecFileNoThrow.mockClear()
      }
    })
  })
})
