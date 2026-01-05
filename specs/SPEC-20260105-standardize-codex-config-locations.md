---
spec_id: spec-20260105-standardize-codex-config-locations
title: Standardize Codex Configuration and Cache Locations
type: infrastructure
status: approved
created: 2026-01-05
author: Claude Code
validated: true
breaking_change: true
tags:
  - configuration
  - migration
  - standardization
  - breaking-change
  - v4.0
---

# Infrastructure Specification: Standardize Codex Configuration and Cache Locations

**Type**: Infrastructure
**Status**: Approved
**Created**: 2026-01-05

## Summary

**⚠️ BREAKING CHANGE**

This specification addresses the fragmentation of codex configuration and cache file locations across CLI, SDK, and plugin implementations. The goal is to consolidate everything under `.fractary/codex/` and remove backward compatibility to eliminate confusion.

**Key Decision**: No backward compatibility. All projects MUST migrate to v4.0 standard.

## Problem Statement

Multiple conflicting locations exist for codex config and cache files:

**Config locations:**
- `.fractary/codex.yaml` - Current CLI (YAML)
- `.fractary/plugins/codex/config.json` - Old plugin (JSON)
- Inconsistent documentation

**Cache locations:**
- `.codex-cache/` - New CLI default (pollutes project root)
- `.fractary/plugins/codex/cache/` - Old plugin/SDK default

This inconsistency causes:
1. **User confusion**: Unclear which location to use
2. **Implementation bugs**: Commands looking in different places
3. **Migration issues**: Multiple legacy paths to support
4. **Documentation drift**: Docs reference old and new locations inconsistently

## Proposed Solution

Consolidate everything under `.fractary/codex/`:

```
.fractary/
└── codex/
    ├── config.yaml
    └── cache/
```

**Benefits:**
- ✅ Single namespace for all codex files
- ✅ No project root pollution (`.codex-cache/`)
- ✅ Not overly nested (`.fractary/plugins/codex/`)
- ✅ Clear organization and ownership
- ✅ Future-proof for additional codex metadata

## Design

### Target State (v4.0 Standard)

**Configuration:**
- Location: `.fractary/codex/config.yaml`
- Format: YAML
- Scope: Project-level only (no global config)

**Cache:**
- Location: `.fractary/codex/cache/`
- Structure: Unchanged (maintains org/project/path hierarchy)
- Metadata: `.fractary/codex/cache/.cache-index.json`

### Legacy Paths (for migration)

**Config:**
1. `.fractary/plugins/codex/config.json` (v3.0 plugin)
2. `.fractary/codex.yaml` (v3.5 CLI intermediate)
3. `~/.config/fractary/codex/config.json` (deprecated global)

**Cache:**
1. `.codex-cache/` (v3.5 CLI)
2. `.fractary/plugins/codex/cache/` (v3.0 plugin)

### No Backward Compatibility (Breaking Change)

**v4.0 ONLY accepts the new standard locations:**
- Config: `.fractary/codex/config.yaml` (YAML format)
- Cache: `.fractary/codex/cache/`

**Legacy locations will NOT work:**
- ❌ `.fractary/codex.yaml`
- ❌ `.fractary/plugins/codex/config.json`
- ❌ `.codex-cache/`
- ❌ `.fractary/plugins/codex/cache/`
- ❌ `~/.config/fractary/codex/config.json`

**Migration is REQUIRED** before v4.0 will function. Users with v3.x configs must run `fractary codex migrate` or `fractary codex init`.

## Implementation

### Phase 1: Update Core Constants

#### Priority 1: SDK JS
**File**: `sdk/js/src/references/resolver.ts:42`

```typescript
// BEFORE
export const DEFAULT_CACHE_DIR = '.fractary/plugins/codex/cache'

// AFTER
export const DEFAULT_CACHE_DIR = '.fractary/codex/cache'

// ADD
export const LEGACY_CACHE_DIRS = [
  '.codex-cache',
  '.fractary/plugins/codex/cache',
] as const;
```

#### Priority 2: SDK Python
**File**: `sdk/py/fractary_codex/core/config.py:18-23`

```python
# BEFORE
CONFIG_FILENAMES = ["codex.yaml", "codex.yml"]
CONFIG_DIRS = [".fractary", ".codex"]
DEFAULT_CACHE_DIR = ".codex-cache"

# AFTER
CONFIG_FILENAMES = ["config.yaml", "config.yml", "codex.yaml"]
CONFIG_DIRS = [".fractary/codex", ".fractary", ".codex"]
DEFAULT_CACHE_DIR = ".fractary/codex/cache"

# ADD
LEGACY_CONFIG_DIRS = [".fractary/plugins/codex", ".fractary"]
LEGACY_CACHE_DIRS = [".codex-cache", ".fractary/plugins/codex/cache"]
```

