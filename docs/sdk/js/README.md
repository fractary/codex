# JavaScript/TypeScript SDK

Comprehensive documentation for the `@fractary/codex` JavaScript/TypeScript SDK.

[![npm version](https://img.shields.io/npm/v/@fractary/codex.svg)](https://www.npmjs.com/package/@fractary/codex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [References](#references)
  - [File Plugin Integration](#file-plugin-integration)
  - [Storage](#storage)
  - [Cache](#cache)
  - [Types](#types)
  - [Configuration](#configuration)
  - [Sync](#sync)
  - [MCP Server](#mcp-server)
  - [Permissions](#permissions)
  - [Migration](#migration)
  - [Errors](#errors)
- [Authentication](#authentication)
- [Troubleshooting](#troubleshooting)

## Installation

```bash
npm install @fractary/codex
# or
yarn add @fractary/codex
# or
pnpm add @fractary/codex
```

## Features

- **Universal References**: `codex://` URI scheme for cross-project knowledge references
- **Multi-Provider Storage**: Local filesystem, GitHub, HTTP, and S3 storage backends
- **Intelligent Caching**: Multi-tier caching (L1 memory, L2 disk, L3 network) with LRU eviction
- **File Plugin Integration**: Seamless access to current project artifacts
- **File Synchronization**: Bidirectional sync with conflict detection
- **MCP Integration**: Model Context Protocol server for AI agent integration
- **Permission System**: Fine-grained access control (none/read/write/admin)
- **Migration Tools**: Upgrade from v2.x to v3.0 configuration format
- **Type-Safe**: Full TypeScript support with strict typing

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

// Create storage and cache managers
const storage = StorageManager.create()
const cache = CacheManager.create({ cacheDir: '.fractary/codex/cache' })
cache.setStorageManager(storage)

// Fetch content with caching
const content = await cache.get('codex://myorg/docs/api-guide.md')
```

## API Reference

### References

The reference system provides parsing, validation, and resolution of `codex://` URIs.

#### parseReference

Parse a `codex://` URI into its components.

```typescript
import { parseReference } from '@fractary/codex'

function parseReference(uri: string): ParsedReference

interface ParsedReference {
  uri: string
  org: string
  project: string
  path: string
}
```

**Examples:**

```typescript
const ref = parseReference('codex://fractary/codex/docs/api.md')
// {
//   uri: 'codex://fractary/codex/docs/api.md',
//   org: 'fractary',
//   project: 'codex',
//   path: 'docs/api.md'
// }

// Invalid URIs throw InvalidUriError
try {
  parseReference('invalid-uri')
} catch (error) {
  console.error(error instanceof InvalidUriError) // true
}
```

#### buildUri

Build a `codex://` URI from components.

```typescript
function buildUri(org: string, project: string, path: string): string
```

**Examples:**

```typescript
const uri = buildUri('fractary', 'codex', 'docs/api.md')
// 'codex://fractary/codex/docs/api.md'

// Empty components are rejected
buildUri('', 'project', 'path') // throws InvalidUriError
```

#### validateUri

Check if a string is a valid `codex://` URI.

```typescript
function validateUri(uri: string): boolean
```

**Examples:**

```typescript
validateUri('codex://org/project/path.md') // true
validateUri('https://example.com/file.md') // false
validateUri('codex://') // false
validateUri('codex://org') // false
validateUri('codex://org/project') // false
```

#### resolveReference

Resolve a reference to local filesystem paths with automatic file plugin detection.

```typescript
function resolveReference(uri: string, options?: {
  cacheDir?: string
  currentOrg?: string
  currentProject?: string
  cwd?: string
  config?: UnifiedConfig  // For file plugin detection
}): ResolvedReference | null

interface ResolvedReference extends ParsedReference {
  cachePath: string           // Cache file path
  isCurrentProject: boolean   // Is this the current project?
  localPath?: string          // If local, the actual file path
  sourceType?: 'local' | 'github' | 'http' | 's3-archive' | 'file-plugin'
  filePluginSource?: string   // File plugin source name (if applicable)
}
```

**Examples:**

```typescript
// Standard resolution
const resolved = resolveReference('codex://fractary/codex/docs/api.md', {
  cacheDir: '.fractary/codex/cache',
  currentOrg: 'fractary',
  currentProject: 'codex'
})
// {
//   uri: 'codex://fractary/codex/docs/api.md',
//   org: 'fractary',
//   project: 'codex',
//   path: 'docs/api.md',
//   cachePath: '.fractary/codex/cache/fractary/codex/docs/api.md',
//   isCurrentProject: true,
//   localPath: 'docs/api.md',
//   sourceType: 'local'
// }

// File plugin detection
const config = {
  file: {
    sources: {
      specs: { local: { base_path: '.fractary/specs' } }
    }
  }
}
const filePluginRef = resolveReference('codex://fractary/project/specs/SPEC-001.md', {
  currentOrg: 'fractary',
  currentProject: 'project',
  config
})
// {
//   isCurrentProject: true,
//   sourceType: 'file-plugin',
//   filePluginSource: 'specs',
//   localPath: '.fractary/specs/SPEC-001.md'
// }
```

### File Plugin Integration

APIs for working with file plugin sources and current project artifacts.

#### FileSourceResolver

Resolves and matches file paths against configured file plugin sources.

```typescript
import { FileSourceResolver } from '@fractary/codex'

class FileSourceResolver {
  constructor(config: UnifiedConfig)

  // Get all configured file sources
  getAvailableSources(): ResolvedFileSource[]

  // Resolve a source by name
  resolveSource(name: string): ResolvedFileSource | null

  // Check if a path belongs to any file source
  isFilePluginPath(path: string): boolean

  // Get the source for a given path (longest match)
  getSourceForPath(path: string): ResolvedFileSource | null

  // Get all source names
  getSourceNames(): string[]

  // Check if sources are configured
  hasSources(): boolean
}
```

**Examples:**

```typescript
import { FileSourceResolver } from '@fractary/codex'

const config = {
  file: {
    sources: {
      specs: {
        type: 's3',
        bucket: 'myproject-files',
        prefix: 'specs/',
        local: { base_path: '.fractary/specs' }
      },
      logs: {
        type: 's3',
        bucket: 'myproject-files',
        prefix: 'logs/',
        local: { base_path: '.fractary/logs' }
      }
    }
  }
}

const resolver = new FileSourceResolver(config)

// List all sources
const sources = resolver.getAvailableSources()

// Resolve by name
const specsSource = resolver.resolveSource('specs')

// Check if path belongs to a source
resolver.isFilePluginPath('.fractary/specs/SPEC-001.md') // true
resolver.isFilePluginPath('src/index.ts') // false

// Get source for path
const source = resolver.getSourceForPath('.fractary/specs/SPEC-001.md')
```

#### FilePluginStorage

Storage provider for file plugin integration (current project artifacts).

```typescript
import { FilePluginStorage } from '@fractary/codex'

class FilePluginStorage implements StorageProvider {
  readonly name = 'file-plugin'
  readonly type = 'local'

  constructor(options: FilePluginStorageOptions)

  canHandle(reference: ResolvedReference): boolean
  fetch(reference: ResolvedReference, options?: FetchOptions): Promise<FetchResult>
  exists(reference: ResolvedReference, options?: FetchOptions): Promise<boolean>
}
```

### Storage

Multi-provider storage layer for fetching content from various sources.

#### StorageManager

Orchestrates multiple storage providers with automatic fallback.

```typescript
class StorageManager {
  static create(options?: {
    providers?: StorageProviderConfig[]
  }): StorageManager

  registerProvider(provider: StorageProvider, priority?: number): void
  fetch(reference: ResolvedReference, options?: FetchOptions): Promise<FetchResult>
  exists(reference: ResolvedReference): Promise<boolean>
}

interface FetchOptions {
  noCache?: boolean
  timeout?: number
}

interface FetchResult {
  content: Buffer
  contentType: string
  size: number
  source: string
  metadata?: Record<string, unknown>
}
```

**Examples:**

```typescript
import { StorageManager } from '@fractary/codex'

const storage = StorageManager.create({
  providers: [
    { type: 'local', basePath: './knowledge' },
    { type: 'github', token: process.env.GITHUB_TOKEN },
    { type: 'http', baseUrl: 'https://codex.example.com' }
  ]
})

// Fetch tries each provider in priority order
const result = await storage.fetch(resolvedRef)
console.log(result.source) // 'local' | 'github' | 'http'
console.log(result.content.toString())

// Check if exists without fetching
const exists = await storage.exists(resolvedRef)
```

#### LocalStorage

Filesystem storage provider.

```typescript
class LocalStorage implements StorageProvider {
  constructor(options: { basePath: string })

  async fetch(reference: ResolvedReference): Promise<FetchResult>
  async exists(reference: ResolvedReference): Promise<boolean>
  canHandle(reference: ResolvedReference): boolean
}
```

#### GitHubStorage

GitHub repository storage provider.

```typescript
class GitHubStorage implements StorageProvider {
  constructor(options?: {
    token?: string
    baseUrl?: string  // For GitHub Enterprise
  })

  async fetch(reference: ResolvedReference): Promise<FetchResult>
  async exists(reference: ResolvedReference): Promise<boolean>
  canHandle(reference: ResolvedReference): boolean
}
```

**Examples:**

```typescript
import { GitHubStorage } from '@fractary/codex'

// Public repositories (no token needed)
const publicStorage = new GitHubStorage()

// Private repositories (token required)
const privateStorage = new GitHubStorage({
  token: process.env.GITHUB_TOKEN
})

// GitHub Enterprise
const enterpriseStorage = new GitHubStorage({
  token: process.env.GHE_TOKEN,
  baseUrl: 'https://github.company.com/api/v3'
})
```

#### HttpStorage

HTTP/HTTPS storage provider.

```typescript
class HttpStorage implements StorageProvider {
  constructor(options: {
    baseUrl: string
    headers?: Record<string, string>
  })

  async fetch(reference: ResolvedReference): Promise<FetchResult>
  async exists(reference: ResolvedReference): Promise<boolean>
  canHandle(reference: ResolvedReference): boolean
}
```

#### S3ArchiveStorage

S3-compatible archive storage provider for transparent access to archived documents.

```typescript
class S3ArchiveStorage implements StorageProvider {
  constructor(options?: S3ArchiveStorageOptions)

  async fetch(reference: ResolvedReference): Promise<FetchResult>
  async exists(reference: ResolvedReference): Promise<boolean>
  canHandle(reference: ResolvedReference): boolean
}

interface S3ArchiveStorageOptions {
  projects?: Record<string, ArchiveProjectConfig>
  fractaryCli?: string  // Path to fractary CLI (default: 'fractary')
}

interface ArchiveProjectConfig {
  enabled: boolean
  handler: 's3' | 'r2' | 'gcs' | 'local'
  bucket?: string
  prefix?: string     // Default: 'archive/'
  patterns?: string[] // Glob patterns (empty = all files)
}
```

### Cache

Multi-tier caching system with LRU eviction and type-based TTL.

#### CacheManager

Manages cached content with intelligent expiration.

```typescript
class CacheManager {
  static create(options?: {
    cacheDir?: string
    maxMemorySize?: number  // Bytes
    defaultTtl?: number     // Seconds
    typeRegistry?: TypeRegistry
  }): CacheManager

  setStorageManager(storage: StorageManager): void
  async get(reference: ResolvedReference | string): Promise<FetchResult>
  async set(reference: ResolvedReference, result: FetchResult, ttl?: number): Promise<void>
  async has(reference: ResolvedReference): Promise<boolean>
  async invalidate(pattern?: string): Promise<void>
  async getStats(): Promise<CacheStats>
}

interface CacheStats {
  totalEntries: number
  totalSize: number
  memoryEntries: number
  diskEntries: number
  hitRate: number
  memorySize: number
  diskSize: number
}
```

**Examples:**

```typescript
import { CacheManager, StorageManager, TypeRegistry } from '@fractary/codex'

const types = new TypeRegistry()
const storage = StorageManager.create()

const cache = CacheManager.create({
  cacheDir: '.fractary/codex/cache',
  maxMemorySize: 50 * 1024 * 1024, // 50 MB
  defaultTtl: 3600, // 1 hour
  typeRegistry: types
})
cache.setStorageManager(storage)

// Get with automatic caching and TTL
const result = await cache.get('codex://org/project/docs/api.md')
console.log(result.metadata.fromCache) // false on first fetch

// Second fetch returns cached version
const cached = await cache.get('codex://org/project/docs/api.md')
console.log(cached.metadata.fromCache) // true

// Invalidate specific pattern
await cache.invalidate('codex://org/project/docs/*')

// Get statistics
const stats = await cache.getStats()
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`)
```

### Types

Type registry for artifact categorization and TTL management.

#### TypeRegistry

Manages artifact types with pattern-based matching.

```typescript
class TypeRegistry {
  constructor()

  register(type: ArtifactType): void
  get(name: string): ArtifactType | undefined
  getTtl(path: string): number  // Get TTL based on path patterns
  getType(path: string): ArtifactType | undefined
  list(): ArtifactType[]
  load(config: Record<string, ArtifactType>): void
}

interface ArtifactType {
  name: string
  description?: string
  patterns: string[]        // Glob patterns
  defaultTtl: number       // Seconds
  archiveAfterDays?: number
  archiveStorage?: string
  priority?: number
}
```

**Built-in Types:**

```typescript
const BUILT_IN_TYPES = {
  docs: {
    name: 'docs',
    patterns: ['docs/**', '**/*.md', '**/*.mdx'],
    defaultTtl: 86400 // 1 day
  },
  specs: {
    name: 'specs',
    patterns: ['specs/**', '**/SPEC-*.md'],
    defaultTtl: 604800 // 7 days
  },
  config: {
    name: 'config',
    patterns: ['**/*.yaml', '**/*.json', '**/*.toml'],
    defaultTtl: 3600 // 1 hour
  },
  logs: {
    name: 'logs',
    patterns: ['logs/**', '**/*.log'],
    defaultTtl: 3600, // 1 hour
    archiveAfterDays: 30
  },
  schemas: {
    name: 'schemas',
    patterns: ['schemas/**', '**/*.schema.json'],
    defaultTtl: 604800 // 7 days
  }
}
```

### Configuration

Configuration loading and management.

#### loadConfig

Load configuration from `.fractary/config.yaml`.

```typescript
function loadConfig(path?: string): CodexConfig

interface CodexConfig {
  organization?: string
  cacheDir: string
  storage?: StorageProviderConfig[]
  types?: Record<string, ArtifactType>
  permissions?: PermissionConfig
  sync?: SyncConfig
}
```

See [Configuration Guide](../../configuration.md) for complete configuration reference.

#### resolveOrganization

Auto-detect organization name from config or git remote.

```typescript
function resolveOrganization(options?: {
  workingDir?: string
}): string | undefined
```

### Sync

File synchronization engine.

#### SyncManager

Orchestrates bidirectional file synchronization.

```typescript
class SyncManager {
  static create(options: {
    config: CodexConfig
    dryRun?: boolean
  }): SyncManager

  async sync(directory: string, options?: {
    direction?: 'to-codex' | 'from-codex' | 'bidirectional'
    exclude?: string[]
  }): Promise<SyncResult>
}

interface SyncResult {
  filesChanged: number
  filesAdded: number
  filesDeleted: number
  conflicts: Conflict[]
  errors: Error[]
}
```

### MCP Server

Model Context Protocol server for AI agent integration.

#### createMcpServer

Create an MCP server instance.

```typescript
function createMcpServer(options: {
  name: string
  version?: string
  cache?: CacheManager
  storage?: StorageManager
  cacheDir?: string
}): McpServer

interface McpServer {
  start(options?: { host?: string; port?: number }): Promise<void>
  stop(): Promise<void>
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>
  listTools(): McpTool[]
  listResources(): Promise<McpResource[]>
  readResource(uri: string): Promise<ResourceContent[]>
}
```

**Available Tools:**

- `codex_fetch` - Fetch a document by URI
- `codex_search` - Search documents
- `codex_list` - List documents
- `codex_invalidate` - Invalidate cache

### Permissions

Fine-grained access control system.

#### PermissionManager

Manages document permissions.

```typescript
class PermissionManager {
  constructor(config?: PermissionConfig)

  async checkPermission(
    reference: ResolvedReference,
    required: Permission
  ): Promise<boolean>

  async getPermission(reference: ResolvedReference): Promise<Permission>
}

type Permission = 'none' | 'read' | 'write' | 'admin'
```

### Migration

Tools for migrating from v2.x to v3.0.

#### migrateConfig

Migrate configuration file.

```typescript
function migrateConfig(path: string, options?: {
  backup?: boolean
  write?: boolean
}): MigrationResult
```

#### convertLegacyReferences

Convert `$ref:` references to `codex://` URIs.

```typescript
function convertLegacyReferences(content: string, options?: {
  organization?: string
  project?: string
}): ConversionResult
```

### Errors

Error types thrown by the SDK.

```typescript
class InvalidUriError extends Error {
  uri: string
  reason?: string
}

class StorageError extends Error {
  provider?: string
  reference?: ResolvedReference
  cause?: Error
}

class CacheError extends Error {
  reference?: ResolvedReference
  cause?: Error
}

class ConfigError extends Error {
  path?: string
  cause?: Error
}

class PermissionError extends Error {
  reference?: ResolvedReference
  required?: Permission
  actual?: Permission
}
```

## Authentication

### Quick Start (Single Token)

```bash
# Set environment variable
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Or create .env file (recommended for local development)
echo 'GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx' > .env
echo '.env' >> .gitignore
```

### Multiple Organizations

Configure per-remote authentication in `.fractary/config.yaml`:

```yaml
codex:
  auth:
    github:
      default_token_env: GITHUB_TOKEN
      fallback_to_public: true

  remotes:
    # Partner organization with separate token
    partner-org/shared-specs:
      token: ${PARTNER_GITHUB_TOKEN}
```

**Environment setup:**

```bash
# .env (NEVER COMMITTED)
GITHUB_TOKEN=ghp_your_default_token
PARTNER_GITHUB_TOKEN=ghp_partner_specific_token
```

### Token Resolution Flow

1. **Explicit option** - Token passed directly in fetch options
2. **Remote-specific token** - From remote's `token` configuration (supports `${ENV_VAR}` syntax)
3. **Default token** - From `auth.github.default_token_env` (defaults to `GITHUB_TOKEN`)
4. **Fallback to public** - If `fallback_to_public: true` is set

### Token Scopes

| Use Case | Required Scopes |
|----------|----------------|
| Public repos only | None |
| Private repos (read) | `repo` |
| Organization repos | `repo`, `read:org` |

## Troubleshooting

### Installation Issues

**TypeScript Compilation Errors:**

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "lib": ["ES2020"]
  }
}
```

### Configuration Problems

**Configuration Not Found:**

```typescript
import { loadConfig } from '@fractary/codex'

const config = loadConfig()
if (!config) {
  console.log('Config not found, checking paths...')
  // Check .fractary/config.yaml exists
}
```

**Solutions:**

1. Create config file: `mkdir -p .fractary && touch .fractary/config.yaml`
2. Use absolute path: `const config = loadConfig('/absolute/path/to/config.yaml')`
3. Set environment variable: `export CODEX_CONFIG_PATH=/path/to/config.yaml`

### URI and Reference Errors

**InvalidUriError: Invalid codex URI:**

Ensure URI follows the format: `codex://org/project/path`

```typescript
// Correct format
parseReference('codex://fractary/codex/docs/api.md')

// Invalid formats (will throw)
parseReference('http://example.com/file.md')
parseReference('codex:/org/project/file.md')  // Missing second slash
parseReference('codex://org')  // Missing project and path
```

### Storage Provider Issues

**GitHub Storage: 401 Unauthorized:**

1. Check token is set: `echo $GITHUB_TOKEN`
2. Verify token has correct scopes (needs `repo` for private repos)
3. Test token: `curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user`

**GitHub Storage: 404 Not Found:**

1. Verify file exists in repository
2. Check branch configuration (default is `main`)
3. Ensure path is correct (case-sensitive)

### Cache Problems

**Cache Always Misses:**

```typescript
const cache = CacheManager.create({ cacheDir: '.fractary/codex/cache' })
const stats = await cache.getStats()
console.log('Hit rate:', stats.hitRate)
console.log('Total entries:', stats.totalEntries)
```

**Solutions:**

1. Check cache directory exists and is writable
2. Verify TTL is not too short
3. Check for conflicting cache keys

**Stale Cache Entries:**

```typescript
// Invalidate specific entry
await cache.invalidate('codex://org/project/updated-file.md')

// Force fresh fetch
await cache.get(ref, { noCache: true })
```

### Performance Issues

**Slow First Fetch:**

First fetch is slower because it must resolve reference, try providers, and cache. Solutions:

1. Pre-warm cache with common documents
2. Use local storage first (set priority: 10)
3. Reduce provider count

### Debugging Tips

**Enable Debug Logging:**

```bash
# Enable all codex debug logs
DEBUG=codex:* node app.js

# Enable specific modules
DEBUG=codex:cache,codex:storage node app.js
```

## See Also

- [Configuration Guide](../../configuration.md) - Complete configuration reference
- [Python SDK](../py/) - Python implementation
- [CLI Documentation](../../cli/) - Command-line interface
- [MCP Server Documentation](../../mcp-server/) - AI agent integration
