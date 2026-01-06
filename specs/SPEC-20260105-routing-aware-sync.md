# SPEC-20260105: Routing-Aware Sync Implementation

**Status**: Draft
**Created**: 2026-01-05
**Author**: Fractary Engineering
**Priority**: Critical
**Related Specs**: SPEC-00004 (Routing & Distribution), SPEC-00024 (Codex SDK)

## Problem Statement

The current sync implementation (`--from-codex`) only scans files in the **project-specific directory** within the codex repository (e.g., `corthosai/lake.corthonomy.ai/`), ignoring the hundreds of files from other projects that have `codex_sync_include` routing rules targeting this project.

### Current Broken Behavior

```
User runs: /fractary-codex:sync --from-codex

Expected: Sync all files from codex where codex_sync_include matches this project
Actual:   Only sync files from systems/this-project/ directory

Result: Only 5 files synced instead of hundreds
```

### Root Cause

The sync manager (sdk/js/src/sync/manager.ts:134) calls:
```typescript
const sourceFiles = await this.listLocalFiles(sourceDir)
```

Where `sourceDir` points to **only this project's directory** in the codex, not the entire codex repository.

**The routing logic exists but is never invoked during sync operations.**

## Architecture Overview

### Existing Components (Unused)

✅ **shouldSyncToRepo()** - sdk/js/src/core/routing/evaluator.ts:22
- Evaluates file frontmatter metadata
- Checks codex_sync_include patterns
- Returns true if file should sync to target project

✅ **SPEC-00004** - Routing & Distribution specification
- Defines frontmatter-based routing
- Explains cross-project sync patterns

❌ **Sync Manager** - sdk/js/src/sync/manager.ts
- Never calls shouldSyncToRepo()
- Only scans project-specific directory
- Uses path-based pattern matching instead of metadata routing

### Expected Architecture

```
┌─────────────────────────────────────────────┐
│        Codex Repository                     │
│  (All files across all projects)            │
└─────────────────┬───────────────────────────┘
                  │
                  ├─ Scan entire repository
                  │
                  ▼
┌─────────────────────────────────────────────┐
│     Routing Evaluator                       │
│  (shouldSyncToRepo for each file)           │
└─────────────────┬───────────────────────────┘
                  │
                  ├─ Parse frontmatter
                  ├─ Check codex_sync_include patterns
                  ├─ Match against target project
                  │
                  ▼
┌─────────────────────────────────────────────┐
│     Filtered Files                          │
│  (Only files routing to this project)       │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│     Sync Plan & Execution                   │
│  (Existing sync logic)                      │
└─────────────────────────────────────────────┘
```

## Concrete Example

### Codex Repository Structure
```
codex.corthos.ai/
├── corthosai/
│   ├── lake.corthonomy.ai/          # Current project
│   │   ├── .gitignore
│   │   ├── CLAUDE.md
│   │   ├── README.md
│   │   ├── IMPLEMENTATION_PLAN.md
│   │   └── requirements.txt
│   │
│   ├── etl.corthion.ai/
│   │   ├── docs/
│   │   │   ├── api-spec.md          # codex_sync_include: ['lake.*', 'api.*']
│   │   │   ├── data-pipeline.md     # codex_sync_include: ['lake.*', 'etl.*']
│   │   │   └── schema-v2.md         # codex_sync_include: ['*']
│   │   └── standards/
│   │       └── sql-style.md         # codex_sync_include: ['lake.*', 'etl.*', 'core.*']
│   │
│   ├── core.corthodex.ai/
│   │   ├── standards/
│   │   │   ├── coding-standards.md  # codex_sync_include: ['*']
│   │   │   ├── git-workflow.md      # codex_sync_include: ['*']
│   │   │   └── security.md          # codex_sync_include: ['*']
│   │   └── templates/
│   │       ├── pr-template.md       # codex_sync_include: ['*']
│   │       └── issue-template.md    # codex_sync_include: ['*']
│   │
│   └── api.corthodex.ai/
│       └── docs/
│           ├── rest-api.md          # codex_sync_include: ['api.*']
│           └── graphql.md           # codex_sync_include: ['api.*', 'web.*']
```

### Current Sync Results (BROKEN)
```bash
$ fractary-codex:sync --from-codex --project lake.corthonomy.ai

Scanning: codex.corthos.ai/corthosai/lake.corthonomy.ai/
Found: 5 files
  ✓ .gitignore
  ✓ CLAUDE.md
  ✓ README.md
  ✓ IMPLEMENTATION_PLAN.md
  ✓ requirements.txt
```

