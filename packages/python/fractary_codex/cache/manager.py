"""
Cache manager for intelligent content caching.

This module provides a CacheManager that integrates storage providers with
TTL-based caching, using the TypeRegistry for automatic TTL determination.
"""

import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Union

from ..core import DEFAULT_CACHE_DIR
from ..errors import CacheError, StorageError
from ..storage.base import FetchOptions, FetchResult, StorageProvider
from ..types import TypeRegistry, create_default_registry
from .entry import CacheEntry, generate_cache_key
from .persistence import FileCacheStore


class CacheManager:
    """Intelligent cache manager with TTL-based expiration.

    The CacheManager wraps storage providers to provide automatic caching
    with TTL determination based on file types. It supports:
    - Automatic TTL based on file type (via TypeRegistry)
    - Manual TTL override per request
    - Conditional requests (If-None-Match, If-Modified-Since)
    - Background refresh for stale entries
    - Cache statistics and cleanup

    Example:
        from fractary_codex.cache import CacheManager
        from fractary_codex.storage import GitHubStorage

        async with CacheManager() as cache:
            # Set up storage provider
            storage = GitHubStorage(token="...")

            # Fetch with automatic TTL based on file type
            result = await cache.fetch(
                "codex://myorg/myrepo/docs/api.md",
                storage=storage,
            )

            # Second fetch returns cached content
            result = await cache.fetch(
                "codex://myorg/myrepo/docs/api.md",
                storage=storage,
            )
    """

    def __init__(
        self,
        cache_dir: Optional[Union[str, Path]] = None,
        *,
        type_registry: Optional[TypeRegistry] = None,
        default_ttl: int = 3600,
        max_entries: int = 10000,
        cleanup_interval: int = 3600,
    ) -> None:
        """Initialize cache manager.

        Args:
            cache_dir: Directory for cache files (default: ~/.codex/cache)
            type_registry: Registry for TTL determination (default: built-in types)
            default_ttl: Default TTL in seconds when type not matched
            max_entries: Maximum cache entries before cleanup
            cleanup_interval: Seconds between automatic cleanups
        """
        self.cache_dir = Path(cache_dir) if cache_dir else Path(DEFAULT_CACHE_DIR)
        self.type_registry = type_registry or create_default_registry()
        self.default_ttl = default_ttl
        self.max_entries = max_entries
        self.cleanup_interval = cleanup_interval

        self._store = FileCacheStore(self.cache_dir)
        self._closed = False
        self._cleanup_task: Optional[asyncio.Task[int]] = None
        self._last_cleanup = datetime.now(timezone.utc)

    async def fetch(
        self,
        path: str,
        storage: StorageProvider,
        *,
        ttl: Optional[int] = None,
        force_refresh: bool = False,
        options: Optional[FetchOptions] = None,
    ) -> FetchResult:
        """Fetch content with caching.

        Args:
            path: Path to fetch (codex:// URI, URL, etc.)
            storage: Storage provider to use for fetching
            ttl: Manual TTL override (uses type-based TTL if not specified)
            force_refresh: Force fetch from storage, ignoring cache
            options: Additional fetch options

        Returns:
            FetchResult with content (from cache or freshly fetched)

        Raises:
            StorageError: If fetch fails and no cached content available
            CacheError: If cache operations fail
        """
        self._ensure_not_closed()

        cache_key = generate_cache_key(path)

        # Check cache first (unless force_refresh)
        if not force_refresh:
            entry = await self._store.get(cache_key)

            if entry is not None and entry.is_fresh:
                # Cache hit - return cached content
                entry.record_hit()
                await self._store.put(entry)  # Update hit count
                return self._entry_to_result(entry, from_cache=True)

            # Stale entry exists - try conditional request
            if entry is not None:
                try:
                    result = await self._conditional_fetch(path, storage, entry, options)
                    if result is not None:
                        return result
                except StorageError:
                    # Conditional fetch failed - return stale content
                    return self._entry_to_result(entry, from_cache=True, stale=True)

        # Cache miss or force refresh - fetch from storage
        try:
            result = await storage.fetch(path, options)
        except StorageError:
            # Fetch failed - try to return stale cached content
            entry = await self._store.get(cache_key)
            if entry is not None:
                return self._entry_to_result(entry, from_cache=True, stale=True)
            raise

        # Determine TTL
        if ttl is None:
            ttl = self._get_ttl(path)

        # Create cache entry
        entry = CacheEntry(
            key=cache_key,
            content=result.content,
            content_type=result.content_type,
            encoding=result.encoding,
            etag=result.etag,
            last_modified=result.last_modified,
            ttl=ttl,
            metadata=result.metadata,
            source=result.metadata.get("provider", "unknown"),
        )

        # Store in cache
        await self._store.put(entry)

        # Check if cleanup needed
        await self._maybe_cleanup()

        return result

    async def get_cached(self, path: str) -> Optional[CacheEntry]:
        """Get cached entry without fetching.

        Args:
            path: Path to check

        Returns:
            CacheEntry if cached, None otherwise
        """
        self._ensure_not_closed()
        cache_key = generate_cache_key(path)
        return await self._store.get(cache_key)

    async def is_cached(self, path: str) -> bool:
        """Check if path is cached (fresh or stale).

        Args:
            path: Path to check

        Returns:
            True if cached
        """
        entry = await self.get_cached(path)
        return entry is not None

    async def is_fresh(self, path: str) -> bool:
        """Check if path has fresh cached content.

        Args:
            path: Path to check

        Returns:
            True if cached and not expired
        """
        entry = await self.get_cached(path)
        return entry is not None and entry.is_fresh

    async def invalidate(self, path: str) -> bool:
        """Invalidate (delete) cached entry.

        Args:
            path: Path to invalidate

        Returns:
            True if entry was deleted
        """
        self._ensure_not_closed()
        cache_key = generate_cache_key(path)
        return await self._store.delete(cache_key)

    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate entries matching a pattern.

        Args:
            pattern: Glob pattern to match against keys

        Returns:
            Number of entries invalidated
        """
        self._ensure_not_closed()

        from ..core import match_pattern

        count = 0
        keys_to_delete: list[str] = []

        async for key in self._store.keys():
            if match_pattern(key, pattern):
                keys_to_delete.append(key)

        for key in keys_to_delete:
            if await self._store.delete(key):
                count += 1

        return count

    async def clear(self) -> int:
        """Clear all cache entries.

        Returns:
            Number of entries deleted
        """
        self._ensure_not_closed()
        return await self._store.clear()

    async def cleanup(self, *, max_age: Optional[int] = None) -> int:
        """Clean up expired and old entries.

        Args:
            max_age: Maximum entry age in seconds (optional)

        Returns:
            Number of entries cleaned up
        """
        self._ensure_not_closed()

        count = await self._store.clear_expired()
        self._last_cleanup = datetime.now(timezone.utc)

        # TODO: Implement max_entries cleanup and max_age cleanup
        # For now, just clear expired entries

        return count

    async def stats(self) -> dict[str, Any]:
        """Get cache statistics.

        Returns:
            Dictionary with cache statistics
        """
        self._ensure_not_closed()

        store_stats = await self._store.stats()
        return {
            **store_stats,
            "default_ttl": self.default_ttl,
            "max_entries": self.max_entries,
            "cleanup_interval": self.cleanup_interval,
            "last_cleanup": self._last_cleanup.isoformat(),
        }

    async def close(self) -> None:
        """Close the cache manager."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        self._closed = True

    @property
    def is_closed(self) -> bool:
        """Check if manager has been closed."""
        return self._closed

    def _ensure_not_closed(self) -> None:
        """Raise error if manager is closed."""
        if self._closed:
            raise CacheError(
                "Cache manager has been closed",
                code="MANAGER_CLOSED",
            )

    def _get_ttl(self, path: str) -> int:
        """Get TTL for a path based on type.

        Args:
            path: File path

        Returns:
            TTL in seconds
        """
        # Extract the file path from various URI formats
        file_path = path
        if path.startswith("codex://"):
            # Extract path component from codex:// URI
            parts = path[8:].split("/", 2)
            if len(parts) >= 3:
                file_path = parts[2]
        elif path.startswith(("http://", "https://")):
            from urllib.parse import urlparse

            parsed = urlparse(path)
            file_path = parsed.path

        return self.type_registry.get_ttl(file_path)

    async def _conditional_fetch(
        self,
        path: str,
        storage: StorageProvider,
        cached_entry: CacheEntry,
        options: Optional[FetchOptions],
    ) -> Optional[FetchResult]:
        """Try conditional fetch using cached ETag/Last-Modified.

        Returns:
            FetchResult if content unchanged (from cache), None if fetch needed
        """
        # Build conditional request options
        cond_options = FetchOptions(
            timeout=options.timeout if options else 30.0,
            headers=options.headers if options else {},
        )

        if cached_entry.etag:
            cond_options.if_none_match = cached_entry.etag
        if cached_entry.last_modified:
            cond_options.if_modified_since = cached_entry.last_modified

        # Try conditional fetch
        result = await storage.fetch(path, cond_options)

        # Check if content unchanged (304 or matching ETag)
        if result.metadata.get("not_modified") or (
            result.etag and result.etag == cached_entry.etag
        ):
            # Content unchanged - refresh cache entry TTL
            cached_entry.refresh(cached_entry.content)
            await self._store.put(cached_entry)
            return self._entry_to_result(cached_entry, from_cache=True)

        return None

    def _entry_to_result(
        self,
        entry: CacheEntry,
        *,
        from_cache: bool = False,
        stale: bool = False,
    ) -> FetchResult:
        """Convert cache entry to FetchResult.

        Args:
            entry: Cache entry
            from_cache: Whether result is from cache
            stale: Whether entry is stale

        Returns:
            FetchResult
        """
        metadata = dict(entry.metadata)
        metadata["from_cache"] = from_cache
        metadata["cache_key"] = entry.key
        metadata["cache_age"] = entry.age
        metadata["cache_hits"] = entry.hit_count

        if stale:
            metadata["stale"] = True

        return FetchResult(
            content=entry.content,
            content_type=entry.content_type,
            encoding=entry.encoding,
            etag=entry.etag,
            last_modified=entry.last_modified,
            size=entry.size,
            metadata=metadata,
        )

    async def _maybe_cleanup(self) -> None:
        """Run cleanup if needed based on interval."""
        now = datetime.now(timezone.utc)
        elapsed = (now - self._last_cleanup).total_seconds()

        if elapsed >= self.cleanup_interval:
            # Run cleanup in background
            asyncio.create_task(self.cleanup())

    async def __aenter__(self) -> "CacheManager":
        """Async context manager entry."""
        return self

    async def __aexit__(self, *args: Any) -> None:
        """Async context manager exit."""
        await self.close()
