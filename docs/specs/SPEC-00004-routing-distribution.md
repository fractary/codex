# SPEC-00004: Routing & Distribution

**Status**: Draft
**Created**: 2025-10-06
**Author**: Fractary Engineering
**Related Specs**: SPEC-00001 (Overview), SPEC-00002 (Metadata), SPEC-00003 (Patterns), SPEC-00005 (Configuration)

## Overview

This specification defines how the Codex SDK determines which files should be synced to which repositories. The routing system evaluates frontmatter metadata, pattern matching rules, and configurable sync policies to make intelligent distribution decisions.

## Goals

1. **Evaluate sync rules** from file frontmatter (`codex_sync_include`, `codex_sync_exclude`)
2. **Apply special routing logic** (auto-sync patterns, self-sync prevention)
3. **Support org-wide defaults** with project-level overrides
4. **Configurable behavior** without hardcoded assumptions
5. **Deterministic routing** - same inputs always produce same output

## Core Function

### shouldSyncToRepo

The primary routing decision function:

```typescript
export interface ShouldSyncOptions {
  filePath: string              // Path to file being evaluated
  fileMetadata: Metadata        // Parsed frontmatter from file
  targetRepo: string            // Repository to sync to
  sourceRepo: string            // Repository file is from
  rules?: SyncRules             // Optional routing rules (defaults applied)
}

/**
 * Determine if a file should be synced to a target repository
 *
 * @returns true if file should sync to targetRepo
 */
export function shouldSyncToRepo(options: ShouldSyncOptions): boolean {
  const {
    filePath,
    fileMetadata,
    targetRepo,
    sourceRepo,
    rules = getDefaultRules()
  } = options

  // 1. Check special rules first
  const specialRuleResult = evaluateSpecialRules({
    filePath,
    targetRepo,
    sourceRepo,
    rules
  })

  if (specialRuleResult !== null) {
    return specialRuleResult
  }

  // 2. Evaluate frontmatter rules
  return evaluateFrontmatterRules({
    metadata: fileMetadata,
    targetRepo,
    allowOverrides: rules.allowProjectOverrides ?? true
  })
}
```

## Special Routing Rules

### Rule 1: Auto-Sync Patterns

Certain file patterns automatically sync to all (or specific) repositories, regardless of frontmatter.

```typescript
export interface AutoSyncPattern {
  pattern: string       // Glob pattern for file paths
  include: string[]     // Repo patterns to include
  exclude?: string[]    // Repo patterns to exclude
}

// Example: Auto-sync JSON schemas
const autoSyncPatterns: AutoSyncPattern[] = [
  {
    pattern: '*/docs/schema/*.json',
    include: ['*'],  // All repos
    exclude: []
  }
]
```

**Implementation**:

```typescript
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
        exclude: autoPattern.exclude
      })
    }
  }

  // No auto-sync pattern matched
  return null
}
```

### Rule 2: Prevent Self-Sync

System files shouldn't sync back to their own repository.

```typescript
function preventSelfSync(
  filePath: string,
  targetRepo: string,
  sourceRepo: string,
  enabled: boolean
): boolean | null {
  if (!enabled) return null

  // Extract system name from file path
  // Example: ".fractary/systems/api-gateway/docs/README.md" → "api-gateway"
  const systemMatch = filePath.match(/systems\/([^/]+)\//)

  if (systemMatch) {
    const systemName = systemMatch[1]

    if (systemName === targetRepo) {
      // Prevent: Don't sync system files to their own repo
      return false
    }
  }

  // Not a system file, or different system
  return null
}
```

### Rule 3: Exclude Codex Repo

Files shouldn't sync back to the codex repository itself (except when explicitly configured).

```typescript
function preventCodexSync(
  targetRepo: string,
  sourceRepo: string,
  enabled: boolean
): boolean | null {
  if (!enabled) return null

  // Detect if target is the codex repo
  const isCodexRepo = targetRepo === sourceRepo ||
                      targetRepo.startsWith('codex.')

  if (isCodexRepo) {
    return false
  }

  return null
}
```

### Combined Special Rules

```typescript
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
    const selfSyncResult = preventSelfSync(
      filePath,
      targetRepo,
      sourceRepo,
      rules.preventSelfSync
    )

    if (selfSyncResult !== null) {
      return selfSyncResult
    }
  }

  // Rule 3: Prevent codex sync
  if (rules.preventCodexSync) {
    const codexSyncResult = preventCodexSync(
      targetRepo,
      sourceRepo,
      rules.preventCodexSync
    )

    if (codexSyncResult !== null) {
      return codexSyncResult
    }
  }

  // No special rule applies
  return null
}
```

## Frontmatter Rules Evaluation

