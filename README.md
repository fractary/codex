# @fractary/codex

Core SDK for Fractary Codex - knowledge infrastructure for AI agents.

[![npm version](https://img.shields.io/npm/v/@fractary/codex.svg)](https://www.npmjs.com/package/@fractary/codex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The Codex SDK provides foundational infrastructure for managing organizational knowledge across AI agents and projects. It implements a universal reference system (`codex://` URIs), multi-provider storage, intelligent caching, file synchronization, and MCP (Model Context Protocol) integration.

### Key Features

- **Universal References**: `codex://` URI scheme for cross-project knowledge references
- **Multi-Provider Storage**: Local filesystem, GitHub, and HTTP storage backends
- **Intelligent Caching**: Multi-tier caching (L1 memory, L2 disk, L3 network) with LRU eviction
- **File Synchronization**: Bidirectional sync with conflict detection
- **MCP Integration**: Model Context Protocol server for AI agent integration
- **Permission System**: Fine-grained access control (none/read/write/admin)
- **Migration Tools**: Upgrade from v2.x to v3.0 configuration format
- **Type-Safe**: Full TypeScript support with strict typing

## Installation

```bash
npm install @fractary/codex
```

## Quick Start

```typescript
import {
  parseReference,
  resolveReference,
  CacheManager,
  StorageManager,
  createMcpServer
} from '@fractary/codex'

// Parse a codex URI
const ref = parseReference('codex://myorg/docs/api-guide.md')
console.log(ref.org)      // 'myorg'
console.log(ref.path)     // 'docs/api-guide.md'

// Resolve to actual file location
const resolved = resolveReference(ref, {
  cacheDir: '.codex-cache'
})

// Create storage and cache managers
const storage = StorageManager.create()
const cache = CacheManager.create({ cacheDir: '.codex-cache' })

// Fetch content with caching
const content = await cache.get('codex://myorg/docs/api-guide.md')
```

## Core Modules

### References

Universal `codex://` URI system for cross-project knowledge references:

```typescript
import {
  parseReference,
  buildUri,
  resolveReference,
  validateUri
} from '@fractary/codex'

// Parse URI
const ref = parseReference('codex://fractary/codex/docs/api.md')
// { org: 'fractary', project: 'codex', path: 'docs/api.md' }

// Build URI
const uri = buildUri('fractary', 'codex', 'docs/api.md')
// 'codex://fractary/codex/docs/api.md'

// Validate
const isValid = validateUri('codex://org/project/path.md')
```

### Storage

Multi-provider storage abstraction with priority-based fallback:

```typescript
import {
  StorageManager,
  LocalStorage,
  GitHubStorage,
  HttpStorage
} from '@fractary/codex'

// Create storage manager with multiple providers
const storage = StorageManager.create({
  providers: [
    { type: 'local', basePath: './knowledge' },
    { type: 'github', token: process.env.GITHUB_TOKEN },
    { type: 'http', baseUrl: 'https://codex.example.com' }
  ]
})

// Fetch content (tries providers in order)
const result = await storage.fetch('codex://org/project/file.md')
console.log(result.content)
console.log(result.provider) // Which provider served the content
```

### Cache

Multi-tier caching with LRU eviction and stale-while-revalidate:

```typescript
import { CacheManager, createCacheManager } from '@fractary/codex'

const cache = createCacheManager({
  cacheDir: '.codex-cache',
  maxMemorySize: 50 * 1024 * 1024,  // 50MB L1 cache
  maxDiskSize: 500 * 1024 * 1024,   // 500MB L2 cache
  defaultTtl: 3600                   // 1 hour TTL
})

// Get with automatic caching
const entry = await cache.get('codex://org/project/file.md')

// Check cache status
const status = cache.getStatus('codex://org/project/file.md')
// 'fresh' | 'stale' | 'expired' | 'missing'

// Invalidate specific entry
await cache.invalidate('codex://org/project/file.md')

// Clear all cache
await cache.clear()
```

### MCP Server

Model Context Protocol integration for AI agents:

```typescript
import { createMcpServer } from '@fractary/codex'

const server = createMcpServer({
  name: 'codex',
  version: '1.0.0',
  cacheDir: '.codex-cache'
})

// Available tools:
// - codex_fetch: Fetch document by URI
// - codex_search: Search across documents
// - codex_list: List available documents
// - codex_invalidate: Clear cache entries

await server.start()
```

### Sync

Bidirectional file synchronization:

```typescript
import { SyncManager, createSyncPlan } from '@fractary/codex'

const sync = new SyncManager({
  sourceDir: './local-docs',
  targetDir: './codex-repo'
})

// Create sync plan (dry run)
const plan = await sync.plan({
  direction: 'bidirectional',
  include: ['**/*.md'],
  exclude: ['**/node_modules/**']
})

console.log(plan.operations) // List of copy/update/delete operations

// Execute sync
const result = await sync.execute(plan)
```

### Permissions

Fine-grained access control:

```typescript
import {
  PermissionManager,
  createRule,
  CommonRules
} from '@fractary/codex'

const permissions = new PermissionManager({
  config: { enforced: true }
})

// Add rules
permissions.addRule(CommonRules.allowDocs())      // Allow read on docs/**
permissions.addRule(CommonRules.denyPrivate())    // Deny .private/**
permissions.addRule(createRule({
  pattern: 'admin/**',
  actions: ['fetch', 'sync'],
  level: 'admin'
}))

// Check permissions
const allowed = permissions.isAllowed('docs/api.md', 'fetch')
const hasAccess = permissions.hasPermission('admin/config.md', 'sync', 'admin')

// Filter paths by permission
const accessible = permissions.filterAllowed(paths, 'fetch')
```

### Migration

Upgrade from v2.x to v3.0 configuration:

```typescript
import {
  migrateConfig,
  detectVersion,
  convertLegacyReferences
} from '@fractary/codex'

// Detect config version
const detection = detectVersion(oldConfig)
console.log(detection.version) // '2.x' | '3.0' | 'unknown'

// Migrate configuration
const result = migrateConfig(oldConfig)
if (result.success) {
  console.log(result.config)   // Modern v3.0 config
  console.log(result.changes)  // List of changes made
}

// Convert legacy references in content
const converted = convertLegacyReferences(content, {
  defaultOrg: 'myorg',
  defaultProject: 'myproject'
})
```

### Types

Extensible artifact type system with TTL management:

```typescript
import { TypeRegistry, BUILT_IN_TYPES } from '@fractary/codex'

const types = new TypeRegistry()

// Get TTL for a file
const ttl = types.getTtl('docs/api.md')      // Uses 'docs' type TTL
const specTtl = types.getTtl('specs/v1.md')  // Uses 'specs' type TTL

// Register custom type
types.register({
  name: 'templates',
  patterns: ['templates/**/*.md'],
  ttl: 86400,  // 24 hours
  description: 'Document templates'
})
```

## API Reference

### References Module
- `parseReference(uri)` - Parse codex:// URI
- `buildUri(org, project, path)` - Build codex:// URI
- `resolveReference(ref, options)` - Resolve to file path
- `validateUri(uri)` - Validate URI format

### Storage Module
- `StorageManager` - Multi-provider storage coordinator
- `LocalStorage` - Local filesystem provider
- `GitHubStorage` - GitHub API/raw content provider
- `HttpStorage` - Generic HTTP provider

### Cache Module
- `CacheManager` - Multi-tier cache coordinator
- `CachePersistence` - Disk persistence layer
- `createCacheEntry(uri, content, options)` - Create cache entry

### MCP Module
- `McpServer` - MCP protocol server
- `CODEX_TOOLS` - Available tool definitions
- `handleToolCall(name, args, context)` - Handle tool invocation

### Sync Module
- `SyncManager` - Sync orchestration
- `createSyncPlan(options)` - Create sync plan
- `evaluatePath(path, rules)` - Evaluate sync rules

### Permissions Module
- `PermissionManager` - Permission orchestration
- `createRule(options)` - Create permission rule
- `CommonRules` - Pre-built common rules

### Migration Module
- `migrateConfig(config)` - Migrate v2.x to v3.0
- `detectVersion(config)` - Detect config version
- `convertLegacyReferences(content)` - Convert old references

## Configuration

### Environment Variables

```bash
CODEX_CACHE_DIR=".codex-cache"    # Cache directory
CODEX_DEFAULT_TTL="3600"          # Default TTL in seconds
GITHUB_TOKEN="ghp_xxx"            # GitHub API token (for GitHub storage)
```

### Cache Configuration

```typescript
const cache = createCacheManager({
  cacheDir: '.codex-cache',
  maxMemorySize: 50 * 1024 * 1024,   // 50MB
  maxDiskSize: 500 * 1024 * 1024,    // 500MB
  defaultTtl: 3600,                   // 1 hour
  staleWhileRevalidate: true
})
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Test with coverage
npm run test:coverage

# Type check
npm run typecheck

# Lint
npm run lint
```

## Project Structure

```
src/
├── references/      # codex:// URI parsing and resolution
├── types/           # Artifact type system
├── storage/         # Multi-provider storage
├── cache/           # Multi-tier caching
├── mcp/             # MCP server integration
├── sync/            # File synchronization
├── permissions/     # Access control
├── migration/       # v2.x to v3.0 migration
├── core/            # Core utilities
│   ├── config/      # Configuration management
│   ├── metadata/    # Frontmatter parsing
│   ├── patterns/    # Glob pattern matching
│   └── routing/     # Sync routing
├── schemas/         # Zod validation schemas
├── errors/          # Error classes
└── index.ts         # Public exports
```

## Related Projects

- **forge-bundle-codex-github-core** - GitHub Actions workflows for codex sync
- **forge-bundle-codex-claude-agents** - Claude Code agents for codex management

## License

MIT © Fractary Engineering

## Contributing

For issues or contributions, please visit the [GitHub repository](https://github.com/fractary/codex).
