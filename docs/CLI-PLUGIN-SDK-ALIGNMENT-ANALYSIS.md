# CLI/Plugin/SDK Alignment Analysis

This document analyzes the extent to which CLI commands and Claude plugin commands leverage core SDK logic, identifying opportunities for consolidation and improvement.

## Executive Summary

The current architecture follows a layered approach:
```
Plugin Commands → CLI Commands → SDK Core Logic
```

**Overall Assessment**: The architecture is generally sound, with most commands properly delegating to SDK logic. However, there are several areas where:
1. Logic is duplicated between CLI and SDK
2. Plugin could delegate more directly to CLI
3. SDK could expose more functionality that CLI currently implements

---

## Command-by-Command Analysis

### 1. `sync` Command

| Layer | Implementation | SDK Usage |
|-------|---------------|-----------|
| **Plugin** | `commands/sync.md` → `agents/sync-manager.md` | Delegates to CLI |
| **CLI** | `cli/src/commands/sync.ts` (540 lines) | Uses SDK `SyncManager` |
| **SDK** | `sdk/js/src/sync/manager.ts` (490 lines) | Core logic |

#### SDK Usage Level: **MEDIUM** (60%)

**What CLI does with SDK:**
- ✅ Uses `createSyncManager()` for sync orchestration
- ✅ Uses `SyncManager.createPlan()` and `SyncManager.createRoutingAwarePlan()`
- ✅ Uses `SyncManager.executePlan()` for execution
- ✅ Uses `SyncManager.getToCodexPatterns()` for pattern resolution

**What CLI implements independently (NOT in SDK):**
- ❌ Git repository cloning via `ensureCodexCloned()` (in `cli/src/utils/codex-repository.ts`)
- ❌ Git commit and push logic using `@fractary/core/repo`
- ❌ File globbing with `glob` package
- ❌ Environment to branch mapping
- ❌ Output formatting (JSON/human-readable)

#### Plugin Behavior:
- ✅ Properly delegates to CLI via `fractary-codex sync` command
- ✅ Adds GitHub issue integration (`--work-id`) for context narrowing
- ✅ Creates issue comments with sync results

#### Recommendations:
1. **Move git operations to SDK**: The `ensureCodexCloned()` and commit/push logic should be in the SDK's SyncManager as optional phases
2. **Move glob matching to SDK**: The pattern matching with `glob` should be part of SDK's file scanning
3. **Standardize output format**: SDK could provide a `formatSyncResult()` utility

---

### 2. `document-fetch` Command

| Layer | Implementation | SDK Usage |
|-------|---------------|-----------|
| **Plugin** | Tool reference in `plugin.json` | Via CLI |
| **CLI** | `cli/src/commands/document/fetch.ts` (114 lines) | Uses `CodexClient` |
| **SDK** | `CacheManager` + `StorageManager` | Core logic |

#### SDK Usage Level: **HIGH** (90%)

**What CLI does with SDK:**
- ✅ Uses `validateUri()` for URI validation
- ✅ Uses `CodexClient.fetch()` which internally uses `CacheManager.get()`
- ✅ Cache-first retrieval with TTL support
- ✅ Bypass cache option

**What CLI implements independently:**
- ❌ Content hashing for display (simple, acceptable)
- ❌ Output formatting (JSON/file/stdout)

#### Plugin Behavior:
- Plugin tool definition references CLI command

#### Assessment: **EXCELLENT**
This command demonstrates ideal architecture - CLI is a thin wrapper around SDK functionality.

---

### 3. `cache-list` Command

| Layer | Implementation | SDK Usage |
|-------|---------------|-----------|
| **Plugin** | Tool reference in `plugin.json` | Via CLI |
| **CLI** | `cli/src/commands/cache/list.ts` (90 lines) | Uses `CodexClient` |
| **SDK** | `CacheManager.getStats()` | Core logic |

#### SDK Usage Level: **HIGH** (85%)

**What CLI does with SDK:**
- ✅ Uses `CodexClient.getCacheStats()` which calls `CacheManager.getStats()`

**What CLI implements independently:**
- ❌ Output formatting and health percentage calculation

#### Gap Identified:
- SDK `CacheManager` doesn't expose individual cache entries (only stats)
- CLI notes: "The SDK's CacheManager doesn't expose individual cache entries"

#### Recommendations:
1. **Add entry listing to SDK**: `CacheManager.list()` should return entry URIs with metadata
2. **Add pagination support**: For large caches

---

### 4. `cache-clear` Command

| Layer | Implementation | SDK Usage |
|-------|---------------|-----------|
| **Plugin** | Tool reference in `plugin.json` | Via CLI |
| **CLI** | `cli/src/commands/cache/clear.ts` (100 lines) | Uses `CodexClient` |
| **SDK** | `CacheManager.invalidate()` / `CacheManager.clear()` | Core logic |

