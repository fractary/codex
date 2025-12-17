---
spec_id: spec-20251217103755-codex-component-alignment
title: Codex Component Alignment Specification
type: infrastructure
status: draft
created: 2025-12-17
author: Claude Code
validated: false
tags:
  - alignment
  - naming-standards
  - feature-parity
  - sdk
  - cli
  - mcp
  - plugin
related_specs:
  - SPEC-20251217102834-mcp-first-integration-strategy.md
---

# Codex Component Alignment Specification

**Type**: Infrastructure
**Status**: Draft
**Created**: 2025-12-17

## Summary

This specification defines the plan to bring all Codex components into alignment, establishing feature parity and consistent naming conventions across:

- **TypeScript SDK** (`@fractary/codex` v0.2.0)
- **Python SDK** (`fractary-codex` v0.1.0)
- **CLI** (`@fractary/codex-cli` v0.2.2)
- **MCP Server** (`@fractary/codex-mcp` v0.1.0)
- **Claude Code Plugin** (`@fractary/codex-plugin` v2.0.0)

The goal is to ensure users can seamlessly switch between interfaces with predictable naming and complete functionality regardless of which interface they choose.

## Objectives

- Establish TypeScript SDK as the authoritative reference implementation
- Achieve 100% feature parity across all components where applicable
- Standardize naming conventions for consistent user mental model
- Document clear mapping between all interfaces
- Create implementation roadmap with prioritized tasks

---

## Current State Analysis

### Component Versions and Maturity

| Component | Version | Maturity | Export Count | Production Ready |
|-----------|---------|----------|--------------|------------------|
| TypeScript SDK | 0.2.0 | Production | 312 exports | ✅ Yes |
| Python SDK | 0.1.0 | Alpha | ~85 exports | ⚠️ No |
| CLI | 0.2.2 | Production | 13 commands | ✅ Yes |
| MCP Server | 0.1.0 | Production | 4 tools | ✅ Yes (limited) |
| Plugin | 2.0.0 | Production | 13 skills | ✅ Yes |

### Feature Coverage Summary

| Component | Coverage vs TS SDK | Critical Gaps |
|-----------|-------------------|---------------|
| TypeScript SDK | 100% (reference) | None |
| Python SDK | 73% | `sync/`, `permissions/` modules missing |
| CLI | 100% | None |
| MCP Server | 33% | 9 of 13 operations missing |
| Plugin | 100% (via CLI) | Direct MCP integration missing |

---

## Complete Side-by-Side Alignment Matrix

### Section 1: Document Operations

| Operation | TS SDK | Py SDK | CLI | MCP Server | Plugin Skill | Plugin Command |
|-----------|--------|--------|-----|------------|--------------|----------------|
| **Fetch document** | `storage.fetch()` | `storage.fetch()` | `fetch <uri>` | `codex_fetch` | `document-fetcher` | `/fractary-codex:fetch` |
| **Fetch with bypass** | `storage.fetch({noCache})` | `storage.fetch(no_cache=True)` | `fetch --bypass-cache` | `codex_fetch {noCache: true}` | `document-fetcher {bypass_cache}` | `/fractary-codex:fetch --bypass-cache` |
| **Fetch from branch** | `storage.fetch({branch})` | `storage.fetch(branch=)` | `fetch --branch <b>` | `codex_fetch {branch: "x"}` | `document-fetcher {branch}` | `/fractary-codex:fetch --branch` |

**Alignment Status:** ✅ Good - All components support fetch with consistent parameters

**Naming Issues:**
- Plugin skill `document-fetcher` vs command `fetch` - minor inconsistency
- Recommend: Keep both (skill is implementation, command is user-facing)

---

### Section 2: Cache Operations

| Operation | TS SDK | Py SDK | CLI | MCP Server | Plugin Skill | Plugin Command |
|-----------|--------|--------|-----|------------|--------------|----------------|
| **List cache entries** | `cache.list()` | `cache.list()` | `cache list` | `codex_list` ⚠️ | `cache-list` | `/fractary-codex:cache-list` |
| **List with filter** | `cache.list({org, project})` | `cache.list(org=, project=)` | `cache list --org --project` | `codex_list {org, project}` | `cache-list {filter}` | `/fractary-codex:cache-list --org --project` |
| **Get cache stats** | `cache.getStats()` | `cache.get_stats()` | `cache stats` | ❌ **MISSING** | `cache-metrics` ⚠️ | `/fractary-codex:metrics` ⚠️ |
| **Clear all cache** | `cache.clear()` | `cache.clear()` | `cache clear --all` | `codex_invalidate` ⚠️ | `cache-clear {scope: all}` | `/fractary-codex:cache-clear --all` |
| **Clear expired** | `cache.clearExpired()` | `cache.clear_expired()` | `cache clear --expired` | ❌ **MISSING** | `cache-clear {scope: expired}` | `/fractary-codex:cache-clear --expired` |
| **Clear by pattern** | `cache.invalidatePattern()` | `cache.invalidate_pattern()` | `cache clear --pattern` | `codex_invalidate {pattern}` | `cache-clear {scope: pattern}` | `/fractary-codex:cache-clear --pattern` |
| **Health check** | ❌ **MISSING** | ❌ **MISSING** | `health` | ❌ **MISSING** | `cache-health` | `/fractary-codex:health` |

**Alignment Status:** ⚠️ Issues Found

**Naming Issues:**
| Current | Issue | Recommended |
|---------|-------|-------------|
| MCP `codex_list` | Ambiguous - list what? | `codex_cache_list` |
| MCP `codex_invalidate` | Different term than CLI | `codex_cache_clear` |
| Plugin `cache-metrics` | Different than CLI `cache stats` | `cache-stats` |
| Plugin `/metrics` | Different than CLI `cache stats` | `/fractary-codex:cache-stats` |

**Missing Features:**
| Feature | Missing From | Priority |
|---------|--------------|----------|
| `cache stats` equivalent | MCP Server | HIGH |
| `clear expired` | MCP Server | MEDIUM |
| Health check API | TS SDK, Py SDK, MCP Server | MEDIUM |

---

### Section 3: Sync Operations

