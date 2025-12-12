/**
 * Sync manager
 *
 * Coordinates sync operations between local files and codex repository.
 */

import type { LocalStorage } from '../storage/local.js'
import type {
  SyncPlan,
  SyncResult,
  SyncOptions,
  SyncConfig,
  SyncManifest,
  SyncManifestEntry,
  FileSyncStatus,
} from './types.js'
import { DEFAULT_SYNC_CONFIG } from './types.js'
import { createSyncPlan, estimateSyncTime, type FileInfo } from './planner.js'
import { calculateContentHash } from '../cache/entry.js'

/**
 * Sync manager configuration
 */
export interface SyncManagerConfig {
  /** Local storage provider */
  localStorage: LocalStorage
  /** Sync configuration */
  config?: Partial<SyncConfig>
  /** Manifest file path */
  manifestPath?: string
}

/**
 * Sync manager
 *
 * Manages synchronization between local files and the codex repository.
 */
export class SyncManager {
  private localStorage: LocalStorage
  private config: SyncConfig
  private manifestPath: string
  private manifest: SyncManifest | null = null

  constructor(options: SyncManagerConfig) {
    this.localStorage = options.localStorage
    this.config = {
      ...DEFAULT_SYNC_CONFIG,
      ...options.config,
    }
    this.manifestPath = options.manifestPath ?? '.fractary/codex-sync-manifest.json'
  }

  /**
   * Load the sync manifest
   */
  async loadManifest(): Promise<SyncManifest | null> {
    try {
      const content = await this.localStorage.readText(this.manifestPath)
      this.manifest = JSON.parse(content)
      return this.manifest
    } catch {
      return null
    }
  }

  /**
   * Save the sync manifest
   */
  async saveManifest(manifest: SyncManifest): Promise<void> {
    this.manifest = manifest
    await this.localStorage.write(this.manifestPath, JSON.stringify(manifest, null, 2))
  }

  /**
   * Get or create manifest
   */
  async getOrCreateManifest(org: string, project: string): Promise<SyncManifest> {
    let manifest = await this.loadManifest()

    if (!manifest || manifest.org !== org || manifest.project !== project) {
      manifest = {
        version: 1,
        org,
        project,
        lastSync: 0,
        entries: {},
      }
    }

    return manifest
  }

  /**
   * List local files
   */
  async listLocalFiles(directory: string): Promise<FileInfo[]> {
    const files = await this.localStorage.list(directory)
    const fileInfos: FileInfo[] = []

    for (const file of files) {
      try {
        const content = await this.localStorage.readText(file)
        const buffer = Buffer.from(content)
        fileInfos.push({
          path: file,
          size: buffer.length,
          mtime: Date.now(), // Would need fs.stat for real mtime
          hash: calculateContentHash(buffer),
        })
      } catch {
        // Skip files that can't be read
      }
    }

    return fileInfos
  }

  /**
   * Create a sync plan
   *
   * @param _org - Organization (reserved for future use)
   * @param _project - Project (reserved for future use)
   * @param sourceDir - Source directory to sync from
   * @param targetFiles - Files currently in the target
   * @param options - Sync options
   */
  async createPlan(
    _org: string,
    _project: string,
    sourceDir: string,
    targetFiles: FileInfo[],
    options?: SyncOptions
  ): Promise<SyncPlan> {
    const sourceFiles = await this.listLocalFiles(sourceDir)

    const plan = createSyncPlan(
      sourceFiles,
      targetFiles,
      options ?? {},
      this.config
    )

    plan.estimatedTime = estimateSyncTime(plan)

    return plan
  }

  /**
   * Execute a sync plan (dry run)
   *
   * In a real implementation, this would actually copy files.
   * For the SDK, we provide the plan and let consumers execute.
   */
  async executePlan(plan: SyncPlan, options?: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: Array<{ path: string; error: string }> = []
    let synced = 0
    let failed = 0

    if (options?.dryRun) {
      // Dry run - just return what would happen
      return {
        success: true,
        plan,
        synced: plan.totalFiles,
        failed: 0,
        skipped: plan.skipped.length,
        errors: [],
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      }
    }

    // Execute operations
    for (let i = 0; i < plan.files.length; i++) {
      const file = plan.files[i]
      if (!file) continue

      try {
        // Report progress
        if (options?.onProgress) {
          options.onProgress(i + 1, plan.totalFiles, file.path)
        }

        // In a real implementation, we would:
        // - For 'create' and 'update': copy file to target
        // - For 'delete': remove file from target
        // For now, we simulate success
        synced++
      } catch (error) {
        failed++
        errors.push({
          path: file.path,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return {
      success: failed === 0,
      plan,
      synced,
      failed,
      skipped: plan.skipped.length,
      errors,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    }
  }

  /**
   * Update manifest after sync
   */
  async updateManifest(
    org: string,
    project: string,
    syncedFiles: FileSyncStatus[]
  ): Promise<void> {
    const manifest = await this.getOrCreateManifest(org, project)
    const now = Date.now()

    for (const file of syncedFiles) {
      if (file.operation === 'delete') {
        delete manifest.entries[file.path]
      } else if (file.operation === 'create' || file.operation === 'update') {
        manifest.entries[file.path] = {
          path: file.path,
          hash: file.hash ?? '',
          size: file.size ?? 0,
          syncedAt: now,
          source: 'local',
        }
      }
    }

    manifest.lastSync = now
    await this.saveManifest(manifest)
  }

  /**
   * Get sync status for a file
   */
  async getFileStatus(path: string): Promise<SyncManifestEntry | null> {
    const manifest = await this.loadManifest()
    return manifest?.entries[path] ?? null
  }

  /**
   * Check if a file is synced
   */
  async isFileSynced(path: string): Promise<boolean> {
    const status = await this.getFileStatus(path)
    return status !== null
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<number | null> {
    const manifest = await this.loadManifest()
    return manifest?.lastSync ?? null
  }

  /**
   * Clear sync manifest
   */
  async clearManifest(): Promise<void> {
    try {
      await this.localStorage.delete(this.manifestPath)
      this.manifest = null
    } catch {
      // Ignore if manifest doesn't exist
    }
  }

  /**
   * Get sync configuration
   */
  getConfig(): SyncConfig {
    return { ...this.config }
  }

  /**
   * Update sync configuration
   */
  updateConfig(updates: Partial<SyncConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    }
  }
}

/**
 * Create a sync manager
 */
export function createSyncManager(config: SyncManagerConfig): SyncManager {
  return new SyncManager(config)
}
