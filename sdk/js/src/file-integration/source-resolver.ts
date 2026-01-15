/**
 * File plugin source resolution
 *
 * Resolves file plugin sources from unified configuration and provides
 * utilities for matching paths to file sources.
 *
 * Based on SPEC-20260115: Codex-File Plugin Integration
 */

import type { UnifiedConfig, FileSource } from '../schemas/config.js'

/**
 * Resolved file source with local and remote paths
 */
export interface ResolvedFileSource {
  /** Source name (e.g., "specs", "logs") */
  name: string
  /** Source type identifier */
  type: 'file-plugin'
  /** Local filesystem path */
  localPath: string
  /** Remote S3/R2/GCS path if configured */
  remotePath?: string
  /** Cloud storage bucket name */
  bucket?: string
  /** Cloud storage prefix */
  prefix?: string
  /** Always true for current project */
  isCurrentProject: boolean
  /** Raw file source configuration */
  config: FileSource
}

/**
 * File source resolver
 *
 * Parses file plugin sources from unified configuration and provides
 * utilities for resolving and matching file paths.
 */
export class FileSourceResolver {
  private sources: Map<string, ResolvedFileSource> = new Map()

  constructor(private config: UnifiedConfig) {
    this.initializeSources()
  }

  /**
   * Initialize sources from config
   */
  private initializeSources(): void {
    if (!this.config.file?.sources) {
      return
    }

    for (const [name, sourceConfig] of Object.entries(this.config.file.sources)) {
      const resolved: ResolvedFileSource = {
        name,
        type: 'file-plugin',
        localPath: sourceConfig.local.base_path,
        isCurrentProject: true,
        config: sourceConfig,
      }

      // Add remote path if cloud storage is configured
      if (sourceConfig.bucket && sourceConfig.type !== 'local') {
        resolved.bucket = sourceConfig.bucket
        resolved.prefix = sourceConfig.prefix
        resolved.remotePath = this.buildRemotePath(sourceConfig)
      }

      this.sources.set(name, resolved)
    }
  }

  /**
   * Build remote path from source config
   */
  private buildRemotePath(source: FileSource): string {
    const protocol = source.type === 's3' ? 's3://' : source.type === 'r2' ? 'r2://' : 'gcs://'
    const bucket = source.bucket
    const prefix = source.prefix ? `/${source.prefix}` : ''
    return `${protocol}${bucket}${prefix}`
  }

  /**
   * Get all available file plugin sources
   *
   * @returns Array of resolved file sources
   */
  getAvailableSources(): ResolvedFileSource[] {
    return Array.from(this.sources.values())
  }

  /**
   * Resolve a source by name
   *
   * @param name - Source name (e.g., "specs", "logs")
   * @returns Resolved source or null if not found
   */
  resolveSource(name: string): ResolvedFileSource | null {
    return this.sources.get(name) || null
  }

  /**
   * Check if a path belongs to any file plugin source
   *
   * @param path - File path to check
   * @returns True if path matches any source's base_path
   */
  isFilePluginPath(path: string): boolean {
    return this.getSourceForPath(path) !== null
  }

  /**
   * Get the source for a given path
   *
   * Matches path against all source base_paths and returns the matching source.
   * Uses longest-match strategy if multiple sources match.
   *
   * @param path - File path to match
   * @returns Matching source or null
   */
  getSourceForPath(path: string): ResolvedFileSource | null {
    let bestMatch: ResolvedFileSource | null = null
    let bestMatchLength = 0

    for (const source of this.sources.values()) {
      // Normalize paths for comparison
      const normalizedPath = this.normalizePath(path)
      const normalizedBasePath = this.normalizePath(source.localPath)

      // Check if path starts with source's base_path
      if (normalizedPath.startsWith(normalizedBasePath)) {
        const matchLength = normalizedBasePath.length

        // Use longest match strategy
        if (matchLength > bestMatchLength) {
          bestMatch = source
          bestMatchLength = matchLength
        }
      }
    }

    return bestMatch
  }

  /**
   * Normalize path for comparison
   * - Remove leading "./" or "/"
   * - Remove trailing "/"
   * - Convert to lowercase for case-insensitive comparison
   */
  private normalizePath(path: string): string {
    return path
      .replace(/^\.\//, '')
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .toLowerCase()
  }

  /**
   * Get source names
   *
   * @returns Array of source names
   */
  getSourceNames(): string[] {
    return Array.from(this.sources.keys())
  }

  /**
   * Check if sources are configured
   *
   * @returns True if any file plugin sources are configured
   */
  hasSources(): boolean {
    return this.sources.size > 0
  }
}