### Expected Sync Results (CORRECT)
```bash
$ fractary-codex:sync --from-codex --project lake.corthonomy.ai

Scanning: codex.corthos.ai/ (entire repository)
Evaluating: 247 files with routing rules
Matched: 89 files for lake.corthonomy.ai

From lake.corthonomy.ai:
  ✓ .gitignore
  ✓ CLAUDE.md
  ✓ README.md
  ✓ IMPLEMENTATION_PLAN.md
  ✓ requirements.txt

From etl.corthion.ai:
  ✓ docs/api-spec.md         (matches: lake.*)
  ✓ docs/data-pipeline.md    (matches: lake.*)
  ✓ docs/schema-v2.md        (matches: *)
  ✓ standards/sql-style.md   (matches: lake.*)

From core.corthodex.ai:
  ✓ standards/coding-standards.md  (matches: *)
  ✓ standards/git-workflow.md      (matches: *)
  ✓ standards/security.md          (matches: *)
  ✓ templates/pr-template.md       (matches: *)
  ✓ templates/issue-template.md    (matches: *)

From api.corthodex.ai:
  (0 files - no patterns match lake.*)
```

## Implementation Plan

### Phase 1: Add Routing-Aware File Scanner

**Goal**: Create a new function that scans entire codex and filters by routing rules

**New File**: `sdk/js/src/sync/routing-scanner.ts`

```typescript
import { shouldSyncToRepo } from '../core/routing/evaluator.js'
import { parseMetadata } from '../metadata/parser.js'
import type { Metadata } from '../schemas/metadata.js'
import type { SyncRules } from '../schemas/config.js'

export interface RoutedFileInfo {
  /** File path in codex */
  path: string
  /** File size */
  size: number
  /** Last modified time */
  mtime: number
  /** Content hash */
  hash?: string
  /** Parsed frontmatter metadata */
  metadata: Metadata
  /** Source project in codex */
  sourceProject: string
}

export interface RoutingScanOptions {
  /** Codex repository directory */
  codexDir: string
  /** Target project to sync to */
  targetProject: string
  /** Organization name */
  org: string
  /** Routing rules */
  rules?: SyncRules
  /** Storage provider for reading files */
  storage: Storage
}

/**
 * Scan entire codex repository and return files that route to target project
 *
 * This is the core function that enables cross-project knowledge sharing.
 *
 * @param options - Scan options
 * @returns Array of files that should sync to target project
 */
export async function scanCodexWithRouting(
  options: RoutingScanOptions
): Promise<RoutedFileInfo[]> {
  const { codexDir, targetProject, org, rules, storage } = options

  // Step 1: List ALL files in entire codex repository
  const allFiles = await listAllFilesRecursive(codexDir, storage)

  // Step 2: For each file, evaluate routing
  const routedFiles: RoutedFileInfo[] = []

  for (const filePath of allFiles) {
    try {
      // Read file content
      const content = await storage.readText(filePath)

      // Parse frontmatter metadata
      const metadata = parseMetadata(content)

      // Determine source project from path
      // E.g., "corthosai/etl.corthion.ai/docs/api.md" → "etl.corthion.ai"
      const sourceProject = extractProjectFromPath(filePath, org)

      // Check if file should sync to target project
      const shouldSync = shouldSyncToRepo({
        filePath,
        fileMetadata: metadata,
        targetRepo: targetProject,
        sourceRepo: sourceProject,
        rules
      })

      if (shouldSync) {
        // Calculate file info
        const buffer = Buffer.from(content)
        routedFiles.push({
          path: filePath,
          size: buffer.length,
          mtime: Date.now(), // TODO: Get real mtime from storage
          hash: calculateHash(buffer),
          metadata,
          sourceProject
        })
      }
    } catch (error) {
      // Skip files that can't be read or parsed
      console.warn(`Skipping ${filePath}: ${error.message}`)
    }
  }

  return routedFiles
}

/**
 * Extract project name from codex file path
 *
 * @param path - File path like "corthosai/etl.corthion.ai/docs/api.md"
 * @param org - Organization name like "corthosai"
 * @returns Project name like "etl.corthion.ai"
 */
function extractProjectFromPath(path: string, org: string): string {
  // Remove leading org directory
  const withoutOrg = path.replace(new RegExp(`^${org}/`), '')

  // Extract first path segment as project name
  const parts = withoutOrg.split('/')
  return parts[0] || 'unknown'
}

/**
 * Recursively list all files in directory
 */
async function listAllFilesRecursive(
  dir: string,
  storage: Storage
): Promise<string[]> {
  // Implementation similar to existing recursive file listing
  // but scans entire codex, not just project subdirectory
  // ...
}
```

### Phase 2: Update Sync Manager

**Goal**: Integrate routing scanner into sync operations

**Modified File**: `sdk/js/src/sync/manager.ts`

