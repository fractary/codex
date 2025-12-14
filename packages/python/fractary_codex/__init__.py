"""
Fractary Codex - Knowledge infrastructure SDK for AI agents.

This package provides universal references, multi-tier caching, storage abstraction,
and configuration management for AI agent knowledge systems.

Quick Start:
    >>> from fractary_codex import parse_reference, build_uri, TypeRegistry
    >>>
    >>> # Parse a codex:// URI
    >>> ref = parse_reference("codex://myorg/myproject/docs/api.md")
    >>> print(f"Organization: {ref.org}")
    >>> print(f"Project: {ref.project}")
    >>> print(f"Path: {ref.path}")
    >>>
    >>> # Build a URI from components
    >>> uri = build_uri("myorg", "myproject", "docs/guide.md")
    >>> print(uri)  # codex://myorg/myproject/docs/guide.md
    >>>
    >>> # Get TTL for a file path
    >>> registry = TypeRegistry()
    >>> ttl = registry.get_ttl("docs/api.md")
    >>> print(f"Cache for {ttl} seconds")

For more information, see https://github.com/fractary/codex
"""

__version__ = "0.1.0"

# Errors
# Cache
from .cache import (
    CacheEntry,
    CacheManager,
    FileCacheStore,
    generate_cache_key,
)

# Core
from .core import (
    DEFAULT_CACHE_DIR,
    CodexConfig,
    ParsedMetadata,
    build_frontmatter,
    compile_pattern,
    expand_pattern,
    extract_frontmatter,
    filter_by_pattern,
    filter_by_patterns,
    get_config_path,
    get_metadata_value,
    get_pattern_prefix,
    has_frontmatter,
    load_config,
    match_pattern,
    match_patterns,
    parse_metadata,
    resolve_organization,
    update_frontmatter,
    validate_metadata,
)
from .errors import (
    CacheError,
    CodexError,
    ConfigurationError,
    ReferenceError,
    StorageError,
    ValidationError,
)

# Migration
from .migration import (
    ConversionResult,
    FileConversionResult,
    convert_legacy_references,
    migrate_directory,
    migrate_file,
    scan_for_legacy_references,
)

# References
from .references import (
    CODEX_URI_PREFIX,
    LEGACY_REF_PREFIX,
    ParsedReference,
    ProjectContext,
    ResolvedReference,
    build_uri,
    convert_legacy_reference,
    detect_current_project,
    get_extension,
    is_legacy_reference,
    is_safe_path,
    is_valid_uri,
    normalize_path,
    parse_reference,
    resolve_reference,
    resolve_references,
    sanitize_path,
    validate_path,
)

# Schemas
from .schemas import (
    CacheConfig,
    FullConfig,
    GitHubStorageConfig,
    HttpStorageConfig,
    LocalStorageConfig,
    PermissionConfig,
    StorageProviderConfig,
    SyncRuleConfig,
    TypeConfig,
    validate_config_dict,
)

# Storage
from .storage import (
    BaseStorageProvider,
    FetchOptions,
    FetchResult,
    GitHubStorage,
    HttpStorage,
    LocalStorage,
    StorageManager,
    StorageProvider,
)

# Types
from .types import (
    BUILT_IN_TYPES,
    DEFAULT_TTL,
    TTL,
    ArtifactType,
    TypeRegistry,
    create_default_registry,
    get_all_built_in_types,
    get_built_in_type,
    load_custom_types,
    merge_type,
    parse_custom_type,
)

__all__ = [
    # Version
    "__version__",
    # Errors
    "CodexError",
    "ConfigurationError",
    "ValidationError",
    "StorageError",
    "CacheError",
    "ReferenceError",
    # Reference constants
    "CODEX_URI_PREFIX",
    "LEGACY_REF_PREFIX",
    # Reference types
    "ParsedReference",
    "ProjectContext",
    "ResolvedReference",
    # Reference functions
    "parse_reference",
    "build_uri",
    "is_valid_uri",
    "is_legacy_reference",
    "convert_legacy_reference",
    "validate_path",
    "sanitize_path",
    "is_safe_path",
    "normalize_path",
    "get_extension",
    "detect_current_project",
    "resolve_reference",
    "resolve_references",
    # Type constants
    "BUILT_IN_TYPES",
    "DEFAULT_TTL",
    "TTL",
    # Type types
    "ArtifactType",
    "TypeRegistry",
    # Type functions
    "get_built_in_type",
    "get_all_built_in_types",
    "create_default_registry",
    "parse_custom_type",
    "load_custom_types",
    "merge_type",
    # Core constants
    "DEFAULT_CACHE_DIR",
    # Core types
    "CodexConfig",
    "ParsedMetadata",
    # Config functions
    "load_config",
    "resolve_organization",
    "get_config_path",
    # Metadata functions
    "parse_metadata",
    "extract_frontmatter",
    "has_frontmatter",
    "build_frontmatter",
    "update_frontmatter",
    "get_metadata_value",
    "validate_metadata",
    # Pattern functions
    "match_pattern",
    "match_patterns",
    "filter_by_pattern",
    "filter_by_patterns",
    "expand_pattern",
    "compile_pattern",
    "get_pattern_prefix",
    # Schema types
    "StorageProviderConfig",
    "LocalStorageConfig",
    "GitHubStorageConfig",
    "HttpStorageConfig",
    "CacheConfig",
    "TypeConfig",
    "SyncRuleConfig",
    "PermissionConfig",
    "FullConfig",
    "validate_config_dict",
    # Storage types
    "StorageProvider",
    "BaseStorageProvider",
    "FetchResult",
    "FetchOptions",
    "LocalStorage",
    "HttpStorage",
    "GitHubStorage",
    "StorageManager",
    # Cache types
    "CacheEntry",
    "CacheManager",
    "FileCacheStore",
    "generate_cache_key",
    # Migration types
    "ConversionResult",
    "FileConversionResult",
    "convert_legacy_references",
    "migrate_file",
    "migrate_directory",
    "scan_for_legacy_references",
]
