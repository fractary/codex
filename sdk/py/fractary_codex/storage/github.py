"""
GitHub storage provider.

This module provides a storage provider that fetches content from GitHub
repositories using the GitHub API or raw content URLs.
"""

import base64
import os
from typing import Optional

import aiohttp

from ..errors import StorageError
from ..references import parse_reference
from .base import BaseStorageProvider, FetchOptions, FetchResult


class GitHubStorage(BaseStorageProvider):
    """Storage provider for GitHub repository content.

    This provider can fetch content from GitHub using either:
    1. Raw content URLs (raw.githubusercontent.com) - faster, no auth required for public repos
    2. GitHub API - required for private repos, provides more metadata

    Example:
        async with GitHubStorage(token=os.environ.get("GITHUB_TOKEN")) as storage:
            # Fetch from codex:// URI
            result = await storage.fetch("codex://org/repo/docs/api.md")

            # Or directly with org/repo/path
            result = await storage.fetch("org/repo/main/docs/api.md")

            print(result.text)
    """

    RAW_BASE_URL = "https://raw.githubusercontent.com"
    API_BASE_URL = "https://api.github.com"

    def __init__(
        self,
        token: Optional[str] = None,
        *,
        token_env: str = "GITHUB_TOKEN",
        default_branch: str = "main",
        use_raw_urls: bool = True,
        timeout: float = 30.0,
    ) -> None:
        """Initialize GitHub storage provider.

        Args:
            token: GitHub personal access token (optional for public repos)
            token_env: Environment variable name for token (default: GITHUB_TOKEN)
            default_branch: Default branch for fetching (default: main)
            use_raw_urls: Use raw.githubusercontent.com (faster, default: True)
            timeout: Request timeout in seconds
        """
        super().__init__(name="github")
        self.token = token or os.environ.get(token_env)
        self.default_branch = default_branch
        self.use_raw_urls = use_raw_urls
        self.timeout = timeout
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create the aiohttp session with GitHub headers."""
        if self._session is None or self._session.closed:
            headers: dict[str, str] = {
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "fractary-codex-python",
            }
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"

            self._session = aiohttp.ClientSession(headers=headers)
        return self._session

    async def fetch(
        self,
        path: str,
        options: Optional[FetchOptions] = None,
    ) -> FetchResult:
        """Fetch content from GitHub.

        Args:
            path: One of:
                - codex:// URI: "codex://org/repo/path/to/file.md"
                - GitHub path: "org/repo/branch/path/to/file.md"
                - Short path: "org/repo/path/to/file.md" (uses default branch)
            options: Fetch options

        Returns:
            FetchResult with content and metadata

        Raises:
            StorageError: If fetch fails
        """
        self._ensure_not_closed()

        # Parse the path
        org, repo, branch, file_path = self._parse_path(path)

        # Choose fetch method
        if self.use_raw_urls and not self.token:
            return await self._fetch_raw(org, repo, branch, file_path, options)
        else:
            return await self._fetch_api(org, repo, branch, file_path, options)

    async def _fetch_raw(
        self,
        org: str,
        repo: str,
        branch: str,
        file_path: str,
        options: Optional[FetchOptions],
    ) -> FetchResult:
        """Fetch using raw.githubusercontent.com URLs."""
        url = f"{self.RAW_BASE_URL}/{org}/{repo}/{branch}/{file_path}"

        session = await self._get_session()
        timeout = options.timeout if options else self.timeout

        try:
            async with session.get(
                url,
                timeout=aiohttp.ClientTimeout(total=timeout),
            ) as response:
                if response.status == 404:
                    raise StorageError(
                        f"File not found: {org}/{repo}/{file_path}",
                        code="NOT_FOUND",
                        details={"org": org, "repo": repo, "path": file_path},
                    )

                if response.status >= 400:
                    raise StorageError(
                        f"GitHub fetch failed: HTTP {response.status}",
                        code="GITHUB_ERROR",
                        details={"status": response.status, "url": url},
                    )

                content = await response.read()
                content_type = response.content_type or "text/plain"

                return FetchResult(
                    content=content,
                    content_type=content_type,
                    encoding="utf-8",
                    size=len(content),
                    metadata={
                        "provider": "github",
                        "method": "raw",
                        "org": org,
                        "repo": repo,
                        "branch": branch,
                        "path": file_path,
                    },
                )

        except aiohttp.ClientError as e:
            raise StorageError(
                f"GitHub request failed: {e}",
                code="REQUEST_FAILED",
                details={"url": url, "error": str(e)},
            )

    async def _fetch_api(
        self,
        org: str,
        repo: str,
        branch: str,
        file_path: str,
        options: Optional[FetchOptions],
    ) -> FetchResult:
        """Fetch using GitHub API (required for private repos)."""
        url = f"{self.API_BASE_URL}/repos/{org}/{repo}/contents/{file_path}"
        params = {"ref": branch}

        session = await self._get_session()
        timeout = options.timeout if options else self.timeout

        try:
            async with session.get(
                url,
                params=params,
                timeout=aiohttp.ClientTimeout(total=timeout),
            ) as response:
                if response.status == 404:
                    raise StorageError(
                        f"File not found: {org}/{repo}/{file_path}",
                        code="NOT_FOUND",
                        details={"org": org, "repo": repo, "path": file_path},
                    )

                if response.status == 401:
                    raise StorageError(
                        "GitHub authentication failed",
                        code="AUTH_FAILED",
                        details={"has_token": bool(self.token)},
                    )

                if response.status == 403:
                    # Check for rate limiting
                    remaining = response.headers.get("X-RateLimit-Remaining", "?")
                    reset = response.headers.get("X-RateLimit-Reset")
                    if remaining == "0":
                        raise StorageError(
                            "GitHub rate limit exceeded",
                            code="RATE_LIMITED",
                            details={"reset": reset},
                        )
                    raise StorageError(
                        "GitHub access denied",
                        code="ACCESS_DENIED",
                    )

                if response.status >= 400:
                    raise StorageError(
                        f"GitHub API error: HTTP {response.status}",
                        code="GITHUB_ERROR",
                        details={"status": response.status},
                    )

                data = await response.json()

                # Handle file content
                if data.get("type") != "file":
                    raise StorageError(
                        f"Path is not a file: {file_path}",
                        code="NOT_A_FILE",
                        details={"type": data.get("type")},
                    )

                # Decode base64 content
                encoded_content = data.get("content", "")
                content = base64.b64decode(encoded_content)

                # Extract metadata
                sha = data.get("sha")
                size = data.get("size", len(content))

                return FetchResult(
                    content=content,
                    content_type="text/plain",
                    encoding="utf-8",
                    etag=f'"{sha}"' if sha else None,
                    size=size,
                    metadata={
                        "provider": "github",
                        "method": "api",
                        "org": org,
                        "repo": repo,
                        "branch": branch,
                        "path": file_path,
                        "sha": sha,
                        "html_url": data.get("html_url"),
                    },
                )

        except aiohttp.ClientError as e:
            raise StorageError(
                f"GitHub API request failed: {e}",
                code="REQUEST_FAILED",
                details={"error": str(e)},
            )

    async def exists(self, path: str) -> bool:
        """Check if a file exists in GitHub.

        Args:
            path: File path (see fetch() for formats)

        Returns:
            True if file exists
        """
        self._ensure_not_closed()

        try:
            org, repo, branch, file_path = self._parse_path(path)

            if self.use_raw_urls and not self.token:
                url = f"{self.RAW_BASE_URL}/{org}/{repo}/{branch}/{file_path}"
                session = await self._get_session()
                async with session.head(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    return response.status == 200
            else:
                url = f"{self.API_BASE_URL}/repos/{org}/{repo}/contents/{file_path}"
                params = {"ref": branch}
                session = await self._get_session()
                async with session.head(
                    url, params=params, timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    return response.status == 200

        except (StorageError, aiohttp.ClientError):
            return False

    async def close(self) -> None:
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()
        await super().close()

    def _parse_path(self, path: str) -> tuple[str, str, str, str]:
        """Parse a path into org, repo, branch, and file path.

        Args:
            path: Input path in various formats

        Returns:
            Tuple of (org, repo, branch, file_path)

        Raises:
            StorageError: If path format is invalid
        """
        # Handle codex:// URIs
        if path.startswith("codex://"):
            try:
                ref = parse_reference(path)
                return ref.org, ref.project, self.default_branch, ref.path
            except Exception as e:
                raise StorageError(
                    f"Invalid codex URI: {e}",
                    code="INVALID_URI",
                    details={"path": path},
                )

        # Handle org/repo/branch/path or org/repo/path format
        parts = path.split("/")

        if len(parts) < 3:
            raise StorageError(
                "Invalid GitHub path: expected org/repo/path or org/repo/branch/path",
                code="INVALID_PATH",
                details={"path": path},
            )

        org = parts[0]
        repo = parts[1]

        # Check if third part looks like a branch (could be main, master, or a version)
        # This is a heuristic - for exact control, use codex:// URIs
        remaining = parts[2:]

        # If we have 4+ parts and third part is a common branch name, treat it as branch
        common_branches = {"main", "master", "develop", "dev", "staging", "production"}
        if len(parts) >= 4 and (
            parts[2] in common_branches
            or parts[2].startswith("v")
            or parts[2].startswith("release")
        ):
            branch = parts[2]
            file_path = "/".join(parts[3:])
        else:
            branch = self.default_branch
            file_path = "/".join(remaining)

        return org, repo, branch, file_path
