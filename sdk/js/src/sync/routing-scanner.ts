/**
 * Routing-aware codex scanner
 *
 * Scans entire codex repository and evaluates routing rules to determine
 * which files should sync to a target project based on frontmatter metadata.
 *
 * Based on SPEC-20260105: Routing-Aware Sync Implementation
 */

import fs from 'fs/promises'
import path from 'path'
import type { Metadata } from '../schemas/metadata.js'
import type { SyncRules } from '../schemas/config.js'
import { shouldSyncToRepo } from '../core/routing/evaluator.js'
import { parseMetadata } from '../core/metadata/parser.js'
import { calculateContentHash } from '../cache/entry.js'
import type { LocalStorage } from '../storage/local.js'

/**
 * File information with routing metadata
 */
export interface RoutedFileInfo {
  /** File path relative to codex root */
  path: string
  /** File size in bytes */
  size: number
  /** Last modified timestamp */
  mtime: number
  /** Content hash for change detection */
  hash: string
  /** Parsed frontmatter metadata */
  metadata: Metadata
  /** Source project in codex (e.g., "etl.corthion.ai") */
  sourceProject: string
}

/**
 * Options for routing-aware scan
 */
export interface RoutingScanOptions {
  /** Path to codex repository directory */
  codexDir: string
  /** Target project to sync to (e.g., "lake.corthonomy.ai") */
  targetProject: string
  /** Organization name (e.g., "corthosai") */
  org: string
  /** Routing rules configuration (optional, uses defaults if not provided) */
  rules?: SyncRules
  /** Storage provider for reading files */
  storage: LocalStorage
  /** Skip files without frontmatter (default: true) */
  skipNoFrontmatter?: boolean
  /** Maximum file size to process in bytes (default: 10MB) */
  maxFileSize?: number
}

/**
 * Statistics from a routing scan
 */
export interface RoutingScanStats {
  /** Total files scanned */
  totalScanned: number
  /** Files that matched routing rules */
  totalMatched: number
  /** Files skipped (no frontmatter, errors, etc.) */
  totalSkipped: number
  /** Unique source projects found */
  sourceProjects: string[]
  /** Duration of scan in milliseconds */
  durationMs: number
  /** Errors encountered (non-fatal) */
  errors: Array<{ path: string; error: string }>
}

/**
 * Result from routing-aware scan
 */
export interface RoutingScanResult {
  /** Files that should sync to target project */
  files: RoutedFileInfo[]
  /** Scan statistics */
  stats: RoutingScanStats
}

/**
 * Scan entire codex repository and return files that route to target project
 *
 * This is the core function that enables cross-project knowledge sharing by:
 * 1. Listing ALL files in the entire codex repository (not just target project)
 * 2. Parsing frontmatter metadata from each file
 * 3. Evaluating codex_sync_include patterns against target project
 * 4. Returning only files that match routing rules
 *
 * @example
 * ```typescript
 * const result = await scanCodexWithRouting({
 *   codexDir: '/path/to/codex.corthos.ai',
 *   targetProject: 'lake.corthonomy.ai',
 *   org: 'corthosai',
 *   storage: localStorage
 * })
 *
 * console.log(`Found ${result.files.length} files routing to lake.corthonomy.ai`)
 * console.log(`From ${result.stats.sourceProjects.length} projects`)
 * ```
 *
 * @param options - Scan options
 * @returns Files that should sync to target project with scan statistics
 */
