import type { Metadata } from '../../schemas/metadata.js'
import type { SyncRules, AutoSyncPattern } from '../../schemas/config.js'
import { matchPattern, evaluatePatterns } from '../patterns/matcher.js'
import { getDefaultRules } from '../config/defaults.js'

export interface ShouldSyncOptions {
  filePath: string // Path to file being evaluated
  fileMetadata: Metadata // Parsed frontmatter from file
  targetRepo: string // Repository to sync to
  sourceRepo: string // Repository file is from
  rules?: SyncRules // Optional routing rules (defaults applied)
}

/**
 * Determine if a file should be synced to a target repository
 *
 * Based on SPEC-00004: Routing & Distribution
 *
 * @param options - Evaluation options
 * @returns true if file should sync to targetRepo
 */
export function shouldSyncToRepo(options: ShouldSyncOptions): boolean {
  const {
    filePath,
    fileMetadata,
    targetRepo,
    sourceRepo,
    rules = getDefaultRules(),
  } = options

  // 1. Check special rules first
  const specialRuleResult = evaluateSpecialRules({
    filePath,
    targetRepo,
    sourceRepo,
    rules,
  })

  if (specialRuleResult !== null) {
    return specialRuleResult
  }

  // 2. Evaluate frontmatter rules
  return evaluateFrontmatterRules({
    metadata: fileMetadata,
    targetRepo,
    allowOverrides: rules.allowProjectOverrides ?? true,
  })
}

/**
 * Evaluate special routing rules
 *
 * Returns true/false if a special rule matches, null otherwise
 */
function evaluateSpecialRules(options: {
  filePath: string
  targetRepo: string
  sourceRepo: string
  rules: SyncRules
}): boolean | null {
  const { filePath, targetRepo, sourceRepo, rules } = options

  // Rule 1: Auto-sync patterns (highest priority)
  if (rules.autoSyncPatterns?.length) {
    const autoSyncResult = evaluateAutoSyncPatterns(
      filePath,
      targetRepo,
      rules.autoSyncPatterns
    )

    if (autoSyncResult !== null) {
      return autoSyncResult
    }
  }

  // Rule 2: Prevent self-sync
  if (rules.preventSelfSync) {
    const selfSyncResult = preventSelfSync(filePath, targetRepo, sourceRepo)

    if (selfSyncResult !== null) {
      return selfSyncResult
    }
  }

  // Rule 3: Prevent codex sync
  if (rules.preventCodexSync) {
    const codexSyncResult = preventCodexSync(targetRepo, sourceRepo)

    if (codexSyncResult !== null) {
      return codexSyncResult
    }
  }

  // No special rule applies
  return null
}

/**
 * Evaluate auto-sync patterns
 */
function evaluateAutoSyncPatterns(
  filePath: string,
  targetRepo: string,
  patterns: AutoSyncPattern[]
): boolean | null {
  for (const autoPattern of patterns) {
    // Check if file matches auto-sync pattern
    if (matchPattern(autoPattern.pattern, filePath)) {
      // File matches - evaluate repo include/exclude
      return evaluatePatterns({
        value: targetRepo,
        include: autoPattern.include,
        ...(autoPattern.exclude && { exclude: autoPattern.exclude }),
      })
    }
  }

  // No auto-sync pattern matched
  return null
}

/**
 * Prevent system files from syncing to their own repository
 */
function preventSelfSync(
  filePath: string,
  targetRepo: string,
  _sourceRepo: string
): boolean | null {
  // Extract system name from file path
  // Example: ".fractary/systems/api-gateway/docs/README.md" → "api-gateway"
  const systemMatch = filePath.match(/systems\/([^/]+)\//)

  if (systemMatch && systemMatch[1]) {
    const systemName = systemMatch[1]

    if (systemName === targetRepo) {
      // Prevent: Don't sync system files to their own repo
      return false
    }
  }

  // Not a system file, or different system
  return null
}

/**
 * Prevent files from syncing back to the codex repository
 */
function preventCodexSync(
  targetRepo: string,
  sourceRepo: string
): boolean | null {
  // Detect if target is the codex repo
  const isCodexRepo =
    targetRepo === sourceRepo || targetRepo.startsWith('codex.')

  if (isCodexRepo) {
    return false
  }

  return null
}

/**
 * Evaluate frontmatter sync rules
 */
function evaluateFrontmatterRules(options: {
  metadata: Metadata
  targetRepo: string
  allowOverrides: boolean
}): boolean {
  const { metadata, targetRepo, allowOverrides } = options

  // If project overrides disabled, return false (no sync by default)
  if (!allowOverrides) {
    return false
  }

  const include = metadata.codex_sync_include || []
  const exclude = metadata.codex_sync_exclude || []

  // If no include rules, don't sync (must be explicit)
  if (include.length === 0) {
    return false
  }

  // Evaluate include/exclude patterns
  return evaluatePatterns({
    value: targetRepo,
    include,
    exclude,
  })
}

/**
 * Determine all repos that should receive a file
 *
 * @param options - Evaluation options
 * @returns Array of repository names that should receive this file
 */
export function getTargetRepos(options: {
  filePath: string
  fileMetadata: Metadata
  sourceRepo: string
  allRepos: string[]
  rules?: SyncRules
}): string[] {
  const { filePath, fileMetadata, sourceRepo, allRepos, rules } = options

  return allRepos.filter(targetRepo =>
    shouldSyncToRepo({
      filePath,
      fileMetadata,
      targetRepo,
      sourceRepo,
      ...(rules && { rules }),
    })
  )
}
