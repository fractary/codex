# SDK Logic Consolidation Specification

**Status**: Active
**Created**: 2026-01-21
**Priority**: High

## Problem Statement

Logic that should reside centrally in the SDK is being duplicated across multiple components (CLI, MCP server), leading to:
- Maintenance burden (changes must be made in multiple places)
- Potential for inconsistencies and bugs
- Increased code surface area to test

## Identified Duplications

### 1. Environment Variable Expansion

**Duplicated in:**
- `mcp/server/src/cli.ts:18-35` - `expandEnvVars()`
- `cli/src/config/config-types.ts:273-305` - `resolveEnvVars()` + `resolveEnvVarsInConfig()`

**Functionality:** Both implement the same `${VAR_NAME}` syntax expansion for configuration values.

**Solution:** Add to SDK as `expandEnvVars()` and `expandEnvVarsInConfig()` exports.

### 2. YAML Configuration Reading

**Duplicated in:**
- `mcp/server/src/cli.ts:47-64` - Inline unified config extraction
- `cli/src/config/migrate-config.ts:289-307` - `readYamlConfig()`

**Functionality:** Both handle:
- Reading YAML config files
- Extracting `codex:` section from unified config format
- Falling back to legacy flat format

**Solution:** Add `readCodexConfig()` to SDK that handles unified format parsing.

### 3. Configuration Migration

**Duplicated in:**
- `cli/src/config/migrate-config.ts` - Full migration from JSON to YAML
- `sdk/js/src/migration/` - Migration from v2.x to v3.0 format

**Issue:** These are **different migration paths** but have overlapping concerns:
- CLI migrates legacy JSON `.fractary/plugins/codex/config.json` → YAML
- SDK migrates v2.x config structure → v3.0 structure

**Solution:** Clarify scope - SDK handles config structure migration, CLI config-types should be moved to SDK.

### 4. Configuration Types

**Duplicated in:**
- `cli/src/config/config-types.ts` - `CodexYamlConfig`, storage configs, etc.
- `sdk/js/src/schemas/config.ts` - `CodexConfig`, storage schemas

**Issue:** CLI defines its own config types separate from SDK schemas.

**Solution:** CLI should import types from SDK; SDK should expose YAML config types.

### 5. Duration/Size Parsing

**Duplicated in:**
- `cli/src/config/config-types.ts:216-266` - `parseDuration()`, `parseSize()`
- SDK has `parseTtl()` but not duration/size parsing

**Solution:** Add `parseDuration()` and `parseSize()` to SDK utilities.

## Architecture After Consolidation

```
┌─────────────────────────────────────────────────────────────────┐
│                        @fractary/codex (SDK)                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Core Utilities (NEW)                                       │ │
│  │  - expandEnvVars()                                          │ │
│  │  - expandEnvVarsInConfig()                                  │ │
│  │  - readCodexConfig()                                        │ │
│  │  - parseDuration()                                          │ │
│  │  - parseSize()                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Existing Modules                                           │ │
│  │  - CacheManager, StorageManager, SyncManager                │ │
│  │  - TypeRegistry, PermissionManager                          │ │
│  │  - Migration (v2.x → v3.0)                                  │ │
│  │  - References, Patterns, Routing                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│      CLI        │ │       MCP       │ │     Plugin      │
│                 │ │                 │ │                 │
│ - Commands      │ │ - Tools         │ │ - Uses CLI      │
│ - Output format │ │ - JSON-RPC      │ │ - Uses MCP      │
│ - User prompts  │ │ - Stdio         │ │                 │
│                 │ │                 │ │                 │
│ Imports SDK for │ │ Imports SDK for │ │ Delegates to    │
│ all core logic  │ │ all core logic  │ │ CLI/MCP         │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Implementation Plan

### Phase 1: Add SDK Utilities

1. Create `sdk/js/src/core/env/index.ts`:
   - `expandEnvVars(value: string): string`
   - `expandEnvVarsInConfig<T>(config: T): T`

2. Create `sdk/js/src/core/yaml/index.ts`:
   - `readCodexConfig(configPath: string): Promise<CodexYamlConfig>`
   - Types for unified config format

3. Add to `sdk/js/src/core/utils/index.ts`:
   - `parseDuration(duration: string | number): number`
   - `parseSize(size: string | number): number`

4. Export from `sdk/js/src/index.ts`

### Phase 2: Refactor CLI

1. Remove `cli/src/config/config-types.ts` duplicated functions:
   - Delete `resolveEnvVars()`, `resolveEnvVarsInConfig()`
   - Delete `parseDuration()`, `parseSize()`
   - Keep type definitions that import from SDK

2. Update `cli/src/config/migrate-config.ts`:
   - Import `readCodexConfig` from SDK
   - Keep CLI-specific YAML writing (output formatting is presentation layer)

3. Update imports throughout CLI

### Phase 3: Refactor MCP

1. Remove `mcp/server/src/cli.ts`:
   - Delete `expandEnvVars()` function
   - Import from SDK instead

2. Use SDK's `readCodexConfig()` for config loading

## Files Changed

### SDK (Added)
- `sdk/js/src/core/env/index.ts` (new)
- `sdk/js/src/core/yaml/index.ts` (new)
- `sdk/js/src/core/utils/index.ts` (extended)
- `sdk/js/src/index.ts` (exports)

### CLI (Modified)
- `cli/src/config/config-types.ts` (remove duplicates)
- `cli/src/config/migrate-config.ts` (use SDK)
- `cli/src/client/codex-client.ts` (update imports)

### MCP (Modified)
- `mcp/server/src/cli.ts` (use SDK)

## Validation

After consolidation:
1. All tests pass (`npm test` in each workspace)
2. CLI commands work identically
3. MCP server starts and handles requests
4. Plugin skills work via CLI delegation

## Non-Goals

- **Not consolidating**: Presentation layer logic (output formatting, colors, progress display)
- **Not consolidating**: Transport layer (JSON-RPC, stdio handling)
- **Not consolidating**: CLI-specific features like interactive prompts
- **Plugin**: Already correctly delegates to CLI/MCP, no changes needed

## References

- Plugin architecture is correct - uses CLI helper skill to delegate to CLI
- CLI correctly uses SDK for CacheManager, StorageManager, SyncManager
- MCP correctly uses SDK for CacheManager, StorageManager
- Issue is peripheral utilities (env vars, config reading) not centralized
