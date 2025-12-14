"""
HTTP/HTTPS storage provider.

This module provides a storage provider that fetches content from HTTP/HTTPS
URLs using aiohttp for async operations.
"""

from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Optional
from urllib.parse import urlparse

import aiohttp

from ..errors import StorageError
from .base import BaseStorageProvider, FetchOptions, FetchResult


class HttpStorage(BaseStorageProvider):
    """Storage provider for HTTP/HTTPS content.

    This provider fetches content from remote HTTP servers.

    Example:
        async with HttpStorage(base_url="https://raw.githubusercontent.com") as storage:
            result = await storage.fetch("org/repo/main/docs/api.md")
            print(result.text)
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        *,
        default_headers: Optional[dict[str, str]] = None,
        timeout: float = 30.0,
        verify_ssl: bool = True,
        max_redirects: int = 10,
    ) -> None:
        """Initialize HTTP storage provider.

        Args:
            base_url: Base URL for relative paths (optional)
            default_headers: Default headers to send with requests
            timeout: Default request timeout in seconds
            verify_ssl: Whether to verify SSL certificates
            max_redirects: Maximum number of redirects to follow
        """
        super().__init__(name="http")
        self.base_url = base_url.rstrip("/") if base_url else None
        self.default_headers = default_headers or {}
        self.default_timeout = timeout
        self.verify_ssl = verify_ssl
        self.max_redirects = max_redirects
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create the aiohttp session."""
        if self._session is None or self._session.closed:
            connector = aiohttp.TCPConnector(ssl=self.verify_ssl)
            self._session = aiohttp.ClientSession(
                connector=connector,
                headers=self.default_headers,
            )
        return self._session

    async def fetch(
        self,
        path: str,
        options: Optional[FetchOptions] = None,
    ) -> FetchResult:
        """Fetch content from HTTP URL.

        Args:
            path: URL path (relative to base_url or absolute)
            options: Fetch options

        Returns:
            FetchResult with content and metadata

        Raises:
            StorageError: If fetch fails
        """
        self._ensure_not_closed()

        # Build full URL
        url = self._build_url(path)

        # Build request headers
        headers: dict[str, str] = {}
        timeout = self.default_timeout

        if options:
            headers.update(options.headers)
            timeout = options.timeout

            # Add conditional request headers
            if options.if_none_match:
                headers["If-None-Match"] = options.if_none_match
            if options.if_modified_since:
                headers["If-Modified-Since"] = options.if_modified_since.strftime(
                    "%a, %d %b %Y %H:%M:%S GMT"
                )

        # Make request
        session = await self._get_session()

        try:
            async with session.get(
                url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=timeout),
                max_redirects=self.max_redirects,
                allow_redirects=options.follow_redirects if options else True,
            ) as response:
                # Handle 304 Not Modified
                if response.status == 304:
                    return FetchResult(
                        content=b"",
                        content_type=response.content_type or "application/octet-stream",
                        etag=response.headers.get("ETag"),
                        last_modified=self._parse_date(
                            response.headers.get("Last-Modified")
                        ),
                        size=0,
                        metadata={"not_modified": True, "status": 304},
                    )

                # Handle errors
                if response.status == 404:
                    raise StorageError(
                        f"Not found: {url}",
                        code="NOT_FOUND",
                        details={"url": url, "status": 404},
                    )

                if response.status == 403:
                    raise StorageError(
                        f"Access denied: {url}",
                        code="ACCESS_DENIED",
                        details={"url": url, "status": 403},
                    )

                if response.status == 429:
                    retry_after = response.headers.get("Retry-After")
                    raise StorageError(
                        f"Rate limited: {url}",
                        code="RATE_LIMITED",
                        details={
                            "url": url,
                            "status": 429,
                            "retry_after": retry_after,
                        },
                    )

                if response.status >= 400:
                    raise StorageError(
                        f"HTTP error {response.status}: {url}",
                        code="HTTP_ERROR",
                        details={"url": url, "status": response.status},
                    )

                # Read content
                content = await response.read()

                # Parse metadata
                content_type = response.content_type or "application/octet-stream"
                encoding = response.charset
                etag = response.headers.get("ETag")
                last_modified = self._parse_date(
                    response.headers.get("Last-Modified")
                )

                return FetchResult(
                    content=content,
                    content_type=content_type,
                    encoding=encoding,
                    etag=etag,
                    last_modified=last_modified,
                    size=len(content),
                    metadata={
                        "provider": "http",
                        "url": str(response.url),
                        "status": response.status,
                    },
                )

        except aiohttp.ClientError as e:
            raise StorageError(
                f"HTTP request failed: {e}",
                code="REQUEST_FAILED",
                details={"url": url, "error": str(e)},
            )
        except TimeoutError:
            raise StorageError(
                f"Request timed out: {url}",
                code="TIMEOUT",
                details={"url": url, "timeout": timeout},
            )

    async def exists(self, path: str) -> bool:
        """Check if a URL exists using HEAD request.

        Args:
            path: URL path

        Returns:
            True if URL returns 2xx status
        """
        self._ensure_not_closed()

        url = self._build_url(path)
        session = await self._get_session()

        try:
            async with session.head(
                url,
                timeout=aiohttp.ClientTimeout(total=10),
                allow_redirects=True,
            ) as response:
                return 200 <= response.status < 300
        except (aiohttp.ClientError, TimeoutError):
            return False

    async def close(self) -> None:
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()
        await super().close()

    def _build_url(self, path: str) -> str:
        """Build full URL from path.

        Args:
            path: Relative or absolute URL path

        Returns:
            Full URL string
        """
        # Check if path is already an absolute URL
        parsed = urlparse(path)
        if parsed.scheme in ("http", "https"):
            return path

        # Build relative URL
        if self.base_url:
            # Ensure path doesn't have leading slash when joining
            path = path.lstrip("/")
            return f"{self.base_url}/{path}"

        raise StorageError(
            "Cannot resolve relative path without base_url",
            code="NO_BASE_URL",
            details={"path": path},
        )

    @staticmethod
    def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
        """Parse HTTP date header."""
        if not date_str:
            return None
        try:
            return parsedate_to_datetime(date_str)
        except (ValueError, TypeError):
            return None
