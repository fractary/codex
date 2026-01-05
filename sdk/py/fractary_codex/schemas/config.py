"""
Configuration schema definitions.

This module provides dataclass-based schemas for configuration validation
and type-safe configuration handling.
"""

from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any, Literal, Optional, Union


@dataclass
class StorageProviderConfig:
    """Configuration for a storage provider.

    Attributes:
        type: Provider type ('local', 'github', 'http')
        enabled: Whether the provider is enabled
        priority: Priority for provider selection (higher = tried first)
        options: Provider-specific options
    """

    type: Literal["local", "github", "http"]
    enabled: bool = True
    priority: int = 0
    options: dict[str, Any] = field(default_factory=dict)


@dataclass
class LocalStorageConfig(StorageProviderConfig):
    """Configuration for local filesystem storage.

    Attributes:
        base_path: Base directory for local storage
        create_dirs: Whether to create directories if they don't exist
    """

    type: Literal["local"] = "local"
    base_path: str = "."
    create_dirs: bool = True


@dataclass
class GitHubStorageConfig(StorageProviderConfig):
    """Configuration for GitHub storage provider.

    Attributes:
        token_env: Environment variable name for GitHub token
        default_branch: Default branch to fetch from
        use_raw_urls: Whether to use raw.githubusercontent.com URLs
        rate_limit_buffer: Buffer for rate limiting (0.0-1.0)
    """

    type: Literal["github"] = "github"
    token_env: str = "GITHUB_TOKEN"
    default_branch: str = "main"
    use_raw_urls: bool = True
    rate_limit_buffer: float = 0.1


@dataclass
class HttpStorageConfig(StorageProviderConfig):
    """Configuration for HTTP storage provider.

    Attributes:
        base_url: Base URL for HTTP requests
        timeout: Request timeout in seconds
        headers: Additional headers to send
        verify_ssl: Whether to verify SSL certificates
    """

    type: Literal["http"] = "http"
    base_url: Optional[str] = None
    timeout: float = 30.0
    headers: dict[str, str] = field(default_factory=dict)
    verify_ssl: bool = True


@dataclass
class CacheConfig:
    """Cache configuration.

    Attributes:
        directory: Cache directory path
        default_ttl: Default TTL in seconds
        max_memory_size: Maximum memory cache size in bytes
        max_disk_size: Maximum disk cache size in bytes
        max_entries: Maximum number of cached entries
        persist: Whether to persist cache to disk
    """

    directory: str = ".fractary/codex/cache"
    default_ttl: int = 86400  # 1 day
    max_memory_size: int = 50 * 1024 * 1024  # 50MB
    max_disk_size: int = 500 * 1024 * 1024  # 500MB
    max_entries: int = 10000
    persist: bool = True


@dataclass
class TypeConfig:
    """Custom type configuration.

    Attributes:
        patterns: Glob patterns for matching files
        ttl: TTL in seconds (or string like '1h', '1d')
        description: Human-readable description
        priority: Priority for pattern matching
    """

    patterns: Sequence[str]
    ttl: Union[int, str] = 86400
    description: str = ""
    priority: int = 0


@dataclass
class SyncRuleConfig:
    """Sync rule configuration.

    Attributes:
        pattern: Glob pattern for matching files
        direction: Sync direction ('to_repo', 'from_repo', 'bidirectional')
        enabled: Whether the rule is enabled
        conflict_resolution: How to resolve conflicts
    """

    pattern: str
    direction: Literal["to_repo", "from_repo", "bidirectional"] = "bidirectional"
    enabled: bool = True
    conflict_resolution: Literal["newer", "local", "remote", "manual"] = "newer"


@dataclass
class PermissionConfig:
    """Permission configuration.

    Attributes:
        enforced: Whether permissions are enforced
        default_level: Default permission level
        rules: List of permission rules
    """

    enforced: bool = False
    default_level: Literal["none", "read", "write", "admin"] = "read"
    rules: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class FullConfig:
    """Complete Codex configuration schema.

    This represents the full configuration file structure.

    Attributes:
        version: Configuration version (e.g., '3.0')
        organization: Organization name
        project: Project name (optional)
        cache: Cache configuration
        storage: Storage provider configurations
        types: Custom type definitions
        sync: Sync configuration
        permissions: Permission configuration
    """

    organization: str
    version: str = "3.0"
    project: Optional[str] = None
    cache: CacheConfig = field(default_factory=CacheConfig)
    storage: dict[str, StorageProviderConfig] = field(default_factory=dict)
    types: dict[str, TypeConfig] = field(default_factory=dict)
    sync: dict[str, Any] = field(default_factory=dict)
    permissions: PermissionConfig = field(default_factory=PermissionConfig)


def validate_config_dict(config: dict[str, Any]) -> list[str]:
    """Validate a raw configuration dictionary.

    Args:
        config: Raw configuration dictionary

    Returns:
        List of validation error messages (empty if valid)
    """
    errors: list[str] = []

    # Check version
    version = config.get("version")
    if version and not isinstance(version, str):
        errors.append(f"'version' must be a string, got {type(version).__name__}")

    # Check organization
    org = config.get("organization") or config.get("org")
    if org and not isinstance(org, str):
        errors.append(f"'organization' must be a string, got {type(org).__name__}")

    # Check cache config
    cache = config.get("cache")
    if cache is not None:
        if not isinstance(cache, dict):
            errors.append(f"'cache' must be a mapping, got {type(cache).__name__}")
        else:
            cache_errors = _validate_cache_config(cache)
            errors.extend(f"cache.{e}" for e in cache_errors)

    # Check storage config
    storage = config.get("storage")
    if storage is not None:
        if not isinstance(storage, dict):
            errors.append(f"'storage' must be a mapping, got {type(storage).__name__}")

    # Check types config
    types = config.get("types")
    if types is not None:
        if not isinstance(types, dict):
            errors.append(f"'types' must be a mapping, got {type(types).__name__}")
        else:
            for name, type_config in types.items():
                if not isinstance(type_config, dict):
                    errors.append(f"types.{name} must be a mapping")
                elif "patterns" not in type_config:
                    errors.append(f"types.{name} missing required 'patterns' field")

    return errors


def _validate_cache_config(config: dict[str, Any]) -> list[str]:
    """Validate cache configuration."""
    errors: list[str] = []

    if "directory" in config and not isinstance(config["directory"], str):
        errors.append("'directory' must be a string")

    if "default_ttl" in config:
        ttl = config["default_ttl"]
        if not isinstance(ttl, (int, str)):
            errors.append("'default_ttl' must be an integer or string")
        elif isinstance(ttl, int) and ttl < 0:
            errors.append("'default_ttl' must be non-negative")

    for size_field in ["max_memory_size", "max_disk_size", "max_entries"]:
        if size_field in config:
            value = config[size_field]
            if not isinstance(value, int):
                errors.append(f"'{size_field}' must be an integer")
            elif value < 0:
                errors.append(f"'{size_field}' must be non-negative")

    return errors
