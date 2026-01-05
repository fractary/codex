---
title: "Python SDK for Fractary Codex"
work_id: "2"
issue_url: "https://github.com/fractary/codex/issues/2"
template: "feature"
created: "2025-12-14T10:00:00Z"
status: "draft"
source: "conversation+issue"
validation_status: "pending"
---

# Python SDK for Fractary Codex

## Summary

Create a Python SDK (`fractary-codex` on PyPI) alongside the existing JavaScript SDK (`@fractary/codex` on npm). The Python SDK will provide equivalent functionality for document fetching, caching with TTL, configuration loading from `.fractary/` directories, and `codex://` reference resolution. Target Python 3.9+ with async support via `asyncio` and comprehensive type hints.

## Background

The existing JavaScript SDK (v0.1.2) provides core knowledge infrastructure for AI agents:
- Universal references (`codex://` URIs)
- Multi-tier caching with persistence
- Storage abstraction (local, GitHub, HTTP)
- Configuration management
- MCP (Model Context Protocol) integration
- File synchronization
- Permission management
- Migration utilities (v2.x to v3.0)

A Python SDK will expand accessibility to the broader Python AI/ML ecosystem and enable Python-based AI agents to leverage the same knowledge infrastructure.

## Requirements

### Functional Requirements

#### FR-1: Reference System
- **FR-1.1**: Parse `codex://` URIs into structured components (org, project, path)
- **FR-1.2**: Build URIs from components
- **FR-1.3**: Validate URI format and path safety
- **FR-1.4**: Convert legacy references to modern `codex://` format
- **FR-1.5**: Resolve references to actual file paths or URLs
- **FR-1.6**: Detect current project context from git repository

#### FR-2: Type Registry
- **FR-2.1**: Built-in artifact types with default TTLs (docs, config, schema, etc.)
- **FR-2.2**: Custom type definitions from configuration
- **FR-2.3**: TTL lookup by file path/pattern
- **FR-2.4**: Type merging and extension

#### FR-3: Storage Abstraction
- **FR-3.1**: Local filesystem storage provider
- **FR-3.2**: GitHub repository storage provider (via API)
- **FR-3.3**: HTTP/HTTPS storage provider for remote URLs
- **FR-3.4**: Storage manager for provider orchestration
- **FR-3.5**: Async fetch operations with proper error handling

#### FR-4: Caching System
- **FR-4.1**: Cache entries with TTL, staleness tracking, and content hashing
- **FR-4.2**: Cache persistence to filesystem (JSON-based)
- **FR-4.3**: Cache manager with lookup, store, and invalidation
- **FR-4.4**: Multi-tier caching (memory + disk)
- **FR-4.5**: Cache statistics and metrics

#### FR-5: Configuration Management
- **FR-5.1**: Load `codex.yaml` from `.fractary/` directories
- **FR-5.2**: Configuration hierarchy (project < user < global)
- **FR-5.3**: Default configuration values
- **FR-5.4**: Organization resolution from git remote or config

#### FR-6: Metadata Parsing
- **FR-6.1**: Parse YAML frontmatter from markdown files
- **FR-6.2**: Validate metadata against schema
- **FR-6.3**: Extract raw frontmatter for processing

#### FR-7: Pattern Matching
- **FR-7.1**: Glob pattern matching for file paths
- **FR-7.2**: Filter files by include/exclude patterns
- **FR-7.3**: Pattern evaluation for sync rules

#### FR-8: Sync System (Optional - Phase 2)
- **FR-8.1**: Evaluate paths against sync rules
- **FR-8.2**: Create sync plans (operations to perform)
- **FR-8.3**: Execute sync operations
- **FR-8.4**: Track sync manifests

#### FR-9: Permissions (Optional - Phase 2)
- **FR-9.1**: Permission rules with levels (none, read, write, admin)
- **FR-9.2**: Path-based permission evaluation
- **FR-9.3**: Permission manager for access control

### Non-Functional Requirements

