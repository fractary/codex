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
      const fullPattern = `${targetProject}/${pattern}`
      return matchPattern(fullPattern, codexFilePath)
    } else {
      // Has project prefix - match directly
      return matchPattern(pattern, codexFilePath)
    }
  })
}

/**
 * Extract project name from codex file path
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
 */
export function getRelativePath(codexFilePath: string): string | null {
  const firstSlashIndex = codexFilePath.indexOf('/')
  if (firstSlashIndex === -1) {
    return null
  }
  return codexFilePath.substring(firstSlashIndex + 1)
}

/**
 * Expand placeholders in patterns
 * Supports {project} placeholder which expands to the target project name
 */
export function expandPlaceholders(
  patterns: string[] | undefined,
  targetProject: string
): string[] | undefined {
  if (!patterns) {
    return patterns
  }

  return patterns.map((pattern) => pattern.replace(/{project}/g, targetProject))
}
