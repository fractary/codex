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
import { scanCodexWithRouting, type RoutingScanResult } from './routing-scanner.js'

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
   * Resolve from_codex include patterns (v0.7.0+)
   *
   * Supports both new format (from_codex.include) and legacy format (default_from_codex).
   * New format takes precedence.
   */
  private resolveFromCodexPatterns(): string[] {
    // New format takes precedence
    if (this.config.from_codex?.include) {
      return this.config.from_codex.include
    }

    // Fall back to legacy format
    return this.config.default_from_codex || []
  }

  /**
   * Resolve from_codex exclude patterns (v0.7.0+)
   */
  private resolveFromCodexExcludes(): string[] {
    if (this.config.from_codex?.exclude) {
      return this.config.from_codex.exclude
    }

    // Legacy global excludes
    return this.config.exclude || []
  }

  /**
   * Resolve to_codex include patterns (v0.7.0+)
   *
   * Supports both new format (to_codex.include) and legacy format (default_to_codex).
   * New format takes precedence.
   */
  private resolveToCodexPatterns(): string[] {
    // New format takes precedence
    if (this.config.to_codex?.include) {
      return this.config.to_codex.include
    }

    // Fall back to legacy format
    return this.config.default_to_codex || []
  }

  /**
   * Resolve to_codex exclude patterns (v0.7.0+)
   */
  private resolveToCodexExcludes(): string[] {
    if (this.config.to_codex?.exclude) {
      return this.config.to_codex.exclude
    }

    // Legacy global excludes
    return this.config.exclude || []
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
    let sourceFiles = await this.listLocalFiles(sourceDir)

    // For to-codex direction, filter files based on to_codex config patterns
    if (options?.direction === 'to-codex') {
      const toCodexPatterns = this.resolveToCodexPatterns()

      if (toCodexPatterns.length > 0) {
        const { matchToCodexPattern } = await import('./directional-patterns.js')

        sourceFiles = sourceFiles.filter((file) =>
          matchToCodexPattern(file.path, toCodexPatterns)
        )
      }
    }

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
   * Create a routing-aware sync plan
   *
   * Scans entire codex repository and evaluates routing rules to find all files
   * that should sync to the target project based on codex_sync_include patterns.
   *
   * This enables cross-project knowledge sharing where files from multiple
   * projects can be synced to the target based on their frontmatter metadata.
   *
   * @param org - Organization name (e.g., "corthosai")
   * @param project - Target project name (e.g., "lake.corthonomy.ai")
   * @param codexDir - Path to codex repository directory
   * @param options - Sync options
   * @returns Sync plan with routing metadata
   *
   * @example
   * ```typescript
   * const plan = await manager.createRoutingAwarePlan(
   *   'corthosai',
   *   'lake.corthonomy.ai',
   *   '/path/to/codex.corthos.ai',
   *   { direction: 'from-codex' }
   * )
   *
   * console.log(`Found ${plan.totalFiles} files from ${plan.metadata.scannedProjects.length} projects`)
   * ```
   */
  async createRoutingAwarePlan(
    org: string,
    project: string,
    codexDir: string,
    options?: SyncOptions
  ): Promise<SyncPlan & { routingScan?: RoutingScanResult }> {
    // Step 1: Scan entire codex with routing evaluation
    // Resolve patterns using new helper functions (supports both new and legacy formats)
    const fromCodexPatterns = this.resolveFromCodexPatterns()

    const routingScan = await scanCodexWithRouting({
      codexDir,
      targetProject: project,
      org,
      rules: undefined, // Use default routing rules (preventSelfSync, preventCodexSync, etc.)
      storage: this.localStorage,
      fromCodexPatterns: fromCodexPatterns.length > 0 ? fromCodexPatterns : undefined,
      routing: this.config.routing, // Pass routing config for frontmatter control
    })

    // Step 2: Convert routed files to FileInfo format expected by planner
    const sourceFiles: FileInfo[] = routingScan.files.map((rf) => ({
      path: rf.path,
      size: rf.size,
      mtime: rf.mtime,
      hash: rf.hash,
    }))

    // Step 3: Get current local files for comparison
    const targetFiles = await this.listLocalFiles(process.cwd())

    // Step 4: Create sync plan using existing planner logic
    // IMPORTANT: Strip include/exclude patterns from options because routing scanner
    // has already filtered files based on routing rules (codex_sync_include frontmatter).
    // We only keep execution options (force, dryRun) to avoid double filtering.
    const planOptions: SyncOptions = {
      direction: options?.direction,
      force: options?.force,
      dryRun: options?.dryRun,
      // Explicitly exclude include/exclude to prevent double filtering
      // include: undefined,
      // exclude: undefined,
    }
    const plan = createSyncPlan(sourceFiles, targetFiles, planOptions, this.config)

    plan.estimatedTime = estimateSyncTime(plan)

    // Override source/target paths for from-codex routing-aware sync
    // Files should be copied from codex to cache directory preserving full paths
    plan.source = codexDir
    plan.target = '.fractary/codex/cache'

    // Step 5: Enhance plan with routing metadata
    return {
      ...plan,
      routingScan,
    }
  }

  /**
   * Execute a sync plan
   *
   * Copies files from source to target based on the plan.
   * For from-codex syncs, files are copied to .fractary/codex/cache/ preserving full paths.
   * For to-codex syncs, files are copied to the codex repository.
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

        // Execute the sync operation
        if (file.operation === 'create' || file.operation === 'update') {
          // Copy file from source to target
          const sourcePath = `${plan.source}/${file.path}`
          const targetPath = `${plan.target}/${file.path}`

          // Ensure target directory exists
          const fs = await import('fs/promises')
          const path = await import('path')
          const targetDir = path.dirname(targetPath)
          await fs.mkdir(targetDir, { recursive: true })

          // Copy the file
          await fs.copyFile(sourcePath, targetPath)
          synced++
        } else if (file.operation === 'delete') {
          // Delete file from target
          const targetPath = `${plan.target}/${file.path}`
          const fs = await import('fs/promises')
          try {
            await fs.unlink(targetPath)
            synced++
          } catch (error: any) {
            // Ignore if file doesn't exist
            if (error.code !== 'ENOENT') {
              throw error
            }
            synced++
          }
        } else {
          // Skip operation
          synced++
        }
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
