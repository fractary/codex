/**
 * URI resolution for codex references
 *
 * Resolves codex:// URIs to filesystem paths, determining whether
 * the reference points to the current project (local file) or
 * needs to be fetched from cache/remote.
 */

import path from 'path'
import { execSync } from 'child_process'
import { parseReference, type ParsedReference } from './parser.js'

/**
 * Resolved reference with filesystem paths
 */
export interface ResolvedReference extends ParsedReference {
  /** Path in the cache directory */
  cachePath: string
  /** Whether this URI refers to the current project */
  isCurrentProject: boolean
  /** Local filesystem path if current project */
  localPath?: string
}

/**
 * Options for resolving references
 */
export interface ResolveOptions {
  /** Base directory for cache (default: .fractary/codex/cache) */
  cacheDir?: string
  /** Override current organization detection */
  currentOrg?: string
  /** Override current project detection */
  currentProject?: string
  /** Current working directory (for git detection) */
  cwd?: string
}

/**
 * Default cache directory (v4.0 standard)
 */
export const DEFAULT_CACHE_DIR = '.fractary/codex/cache'

/**
 * Detect the current project from git remote
 *
 * @param cwd - Current working directory
 * @returns Object with org and project, or nulls if not detected
 */
export function detectCurrentProject(cwd?: string): { org: string | null; project: string | null } {
  try {
    const options = cwd ? { cwd, encoding: 'utf-8' as const } : { encoding: 'utf-8' as const }
    const stdout = execSync('git remote get-url origin', options)
    const url = stdout.toString().trim()

    // Parse GitHub URLs (SSH and HTTPS formats)
    // git@github.com:org/repo.git
    // https://github.com/org/repo.git
    // https://github.com/org/repo
    const patterns = [
      /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/,
      /gitlab\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/,
      /bitbucket\.org[:/]([^/]+)\/([^/]+?)(?:\.git)?$/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1] && match[2]) {
        return { org: match[1], project: match[2] }
      }
    }
  } catch {
    // Git not available or not in a git repo
  }

  return { org: null, project: null }
}

/**
 * Get the current organization and project
 *
 * Priority:
 * 1. Explicit options
 * 2. Environment variables (CODEX_CURRENT_ORG, CODEX_CURRENT_PROJECT)
 * 3. Git remote detection
 *
 * @param options - Resolve options
 * @returns Object with org and project
 */
export function getCurrentContext(options: ResolveOptions = {}): {
  org: string | null
  project: string | null
} {
  // Priority 1: Explicit options
  if (options.currentOrg && options.currentProject) {
    return { org: options.currentOrg, project: options.currentProject }
  }

  // Priority 2: Environment variables
  const envOrg = process.env.CODEX_CURRENT_ORG
  const envProject = process.env.CODEX_CURRENT_PROJECT
  if (envOrg && envProject) {
    return { org: envOrg, project: envProject }
  }

  // Priority 3: Git detection
  return detectCurrentProject(options.cwd)
}

/**
 * Calculate the cache path for a URI
 *
 * @param org - Organization
 * @param project - Project
 * @param filePath - File path within project
 * @param cacheDir - Base cache directory
 * @returns The cache file path
 */
export function calculateCachePath(
  org: string,
  project: string,
  filePath: string,
  cacheDir: string
): string {
  // Cache structure: {cacheDir}/{org}/{project}/{path}
  return path.join(cacheDir, org, project, filePath)
}

/**
 * Resolve a codex URI to filesystem paths
 *
 * @param uri - The URI to resolve
 * @param options - Resolution options
 * @returns The resolved reference or null if invalid
 */
export function resolveReference(
  uri: string,
  options: ResolveOptions = {}
): ResolvedReference | null {
  const parsed = parseReference(uri)
  if (!parsed) {
    return null
  }

  const cacheDir = options.cacheDir || DEFAULT_CACHE_DIR
  const currentContext = getCurrentContext(options)

  // Calculate cache path
  const cachePath = parsed.path
    ? calculateCachePath(parsed.org, parsed.project, parsed.path, cacheDir)
    : path.join(cacheDir, parsed.org, parsed.project)

  // Check if this is the current project
  const isCurrentProject =
    currentContext.org === parsed.org && currentContext.project === parsed.project

  // Build the resolved reference
  const resolved: ResolvedReference = {
    ...parsed,
    cachePath,
    isCurrentProject,
  }

  // If it's the current project and there's a path, provide the local path
  if (isCurrentProject && parsed.path) {
    resolved.localPath = parsed.path
  }

  return resolved
}

/**
 * Resolve multiple URIs at once
 *
 * @param uris - Array of URIs to resolve
 * @param options - Resolution options
 * @returns Array of resolved references (nulls filtered out)
 */
export function resolveReferences(
  uris: string[],
  options: ResolveOptions = {}
): ResolvedReference[] {
  return uris.map((uri) => resolveReference(uri, options)).filter((r): r is ResolvedReference => r !== null)
}

/**
 * Check if a URI refers to the current project
 *
 * @param uri - The URI to check
 * @param options - Resolution options
 * @returns true if the URI refers to the current project
 */
export function isCurrentProjectUri(uri: string, options: ResolveOptions = {}): boolean {
  const resolved = resolveReference(uri, options)
  return resolved?.isCurrentProject ?? false
}

/**
 * Get the relative cache path for a URI (without the cache directory prefix)
 *
 * @param uri - The URI
 * @returns The relative path or null if invalid
 */
export function getRelativeCachePath(uri: string): string | null {
  const parsed = parseReference(uri)
  if (!parsed) {
    return null
  }

  if (parsed.path) {
    return path.join(parsed.org, parsed.project, parsed.path)
  }
  return path.join(parsed.org, parsed.project)
}
