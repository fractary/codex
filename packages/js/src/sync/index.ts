/**
 * Sync module
 *
 * Provides synchronization functionality between local files
 * and the codex repository.
 *
 * @example
 * ```typescript
 * import {
 *   createSyncManager,
 *   createLocalStorage,
 *   createSyncPlan,
 * } from '@fractary/codex'
 *
 * const localStorage = createLocalStorage({ baseDir: process.cwd() })
 * const sync = createSyncManager({
 *   localStorage,
 *   config: {
 *     defaultDirection: 'to-codex',
 *     rules: [
 *       { pattern: 'docs/**', include: true },
 *       { pattern: 'node_modules/**', include: false },
 *     ],
 *   },
 * })
 *
 * // Create a sync plan
 * const plan = await sync.createPlan('org', 'project', 'docs', [])
 *
 * // Execute (dry run)
 * const result = await sync.executePlan(plan, { dryRun: true })
 * ```
 */

// Types
export {
  type SyncDirection,
  type SyncOperation,
  type FileSyncStatus,
  type SyncManifestEntry,
  type SyncManifest,
  type SyncPlan,
  type SyncResult,
  type SyncOptions,
  type SyncRule,
  type SyncConfig,
  DEFAULT_SYNC_CONFIG,
} from './types.js'

// Evaluator
export {
  evaluatePath,
  evaluatePaths,
  filterSyncablePaths,
  createRulesFromPatterns,
  mergeRules,
  summarizeEvaluations,
  validateRules,
  type EvaluationResult,
  type EvaluationSummary,
} from './evaluator.js'

// Planner
export {
  createSyncPlan,
  estimateSyncTime,
  createEmptySyncPlan,
  filterPlanOperations,
  getPlanStats,
  formatPlanSummary,
  type FileInfo,
  type PlanStats,
} from './planner.js'

// Manager
export {
  SyncManager,
  createSyncManager,
  type SyncManagerConfig,
} from './manager.js'
