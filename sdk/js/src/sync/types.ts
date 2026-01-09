/**
 * Sync types
 *
 * Type definitions for the synchronization system.
 */

/**
 * Sync direction
 */
export type SyncDirection = 'to-codex' | 'from-codex' | 'bidirectional'

/**
 * Sync operation type
 */
export type SyncOperation = 'create' | 'update' | 'delete' | 'skip' | 'conflict'

/**
 * File sync status
 */
export interface FileSyncStatus {
  /** File path relative to project root */
  path: string
  /** Operation to perform */
  operation: SyncOperation
  /** Size in bytes */
  size?: number
  /** Last modified timestamp */
  mtime?: number
  /** Content hash */
  hash?: string
  /** Reason for skip or conflict */
  reason?: string
}

/**
 * Sync manifest entry
 */
export interface SyncManifestEntry {
  /** File path */
  path: string
  /** Content hash */
  hash: string
  /** File size */
  size: number
  /** Last synced timestamp */
  syncedAt: number
  /** Source of last sync */
  source: 'local' | 'remote'
}

/**
 * Sync manifest
 *
 * Tracks the state of synced files.
 */
export interface SyncManifest {
  /** Manifest version */
  version: number
  /** Organization */
  org: string
  /** Project */
  project: string
  /** Last full sync timestamp */
  lastSync: number
  /** File entries */
  entries: Record<string, SyncManifestEntry>
}

/**
 * Sync plan
 *
 * A plan of operations to perform during sync.
 */
export interface SyncPlan {
  /** Direction of sync */
  direction: SyncDirection
  /** Source location */
  source: string
  /** Target location */
  target: string
  /** Files to sync */
  files: FileSyncStatus[]
  /** Total files to process */
  totalFiles: number
  /** Total bytes to transfer */
  totalBytes: number
  /** Estimated time in ms */
  estimatedTime?: number
  /** Conflicts that need resolution */
  conflicts: FileSyncStatus[]
  /** Files that will be skipped */
  skipped: FileSyncStatus[]
}

/**
 * Sync result
 */
export interface SyncResult {
  /** Whether sync completed successfully */
  success: boolean
  /** Plan that was executed */
  plan: SyncPlan
  /** Number of files synced */
  synced: number
  /** Number of files failed */
  failed: number
  /** Number of files skipped */
  skipped: number
  /** Errors encountered */
  errors: Array<{ path: string; error: string }>
  /** Duration in ms */
  duration: number
  /** Timestamp */
  timestamp: number
}

/**
 * Sync options
 */
export interface SyncOptions {
  /** Sync direction */
  direction?: SyncDirection
  /** Whether to perform a dry run */
  dryRun?: boolean
  /** Force overwrite on conflicts */
  force?: boolean
  /** Delete files not in source */
  delete?: boolean
  /** Patterns to include */
  include?: string[]
  /** Patterns to exclude */
  exclude?: string[]
  /** Maximum files to sync */
  maxFiles?: number
  /** Timeout in ms */
  timeout?: number
  /** Progress callback */
  onProgress?: (current: number, total: number, file: string) => void
}

/**
 * Sync rule
 */
export interface SyncRule {
  /** Pattern to match */
  pattern: string
  /** Whether to include (true) or exclude (false) */
  include: boolean
  /** Priority (higher = evaluated first) */
  priority?: number
  /** Sync direction this rule applies to */
  direction?: SyncDirection
}

/**
 * Directional sync configuration (v0.7.0+)
 *
 * Provides explicit include/exclude patterns for a sync direction.
 */
export interface DirectionalSyncConfig {
  /** Patterns to include (required) */
  include: string[]
  /** Patterns to exclude (optional) */
  exclude?: string[]
}

/**
 * Routing configuration
 */
export interface RoutingConfig {
  /** Whether to use frontmatter-based routing (default: false in v0.7.0+) */
  use_frontmatter?: boolean
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  /** Default sync direction */
  defaultDirection: SyncDirection
  /** Sync rules */
  rules: SyncRule[]
  /** Default patterns to exclude */
  defaultExcludes: string[]
  /** Whether to delete orphaned files */
  deleteOrphans: boolean
  /** Conflict resolution strategy */
  conflictStrategy: 'newest' | 'local' | 'remote' | 'manual'

  // New format (v0.7.0+) - Recommended
  /** Configuration for pulling from codex (new format) */
  from_codex?: DirectionalSyncConfig
  /** Configuration for pushing to codex (new format) */
  to_codex?: DirectionalSyncConfig
  /** Routing configuration */
  routing?: RoutingConfig

  // Legacy format (deprecated, backward compatible)
  /** @deprecated Use from_codex.include instead. Org-level defaults for pulling from codex */
  default_from_codex?: string[]
  /** @deprecated Use to_codex.include instead. Org-level defaults for pushing to codex */
  default_to_codex?: string[]
  /** @deprecated Use from_codex.exclude or to_codex.exclude instead. Global exclude patterns */
  exclude?: string[]
}

/**
 * Default sync configuration
 */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  defaultDirection: 'to-codex',
  rules: [],
  defaultExcludes: [
    '**/node_modules/**',
    '**/.git/**',
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/*.log',
    '**/.env*',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
  ],
  deleteOrphans: false,
  conflictStrategy: 'newest',
}