#### NFR-1: Python Version
- Minimum Python 3.9+
- Full support for 3.10, 3.11, 3.12, 3.13

#### NFR-2: Async Support
- All I/O operations use `asyncio`
- Provide sync wrappers for convenience
- Support `async with` context managers

#### NFR-3: Type Safety
- Full type hints using `typing` module
- Compatible with `mypy --strict`
- Export type stubs for IDE support

#### NFR-4: API Parity
- Function names follow Python conventions (snake_case)
- Similar module structure to JS SDK
- Equivalent functionality for core features

#### NFR-5: Dependencies
- Minimize external dependencies
- Required: `pyyaml` (YAML parsing), `aiohttp` (HTTP client)
- Optional: `aiofiles` (async file I/O)

#### NFR-6: Performance
- Efficient caching with O(1) lookups
- Lazy loading of configuration
- Connection pooling for HTTP requests

#### NFR-7: Testing
- Unit tests with `pytest` and `pytest-asyncio`
- Code coverage > 80%
- Type checking in CI

#### NFR-8: Documentation
- Docstrings for all public APIs
- README with quickstart guide
- API reference documentation

## Design

### Package Structure

```
sdk/py/
├── fractary_codex/
│   ├── __init__.py           # Public API exports
│   ├── py.typed              # PEP 561 marker
│   │
│   ├── errors/
│   │   ├── __init__.py
│   │   └── exceptions.py     # CodexError, ConfigurationError, ValidationError
│   │
│   ├── references/
│   │   ├── __init__.py
│   │   ├── parser.py         # parse_reference, build_uri, is_valid_uri
│   │   ├── resolver.py       # resolve_reference, detect_current_project
│   │   └── validator.py      # validate_path, sanitize_path
│   │
│   ├── types/
│   │   ├── __init__.py
│   │   ├── builtin.py        # BUILT_IN_TYPES, TTL constants
│   │   ├── registry.py       # TypeRegistry class
│   │   └── custom.py         # Custom type loading and merging
│   │
│   ├── storage/
│   │   ├── __init__.py
│   │   ├── base.py           # StorageProvider protocol
│   │   ├── local.py          # LocalStorage implementation
│   │   ├── github.py         # GitHubStorage implementation
│   │   ├── http.py           # HttpStorage implementation
│   │   └── manager.py        # StorageManager orchestration
│   │
│   ├── cache/
│   │   ├── __init__.py
│   │   ├── entry.py          # CacheEntry dataclass
│   │   ├── persistence.py    # CachePersistence (disk storage)
│   │   └── manager.py        # CacheManager with TTL handling
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py         # load_config, resolve_organization
│   │   ├── metadata.py       # parse_metadata, validate_metadata
│   │   ├── patterns.py       # match_pattern, filter_by_patterns
│   │   └── routing.py        # should_sync_to_repo, get_target_repos
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── config.py         # Pydantic/dataclass schemas
│   │
│   └── migration/
│       ├── __init__.py
│       ├── detector.py       # detect_version, needs_migration
│       ├── migrator.py       # migrate_config
│       └── references.py     # convert_legacy_references
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py           # Pytest fixtures
│   ├── test_references/
│   ├── test_storage/
│   ├── test_cache/
│   ├── test_core/
│   └── test_migration/
│
├── pyproject.toml            # Build configuration
├── README.md                 # Package documentation
├── LICENSE                   # MIT license
└── .github/
    └── workflows/
        └── python-publish.yml  # PyPI publishing workflow
```

### API Design

#### Main Entry Point