export async function scanCodexWithRouting(
  options: RoutingScanOptions
): Promise<RoutingScanResult> {
  const {
    codexDir,
    targetProject,
    org,
    rules,
    storage,
    skipNoFrontmatter = true,
    maxFileSize = 10 * 1024 * 1024, // 10MB default
  } = options

  const startTime = Date.now()
  const routedFiles: RoutedFileInfo[] = []
  const sourceProjectsSet = new Set<string>()
  const errors: Array<{ path: string; error: string }> = []
  let totalScanned = 0
  let totalSkipped = 0

  // Step 1: List ALL files recursively in entire codex repository
  const allFiles = await listAllFilesRecursive(codexDir)

  // Step 2: For each file, evaluate routing
  for (const filePath of allFiles) {
    totalScanned++

    try {
      // Skip non-markdown files for now (optimization)
      if (!filePath.endsWith('.md')) {
        totalSkipped++
        continue
      }

      // Get full path for reading
      const fullPath = path.join(codexDir, filePath)

      // Check file size before reading
      const stats = await fs.stat(fullPath)
      if (stats.size > maxFileSize) {
        totalSkipped++
        errors.push({
          path: filePath,
          error: `File too large (${stats.size} bytes, max: ${maxFileSize})`,
        })
        continue
      }

      // Read file content
      const content = await storage.readText(fullPath)

      // Parse frontmatter metadata
      const parseResult = parseMetadata(content, { strict: false })

      // Skip files without frontmatter if configured
      if (skipNoFrontmatter && Object.keys(parseResult.metadata).length === 0) {
        totalSkipped++
        continue
      }

      // Extract source project from path
      const sourceProject = extractProjectFromPath(filePath, org)

      // Check if file should sync to target project using routing evaluator
      const shouldSync = shouldSyncToRepo({
        filePath,
        fileMetadata: parseResult.metadata,
        targetRepo: targetProject,
        sourceRepo: sourceProject,
        rules,
      })

      if (shouldSync) {
        // Calculate file metadata
        const buffer = Buffer.from(content)
        const hash = calculateContentHash(buffer)

        routedFiles.push({
          path: filePath,
          size: buffer.length,
          mtime: stats.mtimeMs,
          hash,
          metadata: parseResult.metadata,
          sourceProject,
        })

        sourceProjectsSet.add(sourceProject)
      } else {
        totalSkipped++
      }
    } catch (error) {
      // Log error but continue processing other files
      totalSkipped++
      errors.push({
        path: filePath,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const durationMs = Date.now() - startTime

  return {
    files: routedFiles,
    stats: {
      totalScanned,
      totalMatched: routedFiles.length,
      totalSkipped,
      sourceProjects: Array.from(sourceProjectsSet).sort(),
      durationMs,
      errors,
    },
  }
}

/**
 * Extract project name from codex file path
 *
 * Codex structure: {org}/{project}/{path/to/file.md}
 * Example: "corthosai/etl.corthion.ai/docs/api.md" → "etl.corthion.ai"
 *
 * @param filePath - File path like "corthosai/etl.corthion.ai/docs/api.md"
 * @param org - Organization name like "corthosai"
 * @returns Project name like "etl.corthion.ai"
 */
export function extractProjectFromPath(filePath: string, org: string): string {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/')

  // Remove leading org directory if present
  const withoutOrg = normalizedPath.startsWith(`${org}/`)
    ? normalizedPath.slice(org.length + 1)
    : normalizedPath

  // Extract first path segment as project name
  const firstSlash = withoutOrg.indexOf('/')
  if (firstSlash === -1) {
    // File is at root level, use entire path as project
    return withoutOrg
  }

  return withoutOrg.slice(0, firstSlash)
}

/**
 * Recursively list all files in directory
 *
 * @param dirPath - Directory to scan
 * @returns Array of relative file paths
 */
export async function listAllFilesRecursive(dirPath: string): Promise<string[]> {
  const files: string[] = []

  async function scanDirectory(currentPath: string, relativePath: string = ''): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name)
        const entryRelativePath = relativePath
          ? path.join(relativePath, entry.name)
          : entry.name

        if (entry.isDirectory()) {
          // Skip hidden directories and common ignore patterns
          if (
            entry.name.startsWith('.') ||
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === 'build'
          ) {
            continue
          }

          // Recursively scan subdirectory
          await scanDirectory(entryPath, entryRelativePath)
        } else if (entry.isFile()) {
          // Add file to list
          files.push(entryRelativePath)
        }
      }
    } catch {
      // Ignore directories we can't read (permissions, etc.)
      // Silently skip - this is expected for permission issues
    }
  }

  await scanDirectory(dirPath)

  return files
}

/**
 * Group routed files by source project
 *
 * Utility function for displaying results grouped by project.
 *
 * @param files - Files from routing scan
 * @returns Map of project name to files from that project
 */
export function groupFilesByProject(
  files: RoutedFileInfo[]
): Map<string, RoutedFileInfo[]> {
  const grouped = new Map<string, RoutedFileInfo[]>()

  for (const file of files) {
    const existing = grouped.get(file.sourceProject) || []
    existing.push(file)
    grouped.set(file.sourceProject, existing)
  }

  return grouped
}

/**
 * Calculate total size of routed files
 *
 * @param files - Files from routing scan
 * @returns Total size in bytes
 */
export function calculateTotalSize(files: RoutedFileInfo[]): number {
  return files.reduce((total, file) => total + file.size, 0)
}

/**
 * Format scan statistics for display
 *
 * @param stats - Scan statistics
 * @returns Human-readable statistics string
 */
export function formatScanStats(stats: RoutingScanStats): string {
  const lines: string[] = []

  lines.push(`Scanned: ${stats.totalScanned} files`)
  lines.push(`Matched: ${stats.totalMatched} files`)
  lines.push(`Skipped: ${stats.totalSkipped} files`)
  lines.push(`Source projects: ${stats.sourceProjects.length}`)
  lines.push(`  ${stats.sourceProjects.join(', ')}`)
  lines.push(`Duration: ${stats.durationMs}ms`)

  if (stats.errors.length > 0) {
    lines.push(`Errors: ${stats.errors.length}`)
    stats.errors.slice(0, 5).forEach((err) => {
      lines.push(`  ${err.path}: ${err.error}`)
    })
    if (stats.errors.length > 5) {
      lines.push(`  ... and ${stats.errors.length - 5} more`)
    }
  }

  return lines.join('\n')
}