### Standard Behavior

```typescript
function evaluateFrontmatterRules(options: {
  metadata: Metadata
  targetRepo: string
  allowOverrides: boolean
}): boolean {
  const { metadata, targetRepo, allowOverrides } = options

  // If project overrides disabled, return default (false or org-wide config)
  if (!allowOverrides) {
    return false
  }

  const include = metadata.codex_sync_include || []
  const exclude = metadata.codex_sync_exclude || []

  // Evaluate include/exclude patterns
  return evaluatePatterns({
    value: targetRepo,
    include,
    exclude
  })
}
```

### Special Case: Match All

```typescript
// File with [*] syncs to all repos
const metadata = {
  codex_sync_include: ['*']
}

evaluateFrontmatterRules({
  metadata,
  targetRepo: 'any-repo',
  allowOverrides: true
})  // true
```

### Special Case: No Rules

```typescript
// File with no sync rules
const metadata = {}

evaluateFrontmatterRules({
  metadata,
  targetRepo: 'any-repo',
  allowOverrides: true
})  // false (no include rules = no sync)
```

## Sync Rules Configuration

```typescript
export interface SyncRules {
  // Auto-sync patterns (highest priority)
  autoSyncPatterns?: AutoSyncPattern[]

  // Behavioral flags
  preventSelfSync?: boolean        // Default: true
  preventCodexSync?: boolean       // Default: true
  allowProjectOverrides?: boolean  // Default: true

  // Default include/exclude (if file has no frontmatter)
  defaultInclude?: string[]
  defaultExclude?: string[]
}

// Default configuration
export const DEFAULT_SYNC_RULES: SyncRules = {
  autoSyncPatterns: [],
  preventSelfSync: true,
  preventCodexSync: true,
  allowProjectOverrides: true,
  defaultInclude: [],
  defaultExclude: []
}
```

## Use Cases

### Use Case 1: Standard File Routing

```typescript
const fileMetadata = {
  codex_sync_include: ['api-*', 'core-*'],
  codex_sync_exclude: ['*-test']
}

// Should sync to api-gateway? YES
shouldSyncToRepo({
  filePath: 'docs/api-guide.md',
  fileMetadata,
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.fractary.com'
})  // true

// Should sync to api-test? NO (excluded)
shouldSyncToRepo({
  filePath: 'docs/api-guide.md',
  fileMetadata,
  targetRepo: 'api-test',
  sourceRepo: 'codex.fractary.com'
})  // false

// Should sync to web-app? NO (not included)
shouldSyncToRepo({
  filePath: 'docs/api-guide.md',
  fileMetadata,
  targetRepo: 'web-app',
  sourceRepo: 'codex.fractary.com'
})  // false
```

### Use Case 2: Auto-Sync JSON Schemas

```typescript
const rules: SyncRules = {
  autoSyncPatterns: [
    {
      pattern: '*/docs/schema/*.json',
      include: ['*'],
      exclude: []
    }
  ],
  preventCodexSync: true
}

// Schema file syncs to all repos (except codex)
shouldSyncToRepo({
  filePath: '.fractary/docs/schema/api-spec.json',
  fileMetadata: {},  // No frontmatter needed!
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.fractary.com',
  rules
})  // true
```

### Use Case 3: Prevent Self-Sync

```typescript
const rules: SyncRules = {
  preventSelfSync: true
}

// System file from api-gateway shouldn't sync back to api-gateway
shouldSyncToRepo({
  filePath: '.fractary/systems/api-gateway/docs/README.md',
  fileMetadata: { codex_sync_include: ['*'] },
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.fractary.com',
  rules
})  // false (self-sync prevented)

// Same file CAN sync to other repos
shouldSyncToRepo({
  filePath: '.fractary/systems/api-gateway/docs/README.md',
  fileMetadata: { codex_sync_include: ['*'] },
  targetRepo: 'web-app',
  sourceRepo: 'codex.fractary.com',
  rules
})  // true
```

### Use Case 4: Sync to All

```typescript
const fileMetadata = {
  codex_sync_include: ['*']
}

// Syncs to all repos (except prevented by special rules)
shouldSyncToRepo({
  filePath: 'docs/company-wide-policy.md',
  fileMetadata,
  targetRepo: 'any-repo',
  sourceRepo: 'codex.fractary.com'
})  // true
```

## Batch Operations

```typescript
/**
 * Determine all repos that should receive a file
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
      rules
    })
  )
}
```

## Rule Priority

Rules are evaluated in this order:

1. **Auto-sync patterns** (highest priority)
   - If file matches auto-sync pattern, use those rules
2. **Prevent self-sync**
   - If file is system file for targetRepo, prevent sync
