# API Reference

Comprehensive API reference for Fractary Codex SDK.

## Table of Contents

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

## References

The reference system provides parsing, validation, and resolution of `codex://` URIs.

### parseReference

Parse a `codex://` URI into its components.

**TypeScript:**
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

**Python:**
```python
from fractary_codex import parse_reference, ParsedReference

def parse_reference(uri: str) -> ParsedReference

@dataclass
class ParsedReference:
    uri: str
    org: str
    project: str
    path: str
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

### buildUri

Build a `codex://` URI from components.

**TypeScript:**
```typescript
function buildUri(org: string, project: string, path: string): string
```

**Python:**
```python
def build_uri(org: str, project: str, path: str) -> str
```

**Examples:**

```typescript
const uri = buildUri('fractary', 'codex', 'docs/api.md')
// 'codex://fractary/codex/docs/api.md'

// Empty components are rejected
buildUri('', 'project', 'path') // throws InvalidUriError
```

### validateUri

Check if a string is a valid `codex://` URI.

**TypeScript:**
```typescript
function validateUri(uri: string): boolean
```

**Python:**
```python
def is_valid_uri(uri: str) -> bool
```

**Examples:**

```typescript
validateUri('codex://org/project/path.md') // true
validateUri('https://example.com/file.md') // false
validateUri('codex://') // false
validateUri('codex://org') // false
validateUri('codex://org/project') // false
```

### resolveReference

Resolve a reference to local filesystem paths with automatic file plugin detection.

**TypeScript:**
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

**Python:**
```python
def resolve_reference(uri: str, options: Optional[ResolveOptions] = None) -> ResolvedReference

@dataclass
class ResolvedReference(ParsedReference):
    cache_path: str
    is_current_project: bool
    local_path: Optional[str] = None
    source_type: Optional[str] = None
    file_plugin_source: Optional[str] = None
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

// External project reference
const external = resolveReference('codex://other-org/other-project/file.md')
// {
//   isCurrentProject: false,
//   localPath: undefined,
//   cachePath: '.fractary/codex/cache/other-org/other-project/file.md'
// }
```

## File Plugin Integration

APIs for working with file plugin sources and current project artifacts.

### FileSourceResolver

Resolves and matches file paths against configured file plugin sources.

**TypeScript:**
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

interface ResolvedFileSource {
  name: string               // Source name (e.g., "specs", "logs")
  type: 'file-plugin'
  localPath: string          // Local filesystem path
  remotePath?: string        // Cloud storage path (if configured)
  bucket?: string            // Cloud storage bucket
  prefix?: string            // Cloud storage prefix
  isCurrentProject: boolean  // Always true
  config: FileSource         // Raw configuration
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
// [
//   { name: 'specs', localPath: '.fractary/specs', remotePath: 's3://myproject-files/specs/', ... },
//   { name: 'logs', localPath: '.fractary/logs', remotePath: 's3://myproject-files/logs/', ... }
// ]

// Resolve by name
const specsSource = resolver.resolveSource('specs')
// { name: 'specs', localPath: '.fractary/specs', ... }

// Check if path belongs to a source
resolver.isFilePluginPath('.fractary/specs/SPEC-001.md') // true
resolver.isFilePluginPath('src/index.ts') // false

// Get source for path
const source = resolver.getSourceForPath('.fractary/specs/SPEC-001.md')
// { name: 'specs', localPath: '.fractary/specs', ... }
```

### FilePluginStorage

Storage provider for file plugin integration (current project artifacts).

**TypeScript:**
```typescript
import { FilePluginStorage } from '@fractary/codex'

class FilePluginStorage implements StorageProvider {
  readonly name = 'file-plugin'
  readonly type = 'local'

  constructor(options: FilePluginStorageOptions)

  // Check if can handle a reference
  canHandle(reference: ResolvedReference): boolean

  // Fetch content
  fetch(reference: ResolvedReference, options?: FetchOptions): Promise<FetchResult>

