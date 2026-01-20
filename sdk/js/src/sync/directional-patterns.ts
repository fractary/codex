/**
 * Pattern matching for directional sync (to-codex / from-codex)
 *
 * Provides functions to evaluate if files should sync based on directional
 * sync configuration patterns.
 *
 * URI Format: codex://org/project/path
 * - org: Organization name (e.g., "fractary")
 * - project: Project name (e.g., "etl.corthion.ai")
 * - path: File path within project (e.g., "docs/**")
 *
 * Supported placeholders:
 * - {org}: Resolves to configured organization
 * - {project}: Resolves to target project name
 * - {codex_repo}: Resolves to codex repository name (e.g., "codex.fractary.com")
 */

import { matchPattern } from '../core/patterns/matcher.js'

/** Codex URI prefix */
const CODEX_URI_PREFIX = 'codex://'

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
 * Options for from_codex pattern matching
 */
export interface FromCodexMatchOptions {
  /** Organization name for {org} placeholder */
  org?: string
  /** Codex repository name for {codex_repo} placeholder */
  codexRepo?: string
}

/**
 * Check if a codex file path matches from_codex patterns
 *
 * Used when syncing FROM codex to determine which codex files should be pulled.
 *
 * Supports three pattern formats:
 * 1. codex://org/project/path - Full codex URI (recommended)
 * 2. "projects/project/path/pattern" - Direct projects/ path match
 * 3. "project-name/path/pattern" - Legacy bare path format
 * 4. "path/pattern" - Legacy format, matches files from target project
 *
 * @param codexFilePath - File path in codex repo (e.g., "projects/etl.corthion.ai/docs/file.md")
 * @param patterns - Array of patterns to match against
 * @param targetProject - Target project name for implicit patterns
 * @param options - Optional org and codexRepo for placeholder expansion
 */
export function matchFromCodexPattern(
  codexFilePath: string,
  patterns: string[],
  targetProject: string,
  options?: FromCodexMatchOptions
): boolean {
  if (!patterns || patterns.length === 0) {
    return false
  }

  return patterns.some((pattern) => {
    // Handle codex:// URI format (recommended)
    if (pattern.startsWith(CODEX_URI_PREFIX)) {
      return matchCodexUri(pattern, codexFilePath, targetProject, options)
    }

    // Legacy support: patterns starting with "projects/" match directly
    if (pattern.startsWith('projects/')) {
      return matchPattern(pattern, codexFilePath)
    }

    // Legacy support: bare path patterns
    // These patterns work with both flat and projects/ codex structures
    // Check if pattern includes a project prefix
    // Project names contain dots (e.g., "etl.corthion.ai")
    // Path segments don't (e.g., "docs")
    const projectSeparatorIndex = pattern.indexOf('/')

    if (projectSeparatorIndex === -1) {
      // No slash - pattern applies to target project only
      const fullPattern = `${targetProject}/${pattern}`
      return matchPattern(fullPattern, codexFilePath)
    }

    // Extract first segment before slash
    const firstSegment = pattern.substring(0, projectSeparatorIndex)

    // Check if first segment looks like a project name (contains dots)
    if (firstSegment.includes('.')) {
      // Has dots - likely a project name, match directly
      return matchPattern(pattern, codexFilePath)
    } else {
      // No dots - likely a path segment, prepend target project
      const fullPattern = `${targetProject}/${pattern}`
      return matchPattern(fullPattern, codexFilePath)
    }
  })
}

/**
 * Parse and match a codex:// URI pattern against a file path
 *
 * URI format: codex://org/project/path
 * Maps to codex repo structure: projects/{project}/path
 *
 * @param uriPattern - The codex:// URI pattern (e.g., "codex://fractary/etl.corthion.ai/docs/**")
 * @param codexFilePath - File path in codex repo (e.g., "projects/etl.corthion.ai/docs/file.md")
 * @param targetProject - Target project name for {project} placeholder
 * @param options - Optional org and codexRepo for placeholder expansion
 */
function matchCodexUri(
  uriPattern: string,
  codexFilePath: string,
  targetProject: string,
  options?: FromCodexMatchOptions
): boolean {
  // Parse: codex://org/project/path
  let withoutPrefix = uriPattern.slice(CODEX_URI_PREFIX.length)

  // Expand placeholders BEFORE parsing
  withoutPrefix = withoutPrefix
    .replace(/{org}/g, options?.org || '')
    .replace(/{project}/g, targetProject)
    .replace(/{codex_repo}/g, options?.codexRepo || '')

  const parts = withoutPrefix.split('/')

  // Need at least org and project
  if (parts.length < 2) {
    return false
  }

  // org is parts[0] - we don't use it for matching (org is for cache path namespacing)
  const project = parts[1]
  const pathPattern = parts.slice(2).join('/')

  // Skip if project is empty (e.g., placeholder wasn't expanded)
  if (!project) {
    return false
  }

  // Match against codex repo structure: projects/{project}/path
  const fullPattern = pathPattern
    ? `projects/${project}/${pathPattern}`
    : `projects/${project}/**`

  return matchPattern(fullPattern, codexFilePath)
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
 * Options for placeholder expansion
 */
export interface ExpandPlaceholderOptions {
  /** Organization name for {org} placeholder */
  org?: string
  /** Codex repository name for {codex_repo} placeholder */
  codexRepo?: string
}

/**
 * Expand placeholders in patterns
 *
 * Supported placeholders:
 * - {project}: Target project name
 * - {org}: Organization name
 * - {codex_repo}: Codex repository name
 *
 * @param patterns - Array of patterns to expand
 * @param targetProject - Target project name for {project} placeholder
 * @param options - Optional org and codexRepo for additional placeholders
 */
export function expandPlaceholders(
  patterns: string[] | undefined,
  targetProject: string,
  options?: ExpandPlaceholderOptions
): string[] | undefined {
  if (!patterns) {
    return patterns
  }

  return patterns.map((pattern) => {
    let expanded = pattern.replace(/{project}/g, targetProject)

    if (options?.org) {
      expanded = expanded.replace(/{org}/g, options.org)
    }

    if (options?.codexRepo) {
      expanded = expanded.replace(/{codex_repo}/g, options.codexRepo)
    }

    return expanded
  })
}
