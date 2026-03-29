# Fetch Documents

Retrieve documents from codex repositories using `codex://` URIs.

## Quick Reference

| Operation | SDK | CLI | MCP |
|-----------|-----|-----|-----|
| [Fetch document](#fetch-document) | `client.fetch(uri)` | `document-fetch <uri>` | `codex_document_fetch` |
| [List file sources](#list-file-sources) | — | — | `codex_file_sources_list` |

> Document fetching is not available as a Claude Code plugin slash command — the MCP server handles it automatically when you reference a `codex://` URI in a Claude Code conversation.

---

## URI Format

```
codex://org/project/path/to/file.md
       └─┬─┘└──┬──┘└──────┬───────┘
         │     │          └─ File path within project
         │     └─ Project/repository name
         └─ Organization name
```

**Examples:**
```
codex://myorg/my-project/docs/api.md
codex://myorg/codex.myorg.com/docs/standards.md
codex://myorg/shared-service/specs/SPEC-001.md
```

---

## Fetch Document

Retrieves a document by its `codex://` URI. Fetches from the configured GitHub repository, with caching for external projects and direct local reads for current-project files.

### Fetch Document: SDK

```typescript
import { CodexClient } from '@fractary/codex'

const client = await CodexClient.create()
const result = await client.fetch('codex://myorg/project/docs/api.md')

console.log(result.content.toString())
console.log(result.source)     // 'github' | 'local' | 'file-plugin' | 'cache'
console.log(result.cached)     // true if served from cache
console.log(result.uri)        // the resolved URI
```

**Options:**

```typescript
const result = await client.fetch(uri, {
  bypassCache: true,    // Skip cache, fetch fresh from source
  ttl: 3600,           // Override TTL in seconds
})
```

**`CodexClient.create()` options:**

```typescript
const client = await CodexClient.create({
  configPath: '.fractary/config.yaml',  // default
  organizationSlug: 'myorg',            // override org (auto-detected from config)
})
```

### Fetch Document: CLI

```bash
fractary-codex document-fetch <uri> [options]
```

| Argument / Option | Description |
|-------------------|-------------|
| `<uri>` | Codex URI (required) |
| `--bypass-cache` | Skip cache and fetch from source |
| `--ttl <seconds>` | Override TTL |
| `--output <file>` | Write to file instead of stdout |
| `--json` | Output as JSON with metadata |

**Examples:**

```bash
# Fetch and print to stdout
fractary-codex document-fetch codex://myorg/project/docs/api.md

# Fetch fresh (bypass cache)
fractary-codex document-fetch codex://myorg/project/docs/api.md --bypass-cache

# Save to file
fractary-codex document-fetch codex://myorg/project/docs/api.md --output ./api.md

# Get metadata as JSON
fractary-codex document-fetch codex://myorg/project/docs/api.md --json
```

### Fetch Document: MCP

In Claude Code, `codex://` URIs in conversations are fetched automatically by the MCP server. You can also call the tool directly:

**Tool:** `codex_document_fetch`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uri` | string | yes | Codex URI to fetch |
| `noCache` | boolean | no | Skip cache and fetch fresh |
| `branch` | string | no | Override branch (default: `main`) |

**Example tool call (in MCP JSON):**

```json
{
  "name": "codex_document_fetch",
  "arguments": {
    "uri": "codex://myorg/project/docs/api.md",
    "noCache": false
  }
}
```

---

## List File Sources

Returns the file plugin sources configured for the current project. Useful for discovering what local artifact stores are available.

### List File Sources: MCP

**Tool:** `codex_file_sources_list`

No parameters required. Returns a list of configured file plugin sources with their local paths and storage types.

---

## Caching Behavior

- **Current project files** — read directly from local filesystem, never cached
- **External project files** — fetched from GitHub and cached with TTL
- **Cache location** — `.fractary/codex/cache/` (configured during `config-init`)
- **Default TTL** — varies by document type (see [Configuration Guide](../configuration.md#type-registry))

To inspect or manage the cache, see [Cache Management](./cache.md).

## See Also

- [Cache Management](./cache.md) — List, clear, and diagnose the document cache
- [Sync](./sync.md) — Push/pull files with the codex repository
- [Configuration Reference](../configuration.md) — Storage providers, TTL, and type configuration