| Operation | TS SDK | Py SDK | CLI | MCP Server | Plugin Skill | Plugin Command |
|-----------|--------|--------|-----|------------|--------------|----------------|
| **Sync single project** | `sync.syncProject()` | ❌ **MISSING** | `sync project [name]` | ❌ **MISSING** | `project-syncer` ⚠️ | `/fractary-codex:sync-project` |
| **Sync with direction** | `sync.syncProject({direction})` | ❌ **MISSING** | `sync project --to-codex\|--from-codex` | ❌ **MISSING** | `project-syncer {direction}` | `/fractary-codex:sync-project --to-codex` |
| **Sync dry-run** | `sync.syncProject({dryRun})` | ❌ **MISSING** | `sync project --dry-run` | ❌ **MISSING** | `project-syncer {dry_run}` | `/fractary-codex:sync-project --dry-run` |
| **Sync organization** | `sync.syncOrg()` | ❌ **MISSING** | `sync org` | ❌ **MISSING** | `org-syncer` ⚠️ | `/fractary-codex:sync-org` |
| **Create sync plan** | `sync.createSyncPlan()` | ❌ **MISSING** | *(internal)* | ❌ **MISSING** | *(internal)* | *(N/A)* |
| **Evaluate sync paths** | `sync.evaluatePath()` | ❌ **MISSING** | *(internal)* | ❌ **MISSING** | *(internal)* | *(N/A)* |

**Alignment Status:** 🔴 Critical Gap in Python SDK and MCP Server

**Naming Issues:**
| Current | Issue | Recommended |
|---------|-------|-------------|
| Plugin `project-syncer` | Noun form vs verb form | `sync-project` or keep as-is |
| Plugin `org-syncer` | Noun form vs verb form | `sync-org` or keep as-is |

**Missing Features:**
| Feature | Missing From | Priority |
|---------|--------------|----------|
| Entire sync module | Python SDK | **CRITICAL** |
| Project sync | MCP Server | HIGH |
| Org sync | MCP Server | MEDIUM |

---

### Section 4: Type Registry Operations

| Operation | TS SDK | Py SDK | CLI | MCP Server | Plugin Skill | Plugin Command |
|-----------|--------|--------|-----|------------|--------------|----------------|
| **List all types** | `types.listTypes()` | `types.list_types()` | `types list` | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** |
| **Show type details** | `types.getType(name)` | `types.get_type(name)` | `types show <name>` | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** |
| **Add custom type** | `types.addType()` | `types.add_type()` | `types add <name>` | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** |
| **Remove custom type** | `types.removeType()` | `types.remove_type()` | `types remove <name>` | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** |
| **Get TTL for path** | `types.getTtl(path)` | `types.get_ttl(path)` | *(internal)* | ❌ **MISSING** | *(internal)* | *(N/A)* |

**Alignment Status:** ⚠️ Missing from MCP and Plugin

**Missing Features:**
| Feature | Missing From | Priority |
|---------|--------------|----------|
| Type list | MCP Server, Plugin | LOW |
| Type show | MCP Server, Plugin | LOW |
| Type add | MCP Server, Plugin | LOW |
| Type remove | MCP Server, Plugin | LOW |

---

### Section 5: Configuration Operations

| Operation | TS SDK | Py SDK | CLI | MCP Server | Plugin Skill | Plugin Command |
|-----------|--------|--------|-----|------------|--------------|----------------|
| **Initialize config** | `config.loadConfig()` ⚠️ | `config.load_config()` ⚠️ | `init` | ❌ **MISSING** | `config-helper` | `/fractary-codex:init` |
| **Init with org** | `config.loadConfig({org})` | `config.load_config(org=)` | `init --org <name>` | ❌ **MISSING** | `config-helper {org}` | `/fractary-codex:init --org` |
| **Init with codex repo** | `config.loadConfig({codexRepo})` | `config.load_config(codex_repo=)` | `init --codex <repo>` | ❌ **MISSING** | `config-helper {codex}` | `/fractary-codex:init --codex` |
| **Validate setup** | *(no explicit API)* | *(no explicit API)* | *(via health)* | ❌ **MISSING** | *(via health)* | `/fractary-codex:validate-setup` |
| **Validate refs** | `migration.findLegacyReferences()` | `migration.scan_for_legacy_references()` | *(via migrate)* | ❌ **MISSING** | *(via migrator)* | `/fractary-codex:validate-refs` |

**Alignment Status:** ⚠️ SDK naming is load vs CLI init

**Naming Issues:**
| Current | Issue | Recommended |
|---------|-------|-------------|
| SDK `loadConfig()` | Different concept than CLI `init` | Add `initialize()` function |

**Missing Features:**
| Feature | Missing From | Priority |
|---------|--------------|----------|
| Initialize | MCP Server | HIGH |
| Validate setup | MCP Server | LOW |
| Validate refs | MCP Server | LOW |

---

### Section 6: Migration Operations

| Operation | TS SDK | Py SDK | CLI | MCP Server | Plugin Skill | Plugin Command |
|-----------|--------|--------|-----|------------|--------------|----------------|
| **Migrate config** | `migration.migrateConfig()` | `migration.migrate_config()` ⚠️ | `migrate` | ❌ **MISSING** | `config-migrator` | `/fractary-codex:migrate` |
| **Detect version** | `migration.detectVersion()` | `migration.detect_version()` ⚠️ | *(internal)* | ❌ **MISSING** | *(internal)* | *(N/A)* |
| **Convert references** | `migration.convertLegacyReferences()` | `migration.convert_legacy_references()` | `migrate --fix` | ❌ **MISSING** | `config-migrator {fix}` | `/fractary-codex:migrate --fix` |

**Alignment Status:** ⚠️ Python SDK has partial implementation

**Missing Features:**
| Feature | Missing From | Priority |
|---------|--------------|----------|
| Migrate | MCP Server | LOW |
| Full migration support | Python SDK | MEDIUM |

---

### Section 7: Permission Operations

| Operation | TS SDK | Py SDK | CLI | MCP Server | Plugin Skill | Plugin Command |
|-----------|--------|--------|-----|------------|--------------|----------------|
| **Evaluate permission** | `permissions.evaluatePermission()` | ❌ **MISSING** | *(internal)* | ❌ **MISSING** | *(N/A)* | *(N/A)* |
| **Check access** | `permissions.isAllowed()` | ❌ **MISSING** | *(internal)* | ❌ **MISSING** | *(N/A)* | *(N/A)* |
| **Create rule** | `permissions.createRule()` | ❌ **MISSING** | *(N/A)* | ❌ **MISSING** | *(N/A)* | *(N/A)* |
| **Permission manager** | `PermissionManager` class | ❌ **MISSING** | *(internal)* | ❌ **MISSING** | *(N/A)* | *(N/A)* |

**Alignment Status:** 🔴 Python SDK completely missing permissions module

**Missing Features:**
| Feature | Missing From | Priority |
|---------|--------------|----------|
| Entire permissions module | Python SDK | **CRITICAL** |

---

### Section 8: Reference Operations

