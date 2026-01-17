# fractary-codex

Knowledge infrastructure SDK for AI agents - Python implementation.

## Installation

```bash
pip install fractary-codex
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

### Type-Based TTL

```python
from fractary_codex import TypeRegistry, TTL

# Create registry with built-in types
registry = TypeRegistry()

# Get TTL for different file types
print(registry.get_ttl("docs/api.md"))       # 86400 (1 day)
print(registry.get_ttl("config/app.yaml"))   # 3600 (1 hour)
print(registry.get_ttl("schemas/user.json")) # 604800 (1 week)

# Register custom type
from fractary_codex import ArtifactType

registry.register(ArtifactType(
    name="api-specs",
    patterns=["openapi/**/*.yaml", "specs/**/*.json"],
    ttl=TTL.WEEK,
    priority=5,
))
```

### Load Configuration

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

### Migrate Legacy References

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

## API Reference

### References

- `parse_reference(uri)` - Parse a codex:// URI
- `build_uri(org, project, path)` - Build a codex:// URI
- `is_valid_uri(uri)` - Check if URI is valid
- `convert_legacy_reference(ref)` - Convert $ref: to codex://

### Storage

- `LocalStorage` - Filesystem storage provider
- `HttpStorage` - HTTP/HTTPS storage provider
- `GitHubStorage` - GitHub repository storage
- `StorageManager` - Multi-provider orchestration

### Cache

- `CacheManager` - Intelligent caching with TTL
- `CacheEntry` - Cache entry with metadata
- `FileCacheStore` - File-based cache persistence

### Types

- `TypeRegistry` - Artifact type management
- `ArtifactType` - Type definition with patterns and TTL
- `TTL` - Time constants (MINUTE, HOUR, DAY, WEEK)

### Configuration

- `load_config()` - Load .fractary/config.yaml
- `resolve_organization()` - Detect org from config/git
- `CodexConfig` - Configuration dataclass

### Migration

- `migrate_file()` - Migrate a single file
- `migrate_directory()` - Migrate directory tree
- `scan_for_legacy_references()` - Find legacy refs

## Requirements

- Python 3.9+
- `pyyaml` for YAML parsing
- `aiohttp` for async HTTP requests

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=fractary_codex

# Type check
mypy fractary_codex

# Lint
ruff check fractary_codex
ruff format fractary_codex
```

## Publishing to PyPI

### Prerequisites

1. **PyPI Account**: Create accounts on [PyPI](https://pypi.org) and [TestPyPI](https://test.pypi.org)
2. **API Tokens**: Generate API tokens for both registries
3. **GitHub Secrets**: Add `PYPI_API_TOKEN` and `TEST_PYPI_API_TOKEN` to repository secrets

### Manual Publishing

```bash
# Install build tools
pip install build twine

# Build the package
python -m build

# Check the package
twine check dist/*

# Upload to TestPyPI first
twine upload --repository testpypi dist/*

# Test installation from TestPyPI
pip install --index-url https://test.pypi.org/simple/ fractary-codex

# Upload to PyPI (production)
twine upload dist/*
```

### Automated Publishing (CI/CD)

The GitHub Actions workflow handles publishing automatically:

1. **On Pull Request**: Runs tests, linting, and type checking
2. **On Release**: Publishes to TestPyPI, then PyPI

To publish a new version:

```bash
# 1. Update version in pyproject.toml and fractary_codex/__init__.py
# 2. Commit and push changes
# 3. Create a GitHub release with tag (e.g., v0.2.0)
# 4. CI/CD will automatically publish to PyPI
```

### Version Management

Update version in two places:
- `pyproject.toml`: `version = "X.Y.Z"`
- `fractary_codex/__init__.py`: `__version__ = "X.Y.Z"`

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (X): Breaking API changes
- **MINOR** (Y): New features, backward compatible
- **PATCH** (Z): Bug fixes, backward compatible

## License

MIT - see [LICENSE](LICENSE)

## Documentation

- [CLI Integration Guide](../../docs/guides/cli-integration.md) - How to integrate into CLI applications
- [API Reference](../../docs/guides/api-reference.md) - Complete API documentation
- [Configuration Guide](../../docs/guides/configuration.md) - Configuration reference
- [Troubleshooting](../../docs/guides/troubleshooting.md) - Common issues and solutions
- [Examples](../../docs/examples/) - Real-world usage patterns

## See Also

- [JavaScript SDK](../js/) - `@fractary/codex` on npm
- [Technical Specifications](../../docs/specs/) - Detailed specs
