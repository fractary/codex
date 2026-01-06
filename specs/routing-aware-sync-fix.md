# Spec: Fix Routing-Aware Sync with Temp Clone Approach

**Status:** Approved
**Created:** 2026-01-06
**Author:** Claude (with user @jmcwilliam)

## Problem Statement

When running `/fractary-codex:sync --from-codex --dry-run` in project `lake.corthonomy.ai`, only 5 local files are returned instead of hundreds of cross-project files from `etl.corthion.ai` that have `codex_sync_include: [lake.corthonomy.ai]` frontmatter.

## Root Cause

**File: cli/src/commands/sync.ts:177**

```typescript
const codexRepoPath = config.cacheDir || path.join(process.cwd(), '.fractary', 'codex-cache');
```

The CLI passes the **cache directory** path (`.fractary/codex/cache`) to the routing scanner, but the scanner needs the path to the **cloned codex repository** (e.g., `/tmp/codex.corthos.ai/`) containing all markdown files from all projects.

The routing scanner (`sdk/js/src/sync/routing-scanner.ts:scanCodexWithRouting()`) recursively scans ALL markdown files in the provided directory and evaluates frontmatter routing rules. It can't find cross-project files because it's looking in the wrong directory.

## Solution Overview

Clone the codex repository to a **temporary location** for each sync operation, accept the inefficiency as a trade-off for correctness.

**Architecture:**
```
User runs: /fractary-codex:sync --from-codex
  ↓
CLI clones codex to temp dir: /tmp/fractary-codex-clone/corthosai/codex.corthos.ai/
  ↓  (shallow clone with git clone --depth 1)
  ↓
Passes temp path to: scanCodexWithRouting(codexRepoPath)
  ↓
Scanner recursively scans ALL .md files in codex
  ↓
Evaluates frontmatter: codex_sync_include patterns
  ↓
Returns files matching routing rules (hundreds instead of 5)
```

**Trade-offs Accepted:**
- **Inefficient:** Clones entire codex for each sync (~seconds to minutes depending on size)
- **Bandwidth:** Downloads all files even if only needing a few
- **Disk I/O:** Temporary clone takes space (cleaned up after)
- **But Works:** Correctly discovers all routed files without complex indexing

## Implementation Plan

### 1. Create Codex Clone Helper (Temporary Directory)

**New File: cli/src/utils/codex-repository.ts**

Create helper functions:

```typescript
function getTempCodexPath(config: CodexYamlConfig): string {
  // Returns: /tmp/fractary-codex-clone/{org}/{codex_repo}
  return path.join(
    os.tmpdir(),
    'fractary-codex-clone',
    config.organization,
    config.codex_repository || 'codex'
  )
}

async function ensureCodexCloned(
  config: CodexYamlConfig,
  options?: { force?: boolean, branch?: string }
): Promise<string> {
  const tempPath = getTempCodexPath(config)

  // If already exists and not forcing, update it
  if (await isValidGitRepo(tempPath) && !options?.force) {
    await gitFetch(tempPath)
    await gitCheckout(tempPath, options?.branch || 'main')
    await gitPull(tempPath)
    return tempPath
  }

  // Otherwise clone fresh
  const repoUrl = getCodexRepoUrl(config) // e.g., github.com/corthosai/codex.corthos.ai
  await gitClone(repoUrl, tempPath, {
    branch: options?.branch || 'main',
    depth: 1  // Shallow clone for efficiency
  })

  return tempPath
}

async function isValidGitRepo(path: string): Promise<boolean> {
  // Check if .git directory exists
}

function getCodexRepoUrl(config: CodexYamlConfig): string {
  // Construct GitHub URL from config
  // Handle different git hosts (GitHub, GitLab, etc.)
}
```

**Key Features:**
- Uses temp directory (auto-cleaned by OS eventually)
- Reuses existing clone if available (speeds up subsequent syncs)
- Shallow clone (--depth 1) for efficiency
- Supports different branches via options

### 2. Fix CLI Sync Command

**File: cli/src/commands/sync.ts:173-194**

Replace lines 173-194 with:

```typescript
// Use routing-aware sync for from-codex direction
if (direction === 'from-codex') {
  let codexRepoPath: string

  try {
    const { ensureCodexCloned } = await import('../utils/codex-repository')

    if (!options.json) {
      console.log(chalk.blue('ℹ Cloning/updating codex repository...'))
    }

    // Clone to temp directory
    codexRepoPath = await ensureCodexCloned(config, {
      branch: targetBranch
    })

    if (!options.json) {
      console.log(chalk.dim(`  Codex cloned to: ${codexRepoPath}`))
      console.log(chalk.dim('  Scanning for files routing to this project...\n'))
    }
  } catch (error) {
    console.error(chalk.red('Error:'), 'Failed to clone codex repository')
    console.error(chalk.dim(`  ${error.message}`))
    console.log(chalk.yellow('\nTroubleshooting:'))
    console.log(chalk.dim('  1. Ensure git is installed: git --version'))
    console.log(chalk.dim('  2. Check GitHub auth: gh auth status'))
    console.log(chalk.dim(`  3. Verify repo exists: ${config.organization}/${config.codex_repository}`))
    process.exit(1)
  }

  // Use temp clone path for routing scan
  const planWithRouting = await syncManager.createRoutingAwarePlan(
    config.organization,
    projectName,
    codexRepoPath,  // ← FIXED: temp clone instead of cache path
    syncOptions
  )

  plan = planWithRouting
  routingScan = planWithRouting.routingScan
}
```