| Operation | TS SDK | Py SDK | CLI | MCP Server | Plugin Skill | Plugin Command |
|-----------|--------|--------|-----|------------|--------------|----------------|
| **Parse URI** | `parseReference()` | `parse_reference()` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |
| **Build URI** | `buildUri()` | `build_uri()` | *(N/A)* | *(N/A)* | *(N/A)* | *(N/A)* |
| **Validate URI** | `isValidUri()` | `is_valid_uri()` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |
| **Resolve reference** | `resolveReference()` | `resolve_reference()` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |
| **Convert legacy** | `convertLegacyReference()` | `convert_legacy_reference()` | `migrate --fix` | *(N/A)* | `config-migrator` | `/fractary-codex:validate-refs --fix` |

**Alignment Status:** ✅ Good - SDKs aligned, CLI/MCP/Plugin use internally

---

### Section 9: Storage Operations

| Operation | TS SDK | Py SDK | CLI | MCP Server | Plugin Skill | Plugin Command |
|-----------|--------|--------|-----|------------|--------------|----------------|
| **Local storage** | `LocalStorage` | `LocalStorage` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |
| **GitHub storage** | `GitHubStorage` | `GitHubStorage` | *(internal)* | *(internal)* | `handler-sync-github` | *(N/A)* |
| **HTTP storage** | `HttpStorage` | `HttpStorage` | *(internal)* | *(internal)* | `handler-http` | *(N/A)* |
| **Storage manager** | `StorageManager` | `StorageManager` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |

**Alignment Status:** ✅ Good - Both SDKs have all storage providers

---

## Proposed Naming Standard - Complete Command Reference

This table shows **all commands** across all interfaces with the proposed standardized naming following **noun-verb** pattern.

### Naming Principles

1. **Noun-Verb Ordering**: Always `{noun}-{verb}` or `{noun} {verb}` or `{noun}_{verb}`, never `{verb}-{noun}`
   - ✅ `cache-list`, `config-init`, `cache.list()`, `cache_list()`
   - ❌ `list-cache`, `init-config`, `list_cache()`, `listCache()`

2. **Explicit Nouns**: Every command includes the domain/noun explicitly (except when obvious from context)
   - ✅ `document-fetch` (not just `fetch`)
   - ✅ `config-init` (not just `init`)
   - ✅ `cache-list` (not just `list`)
   - ✅ **Exception**: `sync` is acceptable (implies "project sync" as only sync type)

3. **Consistent Grouping**: Commands for the same noun group together alphabetically
   - All `cache-*` commands together
   - All `config-*` commands together
   - All `document-*` commands together

4. **Language Conventions**: Adapt to each language's standard
   - TypeScript SDK: `camelCase` for methods → `cache.list()`, `config.load()`
   - Python SDK: `snake_case` for functions → `cache_list()`, `config_load()`
   - Python SDK: `snake_case` for methods → `cache.list()`, `config.load()`
   - CLI: `space-separated subcommands` → `document fetch`, `cache list`
   - MCP: `snake_case with prefix` → `codex_document_fetch`, `codex_cache_list`
   - Plugin: `kebab-case` → `document-fetch`, `cache-list`

5. **Removed Commands**: org-sync has been removed - only project sync exists (renamed to just `sync`)

### Legend
- ✅ = Implemented and aligned
- ⚠️ = Implemented but needs renaming
- ❌ = Missing, needs implementation
- 🆕 = Proposed new function/command

---

### Document Operations

**Base Operation Name:** `document-fetch` (noun: "document", verb: "fetch")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `document.fetch()` | `storage.fetch()` | ⚠️ RENAME |
| **Python SDK** | `document.fetch()` | `storage.fetch()` | ⚠️ RENAME |
| **CLI** | `document fetch` | `fetch` | ⚠️ RENAME |
| **MCP Tool** | `codex_document_fetch` | `codex_fetch` | ⚠️ RENAME |
| **Plugin Skill** | `fractary-codex:document-fetch` | `document-fetcher` | ⚠️ RENAME |
| **Plugin Command** | `/fractary-codex:document-fetch` | `/fractary-codex:fetch` | ⚠️ RENAME |

**Consistency Check:**
- ✅ Noun "document" appears in ALL interfaces
- ✅ Verb "fetch" appears in ALL interfaces
- ✅ Order is noun-verb everywhere (document fetch, document_fetch, document-fetch)

### Cache Operations

#### cache-clear (noun: "cache", verb: "clear")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `cache.clear()` | `cache.clear()` | ✅ CORRECT |
| **Python SDK** | `cache.clear()` | `cache.clear()` | ✅ CORRECT |
| **CLI** | `cache clear` | `cache clear` | ✅ CORRECT |
| **MCP Tool** | `codex_cache_clear` | `codex_invalidate` | ⚠️ RENAME |
| **Plugin Skill** | `fractary-codex:cache-clear` | `cache-clear` | ⚠️ ADD PREFIX |
| **Plugin Command** | `/fractary-codex:cache-clear` | `/fractary-codex:cache-clear` | ✅ CORRECT |

#### cache-health (noun: "cache", verb: "health")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `cache.health()` | *missing* | 🆕 ADD |
| **Python SDK** | `cache.health()` | *missing* | 🆕 ADD |
| **CLI** | `cache health` | `health` | ⚠️ RENAME |
| **MCP Tool** | `codex_cache_health` | *missing* | 🆕 ADD |
| **Plugin Skill** | `fractary-codex:cache-health` | `cache-health` | ⚠️ ADD PREFIX |
| **Plugin Command** | `/fractary-codex:cache-health` | `/fractary-codex:health` | ⚠️ RENAME |

#### cache-list (noun: "cache", verb: "list")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `cache.list()` | `cache.list()` | ✅ CORRECT |
| **Python SDK** | `cache.list()` | `cache.list()` | ✅ CORRECT |
| **CLI** | `cache list` | `cache list` | ✅ CORRECT |
| **MCP Tool** | `codex_cache_list` | `codex_list` | ⚠️ RENAME |
| **Plugin Skill** | `fractary-codex:cache-list` | `cache-list` | ⚠️ ADD PREFIX |
| **Plugin Command** | `/fractary-codex:cache-list` | `/fractary-codex:cache-list` | ✅ CORRECT |

#### cache-stats (noun: "cache", verb: "stats")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `cache.stats()` | `cache.getStats()` | ⚠️ RENAME |
| **Python SDK** | `cache.stats()` | *missing* | 🆕 ADD |
| **CLI** | `cache stats` | `cache stats` | ✅ CORRECT |
| **MCP Tool** | `codex_cache_stats` | *missing* | 🆕 ADD |
| **Plugin Skill** | `fractary-codex:cache-stats` | `cache-metrics` | ⚠️ RENAME + ADD PREFIX |
| **Plugin Command** | `/fractary-codex:cache-stats` | `/fractary-codex:metrics` | ⚠️ RENAME |

### Config Operations