  // Check if file exists
  exists(reference: ResolvedReference, options?: FetchOptions): Promise<boolean>
}

interface FilePluginStorageOptions {
  config: UnifiedConfig        // Unified configuration
  enableS3Fallback?: boolean   // Show S3 pull suggestions (default: true)
  baseDir?: string             // Base directory for relative paths
}
```

**Examples:**

```typescript
import { FilePluginStorage, resolveReference } from '@fractary/codex'

const config = {
  file: {
    sources: {
      specs: { local: { base_path: '.fractary/specs' } }
    }
  }
}

const storage = new FilePluginStorage({ config })

// Resolve and fetch
const ref = resolveReference('codex://fractary/project/specs/SPEC-001.md', {
  currentOrg: 'fractary',
  currentProject: 'project',
  config
})

if (ref && storage.canHandle(ref)) {
  const result = await storage.fetch(ref)
  // {
  //   content: Buffer,
  //   contentType: 'text/markdown',
  //   size: 1234,
  //   source: 'file-plugin',
  //   metadata: { filePluginSource: 'specs', localPath: '...' }
  // }
}

// File not found error
try {
  await storage.fetch(missingRef)
} catch (error) {
  console.error(error.message)
  // File not found: .fractary/specs/missing.md
  //
  // This file may be in cloud storage (s3).
  //
  // To fetch from cloud storage, run:
  //   file pull specs
  //
  // Or sync all sources:
  //   file sync
}
```

## Storage

Multi-provider storage layer for fetching content from various sources.

### StorageManager

Orchestrates multiple storage providers with automatic fallback.

**TypeScript:**
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

**Python:**
```python
class StorageManager:
    def __init__(self, providers: Optional[List[StorageProviderConfig]] = None)

    async def register_provider(self, provider: StorageProvider, priority: int = 100)
    async def fetch(self, reference: ResolvedReference, options: Optional[FetchOptions] = None) -> FetchResult
    async def exists(self, reference: ResolvedReference) -> bool

@dataclass
class FetchResult:
    content: bytes
    content_type: str
    size: int
    source: str
    metadata: Optional[Dict[str, Any]] = None
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
console.log(result.contentType) // 'text/markdown'

// Check if exists without fetching
const exists = await storage.exists(resolvedRef)
```

### LocalStorage

Filesystem storage provider.

**TypeScript:**
```typescript
class LocalStorage implements StorageProvider {
  constructor(options: {
    basePath: string
  })

  async fetch(reference: ResolvedReference): Promise<FetchResult>
  async exists(reference: ResolvedReference): Promise<boolean>
  canHandle(reference: ResolvedReference): boolean
}
```

**Python:**
```python
class LocalStorage(StorageProvider):
    def __init__(self, base_path: str)

    async def fetch(self, reference: ResolvedReference) -> FetchResult
    async def exists(self, reference: ResolvedReference) -> bool
    def can_handle(self, reference: ResolvedReference) -> bool
```

**Examples:**

```typescript
import { LocalStorage } from '@fractary/codex'

const storage = new LocalStorage({ basePath: './knowledge' })

// Fetches from ./knowledge/docs/api.md
const ref = resolveReference('codex://org/project/docs/api.md')
const result = await storage.fetch(ref)
```

### GitHubStorage

GitHub repository storage provider.

**TypeScript:**
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

**Python:**
```python
class GitHubStorage(StorageProvider):
    def __init__(self, token: Optional[str] = None, base_url: Optional[str] = None)

    async def fetch(self, reference: ResolvedReference) -> FetchResult
    async def exists(self, reference: ResolvedReference) -> bool
    def can_handle(self, reference: ResolvedReference) -> bool
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

// Fetches from github.com/org/project/blob/main/docs/api.md
const ref = resolveReference('codex://org/project/docs/api.md')
const result = await publicStorage.fetch(ref)
```

### HttpStorage

HTTP/HTTPS storage provider.

**TypeScript:**
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

**Python:**
```python
class HttpStorage(StorageProvider):
    def __init__(self, base_url: str, headers: Optional[Dict[str, str]] = None)

    async def fetch(self, reference: ResolvedReference) -> FetchResult
    async def exists(self, reference: ResolvedReference) -> bool
    def can_handle(self, reference: ResolvedReference) -> bool
```

**Examples:**

```typescript
import { HttpStorage } from '@fractary/codex'

const storage = new HttpStorage({
  baseUrl: 'https://codex.example.com',
  headers: {
    'Authorization': `Bearer ${process.env.API_TOKEN}`
  }
})

// Fetches from https://codex.example.com/org/project/docs/api.md
const ref = resolveReference('codex://org/project/docs/api.md')
const result = await storage.fetch(ref)
```

### S3ArchiveStorage

S3-compatible archive storage provider for transparent access to archived documents.

**Note:** This provider enables read-only access to archived documents via the [fractary CLI](https://github.com/fractary/cli). It requires per-project archive configuration and is automatically registered when archive config is present.

**TypeScript:**
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

**Python:**
```python
class S3ArchiveStorage(StorageProvider):
    def __init__(self, options: Optional[S3ArchiveStorageOptions] = None)

