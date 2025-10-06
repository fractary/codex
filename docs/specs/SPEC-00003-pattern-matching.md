# SPEC-00003: Pattern Matching

**Status**: Draft
**Created**: 2025-10-06
**Author**: Fractary Engineering
**Related Specs**: SPEC-00001 (Overview), SPEC-00002 (Metadata), SPEC-00004 (Routing)

## Overview

This specification defines how the Codex SDK matches glob patterns against repository names and file paths. Pattern matching is core to the routing system, determining which files should be synced to which repositories based on `codex_sync_include` and `codex_sync_exclude` rules.

## Goals

1. **Match glob patterns** against strings (repo names, file paths)
2. **Support standard glob syntax** (wildcards, character classes)
3. **Handle special patterns** like `*` (match all)
4. **Predictable behavior** matching existing bash implementation
5. **Performance** for large-scale pattern evaluation

## Pattern Syntax

### Supported Patterns

| Pattern | Matches | Example |
|---------|---------|---------|
| `*` | Any characters | `api-*` matches `api-gateway`, `api-auth` |
| `?` | Single character | `ap?` matches `api`, `app` |
| `[abc]` | Character class | `api-[ab]*` matches `api-auth`, `api-admin` |
| `[!abc]` | Negated class | `api-[!t]*` matches `api-auth` but not `api-test` |
| `**` | Multiple path segments | `**/docs/**` matches any path containing `/docs/` |

### Special Cases

| Pattern | Behavior |
|---------|----------|
| `[*]` | Array with single `*` - matches ALL repositories |
| `[]` | Empty array - matches NO repositories |
| Exact match | `api-gateway` matches only `api-gateway` |

### Pattern Escaping

Literal special characters can be escaped:
- `\*` - Literal asterisk
- `\?` - Literal question mark
- `\[` - Literal bracket

## Implementation

### Core Function

```typescript
/**
 * Match a pattern against a value using glob syntax
 *
 * @param pattern - Glob pattern (e.g., "api-*", "core-*")
 * @param value - Value to test (e.g., "api-gateway")
 * @returns true if pattern matches value
 */
export function matchPattern(pattern: string, value: string): boolean {
  // Special case: exact match
  if (pattern === value) return true

  // Convert glob pattern to regex
  const regex = globToRegex(pattern)

  // Test against value
  return regex.test(value)
}
```

### Glob to Regex Conversion

```typescript
/**
 * Convert glob pattern to RegExp
 *
 * Based on existing bash implementation:
 * local regex_pattern=$(echo "$pattern" | sed 's/\./\\./g' | sed 's/\*/.*/g')
 */
export function globToRegex(pattern: string): RegExp {
  // Escape special regex characters (except glob wildcards)
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
    .replace(/\*/g, '.*')                    // * → .*
    .replace(/\?/g, '.')                     // ? → .

  // Add anchors for full string match
  regex = `^${regex}$`

  return new RegExp(regex)
}
```

### Multi-Pattern Matching

```typescript
/**
 * Check if value matches any pattern in array
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
 */
export function filterByPatterns(
  patterns: string[],
  values: string[]
): string[] {
  return values.filter(value => matchAnyPattern(patterns, value))
}
```

### Include/Exclude Logic

```typescript
/**
 * Evaluate include/exclude rules
 */
export function evaluatePatterns(options: {
  value: string
  include?: string[]
  exclude?: string[]
}): boolean {
  const { value, include = [], exclude = [] } = options

  // Check exclusions first
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
```

## Pattern Matching Behavior

### From Existing Implementation

The existing bash implementation:

```bash
pattern_matches_repo() {
  local pattern=$1
  local repo=$2

  # Convert shell glob pattern to regex
  # First escape dots, then replace * with .*
  local regex_pattern=$(echo "$pattern" | sed 's/\./\\./g' | sed 's/\*/.*/g')

  # Check if repo matches the pattern
  if echo "$repo" | grep -q "^$regex_pattern$"; then
    return 0
  else
    return 1
  fi
}
```

Key behaviors to replicate:
1. Dots (`.`) are treated as literal characters, not regex wildcards
2. Asterisks (`*`) match zero or more characters
3. Full string match (anchored with `^` and `$`)

### Examples