#### Priority 3: CLI Init
**File**: `cli/src/commands/config/init.ts`

**Line 90-91**: Change config path
```typescript
// BEFORE
const configPath = path.join(configDir, 'codex.yaml');

// AFTER
const configDir = path.join(process.cwd(), '.fractary', 'codex');
const configPath = path.join(configDir, 'config.yaml');
```

**Line 114**: Update directory creation
```typescript
// BEFORE
const dirs = ['.fractary', '.codex-cache'];

// AFTER
const dirs = ['.fractary/codex', '.fractary/codex/cache'];
```

**Line 141**: Update output message
```typescript
// BEFORE
console.log(chalk.dim(`  Cache: .codex-cache/`));

// AFTER
console.log(chalk.dim(`  Cache: .fractary/codex/cache/`));
```

#### Priority 4: CLI Migration
**File**: `cli/src/config/migrate-config.ts`

**Line 80**: Update default cache directory
```typescript
// BEFORE
yamlConfig.cacheDir = legacy.cache.directory || '.codex-cache';

// AFTER
yamlConfig.cacheDir = legacy.cache.directory || '.fractary/codex/cache';
```

**Line 223**: Update default in getDefaultYamlConfig
```typescript
// BEFORE
cacheDir: '.codex-cache',

// AFTER
cacheDir: '.fractary/codex/cache',
```

**Add new functions:**
```typescript
export async function detectLegacyLocations(projectRoot: string): Promise<{
  configs: Array<{ path: string; format: 'json' | 'yaml' }>;
  caches: string[];
}>;

export async function migrateCacheDirectory(
  sourcePath: string,
  targetPath: string,
  options?: { removeSource?: boolean }
): Promise<{ filesMoved: number; totalSize: number }>;

export async function migrateToV4Standard(
  projectRoot: string,
  options?: { dryRun?: boolean; removeLegacy?: boolean }
): Promise<MigrationResult>;
```

#### Priority 5: Plugin Scripts
**File**: `plugins/codex/scripts/detect-config.sh:7-10`

```bash
# BEFORE
PROJECT_JSON_CONFIG=".fractary/plugins/codex/config.json"
PROJECT_YAML_CONFIG=".fractary/codex.yaml"

# AFTER
PROJECT_YAML_CONFIG=".fractary/codex/config.yaml"     # v4.0 standard
LEGACY_CLI_CONFIG=".fractary/codex.yaml"              # v3.5
LEGACY_PLUGIN_CONFIG=".fractary/plugins/codex/config.json"  # v3.0
```

### Phase 2: Update Plugin Scripts

**File**: `plugins/codex/lib/resolve-uri.sh:20`
```bash
# BEFORE
cache_path="${CODEX_CACHE_PATH:-.fractary/plugins/codex/cache}"

# AFTER
cache_path="${CODEX_CACHE_PATH:-.fractary/codex/cache}"
```

**File**: `plugins/codex/lib/cache-manager.sh:15-16`
```bash
# BEFORE
cache_path="${CODEX_CACHE_PATH:-.fractary/plugins/codex/cache}"
config_path="${CODEX_CONFIG_PATH:-.fractary/plugins/codex/config.json}"

# AFTER
cache_path="${CODEX_CACHE_PATH:-.fractary/codex/cache}"
config_path="${CODEX_CONFIG_PATH:-.fractary/codex/config.yaml}"
```

### Phase 3: Documentation Updates

**Critical documentation files:**

1. `plugins/codex/commands/sync-project.md:203-217`
   - Update expected config location
   - Add legacy detection messaging

2. `plugins/codex/docs/MIGRATION-GUIDE-v4.md`
   - Add v4.0 path consolidation section
   - Update all examples

3. `plugins/codex/docs/CONFIGURATION-MIGRATION.md`
   - Rewrite to reflect v4.0 standard
   - Add clear migration guide

4. All README files:
   - `README.md`
   - `cli/README.md`
   - `sdk/js/README.md`
   - `sdk/py/README.md`
   - `mcp/server/README.md`
   - `plugins/codex/README.md`

5. Configuration guides:
   - `docs/guides/configuration.md`
   - `docs/guides/api-reference.md`
   - `docs/guides/cli-integration.md`
   - `plugins/codex/commands/config-init.md`

### Phase 4: Add .gitignore Entry

**File**: `.gitignore`
```gitignore
# Codex cache (new standard location)
.fractary/codex/cache/

# Legacy cache locations (if still present)
.codex-cache/
.fractary/plugins/codex/cache/
```

