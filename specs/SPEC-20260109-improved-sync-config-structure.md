# SPEC: Improved Sync Config Structure & Frontmatter Deprecation

**Date**: 2026-01-09
**Status**: Approved
**Version**: v0.7.0

## Executive Summary

Deprecate frontmatter-based routing (`codex_sync_include`) in favor of improved config.yaml structure with per-direction include/exclude patterns. This provides:
- Clearer, more maintainable configuration
- Better access control via centralized patterns
- Improved I/O efficiency (no need to read 3000+ files)
- Alignment with CLI flags (`--include`, `--exclude`)

**Key Finding**: Sync already uses ZERO tokens for file operations (pure Node.js). This change improves I/O efficiency and maintainability, not token usage.

## Problem Statement

### Current Issues

1. **Mixed config format**: Arrays for includes, separate field for excludes
   ```yaml
   sync:
     default_from_codex:
       - "projects/etl.corthion.ai/docs/schema/**"
     exclude:  # Global? Per-direction? Unclear
       - "**/*-private.md"
   ```

2. **Frontmatter overhead**: Must read 3,178 files to check `codex_sync_include`
3. **Inconsistency**: Config patterns vs frontmatter routing - which takes precedence?
4. **Limited to markdown**: Frontmatter only works for markdown files

### User Requirements

- Token efficiency (already achieved - no tokens used for file operations)
- Access control: "files that we don't want to allow to sync to every project"
- Clarity: "include and exclude element under TO codex and FROM codex"
- Alignment with CLI arguments

## Proposed Solution

### New Config Structure (v0.7.0)

```yaml
sync:
  routing:
    use_frontmatter: false  # Default: false for new configs

  from_codex:
    include:
      - "projects/etl.corthion.ai/docs/schema/**/*.json"
      - "projects/core.corthodex.ai/docs/standards/**/*.md"
    exclude:
      - "projects/etl.corthion.ai/docs/internal/**"
      - "**/*-private.md"

  to_codex:
    include:
      - "docs/**/*.md"
      - "specs/**/*.md"
      - "CLAUDE.md"
    exclude:
      - "docs/drafts/**"
      - "**/*.draft.md"
```

### Benefits

1. **Symmetric structure**: Both directions have same format
2. **Clear semantics**: include = what to sync, exclude = what to skip
3. **Per-direction control**: Different rules for from-codex vs to-codex
4. **Aligns with CLI**: Matches `--include` and `--exclude` flags
5. **Better access control**: Centralized, auditable patterns

### Backward Compatibility

Legacy format still works:
```yaml
sync:
  default_from_codex:
    - "projects/etl.corthion.ai/docs/schema/**"
  default_to_codex:
    - "docs/**/*.md"
```

Migration logic checks new format first, falls back to legacy.

## Technical Design

### Type Definitions

```typescript
// sdk/js/src/sync/types.ts

export interface DirectionalSyncConfig {
  include: string[]     // Required: patterns to include
  exclude?: string[]    // Optional: patterns to exclude
}

export interface SyncConfig {
  // New format (v0.7.0+)
  from_codex?: DirectionalSyncConfig
  to_codex?: DirectionalSyncConfig

  // Legacy format (deprecated, still supported)
  default_from_codex?: string[]
  default_to_codex?: string[]

  // Global settings
  routing?: {
    use_frontmatter?: boolean  // Default: false in v0.7.0+
  }
}
```

### Pattern Resolution

```typescript
// sdk/js/src/sync/manager.ts

function resolveFromCodexPatterns(config: SyncConfig): string[] {
  // New format takes precedence
  if (config.from_codex?.include) {
    return config.from_codex.include
  }

  // Fall back to legacy format
  return config.default_from_codex || []
}

function resolveFromCodexExcludes(config: SyncConfig): string[] {
  return config.from_codex?.exclude || []
}

function resolveToCodexPatterns(config: SyncConfig): string[] {
  if (config.to_codex?.include) {
    return config.to_codex.include
  }

  return config.default_to_codex || []
}

function resolveToCodexExcludes(config: SyncConfig): string[] {
  return config.to_codex?.exclude || []
}
```