```python
# fractary_codex/__init__.py

# Errors
from .errors import CodexError, ConfigurationError, ValidationError

# References
from .references import (
    parse_reference,
    build_uri,
    is_valid_uri,
    resolve_reference,
    resolve_references,
    detect_current_project,
    validate_path,
    sanitize_path,
    ParsedReference,
)

# Types
from .types import (
    TypeRegistry,
    create_default_registry,
    BUILT_IN_TYPES,
    TTL,
)

# Storage
from .storage import (
    StorageProvider,
    LocalStorage,
    GitHubStorage,
    HttpStorage,
    StorageManager,
    create_storage_manager,
    FetchResult,
)

# Cache
from .cache import (
    CacheEntry,
    CacheManager,
    CachePersistence,
    create_cache_manager,
)

# Core
from .core import (
    load_config,
    resolve_organization,
    parse_metadata,
    match_pattern,
    filter_by_patterns,
)

# Migration
from .migration import (
    detect_version,
    needs_migration,
    migrate_config,
    convert_legacy_references,
)

__version__ = "0.1.0"
```

#### Reference Parser Example

```python
# fractary_codex/references/parser.py
from dataclasses import dataclass
from typing import Optional
import re

CODEX_URI_PREFIX = "codex://"
LEGACY_REF_PREFIX = "$ref:"

@dataclass(frozen=True)
class ParsedReference:
    """Parsed components of a codex:// URI."""
    org: str
    project: str
    path: str
    original: str

def parse_reference(uri: str) -> ParsedReference:
    """
    Parse a codex:// URI into its components.

    Args:
        uri: A codex URI like "codex://org/project/path/to/file.md"

    Returns:
        ParsedReference with org, project, and path components

    Raises:
        ValidationError: If URI format is invalid
    """
    if not uri.startswith(CODEX_URI_PREFIX):
        raise ValidationError(f"Invalid URI: must start with {CODEX_URI_PREFIX}")

    path_part = uri[len(CODEX_URI_PREFIX):]
    parts = path_part.split("/", 2)

    if len(parts) < 3:
        raise ValidationError("URI must have format: codex://org/project/path")

    return ParsedReference(
        org=parts[0],
        project=parts[1],
        path=parts[2],
        original=uri
    )

def build_uri(org: str, project: str, path: str) -> str:
    """Build a codex:// URI from components."""
    return f"{CODEX_URI_PREFIX}{org}/{project}/{path}"

def is_valid_uri(uri: str) -> bool:
    """Check if a string is a valid codex:// URI."""
    try:
        parse_reference(uri)
        return True
    except ValidationError:
        return False
```

#### Storage Provider Protocol

```python
# fractary_codex/storage/base.py
from typing import Protocol, Optional
from dataclasses import dataclass

@dataclass
class FetchResult:
    """Result of a storage fetch operation."""
    content: bytes
    content_type: str
    etag: Optional[str] = None
    last_modified: Optional[str] = None
    size: int = 0

class StorageProvider(Protocol):
    """Protocol for storage provider implementations."""

    async def fetch(
        self,
        path: str,
        *,
        timeout: float = 30.0,
        headers: Optional[dict[str, str]] = None,
    ) -> FetchResult:
        """Fetch content from storage."""
        ...

    async def exists(self, path: str) -> bool:
        """Check if path exists in storage."""
        ...

    async def close(self) -> None:
        """Clean up resources."""
        ...
```

#### Cache Manager Example

```python
# fractary_codex/cache/manager.py
from dataclasses import dataclass
from typing import Optional
import time

@dataclass
class CacheEntry:
    """A cached item with TTL tracking."""
    key: str
    content: bytes
    content_hash: str
    created_at: float
    accessed_at: float
    ttl_seconds: int
    etag: Optional[str] = None

    @property
    def is_valid(self) -> bool:
        """Check if entry is within TTL."""
        return time.time() < self.created_at + self.ttl_seconds

    @property
    def is_fresh(self) -> bool:
        """Check if entry is fresh (< 50% of TTL elapsed)."""
        elapsed = time.time() - self.created_at
        return elapsed < self.ttl_seconds * 0.5

class CacheManager:
    """Manages caching with TTL and persistence."""

    def __init__(
        self,
        cache_dir: Optional[str] = None,
        max_memory_entries: int = 1000,
    ) -> None:
        self._memory_cache: dict[str, CacheEntry] = {}
        self._cache_dir = cache_dir
        self._max_entries = max_memory_entries

    async def get(self, key: str) -> Optional[CacheEntry]:
        """Get entry from cache if valid."""
        if key in self._memory_cache:
            entry = self._memory_cache[key]
            if entry.is_valid:
                entry.accessed_at = time.time()
                return entry
            del self._memory_cache[key]
        return None

    async def set(
        self,
        key: str,
        content: bytes,
        ttl_seconds: int,
        etag: Optional[str] = None,
    ) -> CacheEntry:
        """Store entry in cache."""
        now = time.time()
        entry = CacheEntry(
            key=key,
            content=content,
            content_hash=self._hash(content),
            created_at=now,
            accessed_at=now,
            ttl_seconds=ttl_seconds,
            etag=etag,
        )
        self._memory_cache[key] = entry
        return entry
```