## Migration Strategy

### Auto-Migration Flow

```
User runs: fractary codex init OR fractary codex migrate
  ↓
Detect all legacy locations
  - Configs: .fractary/codex.yaml, .fractary/plugins/codex/config.json
  - Caches: .codex-cache/, .fractary/plugins/codex/cache/
  ↓
Create .fractary/codex/ directory structure
  ↓
Migrate config → .fractary/codex/config.yaml
  - Convert JSON → YAML if needed
  - Preserve all settings
  ↓
Merge all cache dirs → .fractary/codex/cache/
  - Preserve all entries
  - Update metadata index
  ↓
Validate migration
  - Config readable
  - Cache accessible
  ↓
Optional: Remove legacy files (if --remove-legacy)
  ↓
Report success
```

### User-Facing Commands

```bash
# Auto-detect and migrate
fractary codex migrate

# Dry run to preview changes
fractary codex migrate --dry-run

# Migrate with cleanup of legacy files
fractary codex migrate --remove-legacy

# Force re-migration
fractary codex migrate --force
```

### Migration Detection

Commands will auto-detect legacy locations and prompt:

```
⚠️  Legacy configuration detected

Your config is at: .fractary/codex.yaml
Standard location: .fractary/codex/config.yaml

Run 'fractary codex migrate' to update (takes ~5 seconds)
```

## Testing Strategy

### Unit Tests

**New test files:**
- `cli/src/config/__tests__/migrate-config.test.ts`
- `sdk/js/tests/references/resolver.test.ts`
- `sdk/py/tests/test_config.py`

**Test coverage:**
- Detection of all legacy locations
- Config migration (JSON → YAML)
- Cache directory migration
- Backward compatibility fallbacks
- Error handling

### Integration Tests

**Test scenarios:**
1. Fresh install → verify new structure
2. Migrate from v3.0 plugin → verify consolidation
3. Migrate from v3.5 CLI → verify path updates
4. Mixed legacy → verify merge strategy
5. Fetch operation → verify new cache location used

## Rollout Plan

**Week 1**: Update all constants and defaults
- Days 1-2: SDK constants (JS + Python)
- Days 3-4: CLI commands (init, migrate)
- Day 5: Plugin scripts

**Week 2**: Implement migration logic
- Days 1-3: Enhanced migrate command
- Days 4-5: Testing

**Week 3**: Documentation updates
- Days 1-2: Core documentation
- Days 3-4: Supporting documentation
- Day 5: Examples and tutorials

**Week 4**: Release
- Days 1-2: Internal testing
- Day 3: Beta release (v4.0-beta)
- Days 4-5: Full release (v4.0)

## Risk Mitigation

**Data Loss Risk:**
- Migration command creates backups before moving files
- Use atomic operations (move, not copy-delete)
- Validate cache integrity after migration

**Breaking Changes Risk:**
- **Accepted**: v4.0 is intentionally a breaking change
- Clear error messages when old config not found
- Migration guide prominently featured in documentation
- Users must explicitly run migration command

**Documentation Drift Risk:**
- Use constants as single source of truth
- Automated tests verify documentation examples
- Clear version markers in all documentation

## Success Criteria

- [ ] All new installations use `.fractary/codex/config.yaml`
- [ ] All new installations use `.fractary/codex/cache/`
- [ ] Migration handles all legacy locations (zero data loss)
- [ ] Backward compatibility maintained (legacy works with warnings)
- [ ] All documentation consistent and up-to-date
- [ ] 100% test coverage for migration logic
- [ ] Migration completes in <10 seconds for typical projects

## Deprecation Timeline

- **v4.0 (Current)**: New standard enforced, legacy support REMOVED
- Migration required for all projects using v3.x
- No grace period - clean break for clarity

## Critical Files Summary

Top 5 files that MUST be changed:

1. `sdk/js/src/references/resolver.ts:42` - DEFAULT_CACHE_DIR constant
2. `cli/src/config/migrate-config.ts:80,223` - Migration logic and defaults
3. `cli/src/commands/config/init.ts:90-91,114` - Directory creation
4. `sdk/py/fractary_codex/core/config.py:23` - Python constants
5. `plugins/codex/scripts/detect-config.sh:7-10` - Detection order

## Related Specifications

- [SPEC-20251217103755](./SPEC-20251217103755-codex-component-alignment.md) - Codex Component Alignment
- [SPEC-20251217102834](./SPEC-20251217102834-mcp-first-integration-strategy.md) - MCP-First Integration
- [SPEC-20251216183224](./SPEC-20251216183224-codex-cli-migration.md) - Codex CLI Migration
