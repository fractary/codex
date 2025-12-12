import { describe, it, expect } from 'vitest'
import {
  createSyncPlan,
  estimateSyncTime,
  createEmptySyncPlan,
  filterPlanOperations,
  getPlanStats,
  formatPlanSummary,
  type FileInfo,
} from '../../../src/sync/planner.js'
import { DEFAULT_SYNC_CONFIG } from '../../../src/sync/types.js'

describe('sync/planner', () => {
  const defaultConfig = { ...DEFAULT_SYNC_CONFIG, rules: [] }

  function createFileInfo(path: string, size = 100, hash = 'abc123'): FileInfo {
    return {
      path,
      size,
      mtime: Date.now(),
      hash,
    }
  }

  describe('createSyncPlan', () => {
    it('should create plan for new files', () => {
      const sourceFiles = [createFileInfo('docs/new.md')]
      const targetFiles: FileInfo[] = []

      const plan = createSyncPlan(sourceFiles, targetFiles, {}, defaultConfig)

      expect(plan.files).toHaveLength(1)
      expect(plan.files[0]?.operation).toBe('create')
      expect(plan.files[0]?.path).toBe('docs/new.md')
    })

    it('should detect updated files', () => {
      const sourceFiles = [createFileInfo('docs/file.md', 100, 'newhash')]
      const targetFiles = [createFileInfo('docs/file.md', 100, 'oldhash')]

      const plan = createSyncPlan(sourceFiles, targetFiles, {}, defaultConfig)

      expect(plan.files).toHaveLength(1)
      expect(plan.files[0]?.operation).toBe('update')
    })

    it('should skip identical files', () => {
      const hash = 'samehash'
      const sourceFiles = [createFileInfo('docs/file.md', 100, hash)]
      const targetFiles = [createFileInfo('docs/file.md', 100, hash)]

      const plan = createSyncPlan(sourceFiles, targetFiles, {}, defaultConfig)

      expect(plan.files).toHaveLength(0)
      expect(plan.skipped).toHaveLength(1)
      expect(plan.skipped[0]?.reason).toContain('identical')
    })

    it('should detect conflicts when target is newer', () => {
      const sourceFile = createFileInfo('docs/file.md', 100, 'sourcehash')
      sourceFile.mtime = Date.now() - 10000 // Older
      const targetFile = createFileInfo('docs/file.md', 100, 'targethash')
      targetFile.mtime = Date.now() // Newer

      const plan = createSyncPlan([sourceFile], [targetFile], {}, defaultConfig)

      expect(plan.conflicts).toHaveLength(1)
      expect(plan.conflicts[0]?.operation).toBe('conflict')
    })

    it('should force overwrite when force option is set', () => {
      const sourceFile = createFileInfo('docs/file.md', 100, 'sourcehash')
      sourceFile.mtime = Date.now() - 10000
      const targetFile = createFileInfo('docs/file.md', 100, 'targethash')
      targetFile.mtime = Date.now()

      const plan = createSyncPlan([sourceFile], [targetFile], { force: true }, defaultConfig)

      expect(plan.files).toHaveLength(1)
      expect(plan.files[0]?.operation).toBe('update')
      expect(plan.conflicts).toHaveLength(0)
    })

    it('should include delete operations when enabled', () => {
      const sourceFiles: FileInfo[] = []
      const targetFiles = [createFileInfo('docs/orphan.md')]

      const plan = createSyncPlan(sourceFiles, targetFiles, { delete: true }, defaultConfig)

      expect(plan.files).toHaveLength(1)
      expect(plan.files[0]?.operation).toBe('delete')
    })

    it('should respect exclude patterns', () => {
      const sourceFiles = [
        createFileInfo('docs/file.md'),
        createFileInfo('node_modules/pkg/index.js'),
      ]
      const targetFiles: FileInfo[] = []
      const config = {
        ...defaultConfig,
        defaultExcludes: ['**/node_modules/**'],
      }

      const plan = createSyncPlan(sourceFiles, targetFiles, {}, config)

      expect(plan.files).toHaveLength(1)
      expect(plan.files[0]?.path).toBe('docs/file.md')
      expect(plan.skipped.some((s) => s.path.includes('node_modules'))).toBe(true)
    })

    it('should respect maxFiles option', () => {
      const sourceFiles = [
        createFileInfo('file1.md'),
        createFileInfo('file2.md'),
        createFileInfo('file3.md'),
      ]
      const targetFiles: FileInfo[] = []

      const plan = createSyncPlan(sourceFiles, targetFiles, { maxFiles: 2 }, defaultConfig)

      expect(plan.files).toHaveLength(2)
      expect(plan.skipped.some((s) => s.reason?.includes('limit'))).toBe(true)
    })

    it('should calculate total bytes', () => {
      const sourceFiles = [
        createFileInfo('file1.md', 100),
        createFileInfo('file2.md', 200),
      ]
      const targetFiles: FileInfo[] = []

      const plan = createSyncPlan(sourceFiles, targetFiles, {}, defaultConfig)

      expect(plan.totalBytes).toBe(300)
    })
  })

  describe('estimateSyncTime', () => {
    it('should estimate time based on bytes', () => {
      const plan = createEmptySyncPlan()
      plan.totalBytes = 1024 * 1024 // 1MB
      plan.totalFiles = 10

      const time = estimateSyncTime(plan, 1024 * 1024) // 1MB/s

      // 1 second for transfer + 10 * 50ms overhead = 1500ms
      expect(time).toBeGreaterThan(1000)
      expect(time).toBeLessThan(2000)
    })

    it('should handle zero bytes', () => {
      const plan = createEmptySyncPlan()
      plan.totalBytes = 0
      plan.totalFiles = 0

      const time = estimateSyncTime(plan)

      expect(time).toBe(0)
    })
  })

  describe('createEmptySyncPlan', () => {
    it('should create empty plan with default direction', () => {
      const plan = createEmptySyncPlan()

      expect(plan.direction).toBe('to-codex')
      expect(plan.files).toEqual([])
      expect(plan.conflicts).toEqual([])
      expect(plan.skipped).toEqual([])
    })

    it('should accept custom direction', () => {
      const plan = createEmptySyncPlan('from-codex')

      expect(plan.direction).toBe('from-codex')
      expect(plan.source).toBe('codex')
      expect(plan.target).toBe('local')
    })
  })

  describe('filterPlanOperations', () => {
    it('should filter by operation type', () => {
      const plan = createEmptySyncPlan()
      plan.files = [
        { path: 'file1.md', operation: 'create', size: 100 },
        { path: 'file2.md', operation: 'update', size: 100 },
        { path: 'file3.md', operation: 'delete', size: 100 },
      ]
      plan.totalFiles = 3
      plan.totalBytes = 300

      const filtered = filterPlanOperations(plan, ['create', 'update'])

      expect(filtered.files).toHaveLength(2)
      expect(filtered.files.some((f) => f.operation === 'delete')).toBe(false)
    })
  })

  describe('getPlanStats', () => {
    it('should return plan statistics', () => {
      const plan = createEmptySyncPlan()
      plan.files = [
        { path: 'file1.md', operation: 'create', size: 100 },
        { path: 'file2.md', operation: 'update', size: 200 },
        { path: 'file3.md', operation: 'delete', size: 50 },
      ]
      plan.skipped = [{ path: 'file4.md', operation: 'skip' }]
      plan.conflicts = [{ path: 'file5.md', operation: 'conflict' }]
      plan.totalBytes = 350

      const stats = getPlanStats(plan)

      expect(stats.creates).toBe(1)
      expect(stats.updates).toBe(1)
      expect(stats.deletes).toBe(1)
      expect(stats.skips).toBe(1)
      expect(stats.conflicts).toBe(1)
      expect(stats.totalBytes).toBe(350)
    })
  })

  describe('formatPlanSummary', () => {
    it('should format plan as readable summary', () => {
      const plan = createEmptySyncPlan()
      plan.files = [
        { path: 'file1.md', operation: 'create', size: 100 },
        { path: 'file2.md', operation: 'update', size: 200 },
      ]
      plan.totalFiles = 2
      plan.totalBytes = 300

      const summary = formatPlanSummary(plan)

      expect(summary).toContain('Sync Plan')
      expect(summary).toContain('Create: 1')
      expect(summary).toContain('Update: 1')
      expect(summary).toContain('Total: 2 files')
    })

    it('should include conflict warning', () => {
      const plan = createEmptySyncPlan()
      plan.conflicts = [{ path: 'file.md', operation: 'conflict' }]

      const summary = formatPlanSummary(plan)

      expect(summary).toContain('Conflicts: 1')
    })
  })
})
