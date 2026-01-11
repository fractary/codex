/**
 * S3 Archive storage provider
 *
 * Fetches archived content from S3 using fractary-file CLI.
 * Provides transparent fallback for documents that have been archived.
 */

import type { ResolvedReference } from '../references/index.js'
import {
  type StorageProvider,
  type FetchResult,
  type FetchOptions,
  detectContentType,
  mergeFetchOptions,
} from './provider.js'
import { execFileNoThrow } from '../utils/execFileNoThrow.js'

/**
 * Archive configuration for a project
 */
export interface ArchiveProjectConfig {
  enabled: boolean
  handler: 's3' | 'r2' | 'gcs' | 'local'
  bucket?: string
  prefix?: string
  patterns?: string[]
}

/**
 * Options for creating an S3ArchiveStorage provider
 */
export interface S3ArchiveStorageOptions {
  /** Archive configurations per project (key: "org/project") */
  projects?: Record<string, ArchiveProjectConfig>
  /** Path to fractary CLI (default: 'fractary') */
  fractaryCli?: string
}

/**
 * S3 Archive storage provider
 *
 * Handles fetching archived content from S3 via fractary-file CLI.
 * Only activates for current project files that match archive config.
 */
export class S3ArchiveStorage implements StorageProvider {
  readonly name = 's3-archive'
  readonly type = 's3-archive' as const

  private projects: Record<string, ArchiveProjectConfig>
  private fractaryCli: string

  constructor(options: S3ArchiveStorageOptions = {}) {
    this.projects = options.projects || {}
    this.fractaryCli = options.fractaryCli || 'fractary'
  }

  /**
   * Check if this provider can handle the reference
   *
   * S3 Archive provider handles references that:
   * 1. Are for the current project (same org/project)
   * 2. Have archive enabled in config
   * 3. Match configured patterns (if specified)
   */
  canHandle(reference: ResolvedReference): boolean {
    // Only handle current project files
    if (!reference.isCurrentProject) {
      return false
    }

    // Get archive config for this project
    const projectKey = `${reference.org}/${reference.project}`
    const config = this.projects[projectKey]

    // Check if archive is enabled
    if (!config || !config.enabled) {
      return false
    }

    // Check patterns if specified
    if (config.patterns && config.patterns.length > 0) {
      return this.matchesPatterns(reference.path, config.patterns)
    }

    // No patterns = handle all files
    return true
  }

  /**
   * Fetch content from S3 archive via fractary-file CLI
   */
  async fetch(reference: ResolvedReference, options?: FetchOptions): Promise<FetchResult> {
    const opts = mergeFetchOptions(options)
    const projectKey = `${reference.org}/${reference.project}`
    const config = this.projects[projectKey]

    if (!config) {
      throw new Error(`No archive config for project: ${projectKey}`)
    }

    // Calculate archive path
    const archivePath = this.calculateArchivePath(reference)

    // Call fractary-file CLI to read from archive
    try {
      const result = await execFileNoThrow(
        this.fractaryCli,
        [
          'file',
          'read',
          '--remote-path',
          archivePath,
          '--handler',
          config.handler,
          ...(config.bucket ? ['--bucket', config.bucket] : []),
        ],
        {
          timeout: opts.timeout,
        }
      )

      if (result.exitCode !== 0) {
        throw new Error(`fractary-file read failed: ${result.stderr}`)
      }

      const content = Buffer.from(result.stdout)

      return {
        content,
        contentType: detectContentType(reference.path),
        size: content.length,
        source: 's3-archive',
        metadata: {
          archivePath,
          bucket: config.bucket,
          handler: config.handler,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to fetch from archive: ${message}`)
    }
  }

  /**
   * Check if archived file exists
   */
  async exists(reference: ResolvedReference, options?: FetchOptions): Promise<boolean> {
    try {
      await this.fetch(reference, options)
      return true
    } catch {
      return false
    }
  }

  /**
   * Calculate archive path from reference
   *
   * Pattern: archive/{type}/{org}/{project}/{original-path}
   *
   * Examples:
   *   specs/WORK-123.md → archive/specs/org/project/specs/WORK-123.md
   *   docs/api.md → archive/docs/org/project/docs/api.md
   */
  private calculateArchivePath(reference: ResolvedReference): string {
    const type = this.detectType(reference.path)
    return `archive/${type}/${reference.org}/${reference.project}/${reference.path}`
  }

  /**
   * Detect artifact type from path
   *
   * Used to organize archives by type
   */
  private detectType(path: string): string {
    if (path.startsWith('specs/')) return 'specs'
    if (path.startsWith('docs/')) return 'docs'
    if (path.includes('/logs/')) return 'logs'
    return 'misc'
  }

  /**
   * Check if path matches any of the patterns
   *
   * Supports glob-style patterns:
   * - specs/** (all files in specs/)
   * - *.md (all markdown files)
   * - docs/*.md (markdown files in docs/)
   */
  private matchesPatterns(path: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (this.matchesPattern(path, pattern)) {
        return true
      }
    }
    return false
  }

  /**
   * Check if path matches a single pattern
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    // ** → .*
    // * → [^/]*
    // ? → [^/]
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/\./g, '\\.')

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(path)
  }
}
