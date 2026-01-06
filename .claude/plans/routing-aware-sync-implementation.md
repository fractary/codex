# Implementation Plan: Routing-Aware Sync

**Spec**: SPEC-20260105-routing-aware-sync.md
**Priority**: Critical
**Estimated Effort**: 2-3 days
**Status**: Ready to implement

## Overview

Fix the sync `--from-codex` operation to scan the **entire codex repository** and evaluate routing rules (codex_sync_include patterns) instead of only scanning the current project's subdirectory.

**Impact**: Changes sync from finding ~5 files to finding hundreds of files that route to the target project.

## Affected Files

### New Files to Create

1. **sdk/js/src/sync/routing-scanner.ts** (NEW)
   - Core routing-aware file scanner
   - ~250 lines
   - Exports: `scanCodexWithRouting()`, `RoutedFileInfo` interface

2. **sdk/js/src/sync/routing-scanner.test.ts** (NEW)
   - Unit tests for routing scanner
   - ~200 lines
   - Tests: pattern matching, cross-project discovery, edge cases

3. **cli/tests/integration/sync-routing.test.ts** (NEW)
   - Integration tests for full sync flow
   - ~150 lines
   - Tests: end-to-end routing behavior

### Files to Modify

4. **sdk/js/src/sync/manager.ts** (MODIFY)
   - Add: `createRoutingAwarePlan()` method
   - ~50 lines added
   - Keep existing `createPlan()` for backward compatibility

5. **sdk/js/src/sync/index.ts** (MODIFY)
   - Export new routing scanner functions
   - ~3 lines

6. **cli/src/commands/sync.ts** (MODIFY)
   - Switch `--from-codex` to use routing-aware sync
   - ~30 lines modified
   - Add routing stats to output

7. **plugins/codex/agents/sync-manager.md** (MODIFY)
   - Document routing-aware behavior
   - Add examples of cross-project sync
   - ~50 lines added

8. **plugins/codex/skills/project-syncer/SKILL.md** (MODIFY)
   - Update skill documentation
   - Note routing-aware behavior
   - ~20 lines

### Files to Review (No Changes)

9. **sdk/js/src/core/routing/evaluator.ts**
   - Already has `shouldSyncToRepo()` - will be used as-is
   - No changes needed

10. **sdk/js/src/metadata/parser.ts**
    - Already has `parseMetadata()` - will be used as-is
    - No changes needed

## Implementation Phases

### Phase 1: Create Routing Scanner (Core Logic)

**Goal**: Implement the core routing-aware file discovery logic

**File**: `sdk/js/src/sync/routing-scanner.ts`

**Tasks**:
- [ ] Define `RoutedFileInfo` interface
- [ ] Define `RoutingScanOptions` interface
- [ ] Implement `scanCodexWithRouting()` function:
  - [ ] List all files recursively in codex
  - [ ] Parse frontmatter for each file
  - [ ] Evaluate routing with `shouldSyncToRepo()`
  - [ ] Return filtered list with metadata
- [ ] Implement `extractProjectFromPath()` helper
- [ ] Implement `listAllFilesRecursive()` helper
- [ ] Add error handling for unparseable files

**Validation**:
```bash
# Manual test
npm run build
node -e "
  const { scanCodexWithRouting } = require('./dist/sync/routing-scanner.js');
  // Test with sample data
"
```

### Phase 2: Add Unit Tests

**Goal**: Ensure routing scanner works correctly in isolation

**File**: `sdk/js/src/sync/routing-scanner.test.ts`

**Test Cases**:
- [ ] Finds files from multiple projects with `codex_sync_include: ['*']`
- [ ] Matches specific patterns like `codex_sync_include: ['lake-*']`
- [ ] Respects exclude patterns `codex_sync_exclude: ['*-test']`
- [ ] Handles files without frontmatter (should not sync)
- [ ] Handles malformed YAML (should skip gracefully)
- [ ] Extracts correct project name from paths
- [ ] Returns correct file metadata (size, mtime, hash)

**Validation**:
```bash
npm test -- routing-scanner.test.ts
```

### Phase 3: Integrate with Sync Manager

**Goal**: Add routing-aware sync method to SyncManager class

**File**: `sdk/js/src/sync/manager.ts`

**Tasks**:
- [ ] Import routing scanner functions
- [ ] Add `createRoutingAwarePlan()` method:
  - [ ] Call `scanCodexWithRouting()` to get files
  - [ ] Convert `RoutedFileInfo[]` to `FileInfo[]`
  - [ ] Call existing `createSyncPlan()` with routing results
  - [ ] Add routing metadata to plan
- [ ] Keep existing `createPlan()` unchanged (backward compatibility)

**Validation**:
```typescript
// Test in Node REPL
const manager = new SyncManager(config)
const plan = await manager.createRoutingAwarePlan('org', 'project', '/path/to/codex')
console.log(plan.files.length) // Should be > 5
console.log(plan.metadata.scannedProjects) // Should list multiple projects
```

### Phase 4: Update CLI Command

**Goal**: Use routing-aware sync for `--from-codex` direction

**File**: `cli/src/commands/sync.ts`

**Tasks**:
- [ ] Check if direction is `from-codex`
- [ ] If yes, call `manager.createRoutingAwarePlan()` instead of `manager.createPlan()`
- [ ] Add routing statistics to output:
  - [ ] Number of projects scanned
  - [ ] Number of files matched
  - [ ] Breakdown by source project