    async def fetch(self, reference: ResolvedReference) -> FetchResult
    async def exists(self, reference: ResolvedReference) -> bool
    def can_handle(self, reference: ResolvedReference) -> bool

@dataclass
class S3ArchiveStorageOptions:
    projects: Optional[Dict[str, ArchiveProjectConfig]] = None
    fractary_cli: Optional[str] = 'fractary'

@dataclass
class ArchiveProjectConfig:
    enabled: bool
    handler: Literal['s3', 'r2', 'gcs', 'local']
    bucket: Optional[str] = None
    prefix: Optional[str] = 'archive/'
    patterns: Optional[List[str]] = None
```

**Examples:**

```typescript
import { S3ArchiveStorage, StorageManager } from '@fractary/codex'

// Typically configured via config file, not manually
const archiveStorage = new S3ArchiveStorage({
  projects: {
    'fractary/auth-service': {
      enabled: true,
      handler: 's3',
      bucket: 'fractary-archives',
      prefix: 'archive/',
      patterns: ['specs/**', 'docs/**']
    }
  },
  fractaryCli: 'fractary'  // Or custom path
})

// Register with storage manager (priority 20 = after local, before GitHub)
const storage = StorageManager.create()
storage.registerProvider(archiveStorage, 20)

// Transparent access - same URI for archived and active files
const ref = resolveReference('codex://fractary/auth-service/specs/WORK-123.md')

// Checks: local → archive → GitHub → HTTP
const result = await storage.fetch(ref)
console.log(result.source) // 's3-archive' if from archive
console.log(result.metadata?.archivePath)
// 'archive/specs/fractary/auth-service/specs/WORK-123.md'
```

**Archive Path Calculation:**

The provider automatically calculates archive paths following the convention:
```
{prefix}/{type}/{org}/{project}/{original-path}
```

Examples:
```typescript
// Reference: codex://fractary/project/specs/WORK-123.md
// Archive path: archive/specs/fractary/project/specs/WORK-123.md

// Reference: codex://fractary/project/docs/api.md
// Archive path: archive/docs/fractary/project/docs/api.md

// With custom prefix: 'archived-docs/'
// Archive path: archived-docs/specs/fractary/project/specs/WORK-123.md
```

**Pattern Matching:**

```typescript
const archiveStorage = new S3ArchiveStorage({
  projects: {
    'fractary/project': {
      enabled: true,
      handler: 's3',
      patterns: [
        'specs/**',        // All files in specs/
        'docs/**/*.md',    // Markdown files in docs/
        '*.md'            // Top-level markdown files
      ]
    }
  }
})

// Only matches if path matches one of the patterns
// No patterns = all files eligible
```

**Behavior:**

- **Current project only:** Only checks archives for files in the current project
- **Read-only:** No write operations supported
- **Fallback:** Only activated when file not found locally
- **Uses fractary CLI:** Requires `fractary` command available in PATH
- **Caching:** Results cached per configured TTL

**Configuration:**

See [Archive Configuration](configuration.md#archive-configuration) for complete setup guide.

## Cache

Multi-tier caching system with LRU eviction and type-based TTL.

### CacheManager

Manages cached content with intelligent expiration.

**TypeScript:**
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

**Python:**
```python
class CacheManager:
    def __init__(
        self,
        cache_dir: str = ".fractary/codex/cache",
        max_memory_size: int = 50 * 1024 * 1024,
        default_ttl: int = 3600,
        type_registry: Optional[TypeRegistry] = None
    )