### 3. Add Integration Test

**File: cli/tests/integration/sync-routing.test.ts**

Add test case:
```typescript
test('routing-aware sync with cloned codex', async () => {
  // Setup: Clone mock codex with files from multiple projects
  // - project-a with codex_sync_include: ["*"]
  // - project-b with codex_sync_include: ["target-*"]
  // Execute: Run from-codex sync for "target-project"
  // Verify: Files from both project-a and project-b returned
  // Verify: Files from unrelated projects NOT returned
})
```

### 4. Update Documentation

**Files:**
- `cli/README.md` - Document temp clone behavior
- `plugins/codex/README.md` - Update sync command documentation
- Note the inefficiency trade-off in docs

## Critical Files to Modify

1. **cli/src/commands/sync.ts:173-194** - Main bug fix (use temp clone instead of cache path)
2. **cli/src/utils/codex-repository.ts** - NEW FILE: Create temp clone helper utilities
3. **cli/tests/integration/sync-routing.test.ts** - Add test for temp clone + routing scan

## Cache Purging (User's Preferred Workflow)

The user's primary workflow will be:
1. **Reference files via codex://** URIs (efficient, no sync needed)
2. **Purge cache** when needing latest versions (force re-fetch)
3. **Sync occasionally** when needed (accepting the inefficiency)

### Current Cache Purging Mechanisms

**MCP Server Tool: `codex_cache_clear`**
```typescript
// Available via MCP (if user has direct access)
codex_cache_clear({
  pattern: "codex://corthosai/etl.corthion.ai/schemas/ipeds/.*"  // Regex pattern
})
```

**CLI Command: `fractary codex cache clear`**
```bash
# Clear all cache
fractary codex cache clear --all

# Clear by pattern (glob-style)
fractary codex cache clear --pattern "codex://corthosai/etl.corthion.ai/schemas/ipeds/*"

# Dry run to see what would be cleared
fractary codex cache clear --pattern "codex://*/*/schemas/*" --dry-run
```

**Pattern Support:**
- MCP: Regex patterns (e.g., `.*\.yaml$` for all YAML files)
- CLI: Glob patterns (e.g., `*/schemas/*.yaml`)
- Both support wildcards for flexible matching

### Recommended Cache Purge Workflow

**Before syncing IPEDS datasets:**
```bash
# 1. Purge cache for IPEDS schemas to force latest fetch
fractary codex cache clear --pattern "codex://corthosai/etl.corthion.ai/schemas/ipeds/*"

# 2. Then reference the schemas via codex:// URIs
# MCP will re-fetch them fresh from storage
```

**Alternative: Using MCP directly**
If the user has MCP access, they can call `codex_cache_clear` with regex:
```
pattern: "codex://corthosai/etl\\.corthion\\.ai/schemas/ipeds/.*"
```

### Missing: Plugin Command for Cache Clear

**Currently:**
- CLI has `fractary codex cache clear` ✓
- MCP has `codex_cache_clear` tool ✓
- Plugin does NOT expose cache clearing ✗

**Future Enhancement:**
Could add plugin command `/fractary-codex:cache-clear --pattern "..."` that delegates to CLI.

**Workaround for now:**
User can run CLI command directly in their project:
```bash
cd ~/projects/lake.corthonomy.ai
fractary codex cache clear --pattern "codex://corthosai/etl.corthion.ai/schemas/ipeds/*"
```

## Success Criteria

After implementation:
1. User runs `/fractary-codex:sync --from-codex --dry-run` in `lake.corthonomy.ai`
2. CLI clones `codex.corthos.ai` to temp directory
3. Routing scanner scans entire cloned codex (all projects)
4. Returns files from `etl.corthion.ai` with `codex_sync_include: [lake.corthonomy.ai]`
5. Output shows routing statistics with multiple source projects
6. Hundreds of files returned instead of just 5

## Additional Bug Found (Not Blocking)

**Config Path Mismatch in CLI:**
- `cli/src/commands/init.ts:91` writes config to `.fractary/codex/config.yaml`
- `cli/src/commands/sync.ts:69` reads from `.fractary/codex.yaml` (WRONG)
- Four other commands also use wrong path

This doesn't affect the user since they're using the plugin (which doesn't use CLI directly), but should be fixed separately.

**Files affected:**
- cli/src/commands/sync.ts:69
- cli/src/commands/cache/health.ts:43
- cli/src/commands/types/add.ts:101
- cli/src/commands/types/remove.ts:45

**Fix:** Change all instances of `.fractary/codex.yaml` to `.fractary/codex/config.yaml`

## Implementation Sequence

1. Create `codex-repository.ts` helper utilities for temp cloning
2. Fix CLI sync command to use temp clone path
3. Add error handling and user guidance
4. Add integration test
5. Update documentation
6. (Optional) Add plugin command for cache clear
7. (Optional) Fix config path mismatch bug