### PyPI Configuration

```toml
# sdk/py/pyproject.toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "fractary-codex"
version = "0.1.0"
description = "Knowledge infrastructure SDK for AI agents - universal references, caching, and storage abstraction"
readme = "README.md"
license = "MIT"
requires-python = ">=3.9"
authors = [
    { name = "Fractary Engineering", email = "engineering@fractary.dev" }
]
keywords = [
    "codex",
    "knowledge-management",
    "ai-agents",
    "caching",
    "storage",
    "fractary"
]
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Operating System :: OS Independent",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.9",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Programming Language :: Python :: 3.13",
    "Topic :: Software Development :: Libraries :: Python Modules",
    "Typing :: Typed",
]
dependencies = [
    "pyyaml>=6.0",
    "aiohttp>=3.9",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "pytest-cov>=4.0",
    "mypy>=1.8",
    "ruff>=0.1",
    "types-PyYAML",
]

[project.urls]
Homepage = "https://github.com/fractary/codex"
Documentation = "https://github.com/fractary/codex#readme"
Repository = "https://github.com/fractary/codex"
Issues = "https://github.com/fractary/codex/issues"

[tool.hatch.build.targets.wheel]
packages = ["fractary_codex"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.mypy]
python_version = "3.9"
strict = true
warn_return_any = true
warn_unused_configs = true

[tool.ruff]
target-version = "py39"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "C4", "SIM"]
```

### CI/CD Workflow

```yaml
# .github/workflows/python-publish.yml
name: Python Package

on:
  push:
    tags:
      - 'python-v*'
  pull_request:
    paths:
      - 'sdk/py/**'

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11', '3.12', '3.13']

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install dependencies
        working-directory: sdk/py
        run: |
          python -m pip install --upgrade pip
          pip install -e ".[dev]"

      - name: Type check with mypy
        working-directory: sdk/py
        run: mypy fractary_codex

      - name: Lint with ruff
        working-directory: sdk/py
        run: ruff check fractary_codex

      - name: Test with pytest
        working-directory: sdk/py
        run: pytest --cov=fractary_codex --cov-report=xml

  publish:
    needs: test
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/python-v')

    permissions:
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install build tools
        run: pip install build

      - name: Build package
        working-directory: sdk/py
        run: python -m build

      - name: Publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
        with:
          packages-dir: sdk/py/dist/
```

## Implementation Plan

### Phase 1: Core (MVP) - Estimated 3-4 days

1. **Project Setup**
   - Create `sdk/py/` directory structure
   - Set up `pyproject.toml` with dependencies
   - Configure pytest, mypy, ruff
   - Add `py.typed` marker

2. **Errors Module**
   - `CodexError` base exception
   - `ConfigurationError` for config issues
   - `ValidationError` for validation failures

3. **References Module**
   - `parse_reference()` - URI parsing
   - `build_uri()` - URI construction
   - `is_valid_uri()` - validation
   - `validate_path()` - path safety checks

4. **Types Module**
   - `BUILT_IN_TYPES` dictionary
   - `TTL` constants (HOUR, DAY, WEEK, etc.)
   - `TypeRegistry` class
   - Custom type loading

