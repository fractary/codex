import micromatch from 'micromatch'

/**
 * Match a pattern against a value using glob syntax
 *
 * Based on SPEC-00003: Pattern Matching
 *
 * @param pattern - Glob pattern (e.g., "api-*", "core-*")
 * @param value - Value to test (e.g., "api-gateway")
 * @returns true if pattern matches value
 */
export function matchPattern(pattern: string, value: string): boolean {
  // Special case: exact match
  if (pattern === value) return true

  // Use micromatch for glob pattern matching
  return micromatch.isMatch(value, pattern)
}

/**
 * Check if value matches any pattern in array
 *
 * @param patterns - Array of glob patterns
 * @param value - Value to test
 * @returns true if value matches any pattern
 */
export function matchAnyPattern(
  patterns: string[],
  value: string
): boolean {
  // Special case: [*] matches everything
  if (patterns.length === 1 && patterns[0] === '*') {
    return true
  }

  // Empty array matches nothing
  if (patterns.length === 0) {
    return false
  }

  // Check each pattern
  return patterns.some(pattern => matchPattern(pattern, value))
}

/**
 * Filter values that match any pattern
 *
 * @param patterns - Array of glob patterns
 * @param values - Array of values to filter
 * @returns Values that match any pattern
 */
export function filterByPatterns(
  patterns: string[],
  values: string[]
): string[] {
  return values.filter(value => matchAnyPattern(patterns, value))
}

/**
 * Evaluate include/exclude rules
 *
 * @param options - Evaluation options
 * @returns true if value should be included
 */
export function evaluatePatterns(options: {
  value: string
  include?: string[]
  exclude?: string[]
}): boolean {
  const { value, include = [], exclude = [] } = options

  // Check exclusions first (exclusions take priority)
  if (exclude.length > 0 && matchAnyPattern(exclude, value)) {
    return false
  }

  // Check inclusions
  if (include.length === 0) {
    // No include patterns = include by default
    return true
  }

  return matchAnyPattern(include, value)
}
