"""
Base classes and protocols for storage providers.

This module defines the StorageProvider protocol that all storage
implementations must follow, along with common types.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional, Protocol, runtime_checkable


@dataclass
class FetchResult:
    """Result of a storage fetch operation.

    Attributes:
        content: The fetched content as bytes
        content_type: MIME type of the content (e.g., 'text/markdown')
        encoding: Character encoding (e.g., 'utf-8')
        etag: Entity tag for cache validation
        last_modified: Last modification timestamp
        size: Content size in bytes
        metadata: Additional provider-specific metadata
    """

    content: bytes
    content_type: str = "application/octet-stream"
    encoding: Optional[str] = "utf-8"
    etag: Optional[str] = None
    last_modified: Optional[datetime] = None
    size: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Calculate size if not provided."""
        if self.size == 0 and self.content:
            self.size = len(self.content)

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


@dataclass
class FetchOptions:
    """Options for fetch operations.

    Attributes:
        timeout: Request timeout in seconds
        headers: Additional headers to send
        if_none_match: ETag for conditional request (returns None if unchanged)
        if_modified_since: Timestamp for conditional request
        follow_redirects: Whether to follow HTTP redirects
    """

    timeout: float = 30.0
    headers: dict[str, str] = field(default_factory=dict)
    if_none_match: Optional[str] = None
    if_modified_since: Optional[datetime] = None
    follow_redirects: bool = True


@runtime_checkable
class StorageProvider(Protocol):
    """Protocol for storage provider implementations.

    All storage providers must implement this protocol to be used
    with the StorageManager.

    Example implementation:
        class MyStorage:
            async def fetch(self, path: str, options: FetchOptions | None = None) -> FetchResult:
                ...

            async def exists(self, path: str) -> bool:
                ...

            async def close(self) -> None:
                ...
    """

    async def fetch(
        self,
        path: str,
        options: Optional[FetchOptions] = None,
    ) -> FetchResult:
        """Fetch content from storage.

        Args:
            path: Path to the resource
            options: Fetch options (timeout, headers, etc.)

        Returns:
            FetchResult with content and metadata

        Raises:
            StorageError: If fetch fails
        """
        ...

    async def exists(self, path: str) -> bool:
        """Check if a path exists in storage.

        Args:
            path: Path to check

        Returns:
            True if path exists, False otherwise
        """
        ...

    async def close(self) -> None:
        """Clean up resources.

        Called when the provider is no longer needed.
        """
        ...


class BaseStorageProvider(ABC):
    """Abstract base class for storage providers.

    Provides common functionality and enforces the StorageProvider protocol.
    Subclasses must implement fetch(), exists(), and close().
    """

    def __init__(self, name: str = "base") -> None:
        """Initialize the storage provider.

        Args:
            name: Provider name for logging and identification
        """
        self.name = name
        self._closed = False

    @abstractmethod
    async def fetch(
        self,
        path: str,
        options: Optional[FetchOptions] = None,
    ) -> FetchResult:
        """Fetch content from storage."""
        ...

    @abstractmethod
    async def exists(self, path: str) -> bool:
        """Check if path exists."""
        ...

    async def close(self) -> None:
        """Clean up resources."""
        self._closed = True

    @property
    def is_closed(self) -> bool:
        """Check if provider has been closed."""
        return self._closed

    def _ensure_not_closed(self) -> None:
        """Raise error if provider is closed."""
        if self._closed:
            from ..errors import StorageError

            raise StorageError(
                f"Storage provider '{self.name}' has been closed",
                code="PROVIDER_CLOSED",
            )

    async def __aenter__(self) -> "BaseStorageProvider":
        """Async context manager entry."""
        return self

    async def __aexit__(self, *args: Any) -> None:
        """Async context manager exit."""
        await self.close()