5. **Core Configuration**
   - `load_config()` - load codex.yaml
   - `resolve_organization()` - detect org from git
   - Default configuration values

6. **Unit Tests**
   - Tests for all Phase 1 modules
   - CI workflow for testing

### Phase 2: Storage & Cache - Estimated 3-4 days

1. **Storage Module**
   - `StorageProvider` protocol
   - `LocalStorage` implementation
   - `HttpStorage` implementation
   - `StorageManager` orchestration

2. **Cache Module**
   - `CacheEntry` dataclass
   - `CachePersistence` (disk storage)
   - `CacheManager` with TTL handling
   - Memory + disk tiers

3. **Reference Resolution**
   - `resolve_reference()` - full resolution
   - `detect_current_project()` - git context
   - Integration with storage/cache

4. **GitHub Storage** (if time permits)
   - `GitHubStorage` implementation
   - GitHub API authentication
   - Rate limiting handling

### Phase 3: Polish & Release - Estimated 2-3 days

1. **Documentation**
   - README with examples
   - Docstrings for all public APIs
   - Type stubs verification

2. **Additional Features**
   - Metadata parsing
   - Pattern matching
   - Legacy reference conversion

3. **CI/CD**
   - PyPI publishing workflow
   - Version tagging strategy
   - Release automation

4. **Integration Testing**
   - End-to-end tests
   - Cross-platform verification

### Phase 4: Advanced Features (Future)

1. **MCP Integration**
   - Python MCP server
   - Tool handlers

2. **Sync System**
   - Path evaluation
   - Sync planning
   - Sync execution

3. **Permissions**
   - Permission rules
   - Access control manager

## Acceptance Criteria

### Must Have (Phase 1-3)

- [ ] Python SDK installable via `pip install fractary-codex`
- [ ] Passes `mypy --strict` type checking
- [ ] Reference parsing/building matches JS SDK behavior
- [ ] Type registry with built-in types and TTLs
- [ ] Configuration loading from `.fractary/codex/config.yaml`
- [ ] Local storage provider working
- [ ] HTTP storage provider working
- [ ] Cache manager with TTL support
- [ ] Cache persistence to disk
- [ ] Unit test coverage > 80%
- [ ] CI pipeline passing on Python 3.9-3.13
- [ ] PyPI publishing workflow functional
- [ ] README with installation and usage examples

### Should Have

- [ ] GitHub storage provider
- [ ] Metadata (frontmatter) parsing
- [ ] Pattern matching utilities
- [ ] Legacy reference conversion
- [ ] Sync wrappers for async functions

### Could Have (Future)

- [ ] MCP server implementation
- [ ] Sync system
- [ ] Permission system
- [ ] CLI tool

## Open Questions

1. **Package naming**: Should it be `fractary-codex` or `fractary_codex` on PyPI? (PyPI normalizes both to `fractary-codex`)

2. **Async-first or sync-first**: Should the primary API be async with sync wrappers, or sync with async variants?
   - **Decision**: Async-first, matching modern Python patterns and the JS SDK's promise-based approach

3. **Pydantic vs dataclasses**: Use Pydantic for schemas (validation) or stick to stdlib dataclasses?
   - **Decision**: Use dataclasses for lightweight types, Pydantic optional for complex validation

4. **aiofiles dependency**: Include for async file I/O or use `asyncio.to_thread()` wrapper?
   - **Decision**: Start with `asyncio.to_thread()` to minimize dependencies, add aiofiles if performance requires

## Related Links

- [Issue #2: Add Python SDK](https://github.com/fractary/codex/issues/2)
- [JS SDK Source](https://github.com/fractary/codex/tree/main/sdk/js/src)
- [Python SDK Source](https://github.com/fractary/codex/tree/main/sdk/py)
- [JS SDK npm](https://www.npmjs.com/package/@fractary/codex)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-12-14 | Updated paths for monorepo structure (`sdk/py/`) | Claude |
| 2025-12-14 | Initial specification created | Claude (spec-generator) |
