"""
Cache persistence for file-based storage.

This module provides classes for persisting cache entries to the filesystem
with atomic writes and metadata management.
"""

import asyncio
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncIterator, Optional

from ..errors import CacheError
from .entry import CacheEntry


class FileCacheStore:
    """File-based cache storage.

    Stores cache entries as files with accompanying metadata JSON files.
    Supports atomic writes and directory-based organization.

    Directory structure:
        cache_dir/
            {key_prefix}/
                {safe_filename}.data     # Content bytes
                {safe_filename}.meta     # JSON metadata
    """

    CONTENT_EXT = ".data"
    META_EXT = ".meta"

    def __init__(
        self,
        cache_dir: str | Path,
        *,
        create_dirs: bool = True,
        max_key_length: int = 200,
    ) -> None:
        """Initialize file cache store.

        Args:
            cache_dir: Directory for cache files
            create_dirs: Whether to create directories automatically
            max_key_length: Maximum key length before hashing
        """
        self.cache_dir = Path(cache_dir).resolve()
        self.create_dirs = create_dirs
        self.max_key_length = max_key_length

        if create_dirs:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    async def get(self, key: str) -> Optional[CacheEntry]:
        """Get a cache entry by key.

        Args:
            key: Cache key

        Returns:
            CacheEntry if found and valid, None otherwise
        """
        content_path, meta_path = self._get_paths(key)

        if not content_path.exists() or not meta_path.exists():
            return None

        try:
            # Read metadata
            meta_text = await asyncio.to_thread(meta_path.read_text)
            metadata = json.loads(meta_text)

            # Read content
            content = await asyncio.to_thread(content_path.read_bytes)

            # Verify content hash
            entry = CacheEntry.from_dict(metadata, content)
            if metadata.get("content_hash") and entry.content_hash != metadata["content_hash"]:
                # Content corrupted - delete and return None
                await self.delete(key)
                return None

            return entry

        except (json.JSONDecodeError, KeyError, OSError) as e:
            # Corrupted entry - try to clean up
            try:
                await self.delete(key)
            except CacheError:
                pass
            return None

    async def put(self, entry: CacheEntry) -> None:
        """Store a cache entry.

        Args:
            entry: Cache entry to store

        Raises:
            CacheError: If write fails
        """
        content_path, meta_path = self._get_paths(entry.key)

        # Ensure directory exists
        if self.create_dirs:
            await asyncio.to_thread(content_path.parent.mkdir, parents=True, exist_ok=True)

        try:
            # Write atomically using temp files
            await self._atomic_write(content_path, entry.content)
            await self._atomic_write(meta_path, json.dumps(entry.to_dict(), indent=2).encode())

        except OSError as e:
            raise CacheError(
                f"Failed to write cache entry: {e}",
                code="WRITE_ERROR",
                details={"key": entry.key, "error": str(e)},
            )

    async def delete(self, key: str) -> bool:
        """Delete a cache entry.

        Args:
            key: Cache key to delete

        Returns:
            True if entry was deleted, False if not found
        """
        content_path, meta_path = self._get_paths(key)
        deleted = False

        for path in (content_path, meta_path):
            if path.exists():
                try:
                    await asyncio.to_thread(path.unlink)
                    deleted = True
                except OSError:
                    pass

        # Try to clean up empty directories
        try:
            parent = content_path.parent
            while parent != self.cache_dir:
                await asyncio.to_thread(parent.rmdir)  # Only removes if empty
                parent = parent.parent
        except OSError:
            pass

        return deleted

    async def exists(self, key: str) -> bool:
        """Check if a cache entry exists.

        Args:
            key: Cache key

        Returns:
            True if entry exists
        """
        content_path, meta_path = self._get_paths(key)
        return content_path.exists() and meta_path.exists()

    async def keys(self) -> AsyncIterator[str]:
        """Iterate over all cache keys.

        Yields:
            Cache keys
        """
        if not self.cache_dir.exists():
            return

        for meta_path in self.cache_dir.rglob(f"*{self.META_EXT}"):
            try:
                meta_text = await asyncio.to_thread(meta_path.read_text)
                metadata = json.loads(meta_text)
                yield metadata["key"]
            except (json.JSONDecodeError, KeyError, OSError):
                continue

    async def entries(
        self,
        *,
        include_expired: bool = False,
    ) -> AsyncIterator[CacheEntry]:
        """Iterate over all cache entries.

        Args:
            include_expired: Whether to include expired entries

        Yields:
            Cache entries
        """
        async for key in self.keys():
            entry = await self.get(key)
            if entry is not None:
                if include_expired or entry.is_fresh:
                    yield entry

    async def clear(self) -> int:
        """Clear all cache entries.

        Returns:
            Number of entries deleted
        """
        count = 0
        async for key in self.keys():
            if await self.delete(key):
                count += 1
        return count

    async def clear_expired(self) -> int:
        """Clear only expired cache entries.

        Returns:
            Number of entries deleted
        """
        count = 0
        keys_to_delete: list[str] = []

        async for entry in self.entries(include_expired=True):
            if entry.is_expired:
                keys_to_delete.append(entry.key)

        for key in keys_to_delete:
            if await self.delete(key):
                count += 1

        return count

    async def stats(self) -> dict:
        """Get cache statistics.

        Returns:
            Dictionary with cache stats
        """
        total_entries = 0
        total_size = 0
        expired_count = 0
        total_hits = 0

        async for entry in self.entries(include_expired=True):
            total_entries += 1
            total_size += entry.size
            total_hits += entry.hit_count
            if entry.is_expired:
                expired_count += 1

        return {
            "total_entries": total_entries,
            "total_size": total_size,
            "expired_count": expired_count,
            "fresh_count": total_entries - expired_count,
            "total_hits": total_hits,
            "cache_dir": str(self.cache_dir),
        }

    def _get_paths(self, key: str) -> tuple[Path, Path]:
        """Get content and metadata paths for a key.

        Args:
            key: Cache key

        Returns:
            Tuple of (content_path, meta_path)
        """
        safe_path = self._key_to_path(key)
        content_path = self.cache_dir / f"{safe_path}{self.CONTENT_EXT}"
        meta_path = self.cache_dir / f"{safe_path}{self.META_EXT}"
        return content_path, meta_path

    def _key_to_path(self, key: str) -> str:
        """Convert a cache key to a safe file path.

        Args:
            key: Cache key

        Returns:
            Safe relative path string
        """
        import hashlib

        # If key is too long, use hash
        if len(key) > self.max_key_length:
            hash_str = hashlib.sha256(key.encode()).hexdigest()[:16]
            # Keep some readable part
            readable = key[:50].replace("/", "_").replace("\\", "_")
            return f"{readable}_{hash_str}"

        # Replace unsafe characters
        safe = key
        for char in '<>:"|?*':
            safe = safe.replace(char, "_")

        # Convert path separators to directory structure
        # but limit nesting
        parts = safe.split("/")
        if len(parts) > 4:
            # Flatten deep paths
            parts = parts[:2] + ["_".join(parts[2:])]

        return "/".join(parts)

    async def _atomic_write(self, path: Path, data: bytes) -> None:
        """Write data atomically using a temp file.

        Args:
            path: Target path
            data: Data to write
        """
        # Create temp file in same directory for atomic rename
        fd, temp_path = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
        try:
            os.write(fd, data)
            os.close(fd)
            # Atomic rename
            await asyncio.to_thread(os.replace, temp_path, path)
        except Exception:
            os.close(fd)
            try:
                os.unlink(temp_path)
            except OSError:
                pass
            raise
