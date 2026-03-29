# Python SDK

The `fractary-codex` Python SDK provides `codex://` URI parsing, multi-provider storage, TTL-based caching, and configuration management for AI agent knowledge systems.

[![PyPI version](https://img.shields.io/pypi/v/fractary-codex.svg)](https://pypi.org/project/fractary-codex/)

## Installation

```bash
pip install fractary-codex
```

## Quick Start

```python
from fractary_codex import parse_reference, build_uri, TypeRegistry

# Parse a codex:// URI
ref = parse_reference("codex://myorg/myproject/docs/api.md")
print(ref.org)      # 'myorg'
print(ref.project)  # 'myproject'
print(ref.path)     # 'docs/api.md'

# Build a URI from components
uri = build_uri("myorg", "myproject", "docs/guide.md")
# 'codex://myorg/myproject/docs/guide.md'

# Get TTL for a file path (uses built-in type patterns)
registry = TypeRegistry()
ttl = registry.get_ttl("docs/api.md")
print(f"Cache for {ttl} seconds")
```

## Features

- `codex://` URI parsing, building, and validation
- Multi-provider storage (Local, GitHub, HTTP)
- TTL-based caching with disk persistence
- Built-in and custom artifact type registry
- Configuration loading from environment variables
- Migration tools for legacy `$ref:` references
- Frontmatter parsing and metadata utilities
- Glob pattern matching utilities

## API Reference

### References

```python
from fractary_codex import (
    parse_reference,   # Parse a codex:// URI → ParsedReference
    build_uri,         # Build a codex:// URI from components
    is_valid_uri,      # Check if a string is a valid codex:// URI
    resolve_reference, # Resolve URI to local paths → ResolvedReference | None
    resolve_references,# Resolve multiple URIs
)
```

### Storage

```python
from fractary_codex import StorageManager, LocalStorage, GitHubStorage, HttpStorage

# Use StorageManager to orchestrate multiple providers
storage = StorageManager(providers=[LocalStorage(base_path="./knowledge")])
result = await storage.fetch(resolved_ref)
print(result.content)
```

### Cache

```python
from fractary_codex import CacheManager, CacheEntry, generate_cache_key

cache = CacheManager(cache_dir=".fractary/codex/cache")
```

### Types

```python
from fractary_codex import TypeRegistry, BUILT_IN_TYPES, create_default_registry

# Registry with built-in types (docs, specs, config, logs, schemas)
registry = create_default_registry()
ttl = registry.get_ttl("specs/SPEC-001.md")  # Uses 'specs' type TTL
```

### Configuration

```python
from fractary_codex import load_config, CodexConfig

# Builds config from environment variables (ORGANIZATION_SLUG, etc.)
config = load_config()
```

### Errors

```python
from fractary_codex import (
    CodexError,         # Base error class
    ConfigurationError, # Config loading/parsing errors
    ValidationError,    # Invalid URIs or bad config values
    StorageError,       # Storage provider errors
    CacheError,         # Cache operation errors
    ReferenceError,     # Reference parsing/resolution errors
)
```

### Migration

```python
from fractary_codex import (
    migrate_file,              # Migrate a single file's $ref: references
    migrate_directory,         # Migrate all files in a directory
    convert_legacy_references, # Convert $ref: strings to codex:// URIs
    scan_for_legacy_references,# Find files containing legacy references
)
```

## Authentication

Set `GITHUB_TOKEN` for private repository access:

```bash
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## See Also

- [JavaScript SDK](../js/) - Full-featured JS/TS SDK
- [CLI Documentation](../../cli/) - Language-agnostic command-line interface
- [Configuration Guide](../../configuration.md) - Configuration reference