#### config-init (noun: "config", verb: "init")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `config.init()` | *missing* | 🆕 ADD |
| **Python SDK** | `config.init()` | *missing* | 🆕 ADD |
| **CLI** | `config init` | `init` | ⚠️ RENAME |
| **MCP Tool** | `codex_config_init` | *missing* | 🆕 ADD |
| **Plugin Skill** | `fractary-codex:config-init` | `config-helper` | ⚠️ RENAME + ADD PREFIX |
| **Plugin Command** | `/fractary-codex:config-init` | `/fractary-codex:init` | ⚠️ RENAME |

#### config-load (noun: "config", verb: "load")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `config.load()` | `config.load()` | ✅ CORRECT |
| **Python SDK** | `config.load()` | `load_config()` | ⚠️ RENAME |
| **CLI** | `config load` | *(internal)* | ✅ INTERNAL |
| **MCP Tool** | `codex_config_load` | *(internal)* | ✅ INTERNAL |
| **Plugin Skill** | `fractary-codex:config-load` | *(internal)* | ✅ INTERNAL |
| **Plugin Command** | `/fractary-codex:config-load` | *(internal)* | ✅ INTERNAL |

#### config-migrate (noun: "config", verb: "migrate")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `config.migrate()` | `config.migrate()` | ✅ CORRECT |
| **Python SDK** | `config.migrate()` | `migrate_config()` | ⚠️ RENAME |
| **CLI** | `config migrate` | `migrate` | ⚠️ RENAME |
| **MCP Tool** | `codex_config_migrate` | *missing* | 🆕 ADD |
| **Plugin Skill** | `fractary-codex:config-migrate` | `config-migrator` | ⚠️ RENAME + ADD PREFIX |
| **Plugin Command** | `/fractary-codex:config-migrate` | `/fractary-codex:migrate` | ⚠️ RENAME |

#### config-validate (noun: "config", verb: "validate")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `config.validate()` | *missing* | 🆕 ADD |
| **Python SDK** | `config.validate()` | *missing* | 🆕 ADD |
| **CLI** | `config validate` | *(via health)* | 🆕 ADD |
| **MCP Tool** | `codex_config_validate` | *missing* | 🆕 ADD |
| **Plugin Skill** | `fractary-codex:config-validate` | `config-validate` | ⚠️ ADD PREFIX |
| **Plugin Command** | `/fractary-codex:config-validate` | `/fractary-codex:validate-setup` | ⚠️ RENAME |

### Sync Operations

#### sync (special case: "sync" is both noun and verb)

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `sync()` | `sync.project()` | ⚠️ RENAME |
| **Python SDK** | `sync()` | *entire sync/ module missing* | 🆕 ADD |
| **CLI** | `sync` | `sync project` | ⚠️ RENAME |
| **MCP Tool** | `codex_sync` | *missing* | 🆕 ADD |
| **Plugin Skill** | `fractary-codex:sync` | `project-syncer` | ⚠️ RENAME + ADD PREFIX |
| **Plugin Command** | `/fractary-codex:sync` | `/fractary-codex:sync-project` | ⚠️ RENAME |

**Note:** Sync is a special case where the noun and verb are identical. All "project-sync" and "org-sync" terminology has been simplified to just "sync".

### Types Operations

#### types-add (noun: "types", verb: "add")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `types.add()` | `types.add()` | ✅ CORRECT |
| **Python SDK** | `types.add()` | `types.add()` | ✅ CORRECT |
| **CLI** | `types add` | `types add` | ✅ CORRECT |
| **MCP Tool** | `codex_types_add` | *missing* | 🆕 ADD |
| **Plugin Skill** | `fractary-codex:types-add` | *missing* | 🆕 ADD |
| **Plugin Command** | `/fractary-codex:types-add` | *missing* | 🆕 ADD |

#### types-list (noun: "types", verb: "list")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `types.list()` | `types.list()` | ✅ CORRECT |
| **Python SDK** | `types.list()` | `types.list()` | ✅ CORRECT |
| **CLI** | `types list` | `types list` | ✅ CORRECT |
| **MCP Tool** | `codex_types_list` | *missing* | 🆕 ADD |
| **Plugin Skill** | `fractary-codex:types-list` | *missing* | 🆕 ADD |
| **Plugin Command** | `/fractary-codex:types-list` | *missing* | 🆕 ADD |

#### types-remove (noun: "types", verb: "remove")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `types.remove()` | `types.remove()` | ✅ CORRECT |
| **Python SDK** | `types.remove()` | `types.remove()` | ✅ CORRECT |
| **CLI** | `types remove` | `types remove` | ✅ CORRECT |
| **MCP Tool** | `codex_types_remove` | *missing* | 🆕 ADD |
| **Plugin Skill** | `fractary-codex:types-remove` | *missing* | 🆕 ADD |
| **Plugin Command** | `/fractary-codex:types-remove` | *missing* | 🆕 ADD |

#### types-show (noun: "types", verb: "show")

| Interface | Target Name | Current Name | Status |
|-----------|-------------|--------------|--------|
| **TS SDK** | `types.show()` | `types.get()` | ⚠️ RENAME |
| **Python SDK** | `types.show()` | `types.get()` | ⚠️ RENAME |
| **CLI** | `types show` | `types show` | ✅ CORRECT |
| **MCP Tool** | `codex_types_show` | *missing* | 🆕 ADD |
| **Plugin Skill** | `fractary-codex:types-show` | *missing* | 🆕 ADD |
| **Plugin Command** | `/fractary-codex:types-show` | *missing* | 🆕 ADD |

### Permission Operations

**Target Naming Pattern:** All use "permission-{verb}" with IDENTICAL verbs across all interfaces (internal operations only)

| Operation | TS SDK | Python SDK | CLI | MCP Server | Plugin Skill | Plugin Command |
|-----------|--------|------------|-----|------------|--------------|----------------|
| **Evaluate** | ✅ `permissions.evaluate()` | ❌ MISSING `permissions.evaluate()` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |
| **Check** | ⚠️ `permissions.check()` | ❌ MISSING `permissions.check()` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |
| **Create** | ⚠️ `permissions.create()` | ❌ MISSING `permissions.create()` | *(N/A)* | *(N/A)* | *(N/A)* | *(N/A)* |

**Current Names (need renaming or implementation):**
- TS SDK: `permissions.isAllowed()` → `permissions.check()` (use consistent verb)
- TS SDK: `permissions.createRule()` → `permissions.create()` (remove redundant "Rule")
- Python SDK: Entire `permissions/` module is MISSING

### Reference Operations (Internal/Utility)

**Target Naming Pattern:** All use "{verb}_reference" with IDENTICAL verbs (internal utility functions)

