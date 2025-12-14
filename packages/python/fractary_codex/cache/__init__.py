"""
Cache module for intelligent content caching with TTL management.

This module provides:
- CacheEntry: Dataclass representing cached content with metadata
- CacheManager: High-level cache manager with TTL-based expiration
- FileCacheStore: File-based cache persistence

Example:
    from fractary_codex.cache import CacheManager
    from fractary_codex.storage import GitHubStorage

    async with CacheManager() as cache:
        storage = GitHubStorage()
        result = await cache.fetch("codex://org/repo/docs/api.md", storage)
        print(result.text)
"""

from .entry import CacheEntry, generate_cache_key
from .manager import CacheManager
from .persistence import FileCacheStore

__all__ = [
    "CacheEntry",
    "CacheManager",
    "FileCacheStore",
    "generate_cache_key",
]
