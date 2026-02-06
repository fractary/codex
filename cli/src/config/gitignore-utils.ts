/**
 * Gitignore utilities for .fractary directory
 *
 * Manages .fractary/.gitignore entries, particularly for cache directories.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Default gitignore content for .fractary directory
 *
 * Uses standard section markers (5 equals signs, start AND end markers)
 * to allow multiple plugins to manage their own sections without conflicts.
 */
export const DEFAULT_FRACTARY_GITIGNORE = `# .fractary/.gitignore
# This file is managed by multiple plugins - each plugin manages its own section

# ===== fractary-codex (managed) =====
codex/cache/
# ===== end fractary-codex =====
`;

/**
 * Legacy gitignore content (for migration detection)
 */
export const LEGACY_FRACTARY_GITIGNORE_PATTERNS = [
  '# Fractary tool-specific ignores',
  '# Codex cache (v4.0 standard)',
  'plugins/codex/cache/',
  'plugins/status/',
];

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

  // Check if already ignored (content is non-null here since gitignoreExists was true)
  if (isCachePathIgnored(content!, relativeCachePath)) {
    return {
      created: false,
      updated: false,
      alreadyIgnored: true,
      gitignorePath,
    };
  }

  // Add the cache path (content is non-null here since gitignoreExists was true)
  content = addCachePathToGitignore(content!, relativeCachePath, 'Custom cache directory');
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

// ===== Section Management Functions =====
// Standard format: # ===== fractary-{plugin} (managed) ===== ... # ===== end fractary-{plugin} =====

const SECTION_START_PATTERN = /^# ===== (fractary-[\w-]+) \(managed\) =====$/;

/**
 * Check if a section marker exists in the gitignore content
 *
 * @param content - Gitignore content
 * @param pluginName - Plugin name (e.g., "fractary-codex")
 * @returns true if the section exists
 */
export function hasSectionMarker(content: string, pluginName: string): boolean {
  const startMarker = `# ===== ${pluginName} (managed) =====`;
  return content.includes(startMarker);
}

/**
 * Get the content of a specific section
 *
 * @param content - Gitignore content
 * @param pluginName - Plugin name (e.g., "fractary-codex")
 * @returns Section entries as an array, or null if section doesn't exist
 */
export function getSectionContent(content: string, pluginName: string): string[] | null {
  const startMarker = `# ===== ${pluginName} (managed) =====`;
  const endMarker = `# ===== end ${pluginName} =====`;

  const lines = content.split('\n');
  const entries: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (line.trim() === startMarker) {
      inSection = true;
      continue;
    }
    if (line.trim() === endMarker && inSection) {
      return entries;
    }
    if (inSection && line.trim() && !line.startsWith('#')) {
      entries.push(line.trim());
    }
  }

  return inSection ? entries : null;
}

/**
 * Update or create a section in the gitignore content
 *
 * @param content - Existing gitignore content
 * @param pluginName - Plugin name (e.g., "fractary-codex")
 * @param entries - Entries to put in the section
 * @returns Updated gitignore content
 */
export function updateSection(content: string, pluginName: string, entries: string[]): string {
  const startMarker = `# ===== ${pluginName} (managed) =====`;
  const endMarker = `# ===== end ${pluginName} =====`;

  // Build new section
  const newSection = [startMarker, ...entries, endMarker].join('\n');

  // Check if section already exists
  if (hasSectionMarker(content, pluginName)) {
    // Remove existing section
    const lines = content.split('\n');
    const result: string[] = [];
    let inSection = false;

    for (const line of lines) {
      if (line.trim() === startMarker) {
        inSection = true;
        continue;
      }
      if (line.trim() === endMarker && inSection) {
        inSection = false;
        continue;
      }
      if (!inSection) {
        result.push(line);
      }
    }

    // Append new section
    return result.join('\n').trimEnd() + '\n\n' + newSection + '\n';
  }

  // Section doesn't exist - append it
  return content.trimEnd() + '\n\n' + newSection + '\n';
}

/**
 * Migrate old-format gitignore to new section-based format
 *
 * Converts old format (no section markers) to new format with proper markers.
 *
 * @param content - Existing gitignore content
 * @returns Migrated content
 */
export function migrateToSectionFormat(content: string): string {
  // Check if already using section format
  if (SECTION_START_PATTERN.test(content)) {
    return content;
  }

  // Check for old format indicators
  const hasOldFormat = LEGACY_FRACTARY_GITIGNORE_PATTERNS.some(pattern =>
    content.includes(pattern)
  );

  if (!hasOldFormat) {
    return content;
  }

  // Extract codex-related entries from old format
  const lines = content.split('\n');
  const codexEntries: string[] = [];
  const otherLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Identify codex-related entries
    if (
      trimmed === 'codex/cache/' ||
      trimmed === 'plugins/codex/cache/' ||
      trimmed.startsWith('# Codex') ||
      trimmed.startsWith('# Legacy codex')
    ) {
      if (trimmed === 'codex/cache/') {
        codexEntries.push(trimmed);
      }
    } else if (
      trimmed !== '# Fractary tool-specific ignores' &&
      trimmed !== '# This file manages all .fractary/ directory exclusions'
    ) {
      otherLines.push(line);
    }
  }

  // Build new content with section markers
  let newContent = '# .fractary/.gitignore\n# This file is managed by multiple plugins - each plugin manages its own section\n\n';

  // Add codex section if we have entries
  if (codexEntries.length > 0 || !content.includes('codex/cache/')) {
    newContent += '# ===== fractary-codex (managed) =====\n';
    newContent += (codexEntries.length > 0 ? codexEntries : ['codex/cache/']).join('\n') + '\n';
    newContent += '# ===== end fractary-codex =====\n';
  }

  // Preserve other non-empty, non-header lines
  const preservedLines = otherLines.filter(l =>
    l.trim() && !l.trim().startsWith('# Status plugin') && l.trim() !== 'plugins/status/'
  );
  if (preservedLines.length > 0) {
    newContent += '\n# Other entries (preserved from migration)\n';
    newContent += preservedLines.join('\n') + '\n';
  }

  return newContent;
}