| Operation | TS SDK | Python SDK | CLI | MCP Server | Plugin Skill | Plugin Command |
|-----------|--------|------------|-----|------------|--------------|----------------|
| **Parse** | ✅ `parse_reference()` | ✅ `parse_reference()` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |
| **Build** | ⚠️ `build_reference()` | ⚠️ `build_reference()` | *(N/A)* | *(N/A)* | *(N/A)* | *(N/A)* |
| **Validate** | ⚠️ `validate_reference()` | ⚠️ `validate_reference()` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |
| **Resolve** | ✅ `resolve_reference()` | ✅ `resolve_reference()` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |
| **Convert** | ⚠️ `convert_reference()` | ⚠️ `convert_reference()` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |

**Current Names (need renaming for consistency):**
- TS SDK: `parseReference()` → `parse_reference()` (use snake_case for standalone functions)
- TS SDK: `buildUri()` → `build_reference()` (use "reference" consistently, not "uri")
- TS SDK: `isValidUri()` → `validate_reference()` (use verb "validate", not "isValid")
- TS SDK: `resolveReference()` → `resolve_reference()` (use snake_case)
- TS SDK: `convertLegacyReference()` → `convert_reference()` (simplify, remove "legacy")
- Py SDK: `build_uri()` → `build_reference()` (use "reference" consistently)
- Py SDK: `is_valid_uri()` → `validate_reference()` (use verb "validate")
- Py SDK: `convert_legacy_reference()` → `convert_reference()` (simplify)

### Storage Operations (Internal)

**Target Naming Pattern:** Storage providers are classes (not commands) - naming already consistent

| Operation | TS SDK | Python SDK | CLI | MCP Server | Plugin Skill | Plugin Command |
|-----------|--------|------------|-----|------------|--------------|----------------|
| **Local storage** | ✅ `LocalStorage` | ✅ `LocalStorage` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |
| **GitHub storage** | ✅ `GitHubStorage` | ✅ `GitHubStorage` | *(internal)* | *(internal)* | ✅ `handler-sync-github` | *(N/A)* |
| **HTTP storage** | ✅ `HttpStorage` | ✅ `HttpStorage` | *(internal)* | *(internal)* | ✅ `handler-http` | *(N/A)* |
| **Storage manager** | ✅ `StorageManager` | ✅ `StorageManager` | *(internal)* | *(internal)* | *(internal)* | *(N/A)* |

**Status:** ✅ All storage operations already aligned between TS and Python SDKs

---

## Summary of Alignment Issues

### Naming Inconsistencies to Fix (Noun-Verb Pattern)

| Current | Component | Issue | Proposed | Priority |
|---------|-----------|-------|----------|----------|
| `fetch` | CLI | Missing noun | `document fetch` | HIGH |
| `codex_fetch` | MCP | Missing noun | `codex_document_fetch` | HIGH |
| `/codex:fetch` | Plugin Cmd | Missing noun | `/codex:document-fetch` | HIGH |
| `init` | CLI | Missing noun | `config init` | HIGH |
| `codex_init` | MCP | Missing noun | `codex_config_init` | HIGH |
| `/codex:init` | Plugin Cmd | Missing noun | `/codex:config-init` | HIGH |
| `migrate` | CLI | Missing noun | `config migrate` | HIGH |
| `codex_migrate` | MCP | Missing noun | `codex_config_migrate` | HIGH |
| `/codex:migrate` | Plugin Cmd | Missing noun | `/codex:config-migrate` | HIGH |
| `health` | CLI | Missing noun | `cache health` | HIGH |
| `codex_health` | MCP | Missing noun | `codex_cache_health` | HIGH |
| `/codex:health` | Plugin Cmd | Missing noun | `/codex:cache-health` | HIGH |
| `sync project` | CLI | Simplify to just sync | `sync` | HIGH |
| `codex_sync_project` | MCP | Simplify to just sync | `codex_sync` | HIGH |
| `/codex:sync-project` | Plugin Cmd | Simplify to just sync | `/codex:sync` | HIGH |
| `codex_list` | MCP | Ambiguous noun | `codex_cache_list` | HIGH |
| `codex_invalidate` | MCP | Wrong verb for cache clear | `codex_cache_clear` | HIGH |
| `cache.getStats()` | TS SDK | Inconsistent verb | `cache.stats()` (alias) | MEDIUM |
| `cache-metrics` | Plugin | Different term from stats | `cache-stats` | MEDIUM |
| `/codex:metrics` | Plugin | Missing noun + different term | `/codex:cache-stats` | MEDIUM |
| `document-fetcher` | Plugin Skill | Noun-agent suffix | `document-fetch` | LOW |
| `project-syncer` | Plugin Skill | Rename to just sync | `sync` | LOW |
| `config-helper` | Plugin Skill | Too generic | `config-init` | LOW |
| `config-migrator` | Plugin Skill | Noun-agent suffix | `config-migrate` | LOW |
| `load_config()` | Python SDK | Verb-noun order | `config_load()` or `config.load()` | HIGH |
| `migrate_config()` | Python SDK | Verb-noun order | `config_migrate()` or `config.migrate()` | HIGH |
| `scan_for_legacy_references()` | Python SDK | Verb-noun order | `reference_scan_legacy()` | MEDIUM |

### Missing Features to Add

| Feature | Missing From | Priority |
|---------|--------------|----------|
| `sync/` module | Python SDK | **CRITICAL** |
| `permissions/` module | Python SDK | **CRITICAL** |
| `codex_cache_stats` | MCP Server | HIGH |
| `codex_sync` | MCP Server | HIGH |
| `codex_config_init` | MCP Server | HIGH |
| `codex_cache_health` | MCP Server | MEDIUM |
| `codex_document_fetch` (rename from `codex_fetch`) | MCP Server | HIGH |
| `codex_cache_list` (rename from `codex_list`) | MCP Server | HIGH |
| `codex_cache_clear` (rename from `codex_invalidate`) | MCP Server | HIGH |
| `cache.stats()` method | Both SDKs | HIGH |
| `cache.health()` method | Both SDKs | MEDIUM |
| `config.init()` method | Both SDKs | MEDIUM |
| Type management tools | MCP Server, Plugin | LOW |

---

## Complete Naming Alignment Table (Deprecated - See Above)

This section has been replaced by the comprehensive command reference table above.

---

## Required Changes by Component

### TypeScript SDK Changes

| Change Type | Current | Target | Breaking? | Priority |
|-------------|---------|--------|-----------|----------|
| ADD | - | `cache.stats()` | No | HIGH |
| ADD | - | `cache.health()` | No | HIGH |
| ADD | - | `initialize()` | No | MEDIUM |
| RENAME | `cache.getStats()` | `cache.stats()` | ⚠️ Deprecate old | LOW |
| ADD | - | `HealthChecker` class | No | MEDIUM |

**Files to modify:**
- `sdk/js/src/cache/manager.ts` - Add `stats()` alias, `health()` method
- `sdk/js/src/core/config/loader.ts` - Add `initialize()` export
- `sdk/js/src/health/` - New module for health checking
- `sdk/js/src/index.ts` - Export new functions

