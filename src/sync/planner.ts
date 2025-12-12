/**
 * Sync planner
 *
 * Creates sync plans by comparing source and target file states.
 */

import type {
  SyncPlan,
  SyncOptions,
  SyncDirection,
  FileSyncStatus,
  SyncConfig,
} from './types.js'
import { evaluatePath } from './evaluator.js'

/**
 * File info for comparison
 */
export interface FileInfo {
  path: string
  size: number
  mtime: number
  hash?: string
}

/**
 * Create a sync plan by comparing source and target files
 *
 * @param sourceFiles - Files in the source
 * @param targetFiles - Files in the target
 * @param options - Sync options
 * @param config - Sync configuration
 * @returns Sync plan
 */
export function createSyncPlan(
  sourceFiles: FileInfo[],
  targetFiles: FileInfo[],
  options: SyncOptions,
  config: SyncConfig
): SyncPlan {
  const direction = options.direction ?? config.defaultDirection
  const targetMap = new Map(targetFiles.map((f) => [f.path, f]))
  const sourceMap = new Map(sourceFiles.map((f) => [f.path, f]))

  const files: FileSyncStatus[] = []
  const conflicts: FileSyncStatus[] = []
  const skipped: FileSyncStatus[] = []

  // Build include/exclude rules
  const rules = [
    ...config.rules,
    ...(options.include ?? []).map((p) => ({ pattern: p, include: true, priority: 200 })),
    ...(options.exclude ?? []).map((p) => ({ pattern: p, include: false, priority: 200 })),
  ]

  const excludes = [...config.defaultExcludes]

  // Process source files
  for (const sourceFile of sourceFiles) {
    // Evaluate if file should be synced
    const evaluation = evaluatePath(sourceFile.path, rules, direction, excludes)

    if (!evaluation.shouldSync) {
      skipped.push({
        path: sourceFile.path,
        operation: 'skip',
        size: sourceFile.size,
        reason: evaluation.reason,
      })
      continue
    }

    const targetFile = targetMap.get(sourceFile.path)

    if (!targetFile) {
      // File doesn't exist in target - create it
      files.push({
        path: sourceFile.path,
        operation: 'create',
        size: sourceFile.size,
        mtime: sourceFile.mtime,
        hash: sourceFile.hash,
      })
    } else {
      // File exists in both - check for changes
      const isDifferent = sourceFile.hash !== targetFile.hash

      if (isDifferent) {
        if (options.force) {
          // Force overwrite
          files.push({
            path: sourceFile.path,
            operation: 'update',
            size: sourceFile.size,
            mtime: sourceFile.mtime,
            hash: sourceFile.hash,
          })
        } else if (targetFile.mtime > sourceFile.mtime) {
          // Target is newer - conflict
          conflicts.push({
            path: sourceFile.path,
            operation: 'conflict',
            size: sourceFile.size,
            mtime: sourceFile.mtime,
            reason: 'Target file is newer than source',
          })
        } else {
          // Source is newer - update
          files.push({
            path: sourceFile.path,
            operation: 'update',
            size: sourceFile.size,
            mtime: sourceFile.mtime,
            hash: sourceFile.hash,
          })
        }
      } else {
        // Files are identical - skip
        skipped.push({
          path: sourceFile.path,
          operation: 'skip',
          size: sourceFile.size,
          reason: 'Files are identical',
        })
      }
    }
  }

  // Handle deletions if enabled
  if (options.delete) {
    for (const targetFile of targetFiles) {
      if (!sourceMap.has(targetFile.path)) {
        // File in target but not in source
        const evaluation = evaluatePath(targetFile.path, rules, direction, excludes)

        if (evaluation.shouldSync) {
          files.push({
            path: targetFile.path,
            operation: 'delete',
            size: targetFile.size,
          })
        }
      }
    }
  }

  // Apply max files limit
  let limitedFiles = files
  if (options.maxFiles && files.length > options.maxFiles) {
    limitedFiles = files.slice(0, options.maxFiles)
    for (const file of files.slice(options.maxFiles)) {
      skipped.push({
        ...file,
        operation: 'skip',
        reason: 'Exceeded max files limit',
      })
    }
  }

  // Calculate totals
  const totalBytes = limitedFiles.reduce((sum, f) => sum + (f.size ?? 0), 0)

  return {
    direction,
    source: direction === 'from-codex' ? 'codex' : 'local',
    target: direction === 'from-codex' ? 'local' : 'codex',
    files: limitedFiles,
    totalFiles: limitedFiles.length,
    totalBytes,
    conflicts,
    skipped,
  }
}

/**
 * Estimate sync time based on file sizes
 *
 * @param plan - Sync plan
 * @param bytesPerSecond - Estimated transfer speed (default: 1MB/s)
 * @returns Estimated time in milliseconds
 */
export function estimateSyncTime(plan: SyncPlan, bytesPerSecond = 1024 * 1024): number {
  const transferTime = (plan.totalBytes / bytesPerSecond) * 1000
  const overheadPerFile = 50 // ms per file
  const overhead = plan.totalFiles * overheadPerFile

  return Math.ceil(transferTime + overhead)
}

/**
 * Create an empty sync plan
 */
export function createEmptySyncPlan(direction: SyncDirection = 'to-codex'): SyncPlan {
  return {
    direction,
    source: direction === 'from-codex' ? 'codex' : 'local',
    target: direction === 'from-codex' ? 'local' : 'codex',
    files: [],
    totalFiles: 0,
    totalBytes: 0,
    conflicts: [],
    skipped: [],
  }
}

/**
 * Filter plan to only include specific operations
 */
export function filterPlanOperations(
  plan: SyncPlan,
  operations: Array<'create' | 'update' | 'delete'>
): SyncPlan {
  const filtered = plan.files.filter((f) =>
    operations.includes(f.operation as 'create' | 'update' | 'delete')
  )

  return {
    ...plan,
    files: filtered,
    totalFiles: filtered.length,
    totalBytes: filtered.reduce((sum, f) => sum + (f.size ?? 0), 0),
  }
}

/**
 * Get plan statistics
 */
export interface PlanStats {
  creates: number
  updates: number
  deletes: number
  skips: number
  conflicts: number
  totalBytes: number
}

/**
 * Get statistics from a sync plan
 */
export function getPlanStats(plan: SyncPlan): PlanStats {
  return {
    creates: plan.files.filter((f) => f.operation === 'create').length,
    updates: plan.files.filter((f) => f.operation === 'update').length,
    deletes: plan.files.filter((f) => f.operation === 'delete').length,
    skips: plan.skipped.length,
    conflicts: plan.conflicts.length,
    totalBytes: plan.totalBytes,
  }
}

/**
 * Format plan as human-readable summary
 */
export function formatPlanSummary(plan: SyncPlan): string {
  const stats = getPlanStats(plan)

  const lines = [
    `Sync Plan: ${plan.source} → ${plan.target}`,
    `Direction: ${plan.direction}`,
    '',
    `Operations:`,
    `  Create: ${stats.creates} files`,
    `  Update: ${stats.updates} files`,
    `  Delete: ${stats.deletes} files`,
    `  Skip: ${stats.skips} files`,
    '',
  ]

  if (stats.conflicts > 0) {
    lines.push(`⚠️ Conflicts: ${stats.conflicts} files`)
    lines.push('')
  }

  lines.push(`Total: ${plan.totalFiles} files (${formatBytes(stats.totalBytes)})`)

  return lines.join('\n')
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