### Conditional Frontmatter Parsing

```typescript
// sdk/js/src/sync/routing-scanner.ts

// Only parse frontmatter if enabled
let shouldSync = false

if (options.routing?.use_frontmatter !== false) {
  // Existing frontmatter routing logic
  const parseResult = parseMetadata(content, { strict: false })

  // Deprecation warning
  if (parseResult.metadata.codex_sync_include) {
    console.warn(
      `[DEPRECATION] File ${filePath} uses codex_sync_include frontmatter. ` +
      `This feature will be removed in v1.0. Use config.yaml patterns instead.`
    )
  }

  shouldSync = shouldSyncToRepo({
    filePath,
    fileMetadata: parseResult.metadata,
    targetRepo: targetProject,
    sourceRepo: sourceProject,
    rules,
  })
} else {
  // Skip frontmatter - use config patterns only (faster)
  shouldSync = matchFromCodexPattern(
    filePath,
    expandedFromCodexPatterns,
    targetProject
  )
}
```

## Implementation Plan

### Phase 1: Core Implementation (v0.7.0)

**Files to modify:**

| File | Changes | Estimated Lines |
|------|---------|----------------|
| `sdk/js/src/sync/types.ts` | Add `DirectionalSyncConfig`, update `SyncConfig` | +20 |
| `sdk/js/src/sync/manager.ts` | Add pattern resolution helpers | +40 |
| `sdk/js/src/sync/routing-scanner.ts` | Conditional frontmatter, deprecation warnings | ~30 |
| `cli/src/commands/sync.ts` | Use new config format | ~15 |

**Tests to add:**

| File | Tests | Lines |
|------|-------|-------|
| `sdk/js/tests/unit/sync/types.test.ts` | Config structure validation | +25 |
| `sdk/js/tests/unit/sync/manager.test.ts` | Pattern resolution logic | +30 |
| `sdk/js/tests/unit/sync/routing-scanner.test.ts` | Conditional frontmatter parsing | +20 |

### Phase 2: Documentation & Migration Guide (v0.7.0)

1. Update README.md with new config examples
2. Create migration guide: legacy → new format
3. Document access control patterns
4. Add config validation with helpful error messages

### Phase 3: Breaking Changes (v1.0.0)

1. Remove `default_from_codex` and `default_to_codex` support
2. Remove frontmatter routing entirely
3. Make `use_frontmatter` flag obsolete (always false)
4. Simplify codebase

## Testing Strategy

### Unit Tests

1. **Config parsing**:
   - New format parses correctly
   - Legacy format still works
   - New format takes precedence over legacy

2. **Pattern resolution**:
   - Include patterns resolved correctly
   - Exclude patterns applied properly
   - Empty configs handled gracefully

3. **Frontmatter flag**:
   - `use_frontmatter: false` skips parsing
   - `use_frontmatter: true` enables parsing (legacy)
   - Deprecation warnings shown when frontmatter detected

### Integration Tests

1. **End-to-end sync**:
   - Sync with new config format works
   - Sync with legacy config format works
   - Include/exclude patterns filter correctly

2. **Performance**:
   - Measure sync time with `use_frontmatter: false`
   - Compare to current implementation
   - Expect 10-20% improvement

### Acceptance Criteria

- ✅ New config structure implemented
- ✅ Backward compatible with legacy format
- ✅ All existing tests pass
- ✅ New tests cover config resolution
- ✅ Deprecation warnings shown appropriately
- ✅ Documentation updated
- ✅ Migration guide created

## Migration Path

### For Users (v0.7.0)

**Step 1**: Update config to new format

