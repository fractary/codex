/**
 * Pattern matching for directional sync (to-codex / from-codex)
 *
 * Provides functions to evaluate if files should sync based on directional
 * sync configuration patterns.
 */

import { matchPattern } from '../core/patterns/matcher.js'

/**
 * Check if a local file path matches to_codex patterns
 *
 * Used when syncing TO codex to determine which local files should be pushed.
 *
 * @param filePath - Local file path (relative to project root)
 * @param patterns - Array of glob patterns from to_codex config
 * @returns true if file matches any pattern
 *
 * @example
 * matchToCodexPattern('docs/api.md', ['docs/**/*.md']) // true
 * matchToCodexPattern('src/index.ts', ['docs/**/*.md']) // false
 */
export function matchToCodexPattern(filePath: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) {
    return false
  }

  return patterns.some((pattern) => matchPattern(pattern, filePath))
}

/**
 * Check if a codex file path matches from_codex patterns
 *
 * Used when syncing FROM codex to determine which codex files should be pulled.
 * Supports two pattern formats:
 * - "project-name/path/pattern" - matches files from specific project
 * - "path/pattern" - matches files from target project itself
 *
 * @param codexFilePath - File path in codex (e.g., "etl.corthion.ai/docs/schema/data.json")
 * @param patterns - Array of patterns from from_codex config
 * @param targetProject - The project pulling files (used for implicit project matching)
 * @returns true if file matches any pattern
 *
 * @example
 * // Explicit project pattern
 * matchFromCodexPattern(
 *   'etl.corthion.ai/docs/schema/data.json',
 *   ['etl.corthion.ai/docs/schema/**/*.json'],
 *   'lake.corthonomy.ai'
 * ) // true
 *
 * // Implicit project pattern (matches own project)
 * matchFromCodexPattern(
 *   'lake.corthonomy.ai/README.md',
 *   ['README.md'],
 *   'lake.corthonomy.ai'
 * ) // true
 *
 * // Wildcard for own project
 * matchFromCodexPattern(
 *   'lake.corthonomy.ai/docs/api.md',
 *   ['lake.corthonomy.ai/**'],
 *   'lake.corthonomy.ai'
 * ) // true
 */
export function matchFromCodexPattern(
  codexFilePath: string,
  patterns: string[],
  targetProject: string
): boolean {
  if (!patterns || patterns.length === 0) {
    return false
  }

  return patterns.some((pattern) => {
    // Check if pattern includes a project prefix
    const projectSeparatorIndex = pattern.indexOf('/')

    if (projectSeparatorIndex === -1) {
      // No project prefix - pattern applies to target project only
      // Example: "docs/**/*.md" matches "lake.corthonomy.ai/docs/**/*.md"
      const fullPattern = `${targetProject}/${pattern}`
      return matchPattern(fullPattern, codexFilePath)
    } else {
      // Has project prefix - match directly
      // Example: "etl.corthion.ai/docs/**/*.md"
      return matchPattern(pattern, codexFilePath)
    }
  })
}

/**
 * Extract project name from codex file path
 *
 * @param codexFilePath - File path in codex (e.g., "etl.corthion.ai/docs/schema/data.json")
 * @returns Project name (e.g., "etl.corthion.ai") or null if invalid path
 *
 * @example
 * extractProjectFromCodexPath('etl.corthion.ai/docs/schema/data.json') // 'etl.corthion.ai'
 * extractProjectFromCodexPath('invalid') // null
 */
export function extractProjectFromCodexPath(codexFilePath: string): string | null {
  const firstSlashIndex = codexFilePath.indexOf('/')
  if (firstSlashIndex === -1) {
    return null
  }
  return codexFilePath.substring(0, firstSlashIndex)
}

/**
 * Get relative path within project from codex file path
 *
 * @param codexFilePath - File path in codex (e.g., "etl.corthion.ai/docs/schema/data.json")
 * @returns Relative path within project (e.g., "docs/schema/data.json") or null if invalid
 *
 * @example
 * getRelativePath('etl.corthion.ai/docs/schema/data.json') // 'docs/schema/data.json'
 * getRelativePath('invalid') // null
 */
export function getRelativePath(codexFilePath: string): string | null {
  const firstSlashIndex = codexFilePath.indexOf('/')
  if (firstSlashIndex === -1) {
    return null
  }
  return codexFilePath.substring(firstSlashIndex + 1)
}
