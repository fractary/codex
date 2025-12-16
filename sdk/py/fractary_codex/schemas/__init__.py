"""
Schema definitions for Fractary Codex.

This module provides dataclass-based schemas for configuration
and validation of SDK data structures.
"""

from .config import (
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

__all__ = [
    # Storage configs
    "StorageProviderConfig",
    "LocalStorageConfig",
    "GitHubStorageConfig",
    "HttpStorageConfig",
    # Other configs
    "CacheConfig",
    "TypeConfig",
    "SyncRuleConfig",
    "PermissionConfig",
    "FullConfig",
    # Validation
    "validate_config_dict",
]
