"""
Local filesystem storage provider.

This module provides a storage provider that reads files from the local
filesystem, with support for async operations.
"""

import asyncio
import hashlib
import mimetypes
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Union

from ..errors import StorageError
from .base import BaseStorageProvider, FetchOptions, FetchResult


class LocalStorage(BaseStorageProvider):
    """Storage provider for local filesystem access.

    This provider reads files from the local filesystem, resolving paths
    relative to a base directory.

    Example:
        async with LocalStorage(base_path="/path/to/knowledge") as storage:
            result = await storage.fetch("docs/api.md")
            print(result.text)
    """

    def __init__(
        self,
        base_path: Union[str, Path] = ".",
        *,
        create_dirs: bool = False,
        follow_symlinks: bool = True,
    ) -> None:
        """Initialize local storage provider.

        Args:
            base_path: Base directory for file resolution
            create_dirs: Whether to create directories if they don't exist
            follow_symlinks: Whether to follow symbolic links
        """
        super().__init__(name="local")
        self.base_path = Path(base_path).resolve()
        self.create_dirs = create_dirs
        self.follow_symlinks = follow_symlinks

        if create_dirs:
            self.base_path.mkdir(parents=True, exist_ok=True)

    async def fetch(
        self,
        path: str,
        options: Optional[FetchOptions] = None,
    ) -> FetchResult:
        """Fetch content from local filesystem.

        Args:
            path: Relative path to the file
            options: Fetch options (mostly ignored for local storage)

        Returns:
            FetchResult with file content and metadata

        Raises:
            StorageError: If file cannot be read
        """
        self._ensure_not_closed()

        # Resolve and validate path
        file_path = self._resolve_path(path)
        self._validate_path(file_path)

        # Check if file exists
        if not file_path.exists():
            raise StorageError(
                f"File not found: {path}",
                code="FILE_NOT_FOUND",
                details={"path": path, "resolved": str(file_path)},
            )

        if not file_path.is_file():
            raise StorageError(
                f"Path is not a file: {path}",
                code="NOT_A_FILE",
                details={"path": path, "resolved": str(file_path)},
            )

        # Read file content
        try:
            content = await self._read_file(file_path)
        except PermissionError:
            raise StorageError(
                f"Permission denied: {path}",
                code="PERMISSION_DENIED",
                details={"path": path},
            )
        except OSError as e:
            raise StorageError(
                f"Failed to read file: {e}",
                code="READ_ERROR",
                details={"path": path, "error": str(e)},
            )

        # Get file metadata
        stat = file_path.stat()
        mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)

        # Determine content type
        content_type, encoding = mimetypes.guess_type(str(file_path))
        if content_type is None:
            content_type = "application/octet-stream"

        # Generate ETag from content hash
        etag = self._generate_etag(content)

        # Check conditional request
        if options:
            if options.if_none_match and options.if_none_match == etag:
                # Content unchanged - return empty result with metadata
                return FetchResult(
                    content=b"",
                    content_type=content_type,
                    encoding=encoding,
                    etag=etag,
                    last_modified=mtime,
                    size=0,
                    metadata={"not_modified": True},
                )

            if options.if_modified_since and mtime <= options.if_modified_since:
                return FetchResult(
                    content=b"",
                    content_type=content_type,
                    encoding=encoding,
                    etag=etag,
                    last_modified=mtime,
                    size=0,
                    metadata={"not_modified": True},
                )

        return FetchResult(
            content=content,
            content_type=content_type,
            encoding=encoding,
            etag=etag,
            last_modified=mtime,
            size=len(content),
            metadata={"provider": "local", "path": str(file_path)},
        )

    async def exists(self, path: str) -> bool:
        """Check if a file exists.

        Args:
            path: Relative path to check

        Returns:
            True if file exists and is readable
        """
        self._ensure_not_closed()

        try:
            file_path = self._resolve_path(path)
            self._validate_path(file_path)
            return file_path.exists() and file_path.is_file()
        except (StorageError, OSError):
            return False

    async def list_files(
        self,
        path: str = "",
        pattern: str = "*",
        recursive: bool = False,
    ) -> list[str]:
        """List files in a directory.

        Args:
            path: Directory path relative to base
            pattern: Glob pattern for filtering
            recursive: Whether to list recursively

        Returns:
            List of relative file paths
        """
        self._ensure_not_closed()

        dir_path = self._resolve_path(path) if path else self.base_path
        self._validate_path(dir_path)

        if not dir_path.exists() or not dir_path.is_dir():
            return []

        if recursive:
            glob_pattern = f"**/{pattern}"
        else:
            glob_pattern = pattern

        files: list[str] = []
        for file_path in dir_path.glob(glob_pattern):
            if file_path.is_file():
                # Return path relative to base_path
                rel_path = file_path.relative_to(self.base_path)
                files.append(str(rel_path).replace("\\", "/"))

        return sorted(files)

    def _resolve_path(self, path: str) -> Path:
        """Resolve a relative path to an absolute path.

        Args:
            path: Relative path

        Returns:
            Absolute path within base directory
        """
        # Normalize path separators
        path = path.replace("\\", "/").lstrip("/")

        # Resolve to absolute path
        resolved = (self.base_path / path).resolve()

        return resolved

    def _validate_path(self, resolved_path: Path) -> None:
        """Validate that a resolved path is within the base directory.

        Args:
            resolved_path: Absolute path to validate

        Raises:
            StorageError: If path is outside base directory
        """
        try:
            resolved_path.relative_to(self.base_path)
        except ValueError:
            raise StorageError(
                "Path traversal attempt detected",
                code="PATH_TRAVERSAL",
                details={
                    "base": str(self.base_path),
                    "attempted": str(resolved_path),
                },
            )

    async def _read_file(self, path: Path) -> bytes:
        """Read file content asynchronously.

        Uses asyncio.to_thread to avoid blocking the event loop.
        """
        return await asyncio.to_thread(path.read_bytes)

    @staticmethod
    def _generate_etag(content: bytes) -> str:
        """Generate an ETag from content using MD5 hash."""
        hash_obj = hashlib.md5(content, usedforsecurity=False)
        return f'"{hash_obj.hexdigest()}"'