#### SDK Usage Level: **HIGH** (90%)

**What CLI does with SDK:**
- ✅ Uses `CodexClient.invalidateCache(pattern)` for pattern-based clearing
- ✅ Uses `CodexClient.invalidateCache()` (no args) for full clear
- ✅ Uses `getCacheStats()` for before/after comparison

**What CLI implements independently:**
- ❌ Output formatting and size calculation

#### Assessment: **EXCELLENT**
Properly delegates to SDK for all cache operations.

---

### 5. `cache-stats` Command

| Layer | Implementation | SDK Usage |
|-------|---------------|-----------|
| **Plugin** | Tool reference in `plugin.json` | Via CLI |
| **CLI** | `cli/src/commands/cache/stats.ts` (71 lines) | Uses `CodexClient` |
| **SDK** | `CacheManager.getStats()` | Core logic |

#### SDK Usage Level: **HIGH** (95%)

**What CLI does with SDK:**
- ✅ Uses `CodexClient.getCacheStats()` directly
- ✅ Returns all SDK stats (entryCount, totalSize, freshCount, staleCount, expiredCount)

**What CLI implements independently:**
- ❌ Health percentage calculation and display

#### Assessment: **EXCELLENT**
This is essentially a passthrough to SDK with formatting.

---

### 6. `cache-health` Command

| Layer | Implementation | SDK Usage |
|-------|---------------|-----------|
| **Plugin** | Tool reference in `plugin.json` | Via CLI |
| **CLI** | `cli/src/commands/cache/health.ts` (348 lines) | Uses SDK components |
| **SDK** | Multiple: `CacheManager`, `TypeRegistry`, config | Core logic |

#### SDK Usage Level: **MEDIUM** (65%)

**What CLI does with SDK:**
- ✅ Uses `CodexClient.getCacheStats()` for cache health
- ✅ Uses `CodexClient.getTypeRegistry()` for type registry check
- ✅ Uses SDK config validation implicitly through CodexClient

**What CLI implements independently:**
- ❌ Configuration file validation (YAML parsing, structure checking)
- ❌ Storage provider connectivity checking
- ❌ Legacy configuration detection
- ❌ Health check orchestration framework

#### Recommendations:
1. **Add health check module to SDK**:
   ```typescript
   // SDK could expose:
   interface HealthCheck {
     name: string;
     status: 'pass' | 'warn' | 'fail';
     message: string;
     details?: string;
   }

   class HealthChecker {
     checkConfiguration(): Promise<HealthCheck>;
     checkCache(): Promise<HealthCheck>;
     checkStorage(): Promise<HealthCheck>;
     checkTypes(): Promise<HealthCheck>;
     runAll(): Promise<HealthCheck[]>;
   }
   ```

2. **Move config validation to SDK**: The `readYamlConfig()` validation logic should be in SDK

---

### 7. `configure` Command

| Layer | Implementation | SDK Usage |
|-------|---------------|-----------|
| **Plugin** | `commands/configure.md` → `agents/configurator.md` | Mixed |
| **CLI** | `cli/src/commands/config/init.ts` (467 lines) | Limited SDK usage |
| **SDK** | Config loading, org resolution | Some utilities |

#### SDK Usage Level: **LOW** (30%)

**What CLI does with SDK:**
- ✅ Uses `resolveOrganization()` for org detection
- ✅ Uses `validateNameFormat()` (but this is CLI-local, should be SDK)

**What CLI implements independently:**
- ❌ Git remote parsing for org detection
- ❌ GitHub CLI (`gh`) invocation for repo discovery
- ❌ MCP server configuration installation
- ❌ Directory structure creation
- ❌ YAML config file generation
- ❌ Gitignore management

#### Plugin Behavior:
The configurator agent is heavily implemented with bash scripts and direct file operations. It:
- Reads sync presets from `plugins/codex/config/sync-presets.json`
- Creates config files directly
- Manages MCP server installation

#### Significant Gap Identified:
The CLI and Plugin both have independent configuration logic. The plugin doesn't always delegate to CLI.

#### Recommendations:
1. **Create SDK ConfigManager**:
   ```typescript
   class ConfigManager {
     // Organization resolution
     detectOrganization(): Promise<string | null>;
     validateOrganization(org: string): boolean;

     // Repository discovery
     discoverCodexRepo(org: string): Promise<DiscoverResult>;

     // Config generation
     generateConfig(options: ConfigOptions): CodexConfig;
     writeConfig(config: CodexConfig, path: string): Promise<void>;

     // MCP installation
     installMcpServer(projectRoot: string): Promise<McpInstallResult>;

     // Directory setup
     ensureDirectoryStructure(projectRoot: string): Promise<void>;
   }
   ```