```typescript
// Wildcard matching
matchPattern('api-*', 'api-gateway')      // true
matchPattern('api-*', 'api-auth')         // true
matchPattern('api-*', 'web-app')          // false

// Exact matching
matchPattern('api-gateway', 'api-gateway') // true
matchPattern('api-gateway', 'api-auth')    // false

// Dots are literal
matchPattern('codex.fractary.com', 'codex.fractary.com')   // true
matchPattern('codex.*.com', 'codex.fractary.com')          // true
matchPattern('codex.fractary.com', 'codexXfractaryXcom')   // false

// Multiple wildcards
matchPattern('*-gateway', 'api-gateway')   // true
matchPattern('*-gateway', 'auth-gateway')  // true
matchPattern('*-*-*', 'foo-bar-baz')       // true

// Character classes (if supported)
matchPattern('api-[ag]*', 'api-gateway')   // true
matchPattern('api-[ag]*', 'api-auth')      // true
matchPattern('api-[ag]*', 'api-test')      // false
```

## Use Cases

### Repository Routing

```typescript
import { matchAnyPattern } from '@fractary/codex'

const metadata = {
  codex_sync_include: ['api-*', 'core-*'],
  codex_sync_exclude: ['*-test', '*-dev']
}

// Should this file sync to 'api-gateway'?
const includeMatch = matchAnyPattern(
  metadata.codex_sync_include,
  'api-gateway'
)  // true

const excludeMatch = matchAnyPattern(
  metadata.codex_sync_exclude,
  'api-gateway'
)  // false

// Result: YES, sync to api-gateway
```

### Special Pattern: Match All

```typescript
const metadata = {
  codex_sync_include: ['*']  // Sync to ALL repos
}

matchAnyPattern(['*'], 'any-repo-name')  // true
matchAnyPattern(['*'], 'another-repo')   // true
```

### Combined Include/Exclude

```typescript
import { evaluatePatterns } from '@fractary/codex'

// Include api-* repos, but exclude test repos
evaluatePatterns({
  value: 'api-gateway',
  include: ['api-*'],
  exclude: ['*-test']
})  // true

evaluatePatterns({
  value: 'api-test',
  include: ['api-*'],
  exclude: ['*-test']
})  // false (excluded)

evaluatePatterns({
  value: 'web-app',
  include: ['api-*'],
  exclude: ['*-test']
})  // false (not included)
```

## Performance Considerations

### Regex Caching

For frequently used patterns, cache compiled regexes:

```typescript
const regexCache = new Map<string, RegExp>()

export function getCachedRegex(pattern: string): RegExp {
  if (!regexCache.has(pattern)) {
    regexCache.set(pattern, globToRegex(pattern))
  }
  return regexCache.get(pattern)!
}
```

### Optimization Strategies

1. **Short-circuit evaluation**: Check exact matches before regex
2. **Pattern ordering**: Evaluate most common patterns first
3. **Batch operations**: Filter arrays efficiently
4. **Cache compiled regexes**: Avoid recompiling same patterns

## Alternative: Use Existing Library

Instead of implementing from scratch, consider using `micromatch` or `minimatch`:

```typescript
import { isMatch } from 'micromatch'

export function matchPattern(pattern: string, value: string): boolean {
  return isMatch(value, pattern)
}
```

**Pros**:
- Battle-tested, handles edge cases
- Better performance
- More features (brace expansion, etc.)

**Cons**:
- External dependency
- May have different behavior than existing bash implementation

**Recommendation**: Start with custom implementation matching bash behavior exactly, then consider migration to library if needed.

## Testing Requirements

### Unit Tests

1. **Basic wildcards**
   - `*` matches multiple characters
   - `?` matches single character
   - No wildcards (exact match)

2. **Special characters**
   - Dots are literal (`.`)
   - Hyphens are literal (`-`)
   - Underscores are literal (`_`)

3. **Edge cases**
   - Empty pattern
   - Empty value
   - Pattern longer than value
   - Value longer than pattern

4. **Array operations**
   - `matchAnyPattern` with multiple patterns
   - Special case `[*]`
   - Empty array `[]`

5. **Include/exclude logic**
   - Include only
   - Exclude only
   - Combined include and exclude
   - Exclusions take priority