```typescript
import { scanCodexWithRouting, type RoutedFileInfo } from './routing-scanner.js'

export class SyncManager {
  // ... existing code ...

  /**
   * Create a sync plan with routing-aware file discovery
   *
   * @param org - Organization name
   * @param project - Target project name
   * @param codexDir - Path to codex repository
   * @param options - Sync options
   */
  async createRoutingAwarePlan(
    org: string,
    project: string,
    codexDir: string,
    options?: SyncOptions
  ): Promise<SyncPlan> {
    // Scan entire codex with routing evaluation
    const routedFiles = await scanCodexWithRouting({
      codexDir,
      targetProject: project,
      org,
      rules: this.config.rules,
      storage: this.localStorage
    })

    // Convert to FileInfo format expected by existing planner
    const sourceFiles = routedFiles.map(rf => ({
      path: rf.path,
      size: rf.size,
      mtime: rf.mtime,
      hash: rf.hash
    }))

    // Get current local files for comparison
    const targetFiles = await this.listLocalFiles(process.cwd())

    // Use existing sync plan logic
    const plan = createSyncPlan(
      sourceFiles,
      targetFiles,
      options ?? {},
      this.config
    )

    // Add routing metadata to plan
    plan.metadata = {
      ...plan.metadata,
      routingEnabled: true,
      totalCodexFiles: routedFiles.length,
      scannedProjects: [...new Set(routedFiles.map(f => f.sourceProject))]
    }

    return plan
  }
}
```

### Phase 3: Update CLI Command

**Goal**: Use routing-aware sync by default for --from-codex

**Modified File**: `cli/src/commands/sync.ts`

```typescript
// In sync command action handler:

if (direction === 'from-codex') {
  // Use routing-aware sync for from-codex direction
  const plan = await syncManager.createRoutingAwarePlan(
    config.organization,
    projectName,
    codexRepositoryPath, // Path to cloned codex repo
    {
      direction: 'from-codex',
      force: options.force,
      include: options.include,
      exclude: options.exclude
    }
  )

  // Display routing stats
  console.log(chalk.blue('Routing-aware sync:'))
  console.log(`  Scanned projects: ${plan.metadata.scannedProjects.join(', ')}`)
  console.log(`  Matched files: ${plan.metadata.totalCodexFiles}`)

  // ... rest of sync execution
}
```

### Phase 4: Update Sync-Manager Agent

**Goal**: Update agent to use routing-aware sync

**Modified File**: `plugins/codex/agents/sync-manager.md`

Add documentation about routing-aware sync:
```markdown
## Routing-Aware Sync (v4.1+)

When syncing FROM codex, the sync evaluates ALL files in the entire codex
repository, not just files in this project's directory.

For each file:
1. Parse frontmatter metadata
2. Check codex_sync_include patterns
3. If pattern matches target project → include in sync

This enables cross-project knowledge sharing where:
- Standards from core.* sync to all projects
- API specs from etl.* sync to lake.* and api.*
- Templates from admin.* sync to all projects

Example routing rules in frontmatter:
```yaml
---
codex_sync_include: ['lake.*', 'etl.*']  # Syncs to lake.* and etl.* projects
codex_sync_exclude: ['*-test']           # Except *-test projects
---
```
```

## Testing Strategy

### Unit Tests

**File**: `sdk/js/src/sync/routing-scanner.test.ts`

```typescript
describe('scanCodexWithRouting', () => {
  test('finds files from multiple projects', async () => {
    // Setup mock codex with multiple projects
    const mockStorage = createMockStorage({
      'org/project-a/file1.md': '---\ncodex_sync_include: ["*"]\n---',
      'org/project-b/file2.md': '---\ncodex_sync_include: ["target-*"]\n---',
      'org/project-c/file3.md': '---\ncodex_sync_include: ["other-*"]\n---',
    })

    const result = await scanCodexWithRouting({
      codexDir: '/codex',
      targetProject: 'target-project',
      org: 'org',
      storage: mockStorage
    })

    // Should find file1 (* matches all) and file2 (target-* matches)
    expect(result).toHaveLength(2)
    expect(result[0].path).toBe('org/project-a/file1.md')
    expect(result[1].path).toBe('org/project-b/file2.md')
  })

  test('respects codex_sync_exclude patterns', async () => {
    const mockStorage = createMockStorage({
      'org/project-a/file.md': `---
codex_sync_include: ["*"]
codex_sync_exclude: ["target-*"]
---`,
    })

    const result = await scanCodexWithRouting({
      codexDir: '/codex',
      targetProject: 'target-project',
      org: 'org',
      storage: mockStorage
    })

    expect(result).toHaveLength(0)
  })

  test('handles files without frontmatter', async () => {
    const mockStorage = createMockStorage({
      'org/project-a/no-frontmatter.md': 'Just content',
    })

    const result = await scanCodexWithRouting({
      codexDir: '/codex',
      targetProject: 'target-project',
      org: 'org',
      storage: mockStorage
    })

    // Files without codex_sync_include should not sync
    expect(result).toHaveLength(0)
  })
})
```