2. **Consolidate sync presets**: Move `plugins/codex/config/sync-presets.json` to SDK
   - SDK already has `SYNC_PATTERN_PRESETS` in `sdk/js/src/core/config/sync-presets.ts`
   - Plugin should use SDK's presets, not maintain a separate file

3. **Plugin should delegate to CLI**: The configurator agent should invoke `fractary-codex configure` instead of implementing config logic directly

---

## Architecture Summary

### Current State

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Claude Plugin                                │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────────┐ │
│  │ sync.md     │  │ configure.md     │  │ Tool refs (cache-*)   │ │
│  │     ↓       │  │       ↓          │  │          ↓            │ │
│  │sync-manager │  │ configurator     │  │    (via CLI)          │ │
│  │     ↓       │  │    ↓      ↓      │  │                       │ │
│  │   CLI       │  │  CLI    Direct   │  │                       │ │
│  └─────────────┘  └──────────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                            CLI                                       │
│  ┌────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │ sync   │ │doc-fetch   │ │ cache-*    │ │ configure  │           │
│  │        │ │            │ │            │ │            │           │
│  │ Git ops│ │            │ │            │ │ MCP setup  │           │
│  │ Glob   │ │            │ │            │ │ Dir setup  │           │
│  └───┬────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘           │
└──────┼────────────┼──────────────┼──────────────┼───────────────────┘
       │            │              │              │
       ↓            ↓              ↓              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     SDK (@fractary/codex)                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────────┐│
│  │ SyncManager │ │CacheManager │ │StorageManag │ │  Config utils  ││
│  │             │ │             │ │             │ │                ││
│  │ Planning    │ │ Multi-tier  │ │ GitHub      │ │ resolveOrg()   ││
│  │ Execution   │ │ Persistence │ │ HTTP        │ │ loadConfig()   ││
│  │ Routing     │ │ Stats       │ │ Local       │ │                ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### SDK Usage by Command

| Command | SDK Usage | Gap Assessment |
|---------|-----------|----------------|
| sync | 60% | Git ops, globbing outside SDK |
| document-fetch | 90% | Excellent |
| cache-list | 85% | Entry listing missing |
| cache-clear | 90% | Excellent |
| cache-stats | 95% | Excellent |
| cache-health | 65% | Health checks outside SDK |
| configure | 30% | Most logic outside SDK |

---

## Recommendations

### High Priority

1. **Consolidate configure logic into SDK**
   - Create `ConfigManager` class in SDK
   - Move MCP installation, directory setup, config generation to SDK
   - Plugin should delegate entirely to CLI

2. **Move sync presets to SDK (single source of truth)**
   - SDK already has `SYNC_PATTERN_PRESETS` - this should be THE source
   - Remove duplicate `plugins/codex/config/sync-presets.json`
   - CLI and plugin both use SDK presets

3. **Add git operations to SDK SyncManager**
   - `SyncManager.cloneCodexRepo()`
   - `SyncManager.commitAndPush()`
   - CLI becomes thin wrapper

### Medium Priority

4. **Add HealthChecker to SDK**
   - Encapsulate all health check logic
   - CLI just calls `HealthChecker.runAll()`

5. **Expose cache entry listing in SDK**
   - `CacheManager.listEntries()` with pagination
   - Useful for debugging and UI

### Low Priority

6. **Add output formatters to SDK**
   - `formatSyncResult()`, `formatCacheStats()`, etc.
   - CLI uses these, ensuring consistent output

---

## Implementation Roadmap

### Phase 1: Configuration Consolidation
1. Create `ConfigManager` class in SDK
2. Move `installMcpServer()` to SDK
3. Move sync presets to SDK (consolidate with existing `SYNC_PATTERN_PRESETS`)
4. Update CLI to use SDK ConfigManager
5. Update plugin configurator to delegate to CLI

### Phase 2: Sync Enhancement
1. Add `RepoManager` wrapper to SDK for git operations
2. Move file globbing into `SyncManager`
3. CLI sync command becomes thin wrapper

### Phase 3: Health and Diagnostics
1. Create `HealthChecker` class in SDK
2. Move all health check logic from CLI
3. Add cache entry listing to SDK

---

## Conclusion

The codebase has a solid foundation with proper layering (Plugin → CLI → SDK). The cache operations (`document-fetch`, `cache-*`) demonstrate excellent SDK delegation. The main areas needing attention are:

1. **configure command** - Too much logic in CLI and plugin, not enough in SDK
2. **sync command** - Git operations should be in SDK
3. **cache-health** - Health checking framework should be in SDK

Addressing these will ensure consistent behavior whether commands are executed via the Claude plugin or the CLI, and reduce the opportunity for divergent implementations.
