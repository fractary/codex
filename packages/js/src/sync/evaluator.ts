/**
 * Sync rule evaluator
 *
 * Evaluates sync rules to determine which files should be synced.
 */

import micromatch from 'micromatch'
import type { SyncRule, SyncDirection } from './types.js'

/**
 * Evaluation result for a single file
 */
export interface EvaluationResult {
  /** File path */
  path: string
  /** Whether the file should be synced */
  shouldSync: boolean
  /** Matching rule (if any) */
  matchedRule?: SyncRule
  /** Reason for the decision */
  reason: string
}

/**
 * Evaluate a file path against sync rules
 *
 * @param path - File path to evaluate
 * @param rules - Array of sync rules
 * @param direction - Current sync direction
 * @param defaultExcludes - Default exclude patterns
 * @returns Evaluation result
 */
export function evaluatePath(
  path: string,
  rules: SyncRule[],
  direction: SyncDirection,
  defaultExcludes: string[] = []
): EvaluationResult {
  // First check default excludes
  for (const pattern of defaultExcludes) {
    if (micromatch.isMatch(path, pattern)) {
      return {
        path,
        shouldSync: false,
        reason: `Excluded by default pattern: ${pattern}`,
      }
    }
  }

  // Sort rules by priority (higher first)
  const sortedRules = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

  // Find first matching rule
  for (const rule of sortedRules) {
    // Skip rules that don't apply to this direction
    if (rule.direction && rule.direction !== direction) {
      continue
    }

    if (micromatch.isMatch(path, rule.pattern)) {
      return {
        path,
        shouldSync: rule.include,
        matchedRule: rule,
        reason: rule.include
          ? `Included by rule: ${rule.pattern}`
          : `Excluded by rule: ${rule.pattern}`,
      }
    }
  }

  // Default: include if no rule matches
  return {
    path,
    shouldSync: true,
    reason: 'No matching rule, included by default',
  }
}

/**
 * Evaluate multiple paths against sync rules
 *
 * @param paths - Array of file paths
 * @param rules - Array of sync rules
 * @param direction - Current sync direction
 * @param defaultExcludes - Default exclude patterns
 * @returns Map of path to evaluation result
 */
export function evaluatePaths(
  paths: string[],
  rules: SyncRule[],
  direction: SyncDirection,
  defaultExcludes: string[] = []
): Map<string, EvaluationResult> {
  const results = new Map<string, EvaluationResult>()

  for (const path of paths) {
    results.set(path, evaluatePath(path, rules, direction, defaultExcludes))
  }

  return results
}

/**
 * Filter paths to get only syncable files
 *
 * @param paths - Array of file paths
 * @param rules - Array of sync rules
 * @param direction - Current sync direction
 * @param defaultExcludes - Default exclude patterns
 * @returns Array of paths that should be synced
 */
export function filterSyncablePaths(
  paths: string[],
  rules: SyncRule[],
  direction: SyncDirection,
  defaultExcludes: string[] = []
): string[] {
  return paths.filter(
    (path) => evaluatePath(path, rules, direction, defaultExcludes).shouldSync
  )
}

/**
 * Create sync rules from patterns
 *
 * @param include - Patterns to include
 * @param exclude - Patterns to exclude
 * @returns Array of sync rules
 */
export function createRulesFromPatterns(
  include: string[] = [],
  exclude: string[] = []
): SyncRule[] {
  const rules: SyncRule[] = []

  // Add exclude rules with higher priority
  for (const pattern of exclude) {
    rules.push({
      pattern,
      include: false,
      priority: 100,
    })
  }

  // Add include rules
  for (const pattern of include) {
    rules.push({
      pattern,
      include: true,
      priority: 50,
    })
  }

  return rules
}

/**
 * Merge multiple sets of rules
 *
 * @param ruleSets - Arrays of rules to merge
 * @returns Merged rules array
 */
export function mergeRules(...ruleSets: SyncRule[][]): SyncRule[] {
  return ruleSets.flat()
}

/**
 * Get summary of evaluation results
 */
export interface EvaluationSummary {
  total: number
  included: number
  excluded: number
  byReason: Record<string, number>
}

/**
 * Summarize evaluation results
 *
 * @param results - Evaluation results map
 * @returns Summary of results
 */
export function summarizeEvaluations(
  results: Map<string, EvaluationResult>
): EvaluationSummary {
  const summary: EvaluationSummary = {
    total: results.size,
    included: 0,
    excluded: 0,
    byReason: {},
  }

  for (const result of results.values()) {
    if (result.shouldSync) {
      summary.included++
    } else {
      summary.excluded++
    }

    summary.byReason[result.reason] = (summary.byReason[result.reason] ?? 0) + 1
  }

  return summary
}

/**
 * Validate sync rules
 *
 * @param rules - Rules to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateRules(rules: SyncRule[]): string[] {
  const errors: string[] = []

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]
    if (!rule) continue

    // Check pattern is valid
    if (!rule.pattern || rule.pattern.trim() === '') {
      errors.push(`Rule ${i}: pattern is empty`)
      continue
    }

    // Check pattern is valid glob
    try {
      micromatch.isMatch('test', rule.pattern)
    } catch {
      errors.push(`Rule ${i}: invalid pattern "${rule.pattern}"`)
    }

    // Check direction is valid
    if (rule.direction && !['to-codex', 'from-codex', 'bidirectional'].includes(rule.direction)) {
      errors.push(`Rule ${i}: invalid direction "${rule.direction}"`)
    }
  }

  return errors
}