### Integration Tests

**File**: `cli/tests/sync-routing.test.ts`

```typescript
describe('Routing-aware sync integration', () => {
  test('syncs files from multiple projects', async () => {
    // Setup test codex repository
    await setupTestCodex({
      'org/lake-project/README.md': 'Lake project',
      'org/etl-project/docs/api.md': `---
codex_sync_include: ["lake-*", "etl-*"]
---
API Documentation`,
      'org/core-project/standards/code.md': `---
codex_sync_include: ["*"]
---
Coding Standards`,
    })

    // Run sync
    await runCommand('fractary codex sync --from-codex --project lake-project --dry-run')

    // Verify output includes files from all projects
    expect(stdout).toContain('From lake-project: 1 files')
    expect(stdout).toContain('From etl-project: 1 files')
    expect(stdout).toContain('From core-project: 1 files')
    expect(stdout).toContain('Total: 3 files')
  })
})
```

## Migration Guide

### For Existing Users

**No breaking changes** - the new routing-aware sync is additive:

1. **Existing behavior preserved** for `--to-codex` (unchanged)
2. **Enhanced behavior** for `--from-codex` (now scans entire codex)
3. **Backward compatible** - files without `codex_sync_include` won't sync (safe default)

### Recommended Migration Steps

1. **Audit frontmatter**: Add `codex_sync_include` patterns to files you want to share
   ```bash
   # Example: Add routing to all standards docs
   find docs/standards -name "*.md" -exec sed -i '1i---\ncodex_sync_include: ["*"]\n---\n' {} \;
   ```

2. **Run dry-run sync**: See what would be synced
   ```bash
   fractary-codex:sync --from-codex --dry-run
   ```

3. **Review and adjust**: Update patterns as needed

4. **Execute sync**: Actually sync the files
   ```bash
   fractary-codex:sync --from-codex
   ```

## Performance Considerations

### Optimization Strategies

1. **Caching**: Cache parsed frontmatter to avoid re-parsing on every sync
   ```typescript
   // Metadata cache by file path + mtime
   const metadataCache = new Map<string, { mtime: number, metadata: Metadata }>()
   ```

2. **Parallel Processing**: Parse files in parallel batches
   ```typescript
   const BATCH_SIZE = 50
   const results = await Promise.all(
     batch.map(file => parseFileWithRouting(file))
   )
   ```

3. **Early Exit**: Skip files that obviously won't match
   ```typescript
   // Skip if file has no frontmatter delimiter
   if (!content.startsWith('---')) {
     return null
   }
   ```

4. **Sparse Checkout**: For large codex repos, use git sparse-checkout
   ```bash
   git sparse-checkout init --cone
   git sparse-checkout set org/project-a org/project-b
   ```

### Expected Performance

**Baseline**:
- Codex with 1000 files
- 100 projects
- Target project matches 150 files

**Timings**:
- Full scan: ~2-5 seconds
- Metadata parsing: ~1-2 seconds
- Routing evaluation: ~0.5 seconds
- **Total**: ~3-8 seconds

## Success Criteria

✅ **Functional**:
- [ ] Scans entire codex repository (not just project subdirectory)
- [ ] Evaluates `codex_sync_include` patterns for each file
- [ ] Returns all matching files across all projects
- [ ] Preserves existing sync behavior for non-routing operations

✅ **Performance**:
- [ ] Syncs 1000-file codex in under 10 seconds
- [ ] Caches metadata to avoid redundant parsing
- [ ] Handles codex repositories with 100+ projects

✅ **Testing**:
- [ ] Unit tests for routing scanner
- [ ] Integration tests for full sync flow
- [ ] Edge case tests (no frontmatter, malformed YAML, etc.)

✅ **Documentation**:
- [ ] Update sync-manager agent docs
- [ ] Add migration guide for users
- [ ] Document frontmatter routing patterns

## References

- SPEC-00004: Routing & Distribution
- SPEC-00024: Codex SDK
- sdk/js/src/core/routing/evaluator.ts - shouldSyncToRepo()
- sdk/js/src/sync/manager.ts - SyncManager class
- plugins/codex/agents/sync-manager.md - Agent documentation

## Open Questions

1. **Should we support inverse routing** (find all projects that want a file)?
   - Use case: When pushing to codex, show which projects will receive the file
   - Answer: Yes, implement in Phase 5 (future work)

2. **How to handle routing conflicts** (exclude overrides include)?
   - Current: exclude takes precedence (per SPEC-00004)
   - Keep existing behavior

3. **Should we cache routing results** between syncs?
   - Answer: Yes, cache with file mtime as cache key
   - Invalidate when file changes

4. **Performance threshold** for warning users about large syncs?
   - Answer: Warn if > 500 files or > 100MB total size
   - Allow override with --force flag