3. **Prevent codex sync**
   - If targetRepo is the codex repo, prevent sync
4. **Frontmatter rules** (lowest priority)
   - Use `codex_sync_include` and `codex_sync_exclude`

## Testing Requirements

### Unit Tests

1. **Basic frontmatter routing**
   - Include patterns work
   - Exclude patterns work
   - Combined include/exclude

2. **Special rules**
   - Auto-sync patterns
   - Self-sync prevention
   - Codex sync prevention

3. **Edge cases**
   - No frontmatter
   - Empty include/exclude
   - Conflicting rules

4. **Batch operations**
   - Get target repos for file
   - Filter repos by rules

### Test Cases

```typescript
describe('shouldSyncToRepo', () => {
  test('includes matching repos', () => {
    const result = shouldSyncToRepo({
      filePath: 'docs/api.md',
      fileMetadata: { codex_sync_include: ['api-*'] },
      targetRepo: 'api-gateway',
      sourceRepo: 'codex.fractary.com'
    })
    expect(result).toBe(true)
  })

  test('excludes matching repos', () => {
    const result = shouldSyncToRepo({
      filePath: 'docs/api.md',
      fileMetadata: {
        codex_sync_include: ['api-*'],
        codex_sync_exclude: ['*-test']
      },
      targetRepo: 'api-test',
      sourceRepo: 'codex.fractary.com'
    })
    expect(result).toBe(false)
  })

  test('auto-sync patterns override frontmatter', () => {
    const result = shouldSyncToRepo({
      filePath: '.fractary/docs/schema/api.json',
      fileMetadata: {},  // No frontmatter
      targetRepo: 'api-gateway',
      sourceRepo: 'codex.fractary.com',
      rules: {
        autoSyncPatterns: [
          { pattern: '*/docs/schema/*.json', include: ['*'] }
        ]
      }
    })
    expect(result).toBe(true)
  })

  test('prevents self-sync', () => {
    const result = shouldSyncToRepo({
      filePath: '.fractary/systems/api-gateway/README.md',
      fileMetadata: { codex_sync_include: ['*'] },
      targetRepo: 'api-gateway',
      sourceRepo: 'codex.fractary.com',
      rules: { preventSelfSync: true }
    })
    expect(result).toBe(false)
  })
})
```

## API Surface

### Public Exports

```typescript
// Main routing function
export function shouldSyncToRepo(options: ShouldSyncOptions): boolean

// Batch operations
export function getTargetRepos(options: {
  filePath: string
  fileMetadata: Metadata
  sourceRepo: string
  allRepos: string[]
  rules?: SyncRules
}): string[]

// Rule evaluation helpers
export function evaluateSpecialRules(options: SpecialRulesOptions): boolean | null
export function evaluateFrontmatterRules(options: FrontmatterRulesOptions): boolean

// Types and interfaces
export type { ShouldSyncOptions, SyncRules, AutoSyncPattern }

// Default configuration
export { DEFAULT_SYNC_RULES }
```

## Performance Considerations

- Cache pattern matching results for same file
- Evaluate cheap rules first (exact matches)
- Batch evaluate multiple target repos efficiently
- Avoid redundant metadata parsing

## Success Criteria

- [ ] Matches existing workflow routing behavior exactly
- [ ] All special rules work correctly
- [ ] Frontmatter rules evaluated properly
- [ ] Rule priority is correct
- [ ] Batch operations efficient
- [ ] 90%+ test coverage
- [ ] Zero false positives/negatives

## Examples

### Example 1: Comprehensive Routing

```typescript
import { shouldSyncToRepo, getTargetRepos } from '@fractary/codex'

const metadata = {
  codex_sync_include: ['api-*', 'core-*'],
  codex_sync_exclude: ['*-test', '*-dev']
}

const allRepos = [
  'api-gateway',
  'api-auth',
  'api-test',
  'core-db',
  'web-app'
]

const targets = getTargetRepos({
  filePath: 'docs/api-guide.md',
  fileMetadata: metadata,
  sourceRepo: 'codex.fractary.com',
  allRepos
})

console.log(targets)
// ['api-gateway', 'api-auth', 'core-db']
// Excludes: api-test (excluded), web-app (not included)
```

### Example 2: Custom Rules

```typescript
const rules: SyncRules = {
  autoSyncPatterns: [
    {
      pattern: '*/security/**/*.md',
      include: ['*'],
      exclude: ['*-public']
    }
  ],
  preventSelfSync: true,
  allowProjectOverrides: true
}

shouldSyncToRepo({
  filePath: '.fractary/security/policies/auth.md',
  fileMetadata: {},
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.fractary.com',
  rules
})  // true (auto-sync pattern)
```

## Changelog

- 2025-10-06: Initial draft
