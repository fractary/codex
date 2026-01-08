# SPEC-20260108: Fix Plural Field Normalization in Routing-Aware Sync

**Status**: Approved
**Created**: 2026-01-08
**Author**: Investigation + Plan
**Priority**: Critical
**Related Specs**: SPEC-20260105 (Routing-Aware Sync), SPEC-00004 (Routing & Distribution)

## Problem Statement

The routing-aware sync feature (implemented in v4.1.0) only discovers 5 files instead of hundreds due to a field name mismatch. **455 files** in the codex repository use `codex_sync_includes` (plural) but the metadata parser expects `codex_sync_include` (singular).

### Impact

- 455+ files with routing rules are silently ignored during sync
- Cross-project knowledge sharing is broken
- Users expect hundreds of files but only get 5

### Example

File: `projects/etl.corthion.ai/docs/schema/ipeds/ic_py/README.md`
```yaml
---
codex_sync_includes: [lake.corthonomy.ai]  ← Plural form not recognized
---
```

Expected: File should sync to `lake.corthonomy.ai` project
Actual: File ignored (no routing rule detected)

## Root Cause

**Location**: `sdk/js/src/core/metadata/parser.ts:95-109`

The `normalizeLegacyMetadata()` function handles:
- ✅ Nested format: `codex.includes` → `codex_sync_include`
- ❌ Flat plural: `codex_sync_includes` → not normalized

**Evidence from codex repository**:
- 455 files use `codex_sync_includes` (plural) ← BROKEN
- 93 files use `codex_sync_include` (singular) ← WORKS
- 0 files use nested `codex.includes` format

## Additional Issues

While investigating, two additional issues were discovered:

1. **Markdown-only filter** (`routing-scanner.ts:139`)
   - Only `.md` files scanned
   - Skips `.json`, `.yaml`, `.py` files even with frontmatter

2. **Missing frontmatter requirement** (`routing-scanner.ts:119`)
   - `skipNoFrontmatter = true` by default
   - Files without frontmatter never evaluated

## Solution

### Fix 1: Add Plural Field Normalization (CRITICAL)

**File**: `sdk/js/src/core/metadata/parser.ts`
**Function**: `normalizeLegacyMetadata` (lines 95-109)

**Change**: Add 8 lines to normalize plural forms:

```typescript
function normalizeLegacyMetadata(parsed: any): any {
  const normalized: any = { ...parsed }

  // Existing normalization
  if (parsed.codex?.includes && !parsed.codex_sync_include) {
    normalized.codex_sync_include = parsed.codex.includes
  }
  if (parsed.codex?.excludes && !parsed.codex_sync_exclude) {
    normalized.codex_sync_exclude = parsed.codex.excludes
  }

  // NEW: Handle flat plural forms
  if (parsed.codex_sync_includes && !normalized.codex_sync_include) {
    normalized.codex_sync_include = parsed.codex_sync_includes
  }
  if (parsed.codex_sync_excludes && !normalized.codex_sync_exclude) {
    normalized.codex_sync_exclude = parsed.codex_sync_excludes
  }

  return normalized
}
```

**Precedence**: Singular form takes precedence if both exist

**Result**: 455 files with plural field names will be discovered

### Fix 2: Remove Markdown-Only Filter

**File**: `sdk/js/src/sync/routing-scanner.ts`
**Lines**: 136-143

**Change**: Delete 4 lines:

```typescript
// DELETE:
// Skip non-markdown files for now (optimization)
if (!filePath.endsWith('.md')) {
  totalSkipped++
  continue
}
```

**Result**: All file types with frontmatter evaluated

### Fix 3: Change skipNoFrontmatter Default

**File**: `sdk/js/src/sync/routing-scanner.ts`
**Line**: 119

**Change**: Change default from `true` to `false`:

```typescript
// BEFORE:
const { skipNoFrontmatter = true, ... } = options

// AFTER:
const { skipNoFrontmatter = false, ... } = options
```