### Python SDK Changes

| Change Type | Current | Target | Breaking? | Priority |
|-------------|---------|--------|-----------|----------|
| ADD MODULE | - | `sync/` | No | **CRITICAL** |
| ADD MODULE | - | `permissions/` | No | **CRITICAL** |
| ADD | - | `core/routing/` | No | HIGH |
| ADD | - | `core/custom/` | No | MEDIUM |
| ADD | - | `cache.stats()` | No | HIGH |
| ADD | - | `cache.health()` | No | MEDIUM |
| ADD | - | `initialize()` | No | MEDIUM |
| COMPLETE | partial | `migration/` | No | MEDIUM |

**Files to create:**
- `sdk/py/fractary_codex/sync/__init__.py`
- `sdk/py/fractary_codex/sync/manager.py`
- `sdk/py/fractary_codex/sync/planner.py`
- `sdk/py/fractary_codex/sync/evaluator.py`
- `sdk/py/fractary_codex/sync/manifest.py`
- `sdk/py/fractary_codex/permissions/__init__.py`
- `sdk/py/fractary_codex/permissions/manager.py`
- `sdk/py/fractary_codex/permissions/evaluator.py`
- `sdk/py/fractary_codex/core/routing.py`
- `sdk/py/fractary_codex/core/custom.py`
- `sdk/py/fractary_codex/health/__init__.py`

### CLI Changes

| Change Type | Current | Target | Breaking? | Priority |
|-------------|---------|--------|-----------|----------|
| RENAME | `fetch` | `document fetch` | ⚠️ Deprecate | HIGH |
| RENAME | `init` | `config init` | ⚠️ Deprecate | HIGH |
| RENAME | `migrate` | `config migrate` | ⚠️ Deprecate | HIGH |
| RENAME | `health` | `cache health` | ⚠️ Deprecate | HIGH |
| RENAME | `sync project` | `sync` | ⚠️ Deprecate | HIGH |
| REMOVE | `sync org` | - | ⚠️ Yes | HIGH |

**Files to modify:**
- `cli/src/cli.ts` - Update command names to follow noun-verb pattern
- `cli/README.md` - Update documentation with new command names

### MCP Server Changes

| Change Type | Current | Target | Breaking? | Priority |
|-------------|---------|--------|-----------|----------|
| RENAME | `codex_fetch` | `codex_document_fetch` | ⚠️ Yes | HIGH |
| RENAME | `codex_list` | `codex_cache_list` | ⚠️ Yes | HIGH |
| RENAME | `codex_invalidate` | `codex_cache_clear` | ⚠️ Yes | HIGH |
| ADD | - | `codex_cache_stats` | No | HIGH |
| ADD | - | `codex_cache_health` | No | MEDIUM |
| ADD | - | `codex_sync` | No | HIGH |
| ADD | - | `codex_config_init` | No | HIGH |
| ADD | - | `codex_config_migrate` | No | LOW |
| ADD | - | `codex_config_validate_refs` | No | LOW |
| ADD | - | `codex_config_validate_setup` | No | LOW |
| ADD | - | `codex_types_list` | No | LOW |
| ADD | - | `codex_types_show` | No | LOW |
| ADD | - | `codex_types_add` | No | LOW |
| ADD | - | `codex_types_remove` | No | LOW |

**Files to modify:**
- `mcp/server/src/tools.ts` - Add new tools, rename existing
- `mcp/server/src/types.ts` - Add new type definitions
- `mcp/server/src/server.ts` - Update capabilities

### Plugin Changes

| Change Type | Current | Target | Breaking? | Priority |
|-------------|---------|--------|-----------|----------|
| RENAME | `document-fetcher` | `document-fetch` | ⚠️ Deprecate | LOW |
| RENAME | `cache-metrics` | `cache-stats` | ⚠️ Deprecate | MEDIUM |
| RENAME | `config-helper` | `config-init` | ⚠️ Deprecate | LOW |
| RENAME | `config-migrator` | `config-migrate` | ⚠️ Deprecate | LOW |
| RENAME | `project-syncer` | `sync` | ⚠️ Deprecate | HIGH |
| REMOVE | `org-syncer` | - | ⚠️ Yes | HIGH |
| RENAME | `/fractary-codex:fetch` | `/fractary-codex:document-fetch` | ⚠️ Deprecate | HIGH |
| RENAME | `/fractary-codex:init` | `/fractary-codex:config-init` | ⚠️ Deprecate | HIGH |
| RENAME | `/fractary-codex:migrate` | `/fractary-codex:config-migrate` | ⚠️ Deprecate | HIGH |
| RENAME | `/fractary-codex:metrics` | `/fractary-codex:cache-stats` | ⚠️ Deprecate | MEDIUM |
| RENAME | `/fractary-codex:sync-project` | `/fractary-codex:sync` | ⚠️ Deprecate | HIGH |
| REMOVE | `/fractary-codex:sync-org` | - | ⚠️ Yes | HIGH |
| ADD | - | `types-list` | No | LOW |
| ADD | - | `types-show` | No | LOW |
| ADD | - | Direct MCP integration | No | MEDIUM |

**Files to modify/create:**
- `plugins/codex/skills/document-fetch/skill.md` - Rename from document-fetcher
- `plugins/codex/skills/cache-stats/skill.md` - Rename from cache-metrics
- `plugins/codex/skills/config-init/skill.md` - Rename from config-helper
- `plugins/codex/skills/config-migrate/skill.md` - Rename from config-migrator
- `plugins/codex/skills/sync/skill.md` - Rename from project-syncer, simplify name
- `plugins/codex/skills/types-list/skill.md` - New
- `plugins/codex/skills/types-show/skill.md` - New
- `plugins/codex/commands/document-fetch.md` - Rename from fetch.md
- `plugins/codex/commands/config-init.md` - Rename from init.md
- `plugins/codex/commands/config-migrate.md` - Rename from migrate.md
- `plugins/codex/commands/cache-stats.md` - Rename from metrics.md
- `plugins/codex/commands/sync.md` - Rename from sync-project.md
- `plugins/codex/plugin.json` - Update skill registry
- **DELETE** `plugins/codex/skills/org-syncer/` - Remove org sync entirely
- **DELETE** `plugins/codex/commands/sync-org.md` - Remove org sync command

---

## Implementation Phases

### Phase 1: MCP Server Alignment (Week 1) - HIGH PRIORITY

**Goal:** Rename existing tools to follow noun-verb pattern and add core missing tools

