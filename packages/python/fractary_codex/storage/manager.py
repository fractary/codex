"""
Storage manager for coordinating multiple storage providers.

This module provides a StorageManager that orchestrates multiple storage
providers with priority-based fallback and automatic provider selection.
"""

from typing import Any, Optional

from ..errors import StorageError
from ..references import ParsedReference, parse_reference
from .base import BaseStorageProvider, FetchOptions, FetchResult, StorageProvider


class StorageManager:
    """Manager for coordinating multiple storage providers.

    The StorageManager routes fetch requests to appropriate providers based on
    the path type and registered providers. It supports priority-based fallback
    when a provider fails.

    Example:
        from fractary_codex.storage import StorageManager, LocalStorage, GitHubStorage

        async with StorageManager() as manager:
            # Register providers with priority (lower = higher priority)
            manager.register("local", LocalStorage(base_path="/path/to/codex"))
            manager.register("github", GitHubStorage(token=os.environ["GITHUB_TOKEN"]))

            # Fetch using codex:// URI - automatically routes to appropriate provider
            result = await manager.fetch("codex://myorg/myproject/docs/api.md")

            # Or fetch with explicit provider
            result = await manager.fetch("docs/api.md", provider="local")
    """

    def __init__(
        self,
        *,
        default_provider: Optional[str] = None,
    ) -> None:
        """Initialize storage manager.

        Args:
            default_provider: Default provider name for relative paths
        """
        self._providers: dict[str, tuple[StorageProvider, int]] = {}
        self._default_provider = default_provider
        self._closed = False

    def register(
        self,
        name: str,
        provider: StorageProvider,
        priority: int = 100,
    ) -> None:
        """Register a storage provider.

        Args:
            name: Unique name for the provider
            provider: The storage provider instance
            priority: Provider priority (lower = tried first, default 100)

        Raises:
            StorageError: If provider name already registered
        """
        if self._closed:
            raise StorageError(
                "Cannot register provider on closed manager",
                code="MANAGER_CLOSED",
            )

        if name in self._providers:
            raise StorageError(
                f"Provider '{name}' already registered",
                code="DUPLICATE_PROVIDER",
                details={"name": name},
            )

        self._providers[name] = (provider, priority)

    def unregister(self, name: str) -> Optional[StorageProvider]:
        """Unregister a storage provider.

        Args:
            name: Provider name to unregister

        Returns:
            The unregistered provider, or None if not found
        """
        if name in self._providers:
            provider, _ = self._providers.pop(name)
            return provider
        return None

    def get_provider(self, name: str) -> Optional[StorageProvider]:
        """Get a registered provider by name.

        Args:
            name: Provider name

        Returns:
            The provider if registered, None otherwise
        """
        if name in self._providers:
            return self._providers[name][0]
        return None

    def list_providers(self) -> list[str]:
        """List all registered provider names.

        Returns:
            List of provider names sorted by priority
        """
        return [
            name
            for name, _ in sorted(
                self._providers.items(),
                key=lambda x: x[1][1],  # Sort by priority
            )
        ]

    async def fetch(
        self,
        path: str,
        *,
        provider: Optional[str] = None,
        options: Optional[FetchOptions] = None,
        fallback: bool = True,
    ) -> FetchResult:
        """Fetch content from storage.

        Routes the request to the appropriate provider based on path type
        or explicit provider specification.

        Args:
            path: Path to fetch (codex:// URI, URL, or relative path)
            provider: Explicit provider name (overrides auto-detection)
            options: Fetch options
            fallback: Whether to try other providers on failure

        Returns:
            FetchResult with content and metadata

        Raises:
            StorageError: If fetch fails on all providers
        """
        self._ensure_not_closed()

        if not self._providers:
            raise StorageError(
                "No storage providers registered",
                code="NO_PROVIDERS",
            )

        # Determine which providers to try
        providers_to_try = self._select_providers(path, provider, fallback)

        errors: list[tuple[str, Exception]] = []

        for provider_name in providers_to_try:
            prov, _ = self._providers[provider_name]

            try:
                result = await prov.fetch(path, options)
                # Add provider info to metadata
                result.metadata["storage_provider"] = provider_name
                return result
            except StorageError as e:
                errors.append((provider_name, e))
                if not fallback:
                    raise
                # Continue to next provider

        # All providers failed
        if len(errors) == 1:
            _, error = errors[0]
            raise error

        error_details = {
            name: str(err) for name, err in errors
        }
        raise StorageError(
            f"All providers failed to fetch: {path}",
            code="ALL_PROVIDERS_FAILED",
            details={"path": path, "errors": error_details},
        )

    async def exists(
        self,
        path: str,
        *,
        provider: Optional[str] = None,
    ) -> bool:
        """Check if a path exists in storage.

        Args:
            path: Path to check
            provider: Explicit provider name

        Returns:
            True if path exists in any provider
        """
        self._ensure_not_closed()

        providers_to_try = self._select_providers(path, provider, fallback=True)

        for provider_name in providers_to_try:
            prov, _ = self._providers[provider_name]
            try:
                if await prov.exists(path):
                    return True
            except StorageError:
                continue

        return False

    def _select_providers(
        self,
        path: str,
        explicit_provider: Optional[str],
        fallback: bool,
    ) -> list[str]:
        """Select providers to try for a given path.

        Args:
            path: The path to fetch
            explicit_provider: Explicitly specified provider
            fallback: Whether fallback is enabled

        Returns:
            List of provider names to try, in order

        Raises:
            StorageError: If explicit provider not found
        """
        # Explicit provider specified
        if explicit_provider:
            if explicit_provider not in self._providers:
                raise StorageError(
                    f"Provider '{explicit_provider}' not registered",
                    code="PROVIDER_NOT_FOUND",
                    details={"provider": explicit_provider, "available": list(self._providers.keys())},
                )
            return [explicit_provider]

        # Auto-detect based on path type
        provider_type = self._detect_provider_type(path)

        # Get providers sorted by priority
        sorted_providers = sorted(
            self._providers.items(),
            key=lambda x: x[1][1],  # Sort by priority
        )

        if provider_type and not fallback:
            # Return only providers of the detected type
            matching = [
                name for name, _ in sorted_providers
                if self._provider_matches_type(name, provider_type)
            ]
            if matching:
                return matching

        # Default: return all providers sorted by priority
        # Put preferred provider type first if detected
        if provider_type:
            preferred: list[str] = []
            others: list[str] = []
            for name, _ in sorted_providers:
                if self._provider_matches_type(name, provider_type):
                    preferred.append(name)
                else:
                    others.append(name)
            return preferred + others

        # Use default provider first if set
        if self._default_provider and self._default_provider in self._providers:
            result = [self._default_provider]
            for name, _ in sorted_providers:
                if name != self._default_provider:
                    result.append(name)
            return result

        return [name for name, _ in sorted_providers]

    def _detect_provider_type(self, path: str) -> Optional[str]:
        """Detect the appropriate provider type for a path.

        Args:
            path: The path to analyze

        Returns:
            Provider type name or None if indeterminate
        """
        # codex:// URIs should use github or local
        if path.startswith("codex://"):
            return "github"

        # HTTP/HTTPS URLs
        if path.startswith(("http://", "https://")):
            return "http"

        # GitHub-style paths (org/repo/...)
        if "/" in path and not path.startswith("/"):
            parts = path.split("/")
            if len(parts) >= 3 and not any(p.startswith(".") for p in parts[:2]):
                # Looks like org/repo/path format
                return "github"

        # Default to local for everything else
        return "local"

    def _provider_matches_type(self, provider_name: str, provider_type: str) -> bool:
        """Check if a provider matches a type.

        Args:
            provider_name: Registered provider name
            provider_type: Type to check against

        Returns:
            True if provider matches type
        """
        # Simple heuristic: check if type is in the name
        # This allows "github-private", "local-cache", etc.
        return provider_type.lower() in provider_name.lower()

    async def close(self) -> None:
        """Close all registered providers."""
        errors: list[tuple[str, Exception]] = []

        for name, (provider, _) in self._providers.items():
            try:
                await provider.close()
            except Exception as e:
                errors.append((name, e))

        self._providers.clear()
        self._closed = True

        if errors:
            raise StorageError(
                "Failed to close some providers",
                code="CLOSE_ERROR",
                details={name: str(err) for name, err in errors},
            )

    @property
    def is_closed(self) -> bool:
        """Check if manager has been closed."""
        return self._closed

    def _ensure_not_closed(self) -> None:
        """Raise error if manager is closed."""
        if self._closed:
            raise StorageError(
                "Storage manager has been closed",
                code="MANAGER_CLOSED",
            )

    async def __aenter__(self) -> "StorageManager":
        """Async context manager entry."""
        return self

    async def __aexit__(self, *args: Any) -> None:
        """Async context manager exit."""
        await self.close()
