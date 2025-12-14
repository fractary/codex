"""
Cache entry dataclass for representing cached content.

This module defines the CacheEntry dataclass that stores content along
with metadata for cache validation and TTL management.
"""

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional


@dataclass
class CacheEntry:
    """Represents a cached content entry.

    Attributes:
        key: Unique cache key (usually derived from path/URI)
        content: The cached content as bytes
        content_type: MIME type of the content
        encoding: Character encoding
        etag: Entity tag for validation
        last_modified: Original last modification time
        fetched_at: When the content was fetched
        expires_at: When the cache entry expires
        ttl: Time-to-live in seconds
        size: Content size in bytes
        metadata: Additional provider-specific metadata
        hit_count: Number of cache hits
        source: Original source (provider name, URL, etc.)
    """

    key: str
    content: bytes
    content_type: str = "application/octet-stream"
    encoding: Optional[str] = "utf-8"
    etag: Optional[str] = None
    last_modified: Optional[datetime] = None
    fetched_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    ttl: int = 3600  # 1 hour default
    size: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)
    hit_count: int = 0
    source: Optional[str] = None

    def __post_init__(self) -> None:
        """Calculate derived fields."""
        if self.size == 0 and self.content:
            self.size = len(self.content)

        # Calculate expires_at if not set
        if self.expires_at is None and self.ttl > 0:
            from datetime import timedelta

            self.expires_at = self.fetched_at + timedelta(seconds=self.ttl)

    @property
    def text(self) -> str:
        """Get content as decoded text string.

        Returns:
            Content decoded using the specified encoding

        Raises:
            UnicodeDecodeError: If content cannot be decoded
        """
        encoding = self.encoding or "utf-8"
        return self.content.decode(encoding)

    @property
    def is_expired(self) -> bool:
        """Check if the cache entry has expired.

        Returns:
            True if entry has expired, False otherwise
        """
        if self.expires_at is None:
            return False
        return datetime.now(timezone.utc) >= self.expires_at

    @property
    def is_fresh(self) -> bool:
        """Check if the cache entry is still fresh.

        Returns:
            True if entry is not expired, False otherwise
        """
        return not self.is_expired

    @property
    def age(self) -> float:
        """Get the age of the cache entry in seconds.

        Returns:
            Age in seconds since fetched_at
        """
        now = datetime.now(timezone.utc)
        return (now - self.fetched_at).total_seconds()

    @property
    def remaining_ttl(self) -> float:
        """Get remaining TTL in seconds.

        Returns:
            Remaining seconds until expiration, or 0 if expired
        """
        if self.expires_at is None:
            return float("inf")
        now = datetime.now(timezone.utc)
        remaining = (self.expires_at - now).total_seconds()
        return max(0, remaining)

    @property
    def content_hash(self) -> str:
        """Get MD5 hash of the content.

        Returns:
            Hex-encoded MD5 hash
        """
        return hashlib.md5(self.content, usedforsecurity=False).hexdigest()

    def record_hit(self) -> None:
        """Record a cache hit."""
        self.hit_count += 1

    def refresh(self, new_content: bytes, new_ttl: Optional[int] = None) -> None:
        """Refresh the cache entry with new content.

        Args:
            new_content: New content bytes
            new_ttl: Optional new TTL (uses existing if not provided)
        """
        from datetime import timedelta

        self.content = new_content
        self.size = len(new_content)
        self.fetched_at = datetime.now(timezone.utc)

        if new_ttl is not None:
            self.ttl = new_ttl

        if self.ttl > 0:
            self.expires_at = self.fetched_at + timedelta(seconds=self.ttl)
        else:
            self.expires_at = None

    def to_dict(self) -> dict[str, Any]:
        """Convert entry to dictionary for serialization.

        Note: Content is not included - use to_json() for full serialization.

        Returns:
            Dictionary with entry metadata
        """
        return {
            "key": self.key,
            "content_type": self.content_type,
            "encoding": self.encoding,
            "etag": self.etag,
            "last_modified": self.last_modified.isoformat() if self.last_modified else None,
            "fetched_at": self.fetched_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "ttl": self.ttl,
            "size": self.size,
            "metadata": self.metadata,
            "hit_count": self.hit_count,
            "source": self.source,
            "content_hash": self.content_hash,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any], content: bytes) -> "CacheEntry":
        """Create entry from dictionary and content.

        Args:
            data: Dictionary with entry metadata
            content: Content bytes

        Returns:
            CacheEntry instance
        """
        last_modified = None
        if data.get("last_modified"):
            last_modified = datetime.fromisoformat(data["last_modified"])

        fetched_at = datetime.now(timezone.utc)
        if data.get("fetched_at"):
            fetched_at = datetime.fromisoformat(data["fetched_at"])

        expires_at = None
        if data.get("expires_at"):
            expires_at = datetime.fromisoformat(data["expires_at"])

        return cls(
            key=data["key"],
            content=content,
            content_type=data.get("content_type", "application/octet-stream"),
            encoding=data.get("encoding", "utf-8"),
            etag=data.get("etag"),
            last_modified=last_modified,
            fetched_at=fetched_at,
            expires_at=expires_at,
            ttl=data.get("ttl", 3600),
            size=data.get("size", len(content)),
            metadata=data.get("metadata", {}),
            hit_count=data.get("hit_count", 0),
            source=data.get("source"),
        )


def generate_cache_key(path: str, provider: Optional[str] = None) -> str:
    """Generate a cache key from a path.

    Creates a safe, unique key for caching based on the path
    and optional provider name.

    Args:
        path: The source path (URI, URL, or file path)
        provider: Optional provider name for namespacing

    Returns:
        Safe cache key string
    """
    # Normalize the path
    key = path.strip()

    # Remove protocol prefixes for consistency
    for prefix in ("codex://", "http://", "https://", "file://"):
        if key.startswith(prefix):
            key = key[len(prefix) :]
            break

    # Replace unsafe characters
    key = key.replace("\\", "/")

    # Add provider prefix if specified
    if provider:
        key = f"{provider}/{key}"

    # Ensure key doesn't start with /
    key = key.lstrip("/")

    return key