**Tasks:**
1. [ ] Rename `codex_fetch` → `codex_document_fetch`
2. [ ] Rename `codex_list` → `codex_cache_list`
3. [ ] Rename `codex_invalidate` → `codex_cache_clear`
4. [ ] Add `codex_cache_stats` tool
5. [ ] Add `codex_cache_health` tool
6. [ ] Add `codex_sync` tool (project sync only)
7. [ ] Add `codex_config_init` tool
8. [ ] Update types.ts with new definitions
9. [ ] Update tests
10. [ ] Update documentation

**Deliverable:** MCP Server v0.2.0 with 9 tools (vs current 4), all following noun-verb naming

### Phase 2: Python SDK Critical Modules (Weeks 2-3) - CRITICAL

**Goal:** Add missing sync and permissions modules

**Tasks:**
1. [ ] Create `sync/` module structure
2. [ ] Implement `SyncManager` class
3. [ ] Implement `SyncPlanner` class
4. [ ] Implement `SyncEvaluator` class
5. [ ] Implement `SyncManifest` class
6. [ ] Create `permissions/` module structure
7. [ ] Implement `PermissionManager` class
8. [ ] Implement `PermissionEvaluator` class
9. [ ] Add unit tests for both modules
10. [ ] Update `__init__.py` exports

**Deliverable:** Python SDK v0.2.0 with sync and permissions modules

### Phase 3: SDK Health APIs (Week 4) - MEDIUM

**Goal:** Add health check APIs to both SDKs

**Tasks:**
1. [ ] TypeScript: Create `health/` module
2. [ ] TypeScript: Add `cache.stats()` alias
3. [ ] TypeScript: Add `cache.health()` method
4. [ ] Python: Create `health/` module
5. [ ] Python: Add `cache.stats()` alias
6. [ ] Python: Add `cache.health()` method
7. [ ] Add tests for health APIs

**Deliverable:** TS SDK v0.3.0, Py SDK v0.3.0

### Phase 4: Plugin & CLI Alignment (Week 5) - HIGH

**Goal:** Rename skills/commands to follow noun-verb pattern, remove org-sync

**Tasks:**
1. [ ] CLI: Rename `fetch` → `document fetch`
2. [ ] CLI: Rename `init` → `config init`
3. [ ] CLI: Rename `migrate` → `config migrate`
4. [ ] CLI: Rename `health` → `cache health`
5. [ ] CLI: Rename `sync project` → `sync`
6. [ ] CLI: Remove `sync org` command entirely
7. [ ] Plugin: Rename `document-fetcher` → `document-fetch`
8. [ ] Plugin: Rename `cache-metrics` → `cache-stats`
9. [ ] Plugin: Rename `config-helper` → `config-init`
10. [ ] Plugin: Rename `config-migrator` → `config-migrate`
11. [ ] Plugin: Rename `project-syncer` → `sync`
12. [ ] Plugin: Remove `org-syncer` skill entirely
13. [ ] Add deprecation notices for old names
14. [ ] Add `types-list` skill
15. [ ] Add `types-show` skill
16. [ ] Update plugin.json and CLI
17. [ ] Update documentation

**Deliverable:** CLI v0.3.0 and Plugin v3.0.0 with aligned noun-verb naming

### Phase 5: Complete MCP Coverage (Week 6) - LOW

**Goal:** Add remaining MCP tools for full coverage (following noun-verb pattern)

**Tasks:**
1. [ ] Add `codex_config_migrate` tool
2. [ ] Add `codex_config_validate_refs` tool
3. [ ] Add `codex_config_validate_setup` tool
4. [ ] Add `codex_types_list` tool
5. [ ] Add `codex_types_show` tool
6. [ ] Add `codex_types_add` tool
7. [ ] Add `codex_types_remove` tool

**Deliverable:** MCP Server v0.3.0 with 16 tools (100% CLI parity, no org-sync)

### Phase 6: Python SDK Completion (Weeks 7-8) - LOW

**Goal:** Complete remaining Python SDK gaps

**Tasks:**
1. [ ] Add `core/routing.py`
2. [ ] Add `core/custom.py`
3. [ ] Complete migration module
4. [ ] Add comprehensive tests
5. [ ] Documentation updates

**Deliverable:** Python SDK v1.0.0 (production ready)

---

## Naming Convention Standards

### SDK Functions (TypeScript)

```typescript
// Pattern: Methods use simple verbs (object.verb), standalone functions use noun_verb
// For object methods: The object name IS the noun, method name is the verb
cache.list()       // ✅ noun=cache, verb=list (not: cache.getList())
cache.stats()      // ✅ noun=cache, verb=stats (not: cache.getStats())
cache.clear()      // ✅ noun=cache, verb=clear (not: cache.deleteAll())
cache.health()     // ✅ noun=cache, verb=health (not: cache.checkHealth())
sync.execute()     // ✅ noun=sync, verb=execute (simplified from sync.project())
types.list()       // ✅ noun=types, verb=list (not: types.getTypes())

// For standalone functions (if any): use noun_verb pattern
config_load()      // ✅ noun_verb (not: load_config)
config_migrate()   // ✅ noun_verb (not: migrate_config)
```

### SDK Functions (Python)

```python
# Pattern: Methods use simple verbs (object.verb), standalone functions use noun_verb
# For object methods: The object name IS the noun, method name is the verb
cache.list()       # ✅ noun=cache, verb=list (not: cache.get_list())
cache.stats()      # ✅ noun=cache, verb=stats (not: cache.get_stats())
cache.clear()      # ✅ noun=cache, verb=clear (not: cache.delete_all())
cache.health()     # ✅ noun=cache, verb=health (not: cache.check_health())
sync.execute()     # ✅ noun=sync, verb=execute (simplified from sync.project())
types.list()       # ✅ noun=types, verb=list (not: types.get_types())

# For standalone functions (if any): use noun_verb pattern
config_load()      # ✅ noun_verb (not: load_config)
config_migrate()   # ✅ noun_verb (not: migrate_config)
```

### CLI Commands

```bash
# Pattern: space-separated subcommands with noun-verb order
fractary-codex document fetch  # not: fetch (missing noun)
fractary-codex cache list      # not: list-cache (verb-noun order)
fractary-codex cache stats     # not: metrics (different term)
fractary-codex cache clear     # not: clear-cache (verb-noun order)
fractary-codex cache health    # not: health (missing noun)
fractary-codex config init     # not: init (missing noun)
fractary-codex config migrate  # not: migrate (missing noun)
fractary-codex sync            # simplified from: sync project
fractary-codex types list      # not: list-types (verb-noun order)
```

### MCP Tools

```typescript
// Pattern: snake_case with codex_ prefix, following noun_verb order
codex_document_fetch   // not: codex_fetch (missing noun)
codex_cache_list       // not: codex_list (missing noun)
codex_cache_stats      // not: codex_get_stats (wrong verb)
codex_cache_clear      // not: codex_invalidate (wrong verb)
codex_cache_health     // not: codex_health (missing noun)
codex_config_init      // not: codex_init (missing noun)
codex_config_migrate   // not: codex_migrate (missing noun)
codex_sync             // simplified from: codex_sync_project
codex_types_list       // not: codex_list_types (verb-noun order)
```