- [ ] Keep existing behavior for other directions

**Validation**:
```bash
fractary codex sync --from-codex --dry-run
# Should show:
# - Multiple projects scanned
# - Hundreds of files found (not just 5)
# - Breakdown by source project
```

### Phase 5: Add Integration Tests

**Goal**: Test complete sync flow end-to-end

**File**: `cli/tests/integration/sync-routing.test.ts`

**Test Scenarios**:
- [ ] Setup mock codex with multiple projects
- [ ] Each project has files with different routing rules
- [ ] Run `sync --from-codex --dry-run`
- [ ] Verify correct files are discovered
- [ ] Verify routing stats are correct
- [ ] Test with actual file operations (not just dry-run)

**Validation**:
```bash
npm run test:integration
```

### Phase 6: Update Documentation

**Goal**: Document the new routing-aware behavior

**Files**:
- `plugins/codex/agents/sync-manager.md`
- `plugins/codex/skills/project-syncer/SKILL.md`
- `README.md` (update examples)

**Tasks**:
- [ ] Add "Routing-Aware Sync" section to sync-manager docs
- [ ] Explain how frontmatter routing works
- [ ] Show examples of cross-project sync
- [ ] Document performance characteristics
- [ ] Add migration guide for existing users
- [ ] Update CLI command examples

**Validation**:
- [ ] Review docs for accuracy
- [ ] Test examples in docs work correctly

## Testing Checklist

### Unit Tests
- [ ] Routing scanner finds files from multiple projects
- [ ] Pattern matching works correctly (wildcards, specific patterns)
- [ ] Exclude patterns are respected
- [ ] Files without frontmatter are skipped
- [ ] Malformed YAML is handled gracefully
- [ ] Project name extraction works for various path formats

### Integration Tests
- [ ] End-to-end sync with routing works
- [ ] Dry-run shows correct files
- [ ] Actual sync copies files correctly
- [ ] Stats/output shows routing information
- [ ] Backward compatibility maintained for non-routing sync

### Manual Tests
- [ ] Run sync in real project with actual codex repo
- [ ] Verify hundreds of files are discovered (not just 5)
- [ ] Check files are from multiple source projects
- [ ] Verify routing patterns match as expected
- [ ] Performance is acceptable (< 10 seconds for 1000 files)

## Rollout Plan

### Step 1: Development
- Implement Phases 1-3 (core functionality)
- Write unit tests
- Manual testing with sample data

### Step 2: Integration
- Implement Phases 4-5 (CLI integration + tests)
- Test with real codex repository
- Performance profiling

### Step 3: Documentation
- Implement Phase 6 (docs)
- Write migration guide
- Update examples

### Step 4: Release
- Create PR with all changes
- Request review
- Merge to main
- Release new version (v4.1.0)

## Backward Compatibility

✅ **No Breaking Changes**:
- Existing `createPlan()` method unchanged
- `--to-codex` direction uses old behavior
- Only `--from-codex` gets new routing-aware behavior
- Files without `codex_sync_include` are skipped (safe default)

## Performance Targets

- [ ] Scan 1000 files in < 10 seconds
- [ ] Scan 100 projects in < 15 seconds
- [ ] Memory usage < 500MB for large codex
- [ ] Cache metadata to avoid redundant parsing

## Success Criteria

**Functional**:
- [ ] Sync discovers files from all projects in codex
- [ ] Routing patterns match correctly
- [ ] Cross-project knowledge sharing works
- [ ] Backward compatibility maintained

**Quality**:
- [ ] >80% test coverage for new code
- [ ] All integration tests pass
- [ ] No performance regression
- [ ] Documentation complete and accurate

**User Impact**:
- [ ] Users see hundreds of files instead of 5
- [ ] Files from standards/templates automatically sync
- [ ] No manual intervention needed
- [ ] Clear output shows what's being synced from where

## Risk Mitigation

**Risk 1**: Performance degradation with large codex
- **Mitigation**: Implement caching, parallel processing, early exit optimizations
- **Fallback**: Add `--no-routing` flag to use old behavior

**Risk 2**: Breaking existing workflows
- **Mitigation**: Keep old behavior as default for `--to-codex`, only change `--from-codex`
- **Fallback**: Feature flag to disable routing

**Risk 3**: Incorrect routing matches
- **Mitigation**: Extensive testing, dry-run by default
- **Fallback**: Users can use exclude patterns to filter

## Open Issues to Track

1. [ ] How to handle very large codex repos (>10k files)?
   - Consider pagination or streaming
   - Add progress indicators

2. [ ] Should we cache routing results between syncs?
   - Yes - implement file mtime-based cache
   - Invalidate on file change

3. [ ] Add telemetry to track routing effectiveness?
   - Metrics: files scanned, files matched, projects involved
   - Help optimize patterns

## Next Steps

1. **Review spec with team** - Ensure alignment on approach
2. **Start Phase 1** - Create routing scanner
3. **Write tests** - TDD approach for core logic
4. **Integrate** - Wire up to sync manager
5. **Test** - Run against real codex repository
6. **Document** - Update all relevant docs
7. **Release** - Ship as v4.1.0

---

**Ready to implement**: This plan is concrete and actionable. Start with Phase 1 and work sequentially through the phases.