    def set_storage_manager(self, storage: StorageManager) -> None
    async def get(self, reference: Union[ResolvedReference, str]) -> FetchResult
    async def set(self, reference: ResolvedReference, result: FetchResult, ttl: Optional[int] = None) -> None
    async def has(self, reference: ResolvedReference) -> bool
    async def invalidate(self, pattern: Optional[str] = None) -> None
    async def get_stats(self) -> CacheStats

@dataclass
class CacheStats:
    total_entries: int
    total_size: int
    memory_entries: int
    disk_entries: int
    hit_rate: float
    memory_size: int
    disk_size: int
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

// Check cache without fetching
const exists = await cache.has(resolvedRef)

// Manual cache entry
await cache.set(resolvedRef, result, 7200) // 2 hour TTL

// Invalidate specific pattern
await cache.invalidate('codex://org/project/docs/*')

// Invalidate all
await cache.invalidate()

// Get statistics
const stats = await cache.getStats()
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`)
console.log(`Memory: ${stats.memoryEntries} entries, ${stats.memorySize} bytes`)
console.log(`Disk: ${stats.diskEntries} entries, ${stats.diskSize} bytes`)
```

## Types

Type registry for artifact categorization and TTL management.

### TypeRegistry

Manages artifact types with pattern-based matching.

**TypeScript:**
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

**Python:**
```python
class TypeRegistry:
    def __init__(self)

    def register(self, artifact_type: ArtifactType) -> None
    def get(self, name: str) -> Optional[ArtifactType]
    def get_ttl(self, path: str) -> int
    def get_type(self, path: str) -> Optional[ArtifactType]
    def list(self) -> List[ArtifactType]
    def load(self, config: Dict[str, ArtifactType]) -> None

@dataclass
class ArtifactType:
    name: str
    patterns: List[str]
    default_ttl: int
    description: Optional[str] = None
    archive_after_days: Optional[int] = None
    archive_storage: Optional[str] = None
    priority: int = 100
```

**Examples:**

```typescript
import { TypeRegistry, BUILT_IN_TYPES } from '@fractary/codex'

const registry = new TypeRegistry()

// Built-in types are pre-registered
console.log(registry.getTtl('docs/api.md'))     // 86400 (1 day)
console.log(registry.getTtl('specs/design.md')) // 604800 (7 days)
console.log(registry.getTtl('logs/error.log'))  // 3600 (1 hour)

// Register custom type
registry.register({
  name: 'api-specs',
  description: 'OpenAPI specifications',
  patterns: ['openapi/**/*.yaml', 'specs/**/*.json'],
  defaultTtl: 604800, // 1 week
  archiveAfterDays: 90,
  priority: 5 // Higher priority than default types
})

// Get type for path
const type = registry.getType('openapi/v1/users.yaml')
console.log(type?.name) // 'api-specs'

// Load from configuration
const config = {
  'api-specs': {
    name: 'api-specs',
    patterns: ['openapi/**/*.yaml'],
    defaultTtl: 604800
  }
}
registry.load(config)

// List all types
const allTypes = registry.list()
console.log(allTypes.map(t => t.name))
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

## Configuration

Configuration loading and management.

### loadConfig

Load configuration from `.fractary/codex/config.yaml`.

**TypeScript:**
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

interface StorageProviderConfig {
  type: 'local' | 'github' | 'http' | 's3' | 'r2' | 'gcs' | 'drive'
  [key: string]: unknown  // Provider-specific options
}
```

**Python:**
```python
def load_config(path: Optional[Path] = None) -> CodexConfig

@dataclass
class CodexConfig:
    organization: Optional[str] = None
    cache_dir: str = ".fractary/codex/cache"
    storage: Optional[List[StorageProviderConfig]] = None
    types: Optional[Dict[str, ArtifactType]] = None
    permissions: Optional[PermissionConfig] = None
    sync: Optional[SyncConfig] = None

@dataclass
class StorageProviderConfig:
    type: str
    options: Dict[str, Any]
```

**Examples:**

```typescript
import { loadConfig } from '@fractary/codex'

// Load from default location (.fractary/codex/config.yaml)
const config = loadConfig()

// Load from custom path
const customConfig = loadConfig('/path/to/codex.yaml')

// Example configuration file (.fractary/codex/config.yaml):
```

```yaml
organization: fractary
cacheDir: .fractary/codex/cache

storage:
  - type: local
    basePath: ./knowledge
  - type: github
    token: ${GITHUB_TOKEN}
  - type: http
    baseUrl: https://codex.example.com
    headers:
      Authorization: Bearer ${API_TOKEN}

types:
  api-specs:
    name: api-specs
    patterns:
      - openapi/**/*.yaml
      - specs/**/*.json
    defaultTtl: 604800
    archiveAfterDays: 90

permissions:
  default: read
  rules:
    - pattern: internal/**
      permission: none
    - pattern: public/**
      permission: read

sync:
  bidirectional: true
  conflictResolution: prompt
  exclude:
    - node_modules/**
    - .git/**
```

### resolveOrganization

Auto-detect organization name.

**TypeScript:**
```typescript
function resolveOrganization(options?: {
  workingDir?: string
}): string | undefined
```

**Python:**
```python
def resolve_organization(working_dir: Optional[Path] = None) -> Optional[str]
```

**Examples:**

```typescript
import { resolveOrganization } from '@fractary/codex'

// Auto-detect from:
// 1. .fractary/codex/config.yaml config
// 2. Git remote URL (e.g., git@github.com:fractary/codex.git -> 'fractary')
// 3. Current directory name (fallback)
const org = resolveOrganization()
console.log(org) // 'fractary'

// Custom working directory
const customOrg = resolveOrganization({ workingDir: '/path/to/project' })
```

## Sync

File synchronization engine (in development).

### SyncManager

Orchestrates bidirectional file synchronization.

**TypeScript:**
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

interface Conflict {
  path: string
  localHash: string
  remoteHash: string
  resolution?: 'local' | 'remote' | 'merge'
}
```

**Examples:**

```typescript
import { SyncManager, loadConfig } from '@fractary/codex'

const config = loadConfig()
const sync = SyncManager.create({ config, dryRun: false })

// Bidirectional sync
const result = await sync.sync('.', {
  direction: 'bidirectional',
  exclude: ['node_modules/**', '.git/**']
})

console.log(`Changed: ${result.filesChanged}`)
console.log(`Added: ${result.filesAdded}`)
console.log(`Deleted: ${result.filesDeleted}`)

if (result.conflicts.length > 0) {
  console.log('Conflicts:')
  result.conflicts.forEach(conflict => {
    console.log(`  ${conflict.path}`)
  })
}
```

## MCP Server

Model Context Protocol server for AI agent integration.

### createMcpServer

Create an MCP server instance.

**TypeScript:**
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

interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}
```

**Examples:**

```typescript
import { createMcpServer, CacheManager, StorageManager } from '@fractary/codex'

const cache = CacheManager.create()
const storage = StorageManager.create()
cache.setStorageManager(storage)

const server = createMcpServer({
  name: 'fractary-codex',
  version: '1.0.0',
  cache,
  storage
})

// Start server
await server.start({ host: 'localhost', port: 3000 })

// List available tools
const tools = server.listTools()
console.log(tools.map(t => t.name))
// ['codex_fetch', 'codex_search', 'codex_list', 'codex_invalidate']

// Call tool directly
const result = await server.callTool('codex_fetch', {
  uri: 'codex://org/project/docs/api.md'
})
console.log(result.content)

// Stop server
await server.stop()
```

**Available Tools:**

```typescript
// codex_fetch - Fetch a document
await server.callTool('codex_fetch', {
  uri: 'codex://org/project/file.md',
  noCache: false  // optional
})

// codex_search - Search documents
await server.callTool('codex_search', {
  query: 'authentication',
  type: 'docs',      // optional
  limit: 10          // optional
})

// codex_list - List documents
await server.callTool('codex_list', {
  prefix: 'docs/',   // optional
  type: 'docs'       // optional
})

// codex_invalidate - Invalidate cache
await server.callTool('codex_invalidate', {
  pattern: 'docs/**'  // optional, all if omitted
})
```

## Permissions

Fine-grained access control system.

### PermissionManager

Manages document permissions.

**TypeScript:**
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

interface PermissionConfig {
  default: Permission
  rules: PermissionRule[]
}

interface PermissionRule {
  pattern: string
  permission: Permission
}
```

**Examples:**

```typescript
import { PermissionManager } from '@fractary/codex'

const permissions = new PermissionManager({
  default: 'read',
  rules: [
    { pattern: 'internal/**', permission: 'none' },
    { pattern: 'public/**', permission: 'read' },
    { pattern: 'admin/**', permission: 'admin' }
  ]
})

const ref = resolveReference('codex://org/project/internal/secrets.md')

// Check permission
const canRead = await permissions.checkPermission(ref, 'read')
console.log(canRead) // false (permission: none)

// Get current permission
const permission = await permissions.getPermission(ref)
console.log(permission) // 'none'
```

**Frontmatter Permissions:**

Documents can specify permissions in YAML frontmatter:

```markdown
---
permissions:
  read: all
  write: admin
---

# Document content
```

```typescript
// The permission manager automatically reads frontmatter
const ref = resolveReference('codex://org/project/docs/api.md')
const permission = await permissions.getPermission(ref)
// Returns permission from frontmatter if present, else uses rules
```

## Migration

Tools for migrating from v2.x to v3.0.

### migrateConfig

Migrate configuration file.

**TypeScript:**
```typescript
function migrateConfig(path: string, options?: {
  backup?: boolean
  write?: boolean
}): MigrationResult

interface MigrationResult {
  success: boolean
  original: string
  migrated: string
  changes: Change[]
}
```

**Python:**
```python
def migrate_file(
    path: Path,
    backup: bool = False,
    write: bool = False
) -> MigrationResult

@dataclass
class MigrationResult:
    success: bool
    original: str
    migrated: str
    changes: List[Change]
```

**Examples:**

```typescript
import { migrateConfig } from '@fractary/codex'

// Dry run
const result = migrateConfig('.fractary/codex/config.yaml')
console.log(result.changes)

// Migrate with backup
const migrated = migrateConfig('.fractary/codex/config.yaml', {
  backup: true,
  write: true
})
// Creates .fractary/codex/config.yaml.backup
```

### convertLegacyReferences

Convert `$ref:` references to `codex://` URIs.

**TypeScript:**
```typescript
function convertLegacyReferences(content: string, options?: {
  organization?: string
  project?: string
}): ConversionResult

interface ConversionResult {
  content: string
  conversions: Conversion[]
}

interface Conversion {
  original: string
  converted: string
  line: number
}
```

**Examples:**

```typescript
import { convertLegacyReferences } from '@fractary/codex'

const markdown = `
See [$ref:/docs/api.md] for details.
Also check [$ref:other-project:/specs/design.md]
`

const result = convertLegacyReferences(markdown, {
  organization: 'fractary',
  project: 'codex'
})

console.log(result.content)
// See [codex://fractary/codex/docs/api.md] for details.
// Also check [codex://fractary/other-project/specs/design.md]

console.log(result.conversions)
// [
//   { original: '$ref:/docs/api.md', converted: 'codex://fractary/codex/docs/api.md', line: 2 },
//   { original: '$ref:other-project:/specs/design.md', converted: 'codex://fractary/other-project/specs/design.md', line: 3 }
// ]
```

## Errors

Error types thrown by the SDK.

### InvalidUriError

Thrown when parsing invalid `codex://` URIs.

```typescript
class InvalidUriError extends Error {
  constructor(uri: string, reason?: string)
  uri: string
  reason?: string
}

// Example
try {
  parseReference('invalid-uri')
} catch (error) {
  if (error instanceof InvalidUriError) {
    console.error(`Invalid URI: ${error.uri}`)
    console.error(`Reason: ${error.reason}`)
  }
}
```

### StorageError

Thrown when storage operations fail.

```typescript
class StorageError extends Error {
  constructor(message: string, options?: {
    provider?: string
    reference?: ResolvedReference
    cause?: Error
  })
  provider?: string
  reference?: ResolvedReference
  cause?: Error
}

// Example
try {
  await storage.fetch(ref)
} catch (error) {
  if (error instanceof StorageError) {
    console.error(`Storage error: ${error.message}`)
    console.error(`Provider: ${error.provider}`)
    console.error(`Caused by: ${error.cause}`)
  }
}
```

### CacheError

Thrown when cache operations fail.

```typescript
class CacheError extends Error {
  constructor(message: string, options?: {
    reference?: ResolvedReference
    cause?: Error
  })
  reference?: ResolvedReference
  cause?: Error
}

// Example
try {
  await cache.get(ref)
} catch (error) {
  if (error instanceof CacheError) {
    console.error(`Cache error: ${error.message}`)
    console.error(`Reference: ${error.reference?.uri}`)
  }
}
```

### ConfigError

Thrown when configuration is invalid.

```typescript
class ConfigError extends Error {
  constructor(message: string, options?: {
    path?: string
    cause?: Error
  })
  path?: string
  cause?: Error
}

// Example
try {
  loadConfig('/path/to/invalid.yaml')
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`Config error: ${error.message}`)
    console.error(`Path: ${error.path}`)
  }
}
```

### PermissionError

Thrown when access is denied.

```typescript
class PermissionError extends Error {
  constructor(message: string, options?: {
    reference?: ResolvedReference
    required?: Permission
    actual?: Permission
  })
  reference?: ResolvedReference
  required?: Permission
  actual?: Permission
}

// Example
try {
  await permissions.checkPermission(ref, 'write')
} catch (error) {
  if (error instanceof PermissionError) {
    console.error(`Permission denied`)
    console.error(`Required: ${error.required}`)
    console.error(`Actual: ${error.actual}`)
  }
}
```

## See Also

- [CLI Integration Guide](./cli-integration.md) - Integration patterns for CLI tools
- [Configuration Guide](./configuration.md) - Configuration reference
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
