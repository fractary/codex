import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  scanCodexWithRouting,
  extractProjectFromPath,
  groupFilesByProject,
  calculateTotalSize,
  formatScanStats,
  type RoutedFileInfo,
  type RoutingScanStats,
} from '../../../src/sync/routing-scanner.js'
import { createLocalStorage } from '../../../src/storage/local.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('sync/routing-scanner', () => {
  describe('extractProjectFromPath', () => {
    it('should extract project from standard path', () => {
      const result = extractProjectFromPath('corthosai/etl.corthion.ai/docs/api.md', 'corthosai')
      expect(result).toBe('etl.corthion.ai')
    })

    it('should handle path without org prefix', () => {
      const result = extractProjectFromPath('etl.corthion.ai/docs/api.md', 'corthosai')
      expect(result).toBe('etl.corthion.ai')
    })

    it('should handle path with backslashes', () => {
      const result = extractProjectFromPath('corthosai\\etl.corthion.ai\\docs\\api.md', 'corthosai')
      expect(result).toBe('etl.corthion.ai')
    })

    it('should handle root-level file', () => {
      const result = extractProjectFromPath('corthosai/project-name', 'corthosai')
      expect(result).toBe('project-name')
    })

    it('should handle different org names', () => {
      const result = extractProjectFromPath('fractary/codex/docs/spec.md', 'fractary')
      expect(result).toBe('codex')
    })
  })

  describe('groupFilesByProject', () => {
    it('should group files by source project', () => {
      const files: RoutedFileInfo[] = [
        {
          path: 'org/proj-a/file1.md',
          size: 100,
          mtime: 1000,
          hash: 'abc123',
          metadata: {},
          sourceProject: 'proj-a',
        },
        {
          path: 'org/proj-a/file2.md',
          size: 200,
          mtime: 2000,
          hash: 'def456',
          metadata: {},
          sourceProject: 'proj-a',
        },
        {
          path: 'org/proj-b/file3.md',
          size: 300,
          mtime: 3000,
          hash: 'ghi789',
          metadata: {},
          sourceProject: 'proj-b',
        },
      ]

      const grouped = groupFilesByProject(files)

      expect(grouped.size).toBe(2)
      expect(grouped.get('proj-a')).toHaveLength(2)
      expect(grouped.get('proj-b')).toHaveLength(1)
    })

    it('should handle empty array', () => {
      const grouped = groupFilesByProject([])
      expect(grouped.size).toBe(0)
    })
  })

  describe('calculateTotalSize', () => {
    it('should sum file sizes', () => {
      const files: RoutedFileInfo[] = [
        {
          path: 'file1.md',
          size: 100,
          mtime: 1000,
          hash: 'a',
          metadata: {},
          sourceProject: 'proj',
        },
        {
          path: 'file2.md',
          size: 250,
          mtime: 2000,
          hash: 'b',
          metadata: {},
          sourceProject: 'proj',
        },
        {
          path: 'file3.md',
          size: 650,
          mtime: 3000,
          hash: 'c',
          metadata: {},
          sourceProject: 'proj',
        },
      ]

      const total = calculateTotalSize(files)
      expect(total).toBe(1000)
    })

    it('should return 0 for empty array', () => {
      expect(calculateTotalSize([])).toBe(0)
    })
  })

  describe('formatScanStats', () => {
    it('should format stats without errors', () => {
      const stats: RoutingScanStats = {
        totalScanned: 100,
        totalMatched: 25,
        totalSkipped: 75,
        sourceProjects: ['proj-a', 'proj-b'],
        durationMs: 1234,
        errors: [],
      }

      const formatted = formatScanStats(stats)

      expect(formatted).toContain('Scanned: 100 files')
      expect(formatted).toContain('Matched: 25 files')
      expect(formatted).toContain('Skipped: 75 files')
      expect(formatted).toContain('Source projects: 2')
      expect(formatted).toContain('proj-a, proj-b')
      expect(formatted).toContain('Duration: 1234ms')
      expect(formatted).not.toContain('Errors')
    })

    it('should format stats with errors', () => {
      const stats: RoutingScanStats = {
        totalScanned: 10,
        totalMatched: 5,
        totalSkipped: 5,
        sourceProjects: ['proj-a'],
        durationMs: 500,
        errors: [
          { path: 'file1.md', error: 'Parse error' },
          { path: 'file2.md', error: 'Too large' },
        ],
      }

      const formatted = formatScanStats(stats)

      expect(formatted).toContain('Errors: 2')
      expect(formatted).toContain('file1.md: Parse error')
      expect(formatted).toContain('file2.md: Too large')
    })

    it('should truncate long error list', () => {
      const errors = Array.from({ length: 10 }, (_, i) => ({
        path: `file${i}.md`,
        error: 'Error',
      }))

      const stats: RoutingScanStats = {
        totalScanned: 20,
        totalMatched: 10,
        totalSkipped: 10,
        sourceProjects: [],
        durationMs: 100,
        errors,
      }

      const formatted = formatScanStats(stats)

      expect(formatted).toContain('Errors: 10')
      expect(formatted).toContain('... and 5 more')
    })
  })

  describe('scanCodexWithRouting', () => {
    let tempDir: string
    let storage: ReturnType<typeof createLocalStorage>

    beforeEach(async () => {
      // Create temporary directory for test files
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'routing-scanner-test-'))
      storage = createLocalStorage({ baseDir: tempDir })
    })

    afterEach(async () => {
      // Clean up temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors
      }
    })

    it('should find files from multiple projects with wildcard pattern', async () => {
      // Setup mock codex structure
      await fs.mkdir(path.join(tempDir, 'org', 'project-a'), { recursive: true })
      await fs.mkdir(path.join(tempDir, 'org', 'project-b'), { recursive: true })

      await fs.writeFile(
        path.join(tempDir, 'org', 'project-a', 'file1.md'),
        '---\ncodex_sync_include: ["*"]\n---\nContent A'
      )

      await fs.writeFile(
        path.join(tempDir, 'org', 'project-b', 'file2.md'),
        '---\ncodex_sync_include: ["*"]\n---\nContent B'
      )

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
      })

      expect(result.files.length).toBe(2)
      expect(result.stats.totalMatched).toBe(2)
      expect(result.stats.sourceProjects).toContain('project-a')
      expect(result.stats.sourceProjects).toContain('project-b')
    })

    it('should match specific patterns', async () => {
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a'), { recursive: true })
      await fs.mkdir(path.join(tempDir, 'org', 'proj-b'), { recursive: true })

      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'file.md'),
        '---\ncodex_sync_include: ["target-*"]\n---\nContent'
      )

      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-b', 'file.md'),
        '---\ncodex_sync_include: ["other-*"]\n---\nContent'
      )

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
      })

      // Only proj-a should match (target-*)
      expect(result.files.length).toBe(1)
      expect(result.files[0]?.sourceProject).toBe('proj-a')
    })

    it('should respect codex_sync_exclude patterns', async () => {
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a'), { recursive: true })

      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'file.md'),
        '---\ncodex_sync_include: ["*"]\ncodex_sync_exclude: ["target-*"]\n---\nContent'
      )

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
      })

      // Should be excluded despite wildcard include
      expect(result.files.length).toBe(0)
      expect(result.stats.totalSkipped).toBeGreaterThan(0)
    })

    it('should evaluate files without frontmatter by default', async () => {
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a'), { recursive: true })

      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'no-frontmatter.md'),
        'Just plain content without frontmatter'
      )

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
        // skipNoFrontmatter defaults to false now
      })

      // File is evaluated but not matched (no routing rules)
      expect(result.files.length).toBe(0)
      expect(result.stats.totalScanned).toBeGreaterThan(0)
    })

    it('should skip files without frontmatter when skipNoFrontmatter=true', async () => {
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a'), { recursive: true })

      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'no-frontmatter.md'),
        'Just plain content without frontmatter'
      )

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
        skipNoFrontmatter: true, // Explicitly skip
      })

      expect(result.files.length).toBe(0)
      expect(result.stats.totalSkipped).toBeGreaterThan(0)
    })

    it('should handle malformed YAML gracefully', async () => {
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a'), { recursive: true })

      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'bad-yaml.md'),
        '---\ncodex_sync_include: [unclosed\n---\nContent'
      )

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
      })

      // Should skip malformed file (parser returns empty metadata in non-strict mode)
      expect(result.files.length).toBe(0)
      expect(result.stats.totalSkipped).toBeGreaterThan(0)
    })

    it('should scan non-markdown files with frontmatter', async () => {
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a'), { recursive: true })

      // Create non-markdown files WITH frontmatter
      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'schema.json'),
        '---\ncodex_sync_include: ["*"]\n---\n{}'
      )
      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'config.yaml'),
        '---\ncodex_sync_include: ["*"]\n---\nkey: value'
      )

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
      })

      // Should find both non-markdown files
      expect(result.files.length).toBe(2)
      const paths = result.files.map((f) => path.basename(f.path))
      expect(paths).toContain('schema.json')
      expect(paths).toContain('config.yaml')
    })

    it('should skip non-markdown files WITHOUT frontmatter', async () => {
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a'), { recursive: true })

      // Files without frontmatter should be skipped
      await fs.writeFile(path.join(tempDir, 'org', 'proj-a', 'file.txt'), 'Text file')
      await fs.writeFile(path.join(tempDir, 'org', 'proj-a', 'file.js'), '// JS file')

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
      })

      expect(result.files.length).toBe(0)
      expect(result.stats.totalSkipped).toBeGreaterThan(0)
    })

    it('should handle mixed markdown and non-markdown files', async () => {
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a'), { recursive: true })

      // Mix of file types with frontmatter
      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'doc.md'),
        '---\ncodex_sync_include: ["*"]\n---\n# Markdown'
      )
      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'schema.json'),
        '---\ncodex_sync_include: ["*"]\n---\n{}'
      )
      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'config.yaml'),
        '---\ncodex_sync_include: ["*"]\n---\nkey: value'
      )

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
      })

      // Should find all three files
      expect(result.files.length).toBe(3)
      const extensions = result.files.map((f) => path.extname(f.path))
      expect(extensions).toContain('.md')
      expect(extensions).toContain('.json')
      expect(extensions).toContain('.yaml')
    })

    it('should calculate file metadata correctly', async () => {
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a'), { recursive: true })

      const content = '---\ncodex_sync_include: ["*"]\n---\nTest content'
      await fs.writeFile(path.join(tempDir, 'org', 'proj-a', 'file.md'), content)

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
      })

      expect(result.files.length).toBe(1)
      const file = result.files[0]!

      expect(file.path).toBe(path.normalize('org/proj-a/file.md'))
      expect(file.size).toBeGreaterThan(0)
      expect(file.mtime).toBeGreaterThan(0)
      expect(file.hash).toBeDefined()
      expect(file.metadata.codex_sync_include).toEqual(['*'])
      expect(file.sourceProject).toBe('proj-a')
    })

    it('should track scan statistics', async () => {
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a'), { recursive: true })

      // Create mix of files: matching, non-matching, no frontmatter
      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'match.md'),
        '---\ncodex_sync_include: ["*"]\n---\nMatches'
      )

      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'no-match.md'),
        '---\ncodex_sync_include: ["other-*"]\n---\nDoesnt match'
      )

      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'no-frontmatter.md'),
        'No frontmatter'
      )

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
      })

      expect(result.stats.totalScanned).toBe(3)
      expect(result.stats.totalMatched).toBe(1)
      expect(result.stats.totalSkipped).toBe(2)
      expect(result.stats.durationMs).toBeGreaterThan(0)
    })

    it('should skip files exceeding max size', async () => {
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a'), { recursive: true })

      // Create file larger than limit
      const largeContent =
        '---\ncodex_sync_include: ["*"]\n---\n' + 'x'.repeat(200 * 1024)
      await fs.writeFile(path.join(tempDir, 'org', 'proj-a', 'large.md'), largeContent)

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
        maxFileSize: 100 * 1024, // 100KB limit
      })

      expect(result.files.length).toBe(0)
      expect(result.stats.errors.some((e) => e.error.includes('too large'))).toBe(true)
    })

    it('should skip hidden directories', async () => {
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a', '.hidden'), { recursive: true })
      await fs.mkdir(path.join(tempDir, 'org', 'proj-a', 'node_modules'), {
        recursive: true,
      })

      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', '.hidden', 'file.md'),
        '---\ncodex_sync_include: ["*"]\n---\nHidden'
      )

      await fs.writeFile(
        path.join(tempDir, 'org', 'proj-a', 'node_modules', 'file.md'),
        '---\ncodex_sync_include: ["*"]\n---\nNode modules'
      )

      const result = await scanCodexWithRouting({
        codexDir: tempDir,
        targetProject: 'target-project',
        org: 'org',
        storage,
      })

      // Should not find files in hidden or node_modules
      expect(result.files.length).toBe(0)
    })
  })
})
