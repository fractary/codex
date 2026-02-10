---
id: SPEC-MLDSOD0K-UUS4
title: "Codex Sync to-codex Missing Remote Push"
work_type: bugfix
template: bugfix
created_at: 2026-02-08T13:44:25.316Z
updated_at: 2026-02-08T13:44:25.316Z
validation_status: not_validated
source: conversation
severity: critical
affects: "@fractary/codex v0.12.11, @fractary/cli"
---

# Codex Sync to-codex Missing Remote Push

## Metadata

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Severity** | Critical |
| **Created** | 2026-02-08 |
| **Author** | Claude Code |
| **Affects** | `@fractary/codex` v0.12.11, `@fractary/cli` |
| **Target Packages** | `@fractary/codex` (primary), `@fractary/cli` (secondary) |

## Summary

The `fractary codex sync project --to-codex` command in `@fractary/codex` v0.12.11 silently fails to push synced files to the remote codex repository. The `SyncManager.executePlan()` method only performs local filesystem copies to `.fractary/codex/cache/` with no git operations whatsoever. The CLI then reports success based on local copy status, misleading users into believing their documentation has been synced to the remote. A secondary issue is that `--dry-run` returns inflated counts without performing actual change detection.

## Problem Statement

### Observed Behavior

Running `fractary codex sync project --to-codex` reports syncing 368 files successfully, but no files are ever pushed to the remote codex repository. The command completes with a success message that is entirely misleading:

```
$ fractary codex sync project --to-codex
Syncing project to codex...
  Synced: 368 files
  Failed: 0 files
```

No commits appear in the remote codex repository. The files are only copied locally to `.fractary/codex/cache/`.

### Expected Behavior

The command should:
1. Copy files to the local cache (current behavior)
2. Clone the codex repo on demand using the remote URL from config
3. Copy cached files into `projects/{project}/` in the cloned repo
4. Execute `git add` + `git commit -m "Sync N files from {project}"` + `git push`
5. Report success only after the remote push completes

## Root Cause Analysis

### Code Trace

**1. CLI entry** (`@fractary/cli` -- `src/tools/codex/commands/sync/project.ts:184`):

```js
const result = await syncManager.executePlan(plan, syncOptions);
```

**2. executePlan** (`@fractary/codex` -- `src/sync/sync-manager.ts`, lines 5299-5365):

Only performs local `fs.copyFile()` with no git operations:

```js
for (const file of plan.files) {
    const sourcePath = `${plan.source}/${file.path}`;
    const targetPath = `${plan.target}/${file.path}`;
    await fs.copyFile(sourcePath, targetPath);
    synced++;
}
return { success: true, synced: 368, failed: 0 };
```

**3. CLI reports success** (`project.ts:289`):

```
Sync completed successfully
  Synced: 368 files
```

### What Is Missing

After the local caching step, the following operations should occur but are entirely absent from the implementation:

1. **Clone**: Shallow clone of the codex repo to a temp directory using the remote URL from config
2. **Copy**: Transfer cached files into `projects/{project}/` within the cloned repo
3. **Commit**: `git add .` + `git commit -m "Sync N files from {project}"`
4. **Push**: `git push` to the remote
5. **Cleanup**: Remove temp directory

None of these steps exist in the current `SyncManager.executePlan()` implementation.

### Secondary Issue: Dry Run Inflation

The `--dry-run` flag returns inflated counts because it does not perform actual change detection. It counts all source files as "to be synced" without comparing against the cached state (via hash or mtime), making it impossible to determine how many files have actually changed.

## Affected Source Files

| File | Package | Source Path | Role |
|------|---------|-------------|------|
| `SyncManager.executePlan` | `@fractary/codex` | `src/sync/sync-manager.ts` | Core sync logic -- missing remote push |
| `sync project` command | `@fractary/cli` | `src/tools/codex/commands/sync/project.ts` | CLI command -- reports false success |

## Proposed Solution

### Phase 1: Core Remote Push (Primary Fix)

- Add a `CodexRepoPusher` class or `pushToRemote()` method to the `@fractary/codex` sync module
- Implement shallow clone of the codex repo to a temp directory using the remote URL from config
- Copy files from the local cache to `projects/{project}/` in the cloned repo
- Implement the git add + commit + push sequence
- Wire into `project.ts` sync command after `executePlan()` completes
- Only report success after the push completes; report failure if push fails

### Phase 2: Dry Run Fix (Secondary Fix)

- Implement actual change detection in `--dry-run` mode
- Compare source files against cached state using content hashing or mtime comparison
- Report accurate added/modified/deleted counts
- Ensure zero side effects in dry-run mode (no filesystem writes, no git operations)

### Phase 3: Error Handling

- Handle missing GitHub credentials gracefully (clear error message, not a stack trace)
- Handle clone failures (network errors, auth failures, repo not found)
- Handle push failures (conflicts, permission denied)
- Handle empty diffs (no changes to push -- skip commit and report "no changes")
- Clean up temp directories on both success and failure paths
- Add structured logging for each git operation stage (clone, copy, add, commit, push)

## Resolution Preference

**Clone-on-demand**: Clone the codex repo to a temp directory using the remote URL from config. Do not require a local path or rely on auto-discovery. This is the simplest and most portable approach.

## Acceptance Criteria

- [ ] **AC-001**: `fractary codex sync project --to-codex` creates commits in the remote codex repository
- [ ] **AC-002**: Deleted files in codex are restored when sync is re-run from source
- [ ] **AC-003**: `git log` on the codex repo shows new sync commits after running the command
- [ ] **AC-004**: `--dry-run` reports accurate change counts (added/modified/deleted) without side effects
- [ ] **AC-005**: Existing `--from-codex` direction continues working unchanged (regression guard)
- [ ] **AC-006**: Graceful error handling for missing credentials, clone failures, and push failures
- [ ] **AC-007**: Temp directories are cleaned up on both success and failure paths

## Impact Analysis

- **Scope**: All projects using `fractary codex sync project --to-codex` are affected
- **Severity**: Critical -- the feature is entirely non-functional despite reporting success
- **Risk of Fix**: Low for Phase 1 (additive code). Moderate for Phase 2 (changes dry-run output format).
- **Backwards Compatibility**: No breaking changes expected. The fix adds missing functionality without altering existing interfaces.
- **Regression Risk**: Phase 1 should not affect `--from-codex` direction. AC-005 guards against regression.

## Testing Plan

1. Run `fractary codex sync project --to-codex` on a project with known file count
2. Verify commits appear in the remote codex repository via `git log`
3. Delete a file from the codex repo manually, re-run sync, verify the file is restored
4. Run with `--dry-run` and verify counts match actual changes (not total file count)
5. Run `--from-codex` and verify existing behavior is unchanged
6. Test error cases: invalid credentials, unreachable remote, empty diff
7. Verify temp directory cleanup after both successful and failed runs