**Result**: Files without frontmatter evaluated (supports path-based routing)

## Testing Strategy

### Unit Tests

**File**: `sdk/js/tests/unit/metadata/parser.test.ts`

```typescript
describe('normalizeLegacyMetadata - plural fields', () => {
  test('normalizes codex_sync_includes to codex_sync_include', () => {
    const content = `---
codex_sync_includes: [lake.corthonomy.ai]
---
# Content`
    const result = parseMetadata(content)
    expect(result.metadata.codex_sync_include).toEqual(['lake.corthonomy.ai'])
  })

  test('singular takes precedence over plural', () => {
    const content = `---
codex_sync_include: [singular]
codex_sync_includes: [plural]
---`
    const result = parseMetadata(content)
    expect(result.metadata.codex_sync_include).toEqual(['singular'])
  })
})
```

**File**: `sdk/js/tests/unit/sync/routing-scanner.test.ts`

```typescript
test('scans non-markdown files with frontmatter', async () => {
  const mockStorage = createMockStorage({
    'org/project/schema.json': '---\ncodex_sync_include: ["*"]\n---\n{}',
    'org/project/config.yaml': '---\ncodex_sync_include: ["*"]\n---\nkey: value',
  })

  const result = await scanCodexWithRouting({
    codexDir: '/codex',
    targetProject: 'target',
    org: 'org',
    storage: mockStorage
  })

  expect(result.files).toHaveLength(2)
})
```

### Integration Test

Run in real project: `/mnt/c/GitHub/corthos/lake.corthonomy.ai`

```bash
# Dry-run
/fractary-codex:sync --from-codex --env prod --dry-run

# Expected: Find hundreds of files, not just 5

# Actual sync
/fractary-codex:sync --from-codex --env prod

# Verify file exists
ls .fractary/codex/cache/corthosai/codex.corthos.ai/projects/etl.corthion.ai/docs/schema/ipeds/ic_py/README.md
```

## Backwards Compatibility

All changes are backwards compatible:

- **Field normalization**: Additive (singular still works)
- **File type filter**: Additive (more files discovered)
- **Default change**: Can be overridden via config

No breaking API changes.

## Risk Assessment

- **Low Risk**: Field normalization (additive only)
- **Medium Risk**: File type filter removal (~10-15% performance overhead)
- **Low Risk**: Default change (overridable)

## Success Criteria

- [ ] 455+ files with `codex_sync_includes` discovered
- [ ] Non-markdown files with frontmatter included
- [ ] All existing tests pass
- [ ] New unit tests pass
- [ ] Integration test validates end-to-end
- [ ] Performance overhead <20%

## Version Bump

**Recommended**: `4.2.0` (minor version)

**Rationale**:
- New functionality (plural field support, non-markdown files)
- Behavior changes (frontmatter default, file type scanning)
- No breaking changes

## References

- Root Cause File: `sdk/js/src/core/metadata/parser.ts:95-109`
- Routing Scanner: `sdk/js/src/sync/routing-scanner.ts`
- Schema Definition: `sdk/js/src/schemas/metadata.ts:15`
- Routing Evaluator: `sdk/js/src/core/routing/evaluator.ts:181`
- Related Spec: SPEC-20260105 (Routing-Aware Sync Implementation)
- Related Spec: SPEC-00004 (Routing & Distribution)

## Implementation Status

- [x] Investigation complete
- [x] Plan approved
- [x] Fix 1: Parser normalization (parser.ts:110-118)
- [x] Fix 2: Markdown filter removal (routing-scanner.ts:138-139)
- [x] Fix 3: Default change (routing-scanner.ts:119)
- [x] Unit tests added (parser.test.ts: 5 new tests, routing-scanner.test.ts: 4 new/updated tests)
- [x] All tests pass (486 tests passing)
- [ ] Integration test with real codex
- [ ] Deployed
