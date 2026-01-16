/**
 * Gitignore utilities for .fractary directory
 *
 * Manages .fractary/.gitignore entries, particularly for cache directories.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Default gitignore content for .fractary directory
 */
export const DEFAULT_FRACTARY_GITIGNORE = `# Fractary tool-specific ignores
# This file manages all .fractary/ directory exclusions

# Codex cache (v4.0 standard)
codex/cache/

# Legacy codex cache location
plugins/codex/cache/

# Status plugin cache
plugins/status/
`;

/**
 * Default cache directory (relative to .fractary/)
 */
export const DEFAULT_CACHE_DIR = 'codex/cache/';

/**
 * Read existing .fractary/.gitignore content
 *
 * @param projectRoot - Project root directory
 * @returns Gitignore content or null if doesn't exist
 */
export async function readFractaryGitignore(projectRoot: string): Promise<string | null> {
  const gitignorePath = path.join(projectRoot, '.fractary', '.gitignore');

  try {
    return await fs.readFile(gitignorePath, 'utf-8');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Write .fractary/.gitignore content
 *
 * @param projectRoot - Project root directory
 * @param content - Gitignore content
 */
export async function writeFractaryGitignore(projectRoot: string, content: string): Promise<void> {
  const gitignorePath = path.join(projectRoot, '.fractary', '.gitignore');

  // Ensure .fractary directory exists
  await fs.mkdir(path.join(projectRoot, '.fractary'), { recursive: true });

  await fs.writeFile(gitignorePath, content, 'utf-8');
}

/**
 * Normalize a cache path to be relative to .fractary/
 *
 * Handles both Unix and Windows path separators, converting to forward slashes
 * for gitignore compatibility.
 *
 * @param cachePath - Cache path (e.g., ".fractary/codex/cache" or "codex/cache")
 * @returns Path relative to .fractary/ with trailing slash
 *
 * @example
 * normalizeCachePath('.fractary/codex/cache')  // returns 'codex/cache/'
 * normalizeCachePath('codex/cache')            // returns 'codex/cache/'
 * normalizeCachePath('codex\\cache')           // returns 'codex/cache/' (Windows)
 */
export function normalizeCachePath(cachePath: string): string {
  // Normalize to forward slashes (gitignore always uses forward slashes)
  let normalized = cachePath.replace(/\\/g, '/');

  // Remove .fractary/ prefix if present
  normalized = normalized.replace(/^\.fractary\//, '');

  // Ensure trailing slash for directory
  if (!normalized.endsWith('/')) {
    normalized += '/';
  }

  return normalized;
}

/**
 * Check if a cache path is already in the gitignore
 *
 * @param gitignoreContent - Current gitignore content
 * @param cachePath - Cache path to check (relative to .fractary/)
 * @returns true if path is already ignored
 */
export function isCachePathIgnored(gitignoreContent: string, cachePath: string): boolean {
  const normalized = normalizeCachePath(cachePath);
  const lines = gitignoreContent.split('\n').map(l => l.trim());

  // Check for exact match or pattern that would match
  return lines.some(line => {
    if (line.startsWith('#') || line === '') return false;

    // Normalize the line for comparison (also handle Windows paths in existing gitignore)
    let normalizedLine = line.replace(/\\/g, '/');
    if (!normalizedLine.endsWith('/')) {
      normalizedLine += '/';
    }

    return normalizedLine === normalized;
  });
}

/**
 * Add a cache path to gitignore content
 *
 * @param gitignoreContent - Current gitignore content
 * @param cachePath - Cache path to add (relative to .fractary/)
 * @param comment - Optional comment to add before the entry
 * @returns Updated gitignore content
 */
export function addCachePathToGitignore(
  gitignoreContent: string,
  cachePath: string,
  comment?: string
): string {
  const normalized = normalizeCachePath(cachePath);

  // Don't add if already present
  if (isCachePathIgnored(gitignoreContent, cachePath)) {
    return gitignoreContent;
  }

  // Add entry with optional comment
  let addition = '';
  if (comment) {
    addition += `\n# ${comment}\n`;
  } else {
    addition += '\n';
  }
  addition += normalized + '\n';

  return gitignoreContent.trimEnd() + addition;
}

/**
 * Ensure .fractary/.gitignore exists and contains the cache path
 *
 * @param projectRoot - Project root directory
 * @param cachePath - Cache path to ensure is ignored (can be absolute or relative)
 * @returns Object with status information
 */
export async function ensureCachePathIgnored(
  projectRoot: string,
  cachePath: string
): Promise<{
  created: boolean;
  updated: boolean;
  alreadyIgnored: boolean;
  gitignorePath: string;
}> {
  const gitignorePath = path.join(projectRoot, '.fractary', '.gitignore');

  // Normalize the cache path relative to .fractary/
  let relativeCachePath = cachePath;

  // Handle absolute paths
  if (path.isAbsolute(cachePath)) {
    relativeCachePath = path.relative(path.join(projectRoot, '.fractary'), cachePath);
  }

  // Handle paths starting with .fractary/
  relativeCachePath = normalizeCachePath(relativeCachePath);

  // Read existing gitignore or use default
  let content = await readFractaryGitignore(projectRoot);
  const gitignoreExists = content !== null;

  if (!gitignoreExists) {
    // Create with default content
    content = DEFAULT_FRACTARY_GITIGNORE;

    // Check if the cache path is already in default content
    if (!isCachePathIgnored(content, relativeCachePath)) {
      content = addCachePathToGitignore(content, relativeCachePath, 'Custom cache directory');
    }

    await writeFractaryGitignore(projectRoot, content);

    return {
      created: true,
      updated: false,
      alreadyIgnored: false,
      gitignorePath,
    };
  }

  // Check if already ignored
  if (isCachePathIgnored(content, relativeCachePath)) {
    return {
      created: false,
      updated: false,
      alreadyIgnored: true,
      gitignorePath,
    };
  }

  // Add the cache path
  content = addCachePathToGitignore(content, relativeCachePath, 'Custom cache directory');
  await writeFractaryGitignore(projectRoot, content);

  return {
    created: false,
    updated: true,
    alreadyIgnored: false,
    gitignorePath,
  };
}

/**
 * Get a warning message for custom cache paths
 *
 * @param cachePath - The custom cache path
 * @returns Warning message string
 */
export function getCustomCachePathWarning(cachePath: string): string {
  const normalized = normalizeCachePath(cachePath);

  return `Custom cache directory detected: ${cachePath}
Please ensure .fractary/.gitignore includes: ${normalized}`;
}