```yaml
# Before (legacy)
sync:
  default_from_codex:
    - "projects/etl.corthion.ai/docs/schema/**"

# After (v0.7.0+)
sync:
  routing:
    use_frontmatter: false
  from_codex:
    include:
      - "projects/etl.corthion.ai/docs/schema/**"
    exclude:
      - "**/*-private.md"
```

**Step 2**: Remove frontmatter from files

If files have `codex_sync_include` in frontmatter, migrate to config patterns:

```yaml
# File: projects/core.corthodex.ai/docs/standards/coding.md
# Remove this frontmatter:
---
codex_sync_include: ['*']
---

# Add to config instead:
sync:
  from_codex:
    include:
      - "projects/core.corthodex.ai/docs/standards/**"
```

### For Developers (v1.0.0)

1. Remove frontmatter parsing code
2. Remove legacy config support
3. Simplify type definitions
4. Update tests

## Performance Impact

### Current State

- Scans 3,178 files
- Reads each file to check frontmatter
- Parses YAML for routing decisions
- Time: ~1.6 seconds

### With New Config

- Pre-filter by path patterns (no file reading needed)
- Only read files that match include patterns
- Skip frontmatter parsing entirely
- Expected time: ~1.3 seconds (10-20% faster)

### Token Usage

**Before**: 0 tokens (already optimized)
**After**: 0 tokens (no change - file operations use Node.js, not LLMs)

## Security & Access Control

### Use Cases

1. **Public schemas**: Sync to all projects
   ```yaml
   from_codex:
     include:
       - "projects/etl.corthion.ai/docs/public/**"
   ```

2. **Restricted data**: Exclude sensitive paths
   ```yaml
   from_codex:
     include:
       - "projects/etl.corthion.ai/docs/**"
     exclude:
       - "projects/etl.corthion.ai/docs/internal/**"
       - "**/*-private.md"
   ```

3. **Project-specific**: Only certain projects pull certain files
   ```yaml
   # In sensitive-project config
   from_codex:
     include:
       - "projects/core.corthodex.ai/docs/standards/**"
     # Deliberately omit etl.corthion.ai/docs/internal/
   ```

This provides same access control as frontmatter but with better visibility.

## Risks & Mitigation

### Risk 1: Breaking Changes

**Mitigation**: Backward compatibility in v0.7.0, breaking changes only in v1.0.0

### Risk 2: Migration Effort

**Mitigation**:
- Automated migration script (future)
- Clear migration guide
- Deprecation warnings guide users

### Risk 3: User Confusion

**Mitigation**:
- Clear documentation
- Examples for common use cases
- Validation with helpful error messages

## Alternatives Considered

### Alternative 1: Keep Frontmatter, Add Config Flag

**Pros**: Minimal changes
**Cons**: Maintains complexity, doesn't address root issue

**Decision**: Rejected - deprecation is cleaner long-term

### Alternative 2: Frontmatter + Config Hybrid

**Pros**: Maximum flexibility
**Cons**: Unclear precedence, hard to debug

**Decision**: Rejected - too complex

### Alternative 3: Frontmatter Only

**Pros**: Per-file control
**Cons**: Inefficient, markdown-only, distributed config

**Decision**: Rejected - user agrees it's impractical

## References

- Original issue: Token efficiency concerns
- User feedback: "I agree with deprecating the front matter solution"
- CLI alignment: `--include` and `--exclude` flags
- Architecture: Plugin → Bash → CLI → SDK (tokens only in plugin)

## Changelog

### v0.7.0 (Proposed)
- Add `DirectionalSyncConfig` with include/exclude
- Add `routing.use_frontmatter` flag (default: false)
- Add deprecation warnings for frontmatter
- Maintain backward compatibility

### v1.0.0 (Future)
- Remove frontmatter routing
- Remove legacy config format
- Breaking changes

## Approval

**Author**: Claude Sonnet 4.5
**Reviewed by**: User (approved)
**Date**: 2026-01-09
**Status**: Approved for implementation
