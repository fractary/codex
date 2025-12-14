"""
Storage providers for fetching content from various sources.

This module provides a unified interface for fetching content from:
- Local filesystem
- HTTP/HTTPS URLs
- GitHub repositories (public and private)

Example:
    from fractary_codex.storage import StorageManager, LocalStorage, GitHubStorage

    async with StorageManager() as manager:
        manager.register("local", LocalStorage(base_path="./knowledge"))
        manager.register("github", GitHubStorage())

        result = await manager.fetch("codex://myorg/myrepo/docs/api.md")
        print(result.text)
"""

from .base import (
    BaseStorageProvider,
    FetchOptions,
    FetchResult,
    StorageProvider,
)
from .github import GitHubStorage
from .http import HttpStorage
from .local import LocalStorage
from .manager import StorageManager

__all__ = [
    # Base types
    "StorageProvider",
    "BaseStorageProvider",
    "FetchResult",
    "FetchOptions",
    # Providers
    "LocalStorage",
    "HttpStorage",
    "GitHubStorage",
    # Manager
    "StorageManager",
]
