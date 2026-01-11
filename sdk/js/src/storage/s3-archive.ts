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

    // Calculate archive path with project config
    const archivePath = this.calculateArchivePath(reference, config)

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
   *
   * Note: This currently downloads the file to check existence.
   * TODO: Optimize by using fractary-file 'stat' or 'head' command when available
   * to avoid downloading full file for existence checks.
   */
  async exists(reference: ResolvedReference, options?: FetchOptions): Promise<boolean> {
    const projectKey = `${reference.org}/${reference.project}`
    const config = this.projects[projectKey]

    if (!config) {
      return false
    }

    try {
      // Use fetch with minimal options for existence check
      // Note: This still downloads the file - requires fractary-file enhancement for true optimization
      await this.fetch(reference, { ...options, timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Calculate archive path from reference
   *
   * Pattern: {prefix}/{type}/{org}/{project}/{original-path}
   *
   * Examples (with default prefix "archive/"):
   *   specs/WORK-123.md → archive/specs/org/project/specs/WORK-123.md
   *   docs/api.md → archive/docs/org/project/docs/api.md
   *
   * Examples (with custom prefix "archived-docs/"):
   *   specs/WORK-123.md → archived-docs/specs/org/project/specs/WORK-123.md
   */
  private calculateArchivePath(reference: ResolvedReference, config: ArchiveProjectConfig): string {
    const type = this.detectType(reference.path)
    const prefix = config.prefix || 'archive/'

    // Validate prefix is not empty or whitespace-only
    const trimmedPrefix = prefix.trim()
    if (!trimmedPrefix) {
      throw new Error('Archive prefix cannot be empty or whitespace-only')
    }

    // Ensure prefix ends with / for consistent path construction
    const normalizedPrefix = trimmedPrefix.endsWith('/') ? trimmedPrefix : `${trimmedPrefix}/`

    return `${normalizedPrefix}${type}/${reference.org}/${reference.project}/${reference.path}`
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
    // Convert glob pattern to regex using placeholder approach
    // to prevent ** replacement from being affected by * replacement

    // Step 1: Protect ** with placeholder
    const DOUBLE_STAR = '\x00DOUBLE_STAR\x00'
    let regexPattern = pattern.replace(/\*\*/g, DOUBLE_STAR)

    // Step 2: Escape regex special chars (except our placeholder and glob chars * ?)
    // Escape: . [ ] ( ) { } + ^ $ | \
    regexPattern = regexPattern.replace(/[.[\](){}+^$|\\]/g, '\\$&')

    // Step 3: Replace single * and ?
    regexPattern = regexPattern
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')

    // Step 4: Replace placeholder with final regex
    regexPattern = regexPattern.replace(new RegExp(DOUBLE_STAR, 'g'), '.*')

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(path)
  }
}
