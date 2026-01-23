# Python SDK

Comprehensive documentation for the `fractary-codex` Python SDK.

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [References](#references)
  - [Storage](#storage)
  - [Cache](#cache)
  - [Types](#types)
  - [Configuration](#configuration)
  - [Migration](#migration)
- [Troubleshooting](#troubleshooting)

## Installation

```bash
pip install fractary-codex
# or
poetry add fractary-codex
```

## Features

- **Universal References**: Parse and resolve `codex://` URIs
- **Multi-tier Caching**: File-based caching with intelligent TTL management
- **Storage Abstraction**: Local filesystem, GitHub, and HTTP storage providers
- **Configuration Management**: Load configs from `.fractary/` directories
- **Type Registry**: Built-in types with customizable TTL per content type
- **Migration Tools**: Convert legacy `$ref:` references to `codex://` URIs
- **Async-first**: Built on `asyncio` for high performance
- **Type-safe**: Full type hints for IDE support

## Quick Start

### Parse References

```python
from fractary_codex import parse_reference, build_uri

# Parse a codex:// URI
ref = parse_reference("codex://myorg/myproject/docs/api.md")
print(f"Organization: {ref.org}")
print(f"Project: {ref.project}")
print(f"Path: {ref.path}")

# Build a URI from components
uri = build_uri("myorg", "myproject", "docs/guide.md")
print(uri)  # codex://myorg/myproject/docs/guide.md
```

### Fetch Content with Caching

```python
import asyncio
from fractary_codex import CacheManager, LocalStorage

async def main():
    async with CacheManager() as cache:
        storage = LocalStorage(base_path="./knowledge")

        # Fetch with automatic TTL based on file type
        result = await cache.fetch("docs/api.md", storage)
        print(result.text)

        # Second fetch returns cached content
        result = await cache.fetch("docs/api.md", storage)
        print(result.metadata["from_cache"])  # True

asyncio.run(main())
```

### Use GitHub Storage

```python
import asyncio
import os
from fractary_codex import CacheManager, GitHubStorage

async def main():
    async with CacheManager() as cache:
        # GitHub storage for public repos (no token needed)
        storage = GitHubStorage()

        # Or with token for private repos
        storage = GitHubStorage(token=os.environ.get("GITHUB_TOKEN"))

        # Fetch by codex:// URI
        result = await cache.fetch(
            "codex://myorg/myrepo/docs/api.md",
            storage
        )
        print(result.text)

asyncio.run(main())
```

### Manage Multiple Storage Providers

```python
import asyncio
from fractary_codex import StorageManager, LocalStorage, GitHubStorage

async def main():
    async with StorageManager() as manager:
        # Register providers with priority
        manager.register("local", LocalStorage(base_path="./docs"), priority=10)
        manager.register("github", GitHubStorage(), priority=100)

        # Fetch tries local first, falls back to GitHub
        result = await manager.fetch("docs/api.md")
        print(result.text)

asyncio.run(main())
```

## API Reference

### References

#### parse_reference

Parse a `codex://` URI into its components.

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

```python
ref = parse_reference("codex://fractary/codex/docs/api.md")
# ParsedReference(
#   uri='codex://fractary/codex/docs/api.md',
#   org='fractary',
#   project='codex',
#   path='docs/api.md'
# )
```

#### build_uri

Build a `codex://` URI from components.

```python
def build_uri(org: str, project: str, path: str) -> str
```

**Examples:**

```python
uri = build_uri("fractary", "codex", "docs/api.md")
# 'codex://fractary/codex/docs/api.md'
```

#### is_valid_uri

Check if a string is a valid `codex://` URI.

```python
def is_valid_uri(uri: str) -> bool
```

**Examples:**

```python
is_valid_uri("codex://org/project/path.md")  # True
is_valid_uri("https://example.com/file.md")  # False
```

#### resolve_reference

Resolve a reference to local filesystem paths.

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

### Storage

Multi-provider storage layer for fetching content.

#### StorageManager

Orchestrates multiple storage providers with automatic fallback.

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

#### LocalStorage

Filesystem storage provider.

```python
class LocalStorage(StorageProvider):
    def __init__(self, base_path: str)

    async def fetch(self, reference: ResolvedReference) -> FetchResult
    async def exists(self, reference: ResolvedReference) -> bool
    def can_handle(self, reference: ResolvedReference) -> bool
```

#### GitHubStorage

GitHub repository storage provider.

```python
class GitHubStorage(StorageProvider):
    def __init__(self, token: Optional[str] = None, base_url: Optional[str] = None)

    async def fetch(self, reference: ResolvedReference) -> FetchResult
    async def exists(self, reference: ResolvedReference) -> bool
    def can_handle(self, reference: ResolvedReference) -> bool
```

#### HttpStorage

HTTP/HTTPS storage provider.

```python
class HttpStorage(StorageProvider):
    def __init__(self, base_url: str, headers: Optional[Dict[str, str]] = None)

    async def fetch(self, reference: ResolvedReference) -> FetchResult
    async def exists(self, reference: ResolvedReference) -> bool
    def can_handle(self, reference: ResolvedReference) -> bool
```

#### S3ArchiveStorage

S3-compatible archive storage provider.

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

### Cache

Multi-tier caching system with TTL management.

#### CacheManager

Manages cached content with intelligent expiration.

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

```python
from fractary_codex import CacheManager, StorageManager, TypeRegistry

types = TypeRegistry()
storage = StorageManager()

cache = CacheManager(
    cache_dir=".fractary/codex/cache",
    max_memory_size=50 * 1024 * 1024,  # 50 MB
    default_ttl=3600,  # 1 hour
    type_registry=types
)
cache.set_storage_manager(storage)

# Get with automatic caching
result = await cache.get("codex://org/project/docs/api.md")

# Invalidate specific pattern
await cache.invalidate("codex://org/project/docs/*")

# Get statistics
stats = await cache.get_stats()
print(f"Hit rate: {stats.hit_rate * 100:.2f}%")
```

### Types

Type registry for artifact categorization and TTL management.

#### TypeRegistry

Manages artifact types with pattern-based matching.

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

```python
from fractary_codex import TypeRegistry, ArtifactType, TTL

registry = TypeRegistry()

# Built-in types are pre-registered
print(registry.get_ttl("docs/api.md"))     # 86400 (1 day)
print(registry.get_ttl("specs/design.md")) # 604800 (7 days)
print(registry.get_ttl("logs/error.log"))  # 3600 (1 hour)

# Register custom type
registry.register(ArtifactType(
    name="api-specs",
    patterns=["openapi/**/*.yaml", "specs/**/*.json"],
    default_ttl=TTL.WEEK,
    priority=5
))
```

**TTL Constants:**

```python
class TTL:
    MINUTE = 60
    HOUR = 3600
    DAY = 86400
    WEEK = 604800
    MONTH = 2592000
```

### Configuration

Configuration loading and management.

#### load_config

Load configuration from `.fractary/config.yaml`.

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

#### resolve_organization

Auto-detect organization name.

```python
def resolve_organization(working_dir: Optional[Path] = None) -> Optional[str]
```

**Examples:**

```python
from fractary_codex import load_config, resolve_organization

# Load from .fractary/config.yaml
config = load_config()
if config:
    print(f"Organization: {config.organization}")
    print(f"Cache dir: {config.cache_dir}")

# Auto-detect organization from git remote
org = resolve_organization()
print(f"Detected org: {org}")
```

### Migration

Tools for migrating legacy references.

#### migrate_file

Migrate a single file.

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

#### migrate_directory

Migrate directory tree.

```python
def migrate_directory(
    path: Path,
    pattern: str = "**/*.md",
    backup: bool = False,
    write: bool = False
) -> List[MigrationResult]
```

**Examples:**

```python
from fractary_codex import migrate_file, migrate_directory

# Migrate a single file (dry run)
result = migrate_file("docs/api.md")
print(f"Found {len(result.results)} legacy references")
for r in result.results:
    print(f"  {r.original} -> {r.converted}")

# Migrate and write changes
result = migrate_file("docs/api.md", write=True, backup=True)

# Migrate entire directory
results = migrate_directory("docs/", pattern="**/*.md", write=True)
for r in results:
    if r.modified:
        print(f"Updated: {r.path}")
```

## Troubleshooting

### Installation Issues

**pip Installation Fails:**

```bash
# Upgrade pip first
pip install --upgrade pip

# Install with verbose output
pip install fractary-codex --verbose

# Install in virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install fractary-codex
```

### Configuration Problems

**Configuration Not Found:**

```python
from fractary_codex import load_config

config = load_config()
if not config:
    # Create config file
    # .fractary/config.yaml
    pass
```

**Solutions:**

1. Create config file: `mkdir -p .fractary && touch .fractary/config.yaml`
2. Use absolute path: `config = load_config(Path('/absolute/path/to/config.yaml'))`

### URI and Reference Errors

**Invalid URI:**

Ensure URI follows the format: `codex://org/project/path`

```python
# Correct format
parse_reference("codex://fractary/codex/docs/api.md")

# Invalid formats (will raise exception)
parse_reference("http://example.com/file.md")
parse_reference("codex:/org/project/file.md")  # Missing second slash
```

### Storage Provider Issues

**GitHub Storage: 401 Unauthorized:**

1. Check token is set: `echo $GITHUB_TOKEN`
2. Verify token has correct scopes (needs `repo` for private repos)
3. Test token:
   ```bash
   curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
   ```

### Cache Problems

**Cache Always Misses:**

```python
cache = CacheManager(cache_dir=".fractary/codex/cache")
stats = await cache.get_stats()
print(f"Hit rate: {stats.hit_rate}")
print(f"Total entries: {stats.total_entries}")
```

**Solutions:**

1. Check cache directory exists and is writable
2. Verify TTL is not too short
3. Check for conflicting cache keys

### Debugging Tips

**Enable Debug Logging:**

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('fractary_codex')
logger.setLevel(logging.DEBUG)
```

## Requirements

- Python 3.9+
- `pyyaml` for YAML parsing
- `aiohttp` for async HTTP requests

## See Also

- [Configuration Guide](../../configuration.md) - Complete configuration reference
- [JavaScript SDK](../js/) - JavaScript/TypeScript implementation
- [CLI Documentation](../../cli/) - Command-line interface
- [MCP Server Documentation](../../mcp-server/) - AI agent integration
