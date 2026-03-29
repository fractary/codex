# Cache Management

Inspect, clear, and diagnose the local document cache. The cache stores fetched documents from external codex repositories to reduce network requests and improve performance.

## Quick Reference

| Operation | SDK | CLI | MCP |
|-----------|-----|-----|-----|
| [List entries](#list-cache-entries) | `client.listCacheEntries(opts)` | `cache-list` | `codex_cache_list` |
| [Clear entries](#clear-cache) | — | `cache-clear` | `codex_cache_clear` |
| [Cache statistics](#cache-statistics) | — | `cache-stats` | `codex_cache_stats` |
| [Health diagnostics](#cache-health) | `client.getHealthChecks()` | `cache-health` | `codex_cache_health` |

> Cache management is not available via the Claude Code plugin slash commands — use CLI or MCP tools.

---

## List Cache Entries

Shows documents currently stored in the local cache with their status, size, and expiry.

### List Cache Entries: SDK

```typescript
import { CodexClient } from '@fractary/codex'

const client = await CodexClient.create()
const result = await client.listCacheEntries({
  status: 'fresh',          // 'fresh' | 'stale' | 'expired' | 'all'
  limit: 20,
  sort: 'createdAt',        // 'uri' | 'size' | 'createdAt' | 'expiresAt'
  desc: true,
})

for (const entry of result.entries) {
  console.log(entry.uri, entry.status, entry.size)
}
```

### List Cache Entries: CLI

```bash
fractary-codex cache-list [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--status <status>` | `all` | Filter: `fresh`, `stale`, `expired`, `all` |
| `--limit <n>` | no limit | Max entries to show |
| `--sort <field>` | `uri` | Sort by: `uri`, `size`, `createdAt`, `expiresAt` |
| `--desc` | `false` | Sort descending |
| `--verbose` | `false` | Show detailed entry info |
| `--json` | `false` | Output as JSON |

**Examples:**

```bash
# List all entries
fractary-codex cache-list

# Show fresh entries, sorted by size (largest first)
fractary-codex cache-list --status fresh --sort size --desc

# Show the 10 most recently cached entries with details
fractary-codex cache-list --verbose --limit 10 --sort createdAt --desc
```

### List Cache Entries: MCP

**Tool:** `codex_cache_list`

| Parameter | Type | Description |
|-----------|------|-------------|
| `org` | string | Filter by organization |
| `project` | string | Filter by project |
| `includeExpired` | boolean | Include expired entries (default: false) |

---

## Clear Cache

Removes entries from the local cache. Requires either `--all` or a pattern.

### Clear Cache: CLI

```bash
fractary-codex cache-clear [options]
```

| Option | Description |
|--------|-------------|
| `--all` | Clear the entire cache |
| `--pattern <glob>` | Clear entries matching a URI glob pattern |
| `--dry-run` | Preview what would be cleared without removing |

**Examples:**

```bash
# Clear everything
fractary-codex cache-clear --all

# Clear a specific project
fractary-codex cache-clear --pattern "codex://myorg/project/*"

# Preview what would be cleared
fractary-codex cache-clear --pattern "codex://myorg/*" --dry-run
```

### Clear Cache: MCP

**Tool:** `codex_cache_clear`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | yes | URI glob pattern to match entries |

**Example:**
```json
{
  "name": "codex_cache_clear",
  "arguments": {
    "pattern": "codex://myorg/project/*"
  }
}
```

---

## Cache Statistics

Displays aggregate stats: entry count, total size, and freshness breakdown.

### Cache Statistics: CLI

```bash
fractary-codex cache-stats [--json]
```

### Cache Statistics: MCP

**Tool:** `codex_cache_stats`

| Parameter | Type | Description |
|-----------|------|-------------|
| `json` | boolean | Output as JSON |

---

## Cache Health

Runs diagnostics on the full codex setup: configuration validity, storage providers, SDK client initialization, and cache health.

### Cache Health: SDK

```typescript
const client = await CodexClient.create()
const checks = await client.getHealthChecks()

for (const check of checks) {
  console.log(`${check.name}: ${check.status} — ${check.message}`)
}
// Cache: pass — 42 entries (95% fresh)
// Storage: pass — 2 provider(s) available
// Type Registry: pass — 8 types registered
```

### Cache Health: CLI

```bash
fractary-codex cache-health [--json]
```

Checks run:
- Configuration structure
- Storage provider connectivity
- SDK client initialization
- Cache health (entry count, freshness percentage)
- Type registry

### Cache Health: MCP

**Tool:** `codex_cache_health`

No parameters required.

---

## Cache Location

The cache directory is created during `config-init` at `.fractary/codex/cache/` and excluded from version control via `.fractary/.gitignore`.

To change the cache directory location, update the `configPath` option when creating a `CodexClient`, or specify an explicit `cacheDir` if constructing the cache manager directly.

---

## See Also

- [Fetch Documents](./fetch-documents.md) — Fetching docs and bypassing cache
- [Configuration Reference](../configuration.md#type-registry) — TTL configuration by document type
