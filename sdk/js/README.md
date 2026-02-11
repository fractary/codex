# @fractary/codex

JavaScript/TypeScript SDK for Fractary Codex - knowledge infrastructure for AI agents.

[![npm version](https://img.shields.io/npm/v/@fractary/codex.svg)](https://www.npmjs.com/package/@fractary/codex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @fractary/codex
```

## Quick Start

### Using CodexClient (recommended)

```typescript
import { CodexClient } from '@fractary/codex'

// Create client from project config (.fractary/config.yaml)
const client = await CodexClient.create()

// Fetch a document
const result = await client.fetch('codex://myorg/project/docs/api.md')
console.log(result.content.toString())

// Fetch with options
const fresh = await client.fetch('codex://myorg/project/docs/api.md', {
  bypassCache: true,
  ttl: 3600
})

// Cache management
const stats = await client.getCacheStats()
await client.invalidateCache('codex://myorg/*')

// Health checks
const checks = await client.getHealthChecks()
```

### Using individual modules

```typescript
import {
  parseReference,
  buildUri,
  isValidUri,
  CacheManager,
  StorageManager,
  TypeRegistry
} from '@fractary/codex'

// Parse a codex:// URI
const ref = parseReference('codex://myorg/project/docs/api.md')
// { org: 'myorg', project: 'project', path: 'docs/api.md' }

// Build a URI
const uri = buildUri('myorg', 'project', 'docs/api.md')
// 'codex://myorg/project/docs/api.md'

// Validate
isValidUri('codex://myorg/project/docs/api.md') // true
```

## API Reference

### CodexClient

High-level facade for all codex operations.

```typescript
interface CodexClientOptions {
  configPath?: string        // Path to .fractary/config.yaml
  cacheDir?: string          // Override cache directory
  organizationSlug?: string  // Override organization
}

const client = await CodexClient.create(options?)

// Document operations
client.fetch(uri, options?)           // Fetch document by URI
client.invalidateCache(pattern?)      // Invalidate cache entries
client.invalidateCachePattern(regex)  // Invalidate by regex

// Cache
client.getCacheStats()                // Get cache statistics
client.listCacheEntries(options?)     // List cached entries

// Health
client.getHealthChecks()              // Run health diagnostics

// Accessors
client.getTypeRegistry()              // Get type registry
client.getCacheManager()              // Get cache manager
client.getStorageManager()            // Get storage manager
client.getOrganization()              // Get organization slug
```

### References

Parse, build, validate, and resolve `codex://` URIs.

```typescript
// Parsing and building
parseReference(uri: string): ParsedReference
buildUri(org: string, project: string, path: string): string
isValidUri(uri: string): boolean
validateUri(uri: string): boolean

// Resolution (adds filesystem paths, cache paths)
resolveReference(uri: string, options?): ResolvedReference
resolveReferences(uris: string[], options?): ResolvedReference[]

// Utilities
getExtension(uri: string): string
getFilename(uri: string): string
getDirectory(uri: string): string
isCurrentProjectUri(uri: string): boolean

// Legacy format support
isLegacyReference(ref: string): boolean
convertLegacyReference(ref: string): string
```

### StorageManager

Multi-provider storage with priority-based fallback.

```typescript
// Built-in providers
LocalStorage      // Filesystem
GitHubStorage     // GitHub repositories (needs GITHUB_TOKEN for private repos)
HttpStorage       // HTTP/HTTPS endpoints
FilePluginStorage // File plugin integration

// Manager
const manager = StorageManager.create(config)
const result = await manager.fetch(ref, options?)
// result: { content: Buffer, contentType?: string, size: number }
```

### CacheManager

TTL-based caching with disk persistence.

```typescript
const cache = CacheManager.create(config)

await cache.get(ref, options?)        // Get from cache (or fetch)
await cache.set(uri, result)          // Store in cache
await cache.clear()                   // Clear all entries
await cache.invalidate(pattern)       // Invalidate by glob
await cache.invalidatePattern(regex)  // Invalidate by regex
await cache.getStats()                // Cache statistics
await cache.listEntries(options?)     // List entries with filtering
```

### TypeRegistry

Maps file paths to artifact types with TTL defaults.

```typescript
const registry = TypeRegistry.create()

registry.detectType('docs/api.md')    // 'docs'
registry.getTtl('docs/api.md')        // 86400 (1 day)
registry.register(customTypeConfig)   // Add custom type
registry.list()                       // List all types
```

**Built-in types:**

| Type | Patterns | Default TTL |
|------|----------|-------------|
| `docs` | `docs/**`, `**/*.md` | 1 day |
| `specs` | `specs/**`, `**/SPEC-*.md` | 7 days |
| `config` | `**/*.yaml`, `**/*.json` | 1 hour |
| `logs` | `logs/**`, `**/*.log` | 1 hour |
| `schemas` | `schemas/**`, `**/*.schema.json` | 7 days |

### SyncManager

Bidirectional file synchronization.

```typescript
const sync = SyncManager.create(config)

const plan = await sync.createPlan(org, project, targetDir, patterns)
// plan: { direction, operations[], stats, conflicts[] }

const result = await sync.executePlan(plan, options?)
```

### PermissionManager

Fine-grained access control.

```typescript
const permissions = PermissionManager.create(config)

permissions.isAllowed(context)        // Check if action allowed
permissions.hasPermission(context, level) // Check permission level

// Permission levels: none < read < write < admin
// Actions: fetch, cache, sync, invalidate, manage
```

### ConfigManager

Configuration management (used by CLI internally).

```typescript
const result = await ConfigManager.init(options)   // Initialize config
const result = await ConfigManager.update(options)  // Update config
const result = await ConfigManager.validate(options) // Validate config
```

### HealthChecker

```typescript
const checker = HealthChecker.create(options)
const results = await checker.runAll()
// Checks: config, storage, client, cache, type registry
```

### Errors

```typescript
import {
  CodexError, ConfigurationError, ValidationError, PermissionDeniedError
} from '@fractary/codex'

try {
  await client.fetch(uri)
} catch (err) {
  // PermissionDeniedError extends Error directly, not CodexError - check it first
  if (err instanceof PermissionDeniedError) { /* access denied */ }
  if (err instanceof ConfigurationError) { /* config issue */ }
  if (err instanceof ValidationError) { /* validation issue */ }
  if (err instanceof CodexError) { /* other SDK error */ }
}
```

## Configuration

The SDK reads from `.fractary/config.yaml`. See the [Configuration Guide](../../docs/configuration.md).

## Development

```bash
npm install
npm run build
npm test
npm run typecheck
```

## License

MIT