### Plugin Skills

```yaml
# Pattern: kebab-case, following noun-verb order
document-fetch     # not: document-fetcher (agent suffix)
cache-list         # cache operations grouped: cache-*
cache-stats        # not: cache-metrics (different term)
cache-clear        # not: cache-cleaner (agent suffix)
cache-health       # not: health (missing noun)
config-init        # not: config-helper (generic name)
config-migrate     # not: config-migrator (agent suffix)
sync               # simplified from: project-syncer
types-list         # type operations grouped: types-*
```

### Plugin Commands

```bash
# Pattern: /fractary-codex:kebab-case following noun-verb order
/fractary-codex:document-fetch  # not: /fractary-codex:fetch
/fractary-codex:cache-list      # not: /fractary-codex:list
/fractary-codex:cache-stats     # not: /fractary-codex:metrics
/fractary-codex:cache-clear     # not: /fractary-codex:invalidate
/fractary-codex:cache-health    # not: /fractary-codex:health
/fractary-codex:config-init     # not: /fractary-codex:init
/fractary-codex:config-migrate  # not: /fractary-codex:migrate
/fractary-codex:sync            # simplified from: /fractary-codex:sync-project
/fractary-codex:types-list      # not: /fractary-codex:list-types
```

---

## Migration Strategy

### Breaking Change Handling

For renamed APIs/tools:

1. **Phase 1 (Current release):** Add new name as alias
2. **Phase 2 (Next minor release):** Deprecation warnings on old name
3. **Phase 3 (Next major release):** Remove old name

### Example: MCP `codex_list` → `codex_cache_list`

```typescript
// v0.2.0: Both work, no warning
codex_list → codex_cache_list (alias)

// v0.3.0: Old name warns
codex_list → "Deprecated: use codex_cache_list"

// v1.0.0: Old name removed
codex_list → "Unknown tool"
```

### Backward Compatibility Timeline

| Component | Current | Deprecated | Removed |
|-----------|---------|------------|---------|
| MCP `codex_fetch` | v0.1.0 | v0.2.0 | v1.0.0 |
| MCP `codex_list` | v0.1.0 | v0.2.0 | v1.0.0 |
| MCP `codex_invalidate` | v0.1.0 | v0.2.0 | v1.0.0 |
| CLI `fetch` | v0.2.2 | v0.3.0 | v1.0.0 |
| CLI `init` | v0.2.2 | v0.3.0 | v1.0.0 |
| CLI `migrate` | v0.2.2 | v0.3.0 | v1.0.0 |
| CLI `health` | v0.2.2 | v0.3.0 | v1.0.0 |
| CLI `sync project` | v0.2.2 | v0.3.0 | v1.0.0 |
| Plugin `document-fetcher` | v2.0.0 | v3.0.0 | v4.0.0 |
| Plugin `cache-metrics` | v2.0.0 | v3.0.0 | v4.0.0 |
| Plugin `config-helper` | v2.0.0 | v3.0.0 | v4.0.0 |
| Plugin `config-migrator` | v2.0.0 | v3.0.0 | v4.0.0 |
| Plugin `project-syncer` | v2.0.0 | v3.0.0 | v4.0.0 |
| Plugin `org-syncer` | v2.0.0 | **REMOVED** v3.0.0 | N/A |
| Plugin `/codex:fetch` | v2.0.0 | v3.0.0 | v4.0.0 |
| Plugin `/codex:init` | v2.0.0 | v3.0.0 | v4.0.0 |
| Plugin `/codex:migrate` | v2.0.0 | v3.0.0 | v4.0.0 |
| Plugin `/codex:metrics` | v2.0.0 | v3.0.0 | v4.0.0 |
| Plugin `/codex:sync-project` | v2.0.0 | v3.0.0 | v4.0.0 |
| Plugin `/codex:sync-org` | v2.0.0 | **REMOVED** v3.0.0 | N/A |

---

## Acceptance Criteria

### Feature Parity

- [ ] Python SDK has `sync/` module with feature parity to TypeScript
- [ ] Python SDK has `permissions/` module with feature parity to TypeScript
- [ ] MCP Server exposes all 16 tools (matching CLI commands, no org-sync)
- [ ] Plugin has skills for all operations (no org-sync)
- [ ] All org-sync functionality removed from all components

### Naming Consistency

- [ ] All MCP tools follow `codex_{noun}_{verb}` pattern (explicit noun in every tool)
- [ ] All Plugin skills follow `{noun}-{verb}` pattern (explicit noun in every skill)
- [ ] All CLI commands follow `{noun} {verb}` subcommand pattern (explicit noun in every command)
- [ ] SDK methods follow `object.verb()` pattern (object name is the noun)
- [ ] SDK standalone functions follow `noun_verb()` pattern (e.g., `config_load()` not `load_config()`)
- [ ] No command uses verb-noun ordering (e.g., no `sync-project`, use `project-sync` or simplified `sync`)

### Documentation

- [ ] README updated with alignment table
- [ ] Migration guide for renamed APIs
- [ ] API reference shows all interfaces side-by-side

### Testing

- [ ] All new SDK functions have unit tests
- [ ] All new MCP tools have integration tests
- [ ] All renamed APIs have deprecation tests
- [ ] Cross-component integration tests pass

---

## Estimated Effort

| Phase | Description | Effort | Priority |
|-------|-------------|--------|----------|
| 1 | MCP Server Alignment | 1 week | HIGH |
| 2 | Python SDK Critical | 2 weeks | CRITICAL |
| 3 | SDK Health APIs | 1 week | MEDIUM |
| 4 | Plugin & CLI Alignment | 1 week | HIGH |
| 5 | Complete MCP | 1 week | LOW |
| 6 | Python SDK Complete | 2 weeks | LOW |
| **Total** | | **8 weeks** | |

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking changes affect users | HIGH | MEDIUM | Deprecation period, clear migration docs |
| Python sync module complex | MEDIUM | HIGH | Port from TypeScript, extensive testing |
| MCP rename breaks integrations | MEDIUM | LOW | Support both names during transition |
| Plugin skill rename confuses users | LOW | MEDIUM | Clear deprecation warnings |

---

## Success Metrics

1. **Feature Parity Score:** 100% (all components have equivalent functionality)
2. **Naming Consistency Score:** 100% (all follow naming standards)
3. **Documentation Coverage:** 100% (all APIs documented with examples)
4. **Test Coverage:** >80% for new code
5. **User Adoption:** No support tickets about naming confusion