### Test Cases

```typescript
describe('matchPattern', () => {
  test('exact match', () => {
    expect(matchPattern('api-gateway', 'api-gateway')).toBe(true)
    expect(matchPattern('api-gateway', 'api-auth')).toBe(false)
  })

  test('wildcard matching', () => {
    expect(matchPattern('api-*', 'api-gateway')).toBe(true)
    expect(matchPattern('api-*', 'api-auth')).toBe(true)
    expect(matchPattern('api-*', 'web-app')).toBe(false)
  })

  test('dots are literal', () => {
    expect(matchPattern('codex.*.com', 'codex.fractary.com')).toBe(true)
    expect(matchPattern('codex.*.com', 'codexXfractaryXcom')).toBe(false)
  })

  test('multiple wildcards', () => {
    expect(matchPattern('*-*-*', 'foo-bar-baz')).toBe(true)
    expect(matchPattern('*-gateway', 'api-gateway')).toBe(true)
  })
})

describe('matchAnyPattern', () => {
  test('matches any pattern', () => {
    expect(matchAnyPattern(['api-*', 'core-*'], 'api-gateway')).toBe(true)
    expect(matchAnyPattern(['api-*', 'core-*'], 'core-auth')).toBe(true)
    expect(matchAnyPattern(['api-*', 'core-*'], 'web-app')).toBe(false)
  })

  test('special case [*]', () => {
    expect(matchAnyPattern(['*'], 'anything')).toBe(true)
    expect(matchAnyPattern(['*'], 'whatever')).toBe(true)
  })

  test('empty array', () => {
    expect(matchAnyPattern([], 'anything')).toBe(false)
  })
})

describe('evaluatePatterns', () => {
  test('include and exclude', () => {
    expect(evaluatePatterns({
      value: 'api-gateway',
      include: ['api-*'],
      exclude: ['*-test']
    })).toBe(true)

    expect(evaluatePatterns({
      value: 'api-test',
      include: ['api-*'],
      exclude: ['*-test']
    })).toBe(false)
  })

  test('exclusions take priority', () => {
    expect(evaluatePatterns({
      value: 'api-test',
      include: ['*'],
      exclude: ['*-test']
    })).toBe(false)
  })
})
```

## API Surface

### Public Exports

```typescript
// Core matching
export function matchPattern(pattern: string, value: string): boolean
export function globToRegex(pattern: string): RegExp

// Multi-pattern operations
export function matchAnyPattern(patterns: string[], value: string): boolean
export function filterByPatterns(patterns: string[], values: string[]): string[]

// Include/exclude logic
export function evaluatePatterns(options: {
  value: string
  include?: string[]
  exclude?: string[]
}): boolean
```

## Success Criteria

- [ ] Matches behavior of existing bash implementation
- [ ] Handles all common glob patterns
- [ ] Special case `[*]` works correctly
- [ ] Include/exclude logic is correct
- [ ] 95%+ test coverage
- [ ] Performance acceptable for 100+ patterns
- [ ] Clear error messages for invalid patterns

## Examples

### Example 1: Repository Filtering

```typescript
import { filterByPatterns } from '@fractary/codex'

const allRepos = [
  'api-gateway',
  'api-auth',
  'api-test',
  'web-app',
  'core-db'
]

const apiRepos = filterByPatterns(['api-*'], allRepos)
// ['api-gateway', 'api-auth', 'api-test']

const nonTestRepos = allRepos.filter(repo =>
  !matchAnyPattern(['*-test'], repo)
)
// ['api-gateway', 'api-auth', 'web-app', 'core-db']
```

### Example 2: Sync Decision

```typescript
import { evaluatePatterns } from '@fractary/codex'

function shouldSyncToRepo(
  targetRepo: string,
  include: string[],
  exclude: string[]
): boolean {
  return evaluatePatterns({
    value: targetRepo,
    include,
    exclude
  })
}

shouldSyncToRepo('api-gateway', ['api-*'], ['*-test'])  // true
shouldSyncToRepo('api-test', ['api-*'], ['*-test'])     // false
shouldSyncToRepo('web-app', ['api-*'], ['*-test'])      // false
```

## Changelog

- 2025-10-06: Initial draft
